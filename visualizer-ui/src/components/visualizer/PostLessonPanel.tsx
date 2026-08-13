"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Pencil, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

/*
 * Post-lesson options shown after every required line has run.
 *
 * This panel is opened from the final required walkthrough card, after every
 * required line has run. It can also be reused anywhere post-lesson tools are
 * needed without duplicating their behavior.
 */

export interface PostLessonExample {
  id: string;
  name: string;
}

interface PostLessonPanelProps {
  examples: PostLessonExample[];
  activeExampleId: string;
  onLoadExample: (id: string) => void;
  showHeading?: boolean;
}

const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "16px 18px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--bg-panel)",
  textAlign: "left",
};

function PostLessonExampleDropdown({
  examples,
  value,
  onChange,
}: {
  examples: PostLessonExample[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const selected = examples.find((example) => example.id === value) ?? examples[0];

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        className={`post-lesson-example-select-button ${isOpen ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate">{selected?.name ?? "Choose an example"}</span>
        <ChevronDown
          size={15}
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#0284c7]" : "text-slate-500"}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <motion.div
          className="post-lesson-example-menu"
          role="listbox"
          aria-label="Choose another example to load"
          initial={reduceMotion ? false : { opacity: 0, y: -7, scaleY: 0.94, clipPath: "inset(0 0 100% 0)" }}
          animate={{ opacity: 1, y: 0, scaleY: 1, clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "top center" }}
        >
          {examples.map((example) => {
            const isSelected = example.id === value;
            return (
              <button
                key={example.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`post-lesson-example-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(example.id);
                  setIsOpen(false);
                }}
              >
                <span>{example.name}</span>
                {isSelected && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

export default function PostLessonPanel({
  examples,
  activeExampleId,
  onLoadExample,
  showHeading = true,
}: PostLessonPanelProps) {
  const otherExamples = examples.filter((example) => example.id !== activeExampleId);
  const [choice, setChoice] = useState<string>(otherExamples[0]?.id ?? activeExampleId);

  return (
    <div
      style={{
        width: "min(620px, 100%)",
        display: "grid",
        gap: 14,
        marginTop: 4,
        textAlign: "left",
      }}
    >
      {showHeading && (
        <h2
          style={{
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Want to keep exploring?
        </h2>
      )}

      <div
        style={{
          ...cardStyle,
          gap: 8,
          padding: "13px 18px",
        }}
      >
        <h3 style={{ color: "var(--text-primary)", fontSize: 13.5, fontWeight: 700 }}>
          Try a different example
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 12.5, lineHeight: 1.5 }}>
          Pick another program and step through it the same way. It opens right here, at step 1.
        </p>
        <div className="post-lesson-example-row">
          <div className="lesson-example-select" style={{ margin: 0 }}>
            <span>Example</span>
            <PostLessonExampleDropdown
              examples={otherExamples}
              value={choice}
              onChange={setChoice}
            />
          </div>
          <button
            type="button"
            className="btn-primary post-lesson-load-button"
            onClick={() => onLoadExample(choice)}
            disabled={otherExamples.length === 0}
          >
            <Play size={15} aria-hidden="true" />
            <span>Load example</span>
            <ArrowRight className="btn-arrow" size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ color: "var(--text-primary)", fontSize: 13.5, fontWeight: 700 }}>
          Edit the code and run it
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 12.5, lineHeight: 1.6 }}>
          This is a feature for the future and will be included for our full user study after our pilot study. In the future, you will be able to edit the Java code directly, compile it, and trace your own custom program step by step in memory.
        </p>
        <div className="relative inline-flex items-center">
          <div className="group relative inline-flex items-center">
            <button
              type="button"
              className="btn-ghost cursor-not-allowed opacity-60 flex items-center gap-1.5"
              disabled
              aria-describedby="edit-code-coming-soon"
            >
              <Pencil size={15} aria-hidden="true" />
              <span>Edit the code</span>
            </button>
            <span
              id="edit-code-coming-soon"
              role="tooltip"
              className="pointer-events-none absolute left-full ml-2 z-20 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-emerald-400 opacity-0 shadow-lg border border-slate-700 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-1"
            >
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
