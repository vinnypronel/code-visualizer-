"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Code2, ArrowRight, HelpCircle, ChevronLeft, Compass, GripHorizontal } from "lucide-react";
import GuideSpotlight, {
  placeGuideCard,
  usePrefersReducedMotion,
  useTargetRect,
  type GuideSide,
} from "@/components/guide/GuideSpotlight";

export interface InteractiveWalkthroughProps {
  isActive: boolean;
  currentLessonStep: number; // 1 to 4
  lessonPhase: "intro" | "ready" | "result" | "complete";
  /*
   * Which example is on screen. The guide narrates specific source lines, so it
   * only runs for presets it has written content for (see WALKTHROUGH_CONTENT
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
  onExploreExamples?: () => void;
}

/* The four executable lines still alternate between run and observe cards.
 * Two teaching-only cards introduce the surrounding Java before line 3, so
 * the complete walkthrough contains ten deliberately separate cards. */
type SubPhase = "run" | "observe";

interface WalkthroughStepDef {
  expectedLessonStep: number;
  subPhase: SubPhase;
  title: string;
  lineNumber?: number;
  codeSnippet?: string;
  showCodeOnObserve?: boolean;
  setupNote?: {
    line1Code: string;
    line1Why: string;
    line2Code: string;
    line2Why: string;
  };
  blueprintNote?: {
    linesCode: string;
    details: string[];
  };
  explanationText: string;
  /* Teaching-only cards can advance within the guide without executing Java.
   * This lets foundational concepts appear one at a time before the runnable
   * line is introduced. */
  actionKind?: "next" | "primary";
  phaseLabel?: string;
  /* Label for the live action button inside the card. It performs the real
   * app action, so the participant can advance from the card or from the
   * workspace and the card visibly moves either way. */
  actionButtonLabel: string;
  selector: string;
  placement: GuideSide;
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

const JAVA_TYPES = new Set(["LinkedListDemo", "Node", "String"]);

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

const walkthroughSteps: WalkthroughStepDef[] = [
  {
    expectedLessonStep: 1,
    subPhase: "run",
    title: "Understanding the basics",
    setupNote: {
      line1Code: "public class LinkedListDemo {",
      line1Why: 'This defines a class named "LinkedListDemo" that holds the program code. It does not create an object.',
      line2Code: "public static void main(String[] args) {",
      line2Why: 'This defines where Java starts running. It does not create anything yet; Java follows the lines inside main from top to bottom.',
    },
    explanationText:
      "These two lines prepare the program. They do not create a Node or change the visualization yet.",
    actionKind: "next",
    phaseLabel: "Learn the basics",
    actionButtonLabel: "Next",
    selector: "#onboarding-code-content",
    placement: "right",
  },
  {
    expectedLessonStep: 1,
    subPhase: "run",
    title: "Meet the Node blueprint",
    blueprintNote: {
      linesCode: "class Node {\n  int value;\n  Node next;\n  Node(int value) {\n    this.value = value;\n  }\n}",
      details: [
        'class Node defines the recipe. It does not create a Node object yet.',
        'int value and Node next say that every Node object will have a number and a link. Before they are changed, value is 0 and next is null.',
        'Node(int value) is the constructor. It runs whenever the program uses new Node(...).',
        'this.value means the value field inside the new object. The value on the right is the number passed in, such as 10. The assignment stores that number in the object.',
      ],
    },
    explanationText:
      "This class describes what every Node will contain. It is a blueprint only; no Node object exists until Java reaches new Node(...).",
    actionKind: "next",
    phaseLabel: "Understand a Node",
    actionButtonLabel: "Next",
    selector: "#onboarding-code-content",
    placement: "right",
  },
  {
    expectedLessonStep: 1,
    subPhase: "run",
    title: "Create the first node",
    lineNumber: 3,
    codeSnippet: "Node head = new Node(10);",
    explanationText:
      'On line 3, new Node(10) creates one Node object. Its constructor stores 10 in the value field, while next remains null. Node head creates a Stack variable named "head", and the = makes head point to the new object.',
    actionKind: "primary",
    actionButtonLabel: "Run line 3",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 1,
    subPhase: "observe",
    title: "First node created",
    explanationText:
      'Look at the visualizer: variable "head" appears on the Stack holding a reference arrow pointing to [Object 1] containing a value of 10 in Object Storage.',
    actionButtonLabel: "Continue",
    selector: "#onboarding-memory-view",
    placement: "center",
  },
  {
    expectedLessonStep: 2,
    subPhase: "run",
    title: "Create the second node",
    lineNumber: 4,
    codeSnippet: "Node temp = new Node(20);",
    explanationText:
      'To connect a list we need a second node. This line creates variable named "temp" on the Stack and allocates a new Node object holding 20.',
    actionButtonLabel: "Run line 4",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 2,
    subPhase: "observe",
    title: "Second node created",
    explanationText:
      'Look at Object Storage: You now have two separate Node objects (10 and 20) sitting side by side in memory, referenced by variables "head" and "temp".',
    actionButtonLabel: "Continue",
    selector: "#onboarding-memory-view",
    placement: "center",
  },
  {
    expectedLessonStep: 3,
    subPhase: "run",
    title: "Link the nodes",
    lineNumber: 5,
    codeSnippet: "head.next = temp;",
    explanationText:
      'This is the key line that links the list. It sets the "next" field inside variable "head" to point directly to the Node referenced by "temp".',
    actionButtonLabel: "Run line 5",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 3,
    subPhase: "observe",
    title: "Nodes connected!",
    lineNumber: 5,
    codeSnippet: "head.next = temp;",
    showCodeOnObserve: true,
    explanationText:
      'The moving [Object 2] label is a reference value being copied from "temp" into the "next" field of [Object 1] (the Node containing 10). Object 2 does not move. When the reference lands, Node 10 points to Node 20, forming the linked list.',
    actionButtonLabel: "Continue",
    selector: "#onboarding-memory-view",
    placement: "center",
  },
  {
    expectedLessonStep: 4,
    subPhase: "run",
    title: "Read a value out of a node",
    lineNumber: 6,
    codeSnippet: "int value = head.value;",
    explanationText:
      'Line 6 follows variable "head" to its Node, reads the number in the "value" field, and copies that number into a new variable named "value" on the Stack.',
    actionButtonLabel: "Run line 6",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 4,
    subPhase: "observe",
    title: "Lesson complete!",
    explanationText:
      'The moving 10 is the integer value being copied from Object 1\'s "value" field into a new Stack variable also named "value". Object 1 keeps its own 10; reading a primitive value copies it rather than removing it. You have now traced the whole program!',
    actionButtonLabel: "Finish Lesson",
    selector: "#onboarding-memory-view",
    placement: "center",
  },
];

/*
 * Guided content, keyed by preset id.
 *
 * Every step above names a linked-list line verbatim, so the array is
 * registered under "linkedlist" only. Any other example, and any program the
 * user ran themselves, gets no guide rather than a guide describing code that
 * is not on screen. To cover another example later, write its steps and add
 * one entry here, then add the id to WALKTHROUGH_PRESET_IDS in studyConfig.
 */
const WALKTHROUGH_CONTENT: Record<string, WalkthroughStepDef[]> = {
  linkedlist: walkthroughSteps,
};

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
  onExploreExamples,
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
  const steps = isCustomCode ? undefined : WALKTHROUGH_CONTENT[presetId];

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
      const cardHeight = cardRef.current?.offsetHeight || CARD_MAX_HEIGHT_FALLBACK;
      const desiredCardWidth = activeStepData?.subPhase === "observe" ? OBSERVE_CARD_WIDTH : CARD_WIDTH;
      const cardWidth = cardRef.current?.offsetWidth || desiredCardWidth;
      const el = activeStepData ? document.querySelector(activeStepData.selector) : null;
      const live = el ? el.getBoundingClientRect() : null;

