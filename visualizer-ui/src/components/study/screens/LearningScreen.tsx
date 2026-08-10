"use client";

/*
 * Learning phase. Renders the AI visualizer or the static materials based on
 * the assigned condition, inside identical study chrome. Count-up timer, no
 * auto-advance. The AI condition can advance only from the completed-lesson
 * screen; the static condition places its transition at the end of the reading.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import StudyShell, { TimerChip } from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import { formatMMSS, useCountUp } from "@/components/study/useTimers";
import StaticMaterialsStub from "@/components/study/StaticMaterialsStub";
import VisualizerExperience from "@/components/visualizer/VisualizerExperience";

export default function LearningScreen() {
  const { session, logEvent, goTo } = useStudy();
  const [startAtMs] = useState(() => Date.now());
  const elapsed = useCountUp(startAtMs);

  // The lesson can be replayed, so completion is logged only the first time.
  const loggedCompletionRef = useRef(false);

  const isAi = session.condition !== "static"; // default to AI if unset

  // Log the start of the learning phase once.
  useEffect(() => {
    void logEvent("learning_started");
  }, [logEvent]);

  // TODO(in-tool-logging): this is the hook point for logging in-tool activity
  // during the learning phase (e.g. steps taken, presets opened, time on task).
  // Left intentionally unimplemented for this task. Wire a callback from
  // VisualizerExperience here and POST it via logEvent when that is in scope.

  const handleLessonComplete = useCallback(() => {
    if (loggedCompletionRef.current) return;
    loggedCompletionRef.current = true;
    void logEvent("learning_completed", {
      elapsed_seconds: Math.floor((Date.now() - startAtMs) / 1000),
    });
  }, [logEvent, startAtMs]);

  const proceed = useCallback(() => {
    void logEvent("learning_continue", {
      elapsed_seconds: Math.floor((Date.now() - startAtMs) / 1000),
    });
    goTo("posttest");
  }, [goTo, logEvent, startAtMs]);

  return (
    <StudyShell
      stageIndex={2}
      heading="Learning"
      fluid
      timer={<TimerChip label="Elapsed" value={formatMMSS(elapsed)} />}
    >
      {isAi ? (
        <VisualizerExperience
          onLessonComplete={handleLessonComplete}
          onContinueToNextStage={proceed}
        />
      ) : (
        <StaticMaterialsStub onContinue={proceed} />
      )}
    </StudyShell>
  );
}
