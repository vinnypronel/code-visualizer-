"use client";

/*
 * StudyShell is the shared chrome for every study screen. It renders IDENTICAL
 * wrapper UI (header, phase progress, timer slot, footer) across both learning
 * conditions so the only thing that ever differs between conditions is the
 * learning-phase content. This is deliberate: matching chrome protects the
 * validity of the comparison.
 */

import type { ReactNode } from "react";
import { useStudy } from "@/components/study/StudyProvider";

/* Index of "Learning" within STAGES below. */
const LEARNING_STAGE_INDEX = 2;

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
  heading?: string;
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
  /*
   * Disables vertical scrolling on the page content and locks it to the viewport height.
   */
  noScroll?: boolean;
}

export default function StudyShell({
  stageIndex,
  heading,
  subheading,
  timer,
  children,
  footer,
  fluid = false,
  noScroll = false,
}: StudyShellProps) {
  const { session, returnToConsent } = useStudy();
  const isStatic = session.condition === "static";

  return (
    <div
      className="study-shell flex flex-col w-full"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Header: study name + phase stepper + timer slot */}
      <header
        className="relative flex-shrink-0 border-b select-none"
        style={{ borderColor: "var(--border)", background: "var(--bg-header)" }}
      >
        <div className="relative w-full px-4 sm:px-6 py-1.5 flex items-center justify-between gap-4 min-h-[46px]">
          {/* Left: Kean Logo + Title + Version Badge */}
          <div
            onClick={returnToConsent}
            role="button"
            tabIndex={0}
            title="Back to Home"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") returnToConsent();
            }}
            className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kean-logo.png"
              alt="Kean University"
              className="h-10 sm:h-12 w-auto object-contain flex-shrink-0 transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span
                className="text-xs sm:text-sm font-mono uppercase tracking-wider font-extrabold whitespace-nowrap hidden lg:inline group-hover:text-[var(--accent)] transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                Code Visualizer Study
              </span>
              <span
                className="text-[10px] font-mono inline-flex items-center w-fit font-semibold"
                style={{
                  color: "var(--accent)",
                }}
              >
                <span>
                  {/*
                    The lesson name belongs to the Learning stage only. It used
                    to persist into the post-test and the questionnaire, which
                    made participants think they were still inside the lesson.
                  */}
                  {stageIndex !== LEARNING_STAGE_INDEX || !session.selectedLessonId
                    ? "Kean University"
                    : isStatic
                      ? "Java Object-Reference Reading: Static Learning"
                      : session.selectedLessonId === "arraylist"
                      ? "Array List: Contiguous Storage & Resizing"
                      : session.selectedLessonId === "stack"
                        ? "Stack: LIFO Stack Push Operations"
                        : session.selectedLessonId === "livetrace"
                          ? "Live Trace: multiply(5, 10)"
                          : session.selectedLessonId === "linkedlist"
                            ? "Linked List: Insertion & Linking"
                            : "Custom Java Code"}
                </span>
              </span>
            </div>
          </div>

          {/* Center: Stage Tracker */}
          {/*
            From xl up there is room to pin the tracker to the true header
            centre, so it stays centred no matter how wide the logo block on
            the left or the timer block on the right happen to be. Below xl the
            side blocks would collide with it, so it stays in normal flow.
          */}
          <ol className="hidden lg:flex items-center gap-1.5 flex-1 max-w-2xl mx-auto px-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:mx-0 lg:w-[520px] lg:flex-none">
            {STAGES.map((stage, i) => {
              const state =
                i < stageIndex ? "done" : i === stageIndex ? "active" : "todo";
              return (
                <li key={stage} className="flex items-center gap-1.5 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
                      style={{
                        width: 19,
                        height: 19,
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
                      className="text-[11px] font-semibold truncate"
                      style={{
                        color:
                          state === "active"
                            ? "var(--accent)"
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

          {/* Right: Participant ID + Timer + UR2PhD Logo */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            {/*
              The ID is shown once on the assigned screen and again at the very
              end. Keeping it here in between means a participant who drops out
              partway can still quote it, which is what makes a withdrawal or a
              support request matchable to their row.
            */}
            {session.participantId && (
              <span
                className="hidden md:inline font-mono text-[11px] font-semibold whitespace-nowrap"
                style={{ color: "var(--text-secondary)" }}
                title="Your participant ID"
              >
                ID {session.participantId}
              </span>
            )}
            {timer && <div className="mr-6 sm:mr-12">{timer}</div>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ur2phd-logo.png"
              alt="UR2PhD Mentoring"
              className="h-9 sm:h-[42px] w-auto object-contain flex-shrink-0"
            />
          </div>
        </div>
      </header>

      {/* Body */}
      {fluid ? (
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      ) : (
        <main className={`flex-1 min-h-0 ${noScroll ? "overflow-hidden flex flex-col items-center justify-center" : "overflow-y-auto panel-scroll"}`}>
          <div className={`w-full max-w-[1440px] ${noScroll ? "px-4 sm:px-6 py-2 flex-1 flex flex-col justify-center items-center mx-auto" : "mx-auto px-6 lg:px-12 py-5 sm:py-6"}`}>
            {heading && <h1 className="text-xl font-bold mb-1">{heading}</h1>}
            {subheading && (
              <p
                className="text-[13px] mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                {subheading}
              </p>
            )}
            <div className={noScroll ? "w-full flex-1 flex flex-col justify-center items-center" : subheading ? "" : "mt-4"}>{children}</div>
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
