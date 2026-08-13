"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGuideScale } from "@/lib/guideScale";
import { guideArrowDirection } from "@/lib/guideKeys";
import { motion } from "framer-motion";
import { CheckCircle2, Code2, ArrowRight, HelpCircle, ChevronLeft, EyeOff, GripHorizontal } from "lucide-react";
import GuideSpotlight, {
  placeGuideCard,
  usePrefersReducedMotion,
  useTargetRect,
  type GuideSide,
} from "@/components/guide/GuideSpotlight";
import {
  GUIDED_WALKTHROUGHS,
} from "@/data/guidedWalkthroughs";

export interface InteractiveWalkthroughProps {
  isActive: boolean;
  currentLessonStep: number;
  lessonPhase: "intro" | "ready" | "result" | "complete";
  /*
   * Which example is on screen. The guide narrates specific source lines, so it
   * only runs for presets it has written content for (see GUIDED_WALKTHROUGHS
   * below) and never for code the user wrote and ran themselves.
   */
  presetId: string;
  isCustomCode?: boolean;
  onStepBack?: () => void;
  onBackToOrientation?: () => void;
  /*
   * The same handler and label the real Run This Line button uses. Both are
   * optional: when they are not supplied the card drives the real button
   * through the DOM instead, so the guide works either way and there is only
   * ever one code path performing the lesson action.
   */
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  /** Hides the card and spotlight without changing the current lesson step. */
  onHide?: () => void;
  /** Keeps the editor highlight synchronized with the guide's current card. */
  onHighlightedLinesChange?: (lines: number[] | null) => void;
}

const PRIMARY_BUTTON_SELECTOR = "#onboarding-playback-controls";
const BACK_BUTTON_SELECTOR = "#onboarding-step-back";

const JAVA_KEYWORDS = new Set([
  "boolean", "break", "case", "catch", "char", "class", "continue",
  "default", "do", "double", "else", "extends", "final", "finally",
  "float", "for", "if", "implements", "import", "instanceof", "int",
  "interface", "long", "new", "package", "private", "protected", "public",
  "return", "short", "static", "super", "switch", "this", "throw", "throws",
  "try", "void", "while",
]);

const JAVA_TYPES = new Set([
  "ArrayListDemo", "LinkedListDemo", "MyStack", "Node", "Sample", "StackDemo", "String", "System",
]);

function JavaSyntax({ code, className = "" }: { code: string; className?: string }) {
  const tokens = code.split(/(\s+|[().,;=])/);

  return (
    <code className={className}>
      {tokens.map((token, index) => {
        if (!token) return null;
        if (JAVA_KEYWORDS.has(token)) {
          return (
            <span key={index} style={{ color: "#569cd6" }}>
              {token}
            </span>
          );
        }
        if (JAVA_TYPES.has(token)) {
          return (
            <span key={index} style={{ color: "#d4d4d4" }}>
              {token}
            </span>
          );
        }
        if (/^\d+$/.test(token)) {
          return (
            <span key={index} style={{ color: "#b5cea8" }}>
              {token}
            </span>
          );
        }
        return (
          <span key={index} style={{ color: "#d4d4d4" }}>
            {token}
          </span>
        );
      })}
    </code>
  );
}

