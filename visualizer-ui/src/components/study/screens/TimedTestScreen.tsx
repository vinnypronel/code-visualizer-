"use client";

/*
 * Reusable timed-test screen for both the pre-test and the post-test. The
 * wrapper behavior (countdown, early Continue, auto-submit on expiry, logging)
 * is IDENTICAL for both; only the test definition and labels differ. A single
 * component guarantees that identical behavior.
 */

import { useEffect, useMemo, useRef, useState } from "react";
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
  const { session, setResponse, logEvent, goTo } = useStudy();
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
          label="Time left"
          value={formatMMSS(remaining)}
          urgent={urgent}
        />
      }
      footer={
        <>
          <span
            id={`${which}-completion-progress`}
            className="mr-auto text-[12px]"
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
            Continue
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
