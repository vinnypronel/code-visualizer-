"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Code2, ArrowRight, HelpCircle, ChevronLeft, GripHorizontal } from "lucide-react";
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
      const cardHeight = cardRef.current?.offsetHeight || defaultHeight;
      const desiredCardWidth = isObserve ? OBSERVE_CARD_WIDTH : CARD_WIDTH;
      const cardWidth = cardRef.current?.offsetWidth || desiredCardWidth;
      const el = activeStepData ? document.querySelector(activeStepData.selector) : null;
      const live = el ? el.getBoundingClientRect() : null;

      if (
        activeStepData?.subPhase === "observe" &&
        currentIndex === (steps?.length ?? 0) - 1
      ) {
        const editorEl = document.querySelector("#onboarding-code-content");
        const editorRect = editorEl ? editorEl.getBoundingClientRect() : null;
        const margin = 24;
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
        const isStackStepTen = presetId === "stack" && currentIndex === 9;
        const isLiveTraceStepTen = presetId === "livetrace" && currentIndex === 9;
        const isLiveTraceStepTwelve = presetId === "livetrace" && currentIndex === 11;
        const isLiveTraceStepFourteen = presetId === "livetrace" && currentIndex === 13;

        if (isLiveTraceStepFourteen) {
          const editorEl = document.querySelector("#onboarding-code-content");
          const codeRect = editorEl?.getBoundingClientRect();
          setPlacement({
            top: codeRect
              ? Math.max(margin, codeRect.top + 145)
              : Math.max(margin, live.top + 145),
            left: codeRect
              ? Math.max(margin, codeRect.right - cardWidth + 2)
              : margin,
            side: "center",
          });
          return;
        }

        if (isLiveTraceStepTwelve) {
          const editorEl = document.querySelector("#onboarding-code-content");
          const codeRect = editorEl?.getBoundingClientRect();
          setPlacement({
            top: codeRect
              ? Math.max(margin, codeRect.top + 217)
              : Math.max(margin, live.top + 217),
            left: codeRect
              ? Math.max(margin, codeRect.right - cardWidth - 7)
              : margin,
            side: "center",
          });
          return;
        }

        if (isLiveTraceStepTen) {
          const editorEl = document.querySelector("#onboarding-code-content");
          const codeRect = editorEl?.getBoundingClientRect();
          setPlacement({
            top: codeRect
              ? Math.max(margin, codeRect.top + 75)
              : Math.max(margin, live.top + 75),
            left: codeRect
              ? Math.max(margin, codeRect.right - cardWidth - 20)
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
  }, [visible, targetRect, activeStepData, currentIndex, steps?.length, presetId]);

  /*
   * The card auto-places itself out of the way of whatever it is describing,
   * but no placement is right for everyone, so the participant can drag it
   * anywhere. The position is retained for the current guide and reset when
   * the next guide opens so every guide starts from its designed location.
   */
  const dragOriginRef = useRef<{ dx: number; dy: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const clampToViewport = useCallback((top: number, left: number) => {
    const card = cardRef.current;
    const width = card?.offsetWidth ?? CARD_WIDTH;
    const height = card?.offsetHeight ?? CARD_MAX_HEIGHT_FALLBACK;
    const margin = 8;
    return {
      top: Math.max(margin, Math.min(window.innerHeight - height - margin, top)),
      left: Math.max(margin, Math.min(window.innerWidth - width - margin, left)),
    };
  }, []);

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
          className={`fixed rounded-lg border pointer-events-auto ${isObserve ? "py-3 px-4" : "py-3.5 px-4"}`}
          role="dialog"
          aria-label={`Lesson guide, step ${guideStepNumber} of ${totalGuideSteps}: ${activeStepData.title}. Drag to move.`}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          style={{
            top: dragPos?.top ?? placement?.top ?? 0,
            left: dragPos?.left ?? placement?.left ?? 0,
            width: `min(${isObserve ? OBSERVE_CARD_WIDTH : CARD_WIDTH}px, calc(100vw - 32px))`,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            boxShadow: "0 16px 36px rgba(23, 32, 51, 0.18)",
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: "var(--accent)" }}>
              Step {guideStepNumber} of {totalGuideSteps} &middot; {activeStepData.phaseLabel ?? (isObserve ? "Look at what changed" : "Run the line")}
            </span>
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

          <h4 className="text-[14px] font-bold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
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
            <div className="mb-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-0.5">
                <Code2 size={12} aria-hidden="true" />
                <span>Line {activeStepData.lineNumber}</span>
                {isObserve && (
                  <span className="normal-case font-semibold text-[9.5px] text-[#16a34a] bg-[#16a34a]/10 px-1.5 py-0.5 rounded border border-[#16a34a]/30">
                    has been run already
                  </span>
                )}
              </div>
              <div className="px-2.5 py-1.5 rounded-md bg-slate-950 border border-[#16a34a]/30 font-mono text-[11.5px] overflow-x-auto shadow-inner">
                <JavaSyntax code={activeStepData.codeSnippet} />
              </div>
            </div>
          )}

          <p className="text-[11.5px] leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
            {activeStepData.explanationText}
          </p>

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
                className="walkthrough-back-button flex items-center gap-1 rounded-md border px-2.5 py-2 text-[11.5px] font-semibold flex-shrink-0"
                style={{
                  color: "var(--text-secondary)",
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
              className="walkthrough-action-button flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-[11.5px] font-semibold flex-shrink-0"
              style={{ color: "var(--success)", background: "#e7f3ee", borderColor: "#b8dccf", cursor: "pointer" }}
            >
              <ArrowRight size={14} className="flex-shrink-0" aria-hidden="true" />
              <span>{guideActionLabel}</span>
            </button>

          </div>

          <div className="flex items-center pt-3">
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