function describeAnimationMovement({
  code,
  line,
  details,
}: {
  code: string;
  line?: number;
  details: string[];
}) {
  const source = `“${code}” moved: Line ${line ?? "?"} →`;
  const allDetails = details.join(" ");
  const objectIds = allDetails.match(/\[Object \d+\]/g) ?? [];
  const objectId = objectIds[0];
  const movedObjectId = objectIds.at(-1);

  if (/\bnew\b/.test(code) && objectId) {
    return `${source} ${objectId} in Objects. Why: Line ${line ?? "?"} created that object.`;
  }
  if (code.includes("System.out.println")) {
    return `${source} Program Output. Why: println displays text.`;
  }
  if (code.trim().startsWith("return ")) {
    return `${source} multiply’s result area. Why: return prepares the value sent to main.`;
  }
  if (allDetails.includes("new multiply box")) {
    return `${source} the new multiply box. Why: calling a method creates that temporary Stack frame.`;
  }

  const assignmentTarget = code.split("=")[0]?.trim();
  const assignmentSource = code.split("=")[1]?.replace(";", "").trim();
  if (assignmentTarget?.includes(".")) {
    return movedObjectId
      ? `Reference ${movedObjectId} moved: ${assignmentSource} → ${assignmentTarget}. Why: the field now points to the same object as ${assignmentSource}.`
      : `Value moved: ${assignmentSource} → ${assignmentTarget}. Why: this assignment changes that field.`;
  }
  if (assignmentTarget?.includes("[")) {
    return `Value moved: ${assignmentSource} → ${assignmentTarget}. Why: that array slot receives a copy.`;
  }
  if (assignmentSource?.includes(".") || assignmentSource?.includes("[")) {
    const declaredVariable = assignmentTarget?.split(/\s+/).at(-1);
    return `Value moved: ${assignmentSource} → ${declaredVariable}. Why: the new Stack variable receives a copy.`;
  }

  const declaredVariable = assignmentTarget?.split(/\s+/).at(-1);
  if (declaredVariable) {
    return `${source} Stack variable “${declaredVariable}.” Why: it receives the result.`;
  }

  return `${source} the main changed location. Other affected places lit up afterward.`;
}

const CARD_WIDTH = 380;
const OBSERVE_CARD_WIDTH = 390;
const CARD_MAX_HEIGHT_FALLBACK = 420;

