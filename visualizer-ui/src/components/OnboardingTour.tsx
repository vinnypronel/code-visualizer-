"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGuideScale } from "@/lib/guideScale";
import { guideArrowDirection } from "@/lib/guideKeys";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, EyeOff, GripHorizontal } from "lucide-react";
import GuideSpotlight, {
  placeGuideCard,
  usePrefersReducedMotion,
  useTargetRect,
  type GuideSide,
} from "@/components/guide/GuideSpotlight";

interface TourStep {
  title: string;
  content: string;
  selector: string;
  placement: GuideSide;
}

const STEPS: TourStep[] = [
  {
    title: "Follow the lesson path",
    content: "This row shows the Java concepts you will complete in this lesson. The highlighted section is your current step.",
    selector: "#onboarding-lesson-progress",
    placement: "bottom",
  },
  {
    title: "Read the highlighted line",
    content: "Focus on the highlighted Java line. Only that line will run during the current lesson step.",
    selector: "#onboarding-editor-panel",
    placement: "right",
  },
  {
    title: "Know what to watch",
    content: "Before you run the line, this explanation tells you which memory change to look for.",
    selector: "#onboarding-tutor-panel",
    placement: "top",
  },
  {
    title: "Meet the Visualization Workbench",
    content: "The entire section to the right of the Java code is the Visualization Workbench. It shows Stack variables on the left, Objects on the right, and marks what changes after each line runs.",
    selector: "#onboarding-memory-view",
    placement: "left",
  },
  {
    title: "Run one line at a time",
    content: "Use Run This Line to execute the highlighted code. The required lesson guide will then show you exactly what changed.",
    selector: "#onboarding-playback-controls",
    placement: "right",
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWalkthrough?: () => void;
  onHideGuide?: () => void;
  initialStep?: number;
}

const CARD_WIDTH = 360;

export default function OnboardingTour({ isOpen, onClose, onStartWalkthrough, onHideGuide, initialStep = 0 }: OnboardingTourProps) {
  const [activeStep, setActiveStep] = useState(() => Math.max(0, Math.min(STEPS.length - 1, initialStep)));
  const [placement, setPlacement] = useState<{ top: number; left: number; side: GuideSide } | null>(null);
  const [dragPos, setDragPos] = useState<{ top: number; left: number } | null>(null);
  /*
   * A single primer shown once, before the orientation steps, so nobody has to
   * work out how to drive the guide while also reading it.
   */
  const [introDismissed, setIntroDismissed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef<{ dx: number; dy: number } | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const guideScale = useGuideScale();
  const step = STEPS[activeStep];
  const targetRect = useTargetRect(isOpen ? step.selector : null, isOpen);
  const devJumpRect = useTargetRect(isOpen ? "#dev-jump-panel" : null, isOpen);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const reposition = () => {
      /*
       * Rect, not offset*: the card is zoomed on large monitors, so the offset
       * properties report the unscaled size and placement would let the card
       * run off the bottom of the screen.
       */
      const cardBox = cardRef.current?.getBoundingClientRect();
      const cardHeight = cardBox?.height ?? 230 * guideScale;
      const cardWidth = cardBox?.width ?? CARD_WIDTH * guideScale;

      /*
       * The highlighted-line card belongs beside the editor but should leave
       * the source visible. Anchor it just inside the memory area and align it
       * to the bottom of the viewport, matching the position students found
       * most useful when moving it themselves.
       */
      if (activeStep === 1 && targetRect) {
        const margin = 24;
        const desiredLeft = targetRect.left + targetRect.width + 19;
        const roomOnRight = desiredLeft + cardWidth <= window.innerWidth - margin;
        if (roomOnRight) {
          setPlacement({
            top: Math.max(margin, window.innerHeight - cardHeight - 84),
            left: desiredLeft,
            side: "right",
          });
          return;
        }
      }

      /* The explanation card reads best centered above the explanation panel,
       * with enough separation for the downward pointer to remain obvious. */
      if (activeStep === 2 && targetRect) {
        const margin = 24;
        const left = Math.max(
          margin,
          Math.min(
            window.innerWidth - cardWidth - margin,
            (window.innerWidth - cardWidth) / 2 + 16,
          ),
        );
        const desiredTop = targetRect.top - cardHeight - 74;
        setPlacement({
          top: Math.max(margin, desiredTop),
          left,
          side: "top",
        });
        return;
      }

      /* The memory overview belongs in the open middle of the code pane so it
       * can point toward Stack and Objects without covering either one. */
      if (activeStep === 3 && targetRect) {
        const margin = 24;
        const editorWidth = targetRect.left;
        const left = Math.max(margin, (editorWidth - cardWidth) / 2);
        const desiredTop = targetRect.top + (targetRect.height - cardHeight) / 2 - 16;
        setPlacement({
          top: Math.max(margin, Math.min(window.innerHeight - cardHeight - margin, desiredTop)),
          left,
          side: "left",
        });
        return;
      }

      /* The final orientation card sits to the right of Run This Line. Keeping
       * the control near the lower third of the card makes the relationship
       * clear without covering the button students are about to use. */
      if (activeStep === 4 && targetRect) {
        const margin = 24;
        const desiredLeft = targetRect.left + targetRect.width + 72;
        const desiredTop = targetRect.top - cardHeight * 0.66;
        setPlacement({
          top: Math.max(margin, Math.min(window.innerHeight - cardHeight - margin, desiredTop)),
          left: Math.max(
            margin,
            Math.min(window.innerWidth - cardWidth - margin, desiredLeft),
          ),
          side: "right",
        });
        return;
      }

      setPlacement(placeGuideCard({
        target: targetRect,
        cardWidth,
        cardHeight,
        preferred: step.placement,
        gap: activeStep === 0 ? 66 : undefined,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
    };

    reposition();
    const observer = cardRef.current ? new ResizeObserver(reposition) : null;
    if (observer && cardRef.current) observer.observe(cardRef.current);
    window.addEventListener("resize", reposition);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reposition);
    };
  }, [activeStep, guideScale, isOpen, step.placement, targetRect]);

  const clampToViewport = useCallback((top: number, left: number) => {
    const box = cardRef.current?.getBoundingClientRect();
    const width = box?.width ?? CARD_WIDTH * guideScale;
    const height = box?.height ?? 230 * guideScale;
    const margin = 8;
    return {
      top: Math.max(margin, Math.min(window.innerHeight - height - margin, top)),
      left: Math.max(margin, Math.min(window.innerWidth - width - margin, left)),
    };
  }, [guideScale]);

  const handleDragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragOriginRef.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
    };
    card.setPointerCapture(event.pointerId);
  }, []);

  const handleDragMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    event.preventDefault();
    setDragPos(clampToViewport(event.clientY - origin.dy, event.clientX - origin.dx));
  }, [clampToViewport]);

  const handleDragEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current) return;
    dragOriginRef.current = null;
    cardRef.current?.releasePointerCapture(event.pointerId);
  }, []);

  useEffect(() => {
    if (!dragPos) return;
    const onResize = () => setDragPos((position) => (
      position ? clampToViewport(position.top, position.left) : position
    ));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dragPos, clampToViewport]);

  // Card 2 explicitly teaches students to read the next executable line, so
  // give that line the same strong treatment used by the required walkthrough.
  useEffect(() => {
    if (!isOpen || activeStep !== 1) return;
    document.body.classList.add("onboarding-editor-line-focus");
    return () => document.body.classList.remove("onboarding-editor-line-focus");
  }, [isOpen, activeStep]);

  const finishTour = () => {
    onClose();
    setActiveStep(0);
    onStartWalkthrough?.();
  };

  const hideGuide = () => {
    onClose();
    onHideGuide?.();
  };

  const moveToStep = (nextStep: number) => {
    setDragPos(null);
    setActiveStep(Math.max(0, Math.min(STEPS.length - 1, nextStep)));
  };

  /* Left and right arrows step the orientation guide. */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = guideArrowDirection(event);
      if (!direction) return;
      event.preventDefault();
      if (!introDismissed) {
        if (direction === "next") setIntroDismissed(true);
        return;
      }
      if (direction === "back") {
        moveToStep(activeStep - 1);
        return;
      }
      if (activeStep === STEPS.length - 1) finishTour();
      else moveToStep(activeStep + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!isOpen || typeof document === "undefined") return null;

  if (!introDismissed) {
    return createPortal(
      <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-slate-900/40 px-4">
        <div
          className="w-[min(560px,calc(100vw-32px))] rounded-xl border px-6 py-6 sm:px-9 sm:py-8 shadow-xl"
          style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}
          role="dialog"
          aria-modal="true"
          aria-label="How to use the lesson guide"
        >
          <p
            className="text-[12px] font-mono font-bold uppercase tracking-wider"
            style={{ color: "var(--accent)" }}
          >
            Before you start
          </p>
          <h2 className="mb-3 mt-1.5 text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
            How to use the lesson guide
          </h2>
          <p className="text-[14.5px] leading-[1.75]" style={{ color: "#000000" }}>
            A small guide card will walk you through this lesson one step at a time.
            Click <strong>Next</strong> to move forward and <strong>Back</strong> to
            revisit the previous step. You can also press the <strong>left and right
            arrow keys</strong> to move between steps.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
            <div
              className="flex items-center gap-1.5"
              aria-label="Use the left and right arrow keys to move between steps"
            >
              <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#000000" }}>
                Navigate
              </span>
              {(["←", "→"] as const).map((arrow) => (
                <kbd
                  key={arrow}
                  className="flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-mono text-base font-bold shadow-sm"
                  style={{
                    background: "var(--bg-panel-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {arrow}
                </kbd>
              ))}
            </div>
            <div className="flex items-center gap-2 self-end">
              <button
                type="button"
                onClick={hideGuide}
                className="guide-hide-button guide-hide-footer-button"
              >
                <EyeOff size={13} aria-hidden="true" />
                <span>Hide Guide</span>
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setIntroDismissed(true)}
                className="btn-primary self-end text-sm py-3 px-8"
              >
                <span>Got it, start the guide</span>
                {/* btn-primary's hover animation is driven by this arrow child. */}
                <svg
                  className="btn-arrow"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const isFirst = activeStep === 0;
  const isLast = activeStep === STEPS.length - 1;

  return createPortal(
    <>
      <GuideSpotlight
        target={targetRect}
        additionalTargets={[devJumpRect]}
        side={placement?.side ?? "center"}
        reducedMotion={reducedMotion}
      />

      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2147483000, isolation: "isolate" }}>
        <motion.div
          ref={cardRef}
          key={activeStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: placement ? 1 : 0, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          className="fixed rounded-lg border px-5 py-4 shadow-lg pointer-events-auto"
          style={{
            zoom: guideScale,
            width: `min(360px, calc((100vw / ${guideScale}) - 32px))`,
            top: (dragPos?.top ?? placement?.top ?? 0) / guideScale,
            left: (dragPos?.left ?? placement?.left ?? 0) / guideScale,
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            boxShadow: "0 16px 36px rgba(23, 32, 51, 0.18)",
          }}
          role="dialog"
          aria-label={`Lesson orientation ${activeStep + 1} of ${STEPS.length}: ${step.title}`}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Lesson guide - {activeStep + 1} of {STEPS.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={hideGuide}
                className="guide-hide-button guide-hide-footer-button"
              >
                <EyeOff size={13} aria-hidden="true" />
                <span>Hide Guide</span>
              </button>
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => moveToStep(activeStep - 1)}
                  className="guide-nav-btn guide-nav-back text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-0.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 shadow-sm"
                  title="Go back to previous step"
                >
                  <ChevronLeft size={13} aria-hidden="true" />
                  <span>Back</span>
                </button>
              )}
              <div
                className="guide-drag-handle"
                onPointerDown={handleDragStart}
                title="Drag guide"
                aria-label="Drag lesson guide"
                role="button"
              >
                <GripHorizontal size={16} aria-hidden="true" />
              </div>
            </div>
          </div>
          <h2 className="mb-2 text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>{step.title}</h2>
          <p className="mb-5 text-[13px] leading-relaxed" style={{ color: "#000000" }}>{step.content}</p>

          <div className="flex items-center justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex gap-1.5" aria-label={`Orientation progress: ${activeStep + 1} of ${STEPS.length}`}>
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: index === activeStep ? 24 : 6,
                    background: index <= activeStep ? "var(--accent)" : "var(--border)",
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => moveToStep(activeStep - 1)}
                  className="guide-nav-btn guide-nav-back border px-3 py-1.5 text-[12px] font-semibold"
                  style={{ color: "#000000", borderColor: "var(--border)", background: "var(--bg-panel-2)" }}
                >
                  <ChevronLeft size={14} aria-hidden="true" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={isLast ? finishTour : () => moveToStep(activeStep + 1)}
                className="guide-nav-btn guide-nav-next px-4 py-1.5 text-[12px] font-bold text-white"
                style={{ background: "var(--action)" }}
              >
                {isLast ? "Start lesson" : "Next"} <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body,
  );
}
