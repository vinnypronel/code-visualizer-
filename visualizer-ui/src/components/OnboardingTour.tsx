"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface TourStep {
  title: string;
  content: string;
  selector: string;
  placement: "right" | "left" | "top" | "bottom" | "center";
}

const steps: TourStep[] = [
  {
    title: "Java Code Editor",
    content: "Start by reading this code. As you step forward, one line is highlighted so you can see exactly what is running.",
    selector: "#onboarding-editor-panel",
    placement: "right",
  },
  {
    title: "Stack",
    content: "This side shows local variables for the current method. Think of it as the work area for the line that is running now.",
    selector: "#onboarding-stack-zone",
    placement: "right",
  },
  {
    title: "Heap",
    content: "Objects created with new appear here. Reference variables point from the Stack to objects in this storage area.",
    selector: "#onboarding-heap-zone",
    placement: "left",
  },
  {
    title: "Gemini CS Tutor",
    content: "Read this when a step feels confusing. It explains the current line in simpler language.",
    selector: "#onboarding-tutor-panel",
    placement: "left",
  },
  {
    title: "Playback Controls",
    content: "Use the right arrow to move one step at a time. Use Run & Visualize only when you want the trace to play by itself.",
    selector: "#onboarding-playback-controls",
    placement: "top",
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 150, left: 420 });

  // Handle Spotlight Highlight Effect
  useEffect(() => {
    if (!isOpen) return;

    const stepData = steps[activeStep];
    const el = document.querySelector(stepData.selector);

    if (el) {
      el.classList.add("onboarding-highlight");
    }

    return () => {
      if (el) {
        el.classList.remove("onboarding-highlight");
      }
    };
  }, [activeStep, isOpen]);

  // Handle Tooltip Positioning
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const stepData = steps[activeStep];
      const el = document.querySelector(stepData.selector);

      if (el) {
        const rect = el.getBoundingClientRect();
        const tooltipWidth = 360;
        const tooltipHeight = 220;
        const gap = 18;
        let top = 0;
        let left = 0;

        if (stepData.placement === "right") {
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
          if (left + tooltipWidth > window.innerWidth - 16) {
            left = rect.left - tooltipWidth - gap;
          }
        } else if (stepData.placement === "left") {
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - gap;
          if (left < 16) {
            left = rect.right + gap;
          }
        } else if (stepData.placement === "bottom") {
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          if (top + tooltipHeight > window.innerHeight - 16) {
            top = rect.top - tooltipHeight - gap;
          }
        } else if (stepData.placement === "top") {
          top = rect.top - tooltipHeight - gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          if (top < 16) {
            top = rect.bottom + gap;
          }
        }

        left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));
        top = Math.max(70, Math.min(window.innerHeight - tooltipHeight - 16, top));

        setTooltipPos({ top, left });
      } else {
        // Fallback to screen center
        setTooltipPos({
          top: window.innerHeight / 2 - 122,
          left: window.innerWidth / 2 - 180,
        });
      }
    };

    updatePosition();
    // Add small delay to let DOM adjust if needed
    const timeout = setTimeout(updatePosition, 100);

    window.addEventListener("resize", updatePosition);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", updatePosition);
    };
  }, [activeStep, isOpen]);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onClose();
    setActiveStep(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {/* Background dimmer layer */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] pointer-events-auto"
        onClick={handleComplete}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute z-[100] w-[360px] rounded-xl border border-white/10 py-5 px-5 shadow-2xl pointer-events-auto"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            background: "rgba(15, 17, 26, 0.95)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-violet-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Learning Screen Walkthrough</span>
            </div>
            <button
              onClick={handleComplete}
              className="text-slate-500 hover:text-slate-200 p-1 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Title */}
          <h4 className="text-lg font-bold text-slate-100 mb-3">
            {steps[activeStep].title}
          </h4>

          {/* Body */}
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            {steps[activeStep].content}
          </p>

          {/* Footer controls */}
          <div className="flex items-center justify-between">
            {/* Step indicators */}
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeStep ? "w-6 bg-blue-500" : "w-1.5 bg-slate-800"
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2.5">
              {activeStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="px-3.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Skip
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 py-1.5 text-xs rounded font-bold text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                style={{
                  background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
                }}
              >
                <span>{activeStep === steps.length - 1 ? "Finish" : "Next"}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
