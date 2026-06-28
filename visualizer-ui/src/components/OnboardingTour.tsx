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
    content: "Here is your Java code. We've preloaded a common example to help you visualize memory. You can edit this code dynamically or choose a preset!",
    selector: "#onboarding-editor-panel",
    placement: "right",
  },
  {
    title: "The Stack & Heap",
    content: "This is your computer's memory bank. As code runs, local variable cards will appear on the Stack workbench (left), and objects/arrays will grow in the Heap storage room (right).",
    selector: "#onboarding-memory-view",
    placement: "bottom",
  },
  {
    title: "Gemini CS Tutor",
    content: "Your AI coach will explain exactly what is happening in plain English at every single step. Look here to understand the physical analogies of the code execution.",
    selector: "#onboarding-tutor-panel",
    placement: "left",
  },
  {
    title: "Playback Controls",
    content: "Ready to start? Click this flashing Next Step button to run the very first line of code and watch memory update in real time!",
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
        let top = 0;
        let left = 0;

        if (stepData.placement === "right") {
          top = rect.top + rect.height / 2 - 170;
          left = rect.right + 24;
        } else if (stepData.placement === "left") {
          top = rect.top + rect.height / 2 - 170;
          left = rect.left - 664; // 640 width + 24 gap
        } else if (stepData.placement === "bottom") {
          top = rect.bottom - 360; // place inside bounds but floating lower
          left = rect.left + rect.width / 2 - 320; // centered: 640 / 2
        } else if (stepData.placement === "top") {
          top = rect.top - 360;
          left = rect.left + rect.width / 2 - 320; // centered: 640 / 2
        }

        // Clamp screen boundaries for a 640px wide tooltip
        left = Math.max(20, Math.min(window.innerWidth - 660, left));
        top = Math.max(70, Math.min(window.innerHeight - 380, top));

        setTooltipPos({ top, left });
      } else {
        // Fallback to screen center
        setTooltipPos({
          top: window.innerHeight / 2 - 180,
          left: window.innerWidth / 2 - 320,
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
    localStorage.setItem("has_seen_onboarding", "true");
    onClose();
    setActiveStep(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Background dimmer layer */}
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] pointer-events-auto" onClick={handleComplete} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute w-[640px] rounded-3xl border border-white/10 py-14 px-10 shadow-2xl pointer-events-auto"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            background: "rgba(15, 17, 26, 0.85)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center text-violet-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Guided Tour</span>
            </div>
            <button
              onClick={handleComplete}
              className="text-slate-500 hover:text-slate-200 p-1 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Title */}
          <h4 className="text-2xl font-bold text-slate-100 mb-5">
            {steps[activeStep].title}
          </h4>

          {/* Body */}
          <p className="text-base text-slate-400 leading-relaxed mb-10">
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
