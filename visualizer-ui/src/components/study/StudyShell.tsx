"use client";

/*
 * StudyShell is the shared chrome for every study screen. It renders IDENTICAL
 * wrapper UI (header, phase progress, timer slot, footer) across both learning
 * conditions so the only thing that ever differs between conditions is the
 * learning-phase content. This is deliberate: matching chrome protects the
 * validity of the comparison.
 */

import type { ReactNode } from "react";

/* The five participant-facing stages, in order, for the progress indicator. */
export const STAGES = [
  "Consent",
  "Pre-test",
  "Learning",
  "Post-test",
  "Questionnaire",
] as const;

interface StudyShellProps {
  /* 0-based index into STAGES for the active stage. */
  stageIndex: number;
  /* Screen heading, e.g. "Pre-test". */
  heading: string;
  /* Optional subheading line under the heading. */
  subheading?: string;
  /* Optional timer element shown in the header (right side). */
  timer?: ReactNode;
  /* Main scrollable content. */
  children: ReactNode;
  /* Optional sticky footer (usually the primary Continue button). */
  footer?: ReactNode;
}

export default function StudyShell({
  stageIndex,
  heading,
  subheading,
  timer,
  children,
  footer,
}: StudyShellProps) {
  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Header: study name + phase stepper + timer slot */}
      <header
        className="flex-shrink-0 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg-header)" }}
      >
        <div className="mx-auto w-full max-w-4xl px-6 py-3 flex items-center justify-between gap-4">
          <span
            className="text-[11px] font-mono uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Code Visualizer Study
          </span>
          <div className="min-h-[24px] flex items-center">{timer}</div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-6 pb-3">
          <ol className="flex items-center gap-2">
            {STAGES.map((stage, i) => {
              const state =
                i < stageIndex ? "done" : i === stageIndex ? "active" : "todo";
              return (
                <li key={stage} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        background:
                          state === "active"
                            ? "var(--accent)"
                            : state === "done"
                              ? "var(--accent-glow)"
                              : "transparent",
                        color:
                          state === "active"
                            ? "#fff"
                            : state === "done"
                              ? "var(--accent)"
                              : "var(--text-muted)",
                        border:
                          state === "todo"
                            ? "1px solid var(--border)"
                            : "1px solid transparent",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-[11px] font-medium truncate"
                      style={{
                        color:
                          state === "todo"
                            ? "var(--text-muted)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {stage}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <span
                      className="flex-1 h-px"
                      style={{
                        background:
                          i < stageIndex
                            ? "var(--accent)"
                            : "var(--border)",
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 overflow-y-auto panel-scroll">
        <div className="mx-auto w-full max-w-4xl px-6 py-8">
          <h1 className="text-xl font-bold mb-1">{heading}</h1>
          {subheading && (
            <p
              className="text-[13px] mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              {subheading}
            </p>
          )}
          <div className={subheading ? "" : "mt-4"}>{children}</div>
        </div>
      </main>

      {/* Footer */}
      {footer && (
        <footer
          className="flex-shrink-0 border-t"
          style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
        >
          <div className="mx-auto w-full max-w-4xl px-6 py-3 flex items-center justify-end gap-3">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}

/*
 * A compact, layout-stable timer chip. Uses tabular-nums and a fixed min-width
 * so the digits never shift the header as they tick.
 */
export function TimerChip({
  label,
  value,
  urgent = false,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <span
      className="badge"
      style={{
        background: urgent ? "#f59e0b1a" : "var(--bg-panel-2)",
        color: urgent ? "var(--warning)" : "var(--text-secondary)",
        border: `1px solid ${urgent ? "#f59e0b55" : "var(--border)"}`,
        fontVariantNumeric: "tabular-nums",
        gap: 6,
      }}
    >
      <span
        className="uppercase"
        style={{ fontSize: 9, letterSpacing: "0.5px", opacity: 0.8 }}
      >
        {label}
      </span>
      <span style={{ minWidth: 42, textAlign: "right", fontWeight: 700 }}>
        {value}
      </span>
    </span>
  );
}
