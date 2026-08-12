"use client";

/*
 * Reusable timed-test screen for both the pre-test and the post-test. The
 * wrapper behavior (countdown, early Continue, auto-submit on expiry, logging)
 * is IDENTICAL for both; only the test definition and labels differ. A single
 * component guarantees that identical behavior.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import StudyShell, { TimerChip } from "@/components/study/StudyShell";
import TestRunner from "@/components/study/TestRunner";
import { useStudy } from "@/components/study/StudyProvider";
import { formatMMSS, useCountdown } from "@/components/study/useTimers";
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
}: {
  label: string;
  onClick: () => void;
  tooltipText?: string;
  showTooltip?: boolean;
}) {
  return (
    <div className="group relative inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
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
          className="pointer-events-none absolute top-[calc(100%+8px)] left-0 z-50 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg border border-slate-700 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-[2px]"
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

  const remaining = useCountdown(durationSeconds, startAtMs, () =>
    finish("timer"),
  );
  const urgent = remaining <= 60;

  return (
    <StudyShell
      stageIndex={stageIndex}
      heading={heading}
      timer={
        <TimerChip
          label="Recommended time left"
          value={formatMMSS(remaining)}
          urgent={urgent}
        />
      }
      footer={
        <>
          {which === "pretest" ? (
            <BackButtonWithTooltip
              label="Back to Home"
              onClick={returnToConsent}
              tooltipText="Going back will reset your assigned Participant ID and answers."
            />
          ) : (
            <BackButtonWithTooltip
              label="Back to Learning"
              onClick={() => goTo("learning")}
              tooltipText="Going back will return you to the learning activity."
            />
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
