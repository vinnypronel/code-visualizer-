"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Code2, ArrowRight, HelpCircle, ChevronLeft } from "lucide-react";
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
  /*
   * The same handler and label the real Run This Line button uses. Both are
   * optional: when they are not supplied the card drives the real button
   * through the DOM instead, so the guide works either way and there is only
   * ever one code path performing the lesson action.
   */
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

/* The lesson has 4 steps. Each one has a run phase and an observe phase, so
 * the guide presents "Step n of 4" with a run/observe sub-state rather than
 * inventing an eight step story the rest of the UI does not tell. */
type SubPhase = "run" | "observe";

interface WalkthroughStepDef {
  expectedLessonStep: number;
  subPhase: SubPhase;
  title: string;
  lineNumber?: number;
  codeSnippet?: string;
  setupNote?: {
    line1Code: string;
    line1Why: string;
    line2Code: string;
    line2Why: string;
  };
  blueprintNote?: {
    linesCode: string;
    linesWhy: string;
  };
  explanationText: string;
  /* Label for the live action button inside the card. It performs the real
   * app action, so the participant can advance from the card or from the
   * workspace and the card visibly moves either way. */
  actionButtonLabel: string;
  selector: string;
  placement: GuideSide;
}

const TOTAL_LESSON_STEPS = 4;
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
    title: "Create the first node",
    lineNumber: 3,
    codeSnippet: "Node head = new Node(10);",
    setupNote: {
      line1Code: "public class LinkedListDemo {",
      line1Why: "Every Java program is wrapped inside a class container.",
      line2Code: "public static void main(String[] args) {",
      line2Why: "This is Java's entry point where execution begins line by line.",
    },
    explanationText:
      "Line 3 creates a variable head on the Stack (workbench) and allocates a new Node object holding 10 in Object Storage (Heap).",
    actionButtonLabel: "Run line 3",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 1,
    subPhase: "observe",
    title: "First node created",
    explanationText:
      "Look at the visualizer: head appears on the Stack holding a reference arrow pointing to [Object 1] containing 10 in Object Storage.",
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
      "To connect a list we need a second node. This line creates variable temp on the Stack and allocates a new Node object holding 20.",
    actionButtonLabel: "Run line 4",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 2,
    subPhase: "observe",
    title: "Second node created",
    explanationText:
      "Look at Object Storage: You now have two separate Node objects (10 and 20) sitting side by side in memory.",
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
      "This is the key line that links the list. It sets the next field inside head to point directly to the Node referenced by temp.",
    actionButtonLabel: "Run line 5",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 3,
    subPhase: "observe",
    title: "Nodes connected!",
    explanationText:
      "Look at Object Storage: A reference arrow now connects Node 10 directly to Node 20, forming a Linked List chain.",
    actionButtonLabel: "Continue",
    selector: "#onboarding-memory-view",
    placement: "center",
  },
  {
    expectedLessonStep: 4,
    subPhase: "run",
    title: "Read a value out of a node",
    lineNumber: 6,
    codeSnippet: "int val = head.val;",
    explanationText:
      "Line 6 follows head to its Node, reads the number in the val field, and copies that number into a new variable called val on the Stack.",
    actionButtonLabel: "Run line 6",
    selector: PRIMARY_BUTTON_SELECTOR,
    placement: "right",
  },
  {
    expectedLessonStep: 4,
    subPhase: "observe",
    title: "Lesson complete!",
    blueprintNote: {
      linesCode: "class Node { int val; Node next; }",
      linesWhy: "This blueprint defined what each Node contains: a number (val) and a pointer to another Node (next).",
    },
    explanationText:
      "You have traced every line of this program from start to finish! You can now edit the code or reset to practice again.",
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
  onPrimaryAction,
  primaryActionLabel,
}: InteractiveWalkthroughProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number; side: GuideSide } | null>(null);
  const [justAdvanced, setJustAdvanced] = useState<boolean>(false);
  const previousKeyRef = useRef<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  /* No narration for this example means no guide at all. */
  const steps = isCustomCode ? undefined : WALKTHROUGH_CONTENT[presetId];

  const currentIndex = (steps ?? []).findIndex(
    (step) =>
      step.expectedLessonStep === currentLessonStep &&
      step.subPhase === (lessonPhase === "result" ? "observe" : "run"),
  );

  const activeStepData =
    steps && (lessonPhase === "ready" || lessonPhase === "result")
      ? (currentIndex >= 0 ? steps[currentIndex] : null)
      : null;

  const visible = isActive && !!activeStepData;
  const stepKey = activeStepData ? `${activeStepData.expectedLessonStep}-${activeStepData.subPhase}` : null;

  const targetRect = useTargetRect(visible && activeStepData ? activeStepData.selector : null, visible);

  /* Confirmation state. The card is driven by app state, so the only proof
   * that a click registered is the card itself moving on. Flagging the arrival
   * makes that visible instead of leaving the participant guessing. */
  useEffect(() => {
    if (!stepKey) return;
    const previous = previousKeyRef.current;
    previousKeyRef.current = stepKey;
    if (previous === null || previous === stepKey) return;

    setJustAdvanced(true);
    const timeout = setTimeout(() => setJustAdvanced(false), 2600);
    return () => clearTimeout(timeout);
  }, [stepKey]);

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

      if (activeStepData?.subPhase === "observe" && live) {
        const margin = 16;
        const visibleBottom = Math.min(live.bottom, window.innerHeight);
        setPlacement({
          top: Math.max(
            margin,
            Math.min(
              visibleBottom - cardHeight - margin,
              window.innerHeight - cardHeight - margin,
            ),
          ),
          left: Math.max(
            margin,
            Math.min(
              window.innerWidth - cardWidth - margin,
              live.left + (live.width - cardWidth) / 2,
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
   * anywhere. Once they have moved it we stop auto-placing and keep their
   * position for the rest of the lesson, since re-snapping every step would
   * undo the move they just made on purpose.
   */
  const [dragPos, setDragPos] = useState<{ top: number; left: number } | null>(null);
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
      setDragPos(
        clampToViewport(event.clientY - origin.dy, event.clientX - origin.dx),
      );
    },
    [clampToViewport],
  );

  const handleDragEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current) return;
    dragOriginRef.current = null;
    cardRef.current?.releasePointerCapture(event.pointerId);
  }, []);

  // Keep a dragged card on screen when the window is resized.
  useEffect(() => {
    if (!dragPos) return;
    const onResize = () => setDragPos((p) => (p ? clampToViewport(p.top, p.left) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dragPos, clampToViewport]);

  const runPrimaryAction = useCallback(() => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }
    const button = document.querySelector<HTMLButtonElement>(PRIMARY_BUTTON_SELECTOR);
    button?.click();
  }, [onPrimaryAction]);

  /*
   * Back drives the real previous-step control the same way the action button
   * drives the real primary control, so the lesson state stays the single
   * source of truth and the card cannot drift out of sync with the workspace.
   */
  const runBackAction = useCallback(() => {
    if (onStepBack) {
      onStepBack();
      return;
    }
    const button = document.querySelector<HTMLButtonElement>(BACK_BUTTON_SELECTOR);
    button?.click();
  }, [onStepBack]);

  if (typeof document === "undefined" || !isActive || !activeStepData) return null;

  const stepNumber = activeStepData.expectedLessonStep;
  const isObserve = activeStepData.subPhase === "observe";
  const isFinalCard = stepNumber === TOTAL_LESSON_STEPS && isObserve;
  const isFirstCard = stepNumber === 1 && !isObserve;
  const buttonLabel = activeStepData.actionButtonLabel || primaryActionLabel || "Continue";
  const guideActionLabel = isObserve ? buttonLabel : `${buttonLabel} now`;

  return createPortal(
    <>
      <GuideSpotlight
        target={targetRect}
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
          className={`fixed overflow-y-auto panel-scroll rounded-lg border pointer-events-auto ${isObserve ? "py-3 px-4" : "py-4 px-4"}`}
          role="dialog"
          aria-label={`Lesson guide, step ${stepNumber} of ${TOTAL_LESSON_STEPS}: ${activeStepData.title}. Drag to move.`}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          style={{
            cursor: "grab",
            touchAction: "none",
            top: dragPos?.top ?? placement?.top ?? 0,
            left: dragPos?.left ?? placement?.left ?? 0,
            width: `min(${isObserve ? OBSERVE_CARD_WIDTH : CARD_WIDTH}px, calc(100vw - 32px))`,
            maxHeight: "min(60vh, 420px)",
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            boxShadow: "0 16px 36px rgba(23, 32, 51, 0.18)",
          }}
        >
          {/* Header with Top-Right Back Button */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: "var(--accent)" }}>
              Step {stepNumber} of {TOTAL_LESSON_STEPS} &middot; {isObserve ? "Look at what changed" : "Run the line"}
            </span>

          </div>

          {justAdvanced && !isObserve && (
            <div
              className="mb-3 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold"
              style={{ color: "var(--success)", background: "#e7f3ee", borderColor: "#b8dccf" }}
              role="status"
            >
              <CheckCircle2 size={13} className="flex-shrink-0" aria-hidden="true" />
              <span>{isObserve ? "That line ran. Here is what changed." : "Nice. On to the next line."}</span>
            </div>
          )}

          <h4 className="text-[15px] font-bold mb-2.5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            {isFinalCard && <CheckCircle2 size={16} className="text-[#16a34a] flex-shrink-0" aria-hidden="true" />}
            {activeStepData.title}
          </h4>

          {!isObserve && activeStepData.setupNote && (
            <div className="mb-3 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-1.5">
                <HelpCircle size={12} aria-hidden="true" />
                <span>Lines 1 and 2 first</span>
              </div>
              <div className="mb-2">
                <JavaSyntax code={activeStepData.setupNote.line1Code} className="font-mono text-[11px] block" />
                <span className="text-slate-300 text-[10.5px] block leading-tight mt-0.5">{activeStepData.setupNote.line1Why}</span>
              </div>
              <div>
                <JavaSyntax code={activeStepData.setupNote.line2Code} className="font-mono text-[11px] block" />
                <span className="text-slate-300 text-[10.5px] block leading-tight mt-0.5">{activeStepData.setupNote.line2Why}</span>
              </div>
            </div>
          )}

          {!isObserve && activeStepData.lineNumber && activeStepData.codeSnippet && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-1">
                <Code2 size={13} aria-hidden="true" />
                <span>Line {activeStepData.lineNumber}</span>
              </div>
                <div className="px-3 py-2 rounded-md bg-slate-950 border border-[#16a34a]/30 font-mono text-[12px] overflow-x-auto shadow-inner">
                <JavaSyntax code={activeStepData.codeSnippet} />
              </div>
            </div>
          )}

          {!isObserve && activeStepData.blueprintNote && (
            <div className="mb-3 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#16a34a] font-bold uppercase tracking-wider mb-1">
                <HelpCircle size={12} aria-hidden="true" />
                <span>The Node blueprint</span>
              </div>
              <JavaSyntax code={activeStepData.blueprintNote.linesCode} className="font-mono text-[11px] block" />
              <span className="text-slate-300 text-[10.5px] block leading-tight mt-0.5">{activeStepData.blueprintNote.linesWhy}</span>
            </div>
          )}

          <p className="text-[11.5px] leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
            {activeStepData.explanationText}
          </p>

          {/*
            Back sits beside the action rather than in the footer so both ways
            of moving through the lesson are in the same place. It is hidden on
            the very first card, where the workspace back control is disabled
            and pressing it would do nothing.
          */}
          <div className="flex items-stretch gap-2">
            {!isFirstCard && (
              <button
                type="button"
                onClick={runBackAction}
                className="walkthrough-back-button flex items-center gap-1 rounded-md border px-2.5 py-2 text-[11.5px] font-semibold flex-shrink-0"
                style={{
                  color: "var(--text-secondary)",
                  background: "var(--bg-panel-2)",
                  borderColor: "var(--border)",
                  cursor: "pointer",
                }}
                aria-label="Go back one step in the lesson"
              >
                <ChevronLeft size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={runPrimaryAction}
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
              aria-label={`Lesson progress, step ${stepNumber} of ${TOTAL_LESSON_STEPS}`}
            >
              {Array.from({ length: TOTAL_LESSON_STEPS }, (_, index) => {
                const step = index + 1;
                return (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step === stepNumber
                        ? "w-6 bg-emerald-500"
                        : step < stepNumber
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
