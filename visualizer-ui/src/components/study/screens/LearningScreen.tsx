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
import { formatMMSS, useCountdown } from "@/components/study/useTimers";
import StaticMaterialsStub from "@/components/study/StaticMaterialsStub";
import VisualizerExperience from "@/components/visualizer/VisualizerExperience";

import { BackButtonWithTooltip } from "@/components/study/screens/TimedTestScreen";

export default function LearningScreen() {
  const { session, logEvent, goTo } = useStudy();
  const [startAtMs] = useState(() => Date.now());
  const remaining = useCountdown(900, startAtMs);
  const urgent = remaining <= 60;

  // The lesson can be replayed, so completion is logged only the first time.
  const loggedCompletionRef = useRef(false);
  const loggedExamplesRef = useRef(new Set<string>());

  const isAi = session.condition !== "static"; // default to AI if unset

  // Log the start of the learning phase once.
  useEffect(() => {
    void logEvent("learning_started");
  }, [logEvent]);

  const handleExampleAttempt = useCallback((exampleId: string) => {
    if (loggedExamplesRef.current.has(exampleId)) return;
    loggedExamplesRef.current.add(exampleId);
    void logEvent("example_attempted", { example_id: exampleId });
  }, [logEvent]);

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
      timer={
        <div className="flex items-center gap-3">
          <BackButtonWithTooltip
            label="Back to Pre-test"
            onClick={() => goTo("pretest")}
          />
          <TimerChip
            label="Recommended time left"
            value={formatMMSS(remaining)}
            urgent={urgent}
          />
        </div>
      }
    >
      {isAi ? (
        <VisualizerExperience
          onLessonComplete={handleLessonComplete}
          onContinueToNextStage={proceed}
          onExampleAttempt={handleExampleAttempt}
        />
      ) : (
        <StaticMaterialsStub onContinue={proceed} />
      )}
    </StudyShell>
  );
}
