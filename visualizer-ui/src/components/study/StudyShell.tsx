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
  /*
   * Fluid mode: the content fills the full width and height of the body (no
   * centered max-width, no heading block). Used for the learning phase so the
   * visualizer and the static materials both get the full canvas while keeping
   * the exact same header, stepper, timer, and footer chrome.
   */
  fluid?: boolean;
}

export default function StudyShell({
  stageIndex,
  heading,
  subheading,
  timer,
  children,
  footer,
  fluid = false,
}: StudyShellProps) {
  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Header: study name + phase stepper + timer slot */}
      <header
        className="relative flex-shrink-0 border-b select-none"
        style={{ borderColor: "var(--border)", background: "var(--bg-header)" }}
      >
        <div className="w-full px-4 sm:px-8 py-2 flex items-center justify-between gap-4 min-h-[52px]">
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Left Logo: Kean University */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kean-logo.png"
              alt="Kean University"
              className="h-9 sm:h-10 w-auto object-contain flex-shrink-0"
            />
            <span
              className="text-xs sm:text-sm font-mono uppercase tracking-wider font-extrabold whitespace-nowrap hidden sm:inline"
              style={{ color: "var(--text-primary)" }}
            >
              Code Visualizer Study
            </span>
          </div>

          <ol className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-auto px-4">
            {STAGES.map((stage, i) => {
              const state =
                i < stageIndex ? "done" : i === stageIndex ? "active" : "todo";
              return (
                <li key={stage} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
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
                              : "var(--text-secondary)",
                        border:
                          state === "todo"
                            ? "1px solid var(--border)"
                            : "1px solid transparent",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-[11.5px] font-semibold truncate"
                      style={{
                        color:
                          state === "active"
                            ? "var(--accent)"
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

          <div className="flex items-center gap-3.5 flex-shrink-0 ml-auto">
            {timer}
            {/* Right Logo: UR2PhD */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ur2phd-logo.png"
              alt="UR2PhD Mentoring"
              className="h-8 sm:h-[38px] w-auto object-contain flex-shrink-0"
            />
          </div>
        </div>

        {!fluid && (
          <div className="mx-auto w-full max-w-4xl px-3 sm:px-6 pb-1.5">
            <ol className="flex items-center gap-1 sm:gap-2">
              {STAGES.map((stage, i) => {
                const state =
                  i < stageIndex ? "done" : i === stageIndex ? "active" : "todo";
                return (
                  <li key={stage} className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
                        style={{
                          width: 18,
                          height: 18,
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
                                : "var(--text-primary)",
                          border:
                            state === "todo"
                              ? "1px solid var(--border)"
                              : "1px solid transparent",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="hidden sm:inline text-[11px] font-semibold truncate"
                        style={{
                          color:
                            state === "todo"
                              ? "var(--text-primary)"
                              : "var(--text-primary)",
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
        )}
      </header>

      {/* Body */}
      {fluid ? (
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      ) : (
        <main className="flex-1 min-h-0 overflow-y-auto panel-scroll">
          <div className="mx-auto w-full max-w-4xl px-6 py-5 sm:py-6">
            <h1 className="text-xl font-bold mb-1">{heading}</h1>
            {subheading && (
              <p
                className="text-[13px] mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                {subheading}
              </p>
            )}
            <div className={subheading ? "" : "mt-4"}>{children}</div>
          </div>
        </main>
      )}

      {/* Footer */}
      {footer && (
        <footer
          className="flex-shrink-0 border-t"
          style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
        >
          <div className="mx-auto w-full max-w-4xl px-6 py-2 flex items-center justify-end gap-3">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}

/*
 * A compact, layout-stable timer text display (unboxed as requested).
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
    <div
      className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider"
      style={{
        color: urgent ? "var(--warning)" : "var(--text-secondary)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span className="uppercase text-[10px] font-semibold opacity-90" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-bold text-xs ml-0.5" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
