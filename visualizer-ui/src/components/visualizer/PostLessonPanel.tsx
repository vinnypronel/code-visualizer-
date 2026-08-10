"use client";

import { useState } from "react";
import { Pencil, Play } from "lucide-react";

/*
 * The two things a participant can do once the lesson is finished: open another
 * built-in example, or edit the Java and run it for real.
 *
 * This panel is rendered only from the lesson completion screen. Nothing here
 * is reachable during the measured lesson, because a participant who spends the
 * learning phase on the Stack example, or on a program they wrote themselves,
 * produces post-test data we cannot use.
 */

export interface PostLessonExample {
  id: string;
  name: string;
}

interface PostLessonPanelProps {
  examples: PostLessonExample[];
  activeExampleId: string;
  onLoadExample: (id: string) => void;
  onEditCode: () => void;
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
  onEditCode,
}: PostLessonPanelProps) {
  const [choice, setChoice] = useState<string>(activeExampleId);

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
              {examples.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary" onClick={() => onLoadExample(choice)}>
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
          Change the Java yourself, then run it. The memory view will follow your program, one line
          at a time, exactly as it followed ours. If your code does not compile, you will see the
          error message and can fix it and run it again.
        </p>
        <div>
          <button type="button" className="btn-ghost" onClick={onEditCode}>
            <Pencil size={15} aria-hidden="true" />
            <span>Edit the code</span>
          </button>
        </div>
      </div>
    </div>
  );
}
