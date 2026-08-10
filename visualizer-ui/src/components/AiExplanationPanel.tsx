"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import GeminiLogo from "@/components/icons/GeminiLogo";
import type { BananaDiagram } from "@/types/visualizer";

interface AiExplanationPanelProps {
  explanation: string;
  diagram: BananaDiagram;
  currentStep: number;
  totalSteps: number;
  showResult: boolean;
  readyPrompt: string;
  whyItMatters: string;
}

export default function AiExplanationPanel({
  explanation,
  diagram,
  currentStep,
  totalSteps,
  showResult,
  readyPrompt,
  whyItMatters,
}: AiExplanationPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  /* Visible by default. The ready-state guidance in this panel is the only place
   * that tells a participant what to look for before they run a line, so hiding it
   * until after the run would withhold the instruction they need. Collapsing stays
   * available as a manual choice and is remembered across steps. */
  const [isCollapsed, setIsCollapsed] = useState(false);

  const runStateLabel = showResult ? "Line executed" : "Ready to run";
  const runStateCopy = showResult
    ? "This line has run. The change is marked in the memory view."
    : "This line has not run yet.";

  return (
    <section
      id="onboarding-tutor-panel"
      className="explanation-panel"
      aria-labelledby="step-explanation-title"
    >
      <style>{`
        .explanation-result-reveal { animation: explanationResultReveal 900ms ease-out 1; }
        @keyframes explanationResultReveal {
          0%   { background-color: rgba(16, 185, 129, 0.14); }
          100% { background-color: transparent; }
        }
        @media (prefers-reduced-motion: reduce) {
          .explanation-result-reveal { animation: none; }
        }
      `}</style>

      <div className="explanation-heading flex items-center justify-between px-3.5 py-1 border-b border-[var(--border)] bg-[var(--bg-panel)]">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setIsCollapsed((prev) => !prev)}
        >
          <GeminiLogo size={14} className="text-[var(--accent)]" />
          <h2 id="step-explanation-title" className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            Step Explanation
            {/* Only surfaced while collapsed, so the run state is stated exactly once on screen. */}
            {isCollapsed && (
              <span className="text-[10px] font-normal" style={{ color: "var(--text-secondary)" }}>{runStateLabel}</span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <button
              type="button"
              className="explain-more-button text-[10px] py-0.5 px-2"
              onClick={() => setDetailsOpen((open) => !open)}
              aria-expanded={detailsOpen}
              aria-controls="step-explanation-details"
            >
              <Info size={12} aria-hidden="true" />
              Explain More
              <ChevronDown size={12} className={detailsOpen ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all"
            style={{ color: "var(--text-secondary)", borderColor: "var(--border)", background: "var(--bg-panel-2)" }}
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? "Expand Step Explanation" : "Collapse Step Explanation"}
            title={isCollapsed ? "Expand Step Explanation" : "Collapse Step Explanation"}
          >
            <span className="text-[10px] font-medium">{isCollapsed ? "Show" : "Hide"}</span>
            {isCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        /* Keyed so the reveal animation replays each time a line runs. It is one
         * short fade, well under 3Hz, and disabled under reduced motion. */
        <div
          key={`${currentStep}-${showResult}`}
          className={`explanation-grid${showResult ? " explanation-result-reveal" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="explanation-item py-1.5 px-3.5">
            <span className="explanation-label text-[9.5px] uppercase font-mono tracking-wider font-bold block mb-0.5">
              {runStateLabel}
            </span>
            <p className="explanation-copy text-[11px] leading-snug">
              {runStateCopy}
            </p>
          </div>

          <div className="explanation-item py-1.5 px-3.5">
            <span className="explanation-label text-[9.5px] uppercase font-mono tracking-wider font-bold block mb-0.5">
              {showResult ? "What changed" : "What to watch"}
            </span>
            <p className="explanation-copy text-[11px] leading-snug">
              {showResult ? explanation : readyPrompt}
            </p>
          </div>

          <div className="explanation-item py-1.5 px-3.5">
            <span className="explanation-label text-[9.5px] uppercase font-mono tracking-wider font-bold block mb-0.5">
              {showResult ? "Why it matters" : "Your task"}
            </span>
            <p className="explanation-copy text-[11px] leading-snug">
              {showResult
                ? whyItMatters
                : "Read the highlighted line, then press Run This Line and look for the change described above."}
            </p>
          </div>
        </div>
      )}

      {!isCollapsed && detailsOpen && (
        <div id="step-explanation-details" className="explanation-details">
          <strong>{diagram.title}</strong>
          <span>{diagram.description}</span>
        </div>
      )}

      <span className="sr-only">
        Lesson step {currentStep} of {totalSteps}. {showResult ? "Line executed." : "Line ready to run."}
      </span>
    </section>
  );
}
