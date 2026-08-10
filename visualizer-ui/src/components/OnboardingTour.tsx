"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    content: "This row shows the four Java concepts you will complete. The highlighted section is your current step.",
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
    title: "Inspect Java's memory",
    content: "Variables appear on the left and objects appear on the right. Items are marked after they change.",
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
}

const CARD_WIDTH = 360;

export default function OnboardingTour({ isOpen, onClose, onStartWalkthrough }: OnboardingTourProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [placement, setPlacement] = useState<{ top: number; left: number; side: GuideSide } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const step = STEPS[activeStep];
  const targetRect = useTargetRect(isOpen ? step.selector : null, isOpen);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const reposition = () => {
      const cardHeight = cardRef.current?.offsetHeight ?? 230;
      setPlacement(placeGuideCard({
        target: targetRect,
        cardWidth: CARD_WIDTH,
        cardHeight,
        preferred: step.placement,
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
  }, [isOpen, step.placement, targetRect]);

  const finishTour = () => {
    onClose();
    setActiveStep(0);
    onStartWalkthrough?.();
  };

  if (!isOpen || typeof document === "undefined") return null;

  const isFirst = activeStep === 0;
  const isLast = activeStep === STEPS.length - 1;

  return createPortal(
    <>
      <GuideSpotlight
        target={targetRect}
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
          className="fixed w-[min(360px,calc(100vw-32px))] rounded-lg border px-5 py-4 shadow-lg pointer-events-auto"
          style={{
            top: placement?.top ?? 0,
            left: placement?.left ?? 0,
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            boxShadow: "0 16px 36px rgba(23, 32, 51, 0.18)",
          }}
          role="dialog"
          aria-label={`Lesson orientation ${activeStep + 1} of ${STEPS.length}: ${step.title}`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
              Lesson guide - {activeStep + 1} of {STEPS.length}
            </p>
            {!isFirst && (
              <button
                type="button"
                onClick={() => setActiveStep((current) => current - 1)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 shadow-sm"
                title="Go back to previous step"
              >
                <ChevronLeft size={13} aria-hidden="true" />
                <span>Back</span>
              </button>
            )}
          </div>
          <h2 className="mb-2 text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>{step.title}</h2>
          <p className="mb-5 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.content}</p>

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
                  onClick={() => setActiveStep((current) => current - 1)}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[12px] font-semibold"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--border)", background: "var(--bg-panel-2)" }}
                >
                  <ChevronLeft size={14} aria-hidden="true" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={isLast ? finishTour : () => setActiveStep((current) => current + 1)}
                className="inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-[12px] font-bold text-white"
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