export default function InteractiveWalkthrough({
  isActive,
  currentLessonStep,
  lessonPhase,
  presetId,
  isCustomCode = false,
  onStepBack,
  onBackToOrientation,
  onPrimaryAction,
  primaryActionLabel,
  onHide,
  onHighlightedLinesChange,
}: InteractiveWalkthroughProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number; side: GuideSide } | null>(null);
  const [dragPlacement, setDragPlacement] = useState<{
    stepKey: string | null;
    top: number;
    left: number;
  } | null>(null);
  const [openingGuideIndex, setOpeningGuideIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  /* No narration for this example means no guide at all. */
  const steps = isCustomCode ? undefined : GUIDED_WALKTHROUGHS[presetId];

  const isOpeningSequence = currentLessonStep === 1 && lessonPhase === "ready";
  const currentIndex = isOpeningSequence
    ? Math.min(openingGuideIndex, 2)
    : (steps ?? []).findIndex(
        (step, index) =>
          index >= 3 &&
          step.expectedLessonStep === currentLessonStep &&
          step.subPhase === (lessonPhase === "result" ? "observe" : "run"),
      );

  const activeStepData =
    steps && (lessonPhase === "ready" || lessonPhase === "result")
      ? (currentIndex >= 0 ? steps[currentIndex] : null)
      : null;

  const visible = isActive && !!activeStepData;
  const stepKey = activeStepData ? `${currentIndex}-${activeStepData.expectedLessonStep}-${activeStepData.subPhase}` : null;
  const dragPos = dragPlacement?.stepKey === stepKey ? dragPlacement : null;
  const guideScale = useGuideScale();

  const targetRect = useTargetRect(visible && activeStepData ? activeStepData.selector : null, visible);
  const spotlightEditor = !!(
    visible &&
    activeStepData.subPhase === "run"
  );
  const editorRect = useTargetRect(
    spotlightEditor ? "#onboarding-code-content" : null,
    spotlightEditor,
  );
  const guideButtonRect = useTargetRect(visible ? "#onboarding-guide-button" : null, visible);
  const editButtonRect = useTargetRect(visible ? "#onboarding-edit-button" : null, visible);
  const restartButtonRect = useTargetRect(visible ? "#onboarding-restart-button" : null, visible);
  const backButtonRect = useTargetRect(visible ? BACK_BUTTON_SELECTOR : null, visible);
  const explainMoreButtonRect = useTargetRect(visible ? "#onboarding-explain-more-button" : null, visible);
  const explanationToggleRect = useTargetRect(visible ? "#onboarding-explanation-toggle" : null, visible);
  const explanationDetailsRect = useTargetRect(visible ? "#step-explanation-details" : null, visible);
  const devJumpRect = useTargetRect(visible ? "#dev-jump-panel" : null, visible);

  useEffect(() => {
    onHighlightedLinesChange?.(
      visible ? (activeStepData?.highlightedLines ?? null) : null,
    );

    return () => onHighlightedLinesChange?.(null);
  }, [activeStepData, onHighlightedLinesChange, visible]);

  /* Keep the strong code line treatment on while the guide is running so the
   * line the card is talking about is obvious in the editor. */
  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("onboarding-editor-line-focus");
    return () => document.body.classList.remove("onboarding-editor-line-focus");
  }, [visible]);

  /* Measure the card, then place it on a side that does not cover the target.
   * Height is measured rather than guessed because the cards differ a lot in
   * length, and the height is capped so the placer can never be forced to
   * fall back to screen center just because the card is tall. */
  useLayoutEffect(() => {
    if (!visible) return;

    const reposition = () => {
      const isObserve = activeStepData?.subPhase === "observe";
      const defaultHeight = isObserve ? 235 : CARD_MAX_HEIGHT_FALLBACK;
      const desiredCardWidth = isObserve ? OBSERVE_CARD_WIDTH : CARD_WIDTH;
      /*
       * Measure with getBoundingClientRect, not offsetWidth/offsetHeight. The
       * card is zoomed on large monitors, so the offset properties report the
       * unscaled layout size and every placement below would underestimate the
       * card by the zoom factor and let it run off the bottom of the screen.
       */
      const cardBox = cardRef.current?.getBoundingClientRect();
      const cardHeight = cardBox?.height || defaultHeight * guideScale;
      const cardWidth = cardBox?.width || desiredCardWidth * guideScale;
      const el = activeStepData ? document.querySelector(activeStepData.selector) : null;
      const live = el ? el.getBoundingClientRect() : null;

      if (
        activeStepData?.subPhase === "observe" &&
        currentIndex === (steps?.length ?? 0) - 1
      ) {
        const editorEl = document.querySelector("#onboarding-code-content");
        const editorRect = editorEl ? editorEl.getBoundingClientRect() : null;
        const margin = 24;

        if (presetId === "livetrace") {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: Math.max(margin, window.innerHeight - cardHeight - 60),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.right + 16,
                  ),
                )
              : Math.max(margin, live?.right ?? margin),
            side: "center",
          });
          return;
        }

        if (presetId === "arraylist") {
          setPlacement({
            top: Math.max(margin, window.innerHeight - cardHeight - 145),
            left: editorRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    editorRect.left + 190,
                  ),
                )
              : 190,
            side: "center",
          });
          return;
        }

        const targetLeft = editorRect ? editorRect.left + 88 : 88;
        const targetTop = Math.max(margin, window.innerHeight - cardHeight - 135);

        setPlacement({
          top: targetTop,
          left: Math.max(margin, targetLeft),
          side: "center",
        });
        return;
      }

      if (
        activeStepData?.subPhase === "run" &&
        live
      ) {
        const margin = 24;
        const isFirstLineRun = activeStepData.expectedLessonStep === 1;
        const isSecondLineRun = activeStepData.expectedLessonStep === 2;
        const isThirdLineRun = activeStepData.expectedLessonStep === 3;
        const isFourthLineRun = activeStepData.expectedLessonStep === 4;
        const bottomInset = isFirstLineRun ? 57 : isSecondLineRun ? 75 : isThirdLineRun ? 64 : 38;
        const horizontalGap = isFirstLineRun ? 64 : isSecondLineRun ? 72 : isThirdLineRun ? 65 : isFourthLineRun ? 72 : 64;
        setPlacement({
          top: Math.max(
            margin,
            Math.min(
              window.innerHeight - cardHeight - bottomInset,
              window.innerHeight - cardHeight - margin,
            ),
          ),
          left: Math.max(
            margin,
            Math.min(
              window.innerWidth - cardWidth - margin,
              live.right + horizontalGap,
            ),
          ),
          side: "right",
        });
        return;
      }

      if (activeStepData?.subPhase === "observe" && live) {
        const margin = 16;
        const isFirstResult = activeStepData.expectedLessonStep === 1;
        const isSecondResult = activeStepData.expectedLessonStep === 2;
        const isThirdResult = activeStepData.expectedLessonStep === 3;
        const isArrayListStepEight = presetId === "arraylist" && currentIndex === 7;
        const isArrayListStepTen = presetId === "arraylist" && currentIndex === 9;
        const isArrayListStepTwelve = presetId === "arraylist" && currentIndex === 11;
        const isStackStepTen = presetId === "stack" && currentIndex === 9;
        const isStackStepTwelve = presetId === "stack" && currentIndex === 11;
        const isLiveTraceStepEight = presetId === "livetrace" && currentIndex === 7;
        const isLiveTraceStepTen = presetId === "livetrace" && currentIndex === 9;
        const isLiveTraceStepTwelve = presetId === "livetrace" && currentIndex === 11;
        const isLiveTraceStepFourteen = presetId === "livetrace" && currentIndex === 13;

        /* Linked List result cards sit at the bottom-left of the workbench,
         * directly beneath the Stack cards. This keeps the variables visible
         * while placing their explanation beside the area it describes. */
        if (presetId === "linkedlist") {
          const isNodesConnectedResult = activeStepData.expectedLessonStep === 3;
          setPlacement({
            top: Math.max(
              margin,
              window.innerHeight - cardHeight - 10,
            ),
            left: Math.max(
              margin,
              Math.min(
                window.innerWidth - cardWidth - margin,
                isNodesConnectedResult
                  ? live.left - cardWidth - 8
                  : live.left + 10,
              ),
            ),
            side: "center",
          });
          return;
        }

        if (isArrayListStepEight) {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: Math.max(margin, window.innerHeight - cardHeight - 59),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.left + 21,
                  ),
                )
              : Math.max(margin, live.left + 21),
            side: "center",
          });
          return;
        }

        if (isArrayListStepTen) {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: Math.max(margin, window.innerHeight - cardHeight - 53),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.left + 22,
                  ),
                )
              : Math.max(margin, live.left + 22),
            side: "center",
          });
          return;
        }

        if (isArrayListStepTwelve) {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: Math.max(margin, window.innerHeight - cardHeight - 11),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.left + 7,
                  ),
                )
              : Math.max(margin, live.left + 7),
            side: "center",
          });
          return;
        }

        if (isLiveTraceStepEight) {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: stackZoneRect
              ? Math.max(margin, stackZoneRect.top + 74)
              : Math.max(margin, live.top + 74),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.right + 11,
                  ),
                )
              : Math.max(margin, live.right + 11),
            side: "center",
          });
          return;
        }

        if (isLiveTraceStepFourteen) {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: stackZoneRect
              ? Math.max(margin, stackZoneRect.top + 80)
              : Math.max(margin, live.top + 145),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.right + 19,
                  ),
                )
              : Math.max(margin, live.right + 19),
            side: "center",
          });
          return;
        }

        if (isLiveTraceStepTwelve) {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: stackZoneRect
              ? Math.max(margin, stackZoneRect.top + 267)
              : Math.max(margin, live.top + 217),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.right + 12,
                  ),
                )
              : Math.max(margin, live.right + 12),
            side: "center",
          });
          return;
        }

        if (isLiveTraceStepTen) {
          const stackZoneEl = document.querySelector("#onboarding-stack-zone");
          const stackZoneRect = stackZoneEl?.getBoundingClientRect();
          setPlacement({
            top: stackZoneRect
              ? Math.max(margin, stackZoneRect.top + 78)
              : Math.max(margin, live.top + 75),
            left: stackZoneRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    stackZoneRect.right + 24,
                  ),
                )
              : Math.max(margin, live.right + 24),
            side: "center",
          });
          return;
        }

        /* LIFO guide Step 12: default to the user's tested lower-left
         * placement. It keeps the Stack variables and all heap objects clear. */
        if (isStackStepTwelve) {
          const editorEl = document.querySelector("#onboarding-code-content");
          const codeRect = editorEl?.getBoundingClientRect();
          setPlacement({
            top: Math.max(margin, window.innerHeight - cardHeight - 90),
            left: codeRect
              ? Math.max(
                  margin,
                  Math.min(
                    window.innerWidth - cardWidth - margin,
                    codeRect.right - cardWidth + 10,
                  ),
                )
              : margin,
            side: "center",
          });
          return;
        }

        if (isStackStepTen) {
          const editorEl = document.querySelector("#onboarding-code-content");
          const codeRect = editorEl?.getBoundingClientRect();
          setPlacement({
            top: codeRect
              ? Math.max(margin, codeRect.top + 55)
              : Math.max(margin, live.top + 55),
            left: codeRect
              ? Math.max(margin, codeRect.right - cardWidth - 5)
              : margin,
            side: "center",
          });
          return;
        }

        if (isThirdResult) {
          const verticalOffset = Math.min(
            215,
            Math.max(0, live.height - cardHeight - 70),
          );
          setPlacement({
            top: Math.max(
              margin,
              Math.min(
                window.innerHeight - cardHeight - margin,
                live.top + verticalOffset,
              ),
            ),
            left: Math.max(
              margin,
              Math.min(
                window.innerWidth - cardWidth - margin,
                live.left - cardWidth - 8,
              ),
            ),
            side: "center",
          });
          return;
        }

        if (isFirstResult) {
          setPlacement({
            top: Math.max(
              margin,
              window.innerHeight - cardHeight - 55,
            ),
            left: Math.max(
              margin,
              Math.min(
                window.innerWidth - cardWidth - margin,
                live.left + 25,
              ),
            ),
            side: "center",
          });
          return;
        }

        if (isSecondResult) {
          setPlacement({
            top: Math.max(
              margin,
              window.innerHeight - cardHeight - 55,
            ),
            left: Math.max(
              margin,
              Math.min(
                window.innerWidth - cardWidth - margin,
                live.left + 25,
              ),
            ),
            side: "center",
          });
          return;
        }

        setPlacement({
          top: Math.max(
            margin,
            window.innerHeight - cardHeight - 105,
          ),
          left: Math.max(
            margin,
            Math.min(
              window.innerWidth - cardWidth - margin,
              live.left - 54,
            ),
          ),
          side: "center",
        });
        return;
      }

      setPlacement(
        placeGuideCard({
          target: live
            ? { top: live.top, left: live.left, width: live.width, height: live.height }
            : targetRect,
          cardWidth: desiredCardWidth,
          cardHeight,
          preferred: activeStepData?.placement ?? "center",
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }),
      );
    };

    reposition();

    const observer = cardRef.current ? new ResizeObserver(reposition) : null;
    if (observer && cardRef.current) observer.observe(cardRef.current);
    window.addEventListener("resize", reposition);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reposition);
    };
  }, [visible, targetRect, activeStepData, currentIndex, steps?.length, presetId, guideScale]);

  /*
   * The card auto-places itself out of the way of whatever it is describing,
   * but no placement is right for everyone, so the participant can drag it
   * anywhere. The position is retained for the current guide and reset when
   * the next guide opens so every guide starts from its designed location.
   */
  const dragOriginRef = useRef<{ dx: number; dy: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const clampToViewport = useCallback((top: number, left: number) => {
    /* Rect, not offset*, so the zoomed size is what gets clamped. */
    const box = cardRef.current?.getBoundingClientRect();
    const width = box?.width ?? CARD_WIDTH * guideScale;
    const height = box?.height ?? CARD_MAX_HEIGHT_FALLBACK * guideScale;
    const margin = 8;
    return {
      top: Math.max(margin, Math.min(window.innerHeight - height - margin, top)),
      left: Math.max(margin, Math.min(window.innerWidth - width - margin, left)),
    };
  }, [guideScale]);

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Never start a drag from a control, or the buttons stop working.
      if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      dragOriginRef.current = {
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top,
      };
      setIsDragging(true);
      card.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handleDragMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      event.preventDefault();
      setDragPlacement({
        stepKey,
        ...clampToViewport(event.clientY - origin.dy, event.clientX - origin.dx),
      });
    },
    [clampToViewport, stepKey],
  );

  const handleDragEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current) return;
    dragOriginRef.current = null;
    setIsDragging(false);
    cardRef.current?.releasePointerCapture(event.pointerId);
  }, []);

  // Keep a dragged card on screen when the window is resized.
  useEffect(() => {
    if (!dragPos) return;
    const onResize = () => setDragPlacement((current) => (
      current?.stepKey === stepKey
        ? { ...current, ...clampToViewport(current.top, current.left) }
        : current
    ));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dragPos, clampToViewport, stepKey]);

  const runPrimaryAction = useCallback(() => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }
    const button = document.querySelector<HTMLButtonElement>(PRIMARY_BUTTON_SELECTOR);
    button?.click();
  }, [onPrimaryAction]);

  const runGuideAction = useCallback(() => {
    if (activeStepData?.actionKind === "next") {
      setOpeningGuideIndex((index) => Math.min(index + 1, 2));
      return;
    }
    runPrimaryAction();
  }, [activeStepData?.actionKind, runPrimaryAction]);

  /*
   * Back drives the real previous-step control the same way the action button
   * drives the real primary control, so the lesson state stays the single
   * source of truth and the card cannot drift out of sync with the workspace.
   */
  const runBackAction = useCallback(() => {
    if (isOpeningSequence && openingGuideIndex > 0) {
      setOpeningGuideIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (onStepBack) {
      onStepBack();
      return;
    }
    const button = document.querySelector<HTMLButtonElement>(BACK_BUTTON_SELECTOR);
    button?.click();
  }, [isOpeningSequence, onStepBack, openingGuideIndex]);

  /*
   * Left and right arrows drive the same two actions the card's buttons do, so
   * a participant can step through the lesson without going back to the mouse.
   */
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = guideArrowDirection(event);
      if (!direction) return;
      event.preventDefault();
      if (direction === "next") runGuideAction();
      else runBackAction();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, runGuideAction, runBackAction]);

  if (typeof document === "undefined" || !isActive || !activeStepData) return null;

  const guideStepNumber = currentIndex + 1;
  const totalGuideSteps = steps?.length ?? 0;
  const isObserve = activeStepData.subPhase === "observe";
  const isFinalCard = guideStepNumber === totalGuideSteps;
  const isFirstCard = guideStepNumber === 1;
  const buttonLabel = activeStepData.actionButtonLabel || primaryActionLabel || "Continue";
  const guideActionLabel = activeStepData.actionKind === "next"
    ? buttonLabel
    : isObserve
      ? buttonLabel
      : `${buttonLabel} now`;

  return createPortal(
    <>
      <GuideSpotlight
        target={targetRect}
        focusTarget={spotlightEditor ? editorRect : null}
        additionalTargets={[
          guideButtonRect,
          editButtonRect,
          restartButtonRect,
          backButtonRect,
          explainMoreButtonRect,
          explanationToggleRect,
          explanationDetailsRect,
          devJumpRect,
        ]}
        side={placement?.side ?? "center"}
        reducedMotion={reducedMotion}
      />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 2147483000, isolation: "isolate" }}
      >
        <motion.div
          ref={cardRef}
          key={stepKey ?? "card"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: placement ? 1 : 0, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed rounded-lg border pointer-events-auto ${isObserve ? "py-2.5 px-3.5" : "py-3.5 px-4"}`}
          role="dialog"
          aria-label={`Lesson guide, step ${guideStepNumber} of ${totalGuideSteps}: ${activeStepData.title}. Drag to move.`}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          style={{
            zoom: guideScale,
            top: (dragPos?.top ?? placement?.top ?? 0) / guideScale,
            left: (dragPos?.left ?? placement?.left ?? 0) / guideScale,
            width: `min(${isObserve ? OBSERVE_CARD_WIDTH : CARD_WIDTH}px, calc((100vw / ${guideScale}) - 32px))`,
            maxHeight: `calc((100vh / ${guideScale}) - 32px)`,
            overflowY: "auto",
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            boxShadow: "0 16px 36px rgba(23, 32, 51, 0.18)",
          }}
        >
          <div className={`flex items-center justify-between gap-2 ${isObserve ? "mb-1" : "mb-2"}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: "var(--accent)" }}>
              Step {guideStepNumber} of {totalGuideSteps} &middot; {activeStepData.phaseLabel ?? (isObserve ? "Look at what changed" : "Run the line")}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className={`guide-drag-handle flex-shrink-0 ${isDragging ? "is-dragging" : ""}`}
                onPointerDown={handleDragStart}
                title="Drag guide (click and hold to drag)"
                aria-label="Drag lesson guide"
                role="button"
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
              >
                <GripHorizontal size={16} aria-hidden="true" style={{ pointerEvents: "none" }} />
              </div>
            </div>
          </div>

          <h4 className={`text-[14px] font-bold flex items-center gap-2 ${isObserve ? "mb-1" : "mb-2"}`} style={{ color: "var(--text-primary)" }}>
            {isFinalCard && <CheckCircle2 size={16} className="text-[#16a34a] flex-shrink-0" aria-hidden="true" />}
            {activeStepData.title}
          </h4>

          {!isObserve && activeStepData.setupNote && (
            <div className="mb-2 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[10.5px]">
              <div className="flex items-center gap-1 text-[9.5px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-1">
                <HelpCircle size={11} aria-hidden="true" />
                <span>{activeStepData.setupNote.heading}</span>
              </div>
              <div className="mb-1.5">
                <JavaSyntax code={activeStepData.setupNote.line1Code} className="font-mono text-[10.5px] block" />
                <span className="text-slate-400 font-mono text-[10px] block leading-tight mt-0.5">
                  {"// "}{activeStepData.setupNote.line1Why}
                </span>
              </div>
              <div>
                <JavaSyntax code={activeStepData.setupNote.line2Code} className="font-mono text-[10.5px] block" />
                <span className="text-slate-400 font-mono text-[10px] block leading-tight mt-0.5">
                  {"// "}{activeStepData.setupNote.line2Why}
                </span>
              </div>
            </div>
          )}

          {!isObserve && activeStepData.blueprintNote && (
            <div className="mb-2 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-1">
                <HelpCircle size={12} aria-hidden="true" />
                <span>{activeStepData.blueprintNote.heading}</span>
              </div>
              <JavaSyntax code={activeStepData.blueprintNote.linesCode} className="font-mono text-[10.5px] leading-tight block whitespace-pre-wrap" />
              <ul className="mt-1.5 space-y-1 text-slate-300 text-[10px] leading-tight list-disc pl-4">
                {activeStepData.blueprintNote.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {(!isObserve || activeStepData.showCodeOnObserve) && activeStepData.lineNumber && activeStepData.codeSnippet && (
            <div className={isObserve ? "mb-1.5" : "mb-2"}>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-0.5">
                <Code2 size={12} aria-hidden="true" />
                <span>Line {activeStepData.lineNumber}</span>
                {isObserve && (
                  <span className="normal-case font-semibold text-[9.5px] text-[#16a34a] bg-[#16a34a]/10 px-1.5 py-0.5 rounded border border-[#16a34a]/30">
                    has been run already
                  </span>
                )}
              </div>
              <div className={`px-2.5 rounded-md bg-slate-950 border border-[#16a34a]/30 font-mono text-[11.5px] overflow-x-auto shadow-inner ${isObserve ? "py-1" : "py-1.5"}`}>
                <JavaSyntax code={activeStepData.codeSnippet} />
              </div>
            </div>
          )}

          {(!isObserve || !activeStepData.animationBreakdown) && (
            <p className={`text-[11.5px] leading-relaxed ${isObserve ? "mb-1.5" : "mb-3"}`} style={{ color: "#000000" }}>
              {activeStepData.explanationText}
            </p>
          )}

          {isObserve && activeStepData.animationBreakdown && (
            <div
              className="mb-1 rounded-md border px-2 py-1.5"
              style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}
            >
              <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider" style={{ color: "#0369a1" }}>
                What changed after this line ran?
              </div>
              <p className="mb-1.5 mt-0.5 text-[9px] leading-snug" style={{ color: "#000000" }}>
                <strong style={{ color: "var(--text-primary)" }}>Drag shown: </strong>
                {describeAnimationMovement({
                  code: activeStepData.codeSnippet ?? "highlighted code",
                  line: activeStepData.lineNumber,
                  details: activeStepData.animationBreakdown.items,
                })}
              </p>
              <ol className={`grid gap-1.5 ${
                activeStepData.animationBreakdown.count === 1
                  ? "grid-cols-1"
                  : activeStepData.animationBreakdown.count === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
              }`}>
                {activeStepData.animationBreakdown.items.map((item, index) => (
                  <li
                    key={item}
                    className="flex items-start gap-1.5 rounded border bg-white/70 px-1.5 py-1.5 text-[9px] leading-snug"
                    style={{ color: "#000000", borderColor: "#d7edf8" }}
                  >
                    <span
                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold"
                      style={{ color: "#0369a1", background: "#e0f2fe", border: "1px solid #7dd3fc" }}
                    >
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/*
            Back sits beside the action rather than in the footer so both ways
            of moving through the lesson are in the same place. On the first
            card it returns to the final orientation card; later it moves to
            the previous Java lesson step.
          */}
          <div className="flex items-stretch gap-2">
            {(!isFirstCard || onBackToOrientation) && (
              <button
                type="button"
                onClick={isFirstCard ? onBackToOrientation : runBackAction}
                className={`walkthrough-back-button guide-nav-btn guide-nav-back border px-2.5 text-[11.5px] font-semibold flex-shrink-0 ${isObserve ? "py-1.5" : "py-2"}`}
                style={{
                  color: "#000000",
                  background: "var(--bg-panel-2)",
                  borderColor: "var(--border)",
                  cursor: "pointer",
                }}
                aria-label={isFirstCard ? "Return to the previous lesson guide" : "Go back one step in the lesson"}
              >
                <ChevronLeft size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={runGuideAction}
              className={`walkthrough-action-button flex items-center justify-center gap-2 rounded-md border px-4 text-[11.5px] font-semibold flex-shrink-0 ${isObserve ? "py-1.5" : "py-2"}`}
              style={{ color: "var(--success)", background: "#e7f3ee", borderColor: "#b8dccf", cursor: "pointer" }}
            >
              <ArrowRight size={14} className="flex-shrink-0" aria-hidden="true" />
              <span>{guideActionLabel}</span>
            </button>

            {onHide && (
              <button
                type="button"
                onClick={onHide}
                className="guide-hide-button guide-hide-footer-button"
                title="Hide the guide and continue on your own"
                aria-label="Hide lesson guide"
              >
                <EyeOff size={13} aria-hidden="true" />
                <span>Hide Guide</span>
              </button>
            )}

          </div>

          <div className={`flex items-center ${isObserve ? "pt-1.5" : "pt-3"}`}>
            <div
              className="flex gap-1.5"
              aria-label={`Guide progress, step ${guideStepNumber} of ${totalGuideSteps}`}
            >
              {Array.from({ length: totalGuideSteps }, (_, index) => {
                const step = index + 1;
                return (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step === guideStepNumber
                        ? "w-6 bg-emerald-500"
                        : step < guideStepNumber
                        ? "w-1.5 bg-emerald-700"
                        : "w-1.5 bg-[#d7dee7]"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body,
  );
}
