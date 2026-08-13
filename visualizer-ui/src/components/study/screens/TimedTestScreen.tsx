"use client";

/*
 * Reusable timed-test screen for both the pre-test and the post-test. The
 * wrapper behavior (recommended-time chip, Continue, logging) is IDENTICAL
 * for both; only the test definition and labels differ. A single
 * component guarantees that identical behavior.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import StudyShell, { TimerChip } from "@/components/study/StudyShell";
import TestRunner from "@/components/study/TestRunner";
import { useStudy } from "@/components/study/StudyProvider";
import { formatMMSS, useCountUp } from "@/components/study/useTimers";
import type { TestDef } from "@/data/tests";
import type { EndedBy, LogEvent, Phase } from "@/lib/studyTypes";

interface TimedTestScreenProps {
  which: "pretest" | "posttest";
  def: TestDef;
  durationSeconds: number;
  stageIndex: number;
  heading: string;
  startEvent: LogEvent;
  finishEvent: LogEvent;
  nextPhase: Phase;
}

/* Tooltip button that informs participants that their responses are saved when navigating back */
export function BackButtonWithTooltip({
  label,
  onClick,
  tooltipText = "Your responses will be saved automatically if you go back.",
  showTooltip = true,
  position = "left",
  confirmText,
}: {
  label: string;
  onClick: () => void;
  tooltipText?: string;
  showTooltip?: boolean;
  position?: "top" | "bottom" | "right" | "left";
  /*
   * Set on buttons that throw away the participant's work. The warning used to
   * live only in a hover tooltip, so a click without hovering wiped the ID and
   * every answer instantly, with no undo. Confirming makes that deliberate.
   */
  confirmText?: string;
}) {
  const posClasses =
    position === "right"
      ? "left-full top-1/2 -translate-y-1/2 ml-2"
      : position === "left"
        ? "right-full top-1/2 -translate-y-1/2 mr-2"
        : position === "bottom"
          ? "top-[calc(100%+6px)] left-0"
          : "bottom-[calc(100%+6px)] left-0";

  return (
    <div className="group relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          onClick();
        }}
        className="study-back-button inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border)] text-[12px] font-semibold text-slate-700 bg-white shadow-sm cursor-pointer"
      >
        <ChevronLeft
          size={14}
          aria-hidden="true"
          className="study-back-button-arrow"
        />
        <span>{label}</span>
      </button>
      {showTooltip && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-50 max-w-[160px] w-max whitespace-normal leading-tight rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg border border-slate-700 transition-all duration-150 group-hover:opacity-100 ${posClasses}`}
        >
          {tooltipText}
        </span>
      )}
    </div>
  );
}

export default function TimedTestScreen({
  which,
  def,
  durationSeconds,
  stageIndex,
  heading,
  startEvent,
  finishEvent,
  nextPhase,
}: TimedTestScreenProps) {
  const { session, setResponse, logEvent, goTo, returnToConsent } = useStudy();
  // Anchor the timer to a single start moment, captured once.
  const [startAtMs] = useState(() => Date.now());
  const finishedRef = useRef(false);

  const responses =
    which === "pretest" ? session.pretestResponses : session.posttestResponses;
  const responseKeys = useMemo(
    () =>
      def.questions.flatMap((question) =>
        question.fields.flatMap((field) => {
          if (field.kind === "text") return [field.key];
          if (field.kind === "grid") {
            return field.rows.flatMap((row) =>
              row.flatMap((cell) => (cell.t === "in" ? [cell.key] : [])),
            );
          }
          return [];
        }),
      ),
    [def],
  );
  const completedResponses = responseKeys.filter(
    (key) => responses[key]?.trim().length > 0,
  ).length;
  const testComplete = completedResponses === responseKeys.length;

  // Log the start of this test exactly once when it opens.
  useEffect(() => {
    void logEvent(startEvent);
  }, [logEvent, startEvent]);

  const finish = (endedBy: EndedBy) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const elapsedSeconds = Math.floor((Date.now() - startAtMs) / 1000);
    void logEvent(finishEvent, {
      ended_by: endedBy,
      responses,
      elapsed_seconds: elapsedSeconds,
    });
    goTo(nextPhase);
  };

  /*
   * The recommended time is advisory and nothing happens when it runs out.
   * Before it is reached the chip counts down, exactly as it always has. Once
   * it is reached the chip flips to counting up, showing how far past the
   * recommendation the participant is, and they carry on and submit whenever
   * they choose. Nothing auto-submits: a participant mid-answer at 0:00 used
   * to lose that answer.
   */
  const elapsed = useCountUp(startAtMs);
  const pastRecommended = elapsed >= durationSeconds;
  const remaining = Math.max(0, durationSeconds - elapsed);
  /* Only the countdown turns urgent, so going over time never looks alarming. */
  const urgent = !pastRecommended && remaining <= 60;

  return (
    <StudyShell
      stageIndex={stageIndex}
      heading={heading}
      timer={
        <TimerChip
          label={pastRecommended ? "Time elapsed after recommended" : "Recommended time left"}
          value={formatMMSS(pastRecommended ? elapsed - durationSeconds : remaining)}
          urgent={urgent}
        />
      }
      footer={
        <>
          {which === "pretest" ? (
            <BackButtonWithTooltip
              label="Back to Home"
              onClick={returnToConsent}
              position="left"
              tooltipText="Going back will reset your assigned Participant ID and answers."
              confirmText="This erases your answers and your participant ID, and it cannot be undone. Are you sure you want to start over?"
            />
          ) : (
            /*
             * The post-test deliberately has no way back to the learning
             * activity. Leaving mid-test to re-study inflated the post-test
             * score, and only participants bold enough to try it benefited,
             * which made the pre-test and post-test measure different things.
             */
            <span aria-hidden="true" />
          )}

          <span
            id={`${which}-completion-progress`}
            className="mx-auto text-[12px]"
            style={{ color: "var(--text-secondary)" }}
          >
            {completedResponses} of {responseKeys.length} responses completed
          </span>

          <button
            className="btn-primary"
            disabled={!testComplete}
            aria-describedby={`${which}-completion-progress`}
            onClick={() => finish("manual")}
          >
            <span>Continue</span>
            <svg
              className="btn-arrow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </>
      }
    >
      <TestRunner
        def={def}
        responses={responses}
        onChange={(key, value) => setResponse(which, key, value)}
      />
    </StudyShell>
  );
}
