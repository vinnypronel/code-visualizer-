"use client";

/*
 * Learning phase. Renders the AI visualizer or the static materials based on
 * the assigned condition, inside identical study chrome. Count-up timer, no
 * auto-advance, manual Continue only.
 */

import { useEffect, useState } from "react";
import StudyShell, { TimerChip } from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import { formatMMSS, useCountUp } from "@/components/study/useTimers";
import StaticMaterialsStub from "@/components/study/StaticMaterialsStub";
import VisualizerExperience from "@/components/visualizer/VisualizerExperience";
import { LEARNING_RECOMMENDED_MINUTES } from "@/lib/studyConfig";

export default function LearningScreen() {
  const { session, logEvent, goTo } = useStudy();
  const [startAtMs] = useState(() => Date.now());
  const elapsed = useCountUp(startAtMs);

  // Log the start of the learning phase once.
  useEffect(() => {
    void logEvent("learning_started");
  }, [logEvent]);

  // TODO(in-tool-logging): this is the hook point for logging in-tool activity
  // during the learning phase (e.g. steps taken, presets opened, time on task).
  // Left intentionally unimplemented for this task. Wire a callback from
  // VisualizerExperience here and POST it via logEvent when that is in scope.

  const onContinue = () => {
    void logEvent("learning_continue", {
      elapsed_seconds: Math.floor((Date.now() - startAtMs) / 1000),
    });
    goTo("posttest");
  };

  const isAi = session.condition !== "static"; // default to AI if unset

  return (
    <StudyShell
      stageIndex={2}
      heading="Learning"
      fluid
      timer={<TimerChip label="Elapsed" value={formatMMSS(elapsed)} />}
      footer={
        <>
          <span
            className="text-[12px] mr-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            We recommend spending {LEARNING_RECOMMENDED_MINUTES} minutes on this
            section.
          </span>
          <button className="btn-primary" onClick={onContinue}>
            Continue
          </button>
        </>
      }
    >
      {isAi ? <VisualizerExperience /> : <StaticMaterialsStub />}
    </StudyShell>
  );
}
