"use client";

/*
 * Reusable timed-test screen for both the pre-test and the post-test. The
 * wrapper behavior (countdown, early Continue, auto-submit on expiry, logging)
 * is IDENTICAL for both; only the test definition and labels differ. A single
 * component guarantees that identical behavior.
 */

import { useEffect, useRef, useState } from "react";
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
        <button className="btn-primary" onClick={() => finish("manual")}>
          Continue
        </button>
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
