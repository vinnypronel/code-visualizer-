"use client";

import { useState } from "react";
import { Pencil, Play } from "lucide-react";

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

      <div style={cardStyle}>
        <h3 style={{ color: "var(--text-primary)", fontSize: 13.5, fontWeight: 700 }}>
          Try a different example
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 12.5, lineHeight: 1.6 }}>
          Pick another program and step through it the same way. It opens right here, at step 1.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <label className="lesson-example-select" style={{ margin: 0 }}>
            <span>Example</span>
            <select
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
              aria-label="Choose another example to load"
            >
              {otherExamples.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onLoadExample(choice)}
            disabled={otherExamples.length === 0}
          >
            <Play size={15} aria-hidden="true" />
            <span>Load example</span>
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