      if (
        activeStepData?.subPhase === "observe" &&
        activeStepData.expectedLessonStep === 4 &&
        live
      ) {
        const margin = 24;
        const bottomInset = 28;
        setPlacement({
          top: Math.max(margin, window.innerHeight - cardHeight - bottomInset),
          left: Math.max(
            margin,
            Math.min(
              window.innerWidth - cardWidth - margin,
              live.left + 187,
            ),
          ),
          side: "center",
        });
        return;
      }

      if (
        activeStepData?.subPhase === "run" &&
        (activeStepData.expectedLessonStep === 1 ||
          activeStepData.expectedLessonStep === 2 ||
          activeStepData.expectedLessonStep === 3 ||
          activeStepData.expectedLessonStep === 4) &&
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
        const visibleBottom = Math.min(live.bottom, window.innerHeight);
        const isFirstResult = activeStepData.expectedLessonStep === 1;
        const isSecondResult = activeStepData.expectedLessonStep === 2;
        const isThirdResult = activeStepData.expectedLessonStep === 3;

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

        const resultBottom = visibleBottom - (isFirstResult ? 34 : isSecondResult ? 10 : margin);
        setPlacement({
          top: Math.max(
            margin,
            Math.min(
              resultBottom - cardHeight,
              window.innerHeight - cardHeight - margin,
            ),
          ),
          left: Math.max(
            margin,
            Math.min(
              window.innerWidth - cardWidth - margin,
              isFirstResult
                ? live.left + 24
                : isSecondResult
                  ? live.left + 16
                  : live.left + (live.width - cardWidth) / 2,
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
  }, [visible, targetRect, activeStepData]);

  /*
   * The card auto-places itself out of the way of whatever it is describing,
   * but no placement is right for everyone, so the participant can drag it
   * anywhere. The position is retained for the current guide and reset when
   * the next guide opens so every guide starts from its designed location.
   */
  const dragOriginRef = useRef<{ dx: number; dy: number } | null>(null);

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
              className="guide-drag-handle flex-shrink-0"
              onPointerDown={handleDragStart}
              title="Drag guide"
              aria-label="Drag lesson guide"
              role="button"
            >
              <GripHorizontal size={16} aria-hidden="true" />
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
                <span>Lines 1-2: where Java starts</span>
              </div>
              <div className="mb-1.5">
                <JavaSyntax code={activeStepData.setupNote.line1Code} className="font-mono text-[10.5px] block" />
                <span className="text-slate-300 text-[10px] block leading-tight mt-0.5">{activeStepData.setupNote.line1Why}</span>
              </div>
              <div>
                <JavaSyntax code={activeStepData.setupNote.line2Code} className="font-mono text-[10.5px] block" />
                <span className="text-slate-300 text-[10px] block leading-tight mt-0.5">{activeStepData.setupNote.line2Why}</span>
              </div>
            </div>
          )}

          {!isObserve && activeStepData.blueprintNote && (
            <div className="mb-2 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-1">
                <HelpCircle size={12} aria-hidden="true" />
                <span>Lines 10-16: how Java builds a Node</span>
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

            {isFinalCard && onExploreExamples && (
              <button
                type="button"
                onClick={onExploreExamples}
                className="walkthrough-back-button flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[11.5px] font-semibold flex-shrink-0"
                style={{
                  color: "var(--accent)",
                  background: "var(--bg-panel-2)",
                  borderColor: "var(--border)",
                  cursor: "pointer",
                }}
                aria-label="Open more Java examples"
              >
                <Compass size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>Try another</span>
              </button>
            )}
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
