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
import type { LessonPhase } from "@/components/visualizer/VisualizerExperience";

import { BackButtonWithTooltip } from "@/components/study/screens/TimedTestScreen";

/* Advisory only. Nothing happens when it elapses. */
const LEARNING_RECOMMENDED_SECONDS = 900;

export default function LearningScreen() {
  const { session, logEvent, goTo } = useStudy();
  const [startAtMs] = useState(() => Date.now());
  const isAi = session.condition !== "static"; // default to AI if unset

  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("intro");
  const [visualizerStartMs, setVisualizerStartMs] = useState<number | null>(
    () => (isAi ? null : startAtMs),
  );

  const handleLessonPhaseChange = useCallback((phase: LessonPhase) => {
    setLessonPhase(phase);
    if (phase !== "intro") {
      setVisualizerStartMs((current) => current ?? Date.now());
    }
  }, []);

  /*
   * The recommended time is advisory here too. Nothing fires when it runs out,
   * but the chip used to sit frozen at 0:00 under a "time left" label, which
   * read like a deadline had passed. Past the recommendation it counts up
   * instead, matching the timed tests.
   */
  const elapsed = useCountUp(visualizerStartMs ?? startAtMs);
  const started = !!visualizerStartMs;
  const pastRecommended = started && elapsed >= LEARNING_RECOMMENDED_SECONDS;
  const remaining = started
    ? Math.max(0, LEARNING_RECOMMENDED_SECONDS - elapsed)
    : LEARNING_RECOMMENDED_SECONDS;
  const urgent = !pastRecommended && remaining <= 60;

  // The lesson can be replayed, so completion is logged only the first time.
  const loggedCompletionRef = useRef(false);
  const loggedExamplesRef = useRef(new Set<string>());

  // Log the start of the learning phase once.
  useEffect(() => {
    void logEvent("learning_started");
  }, [logEvent]);

  const handleExampleAttempt = useCallback((exampleId: string) => {
    if (loggedExamplesRef.current.has(exampleId)) return;
    loggedExamplesRef.current.add(exampleId);
    void logEvent("example_attempted", { example_id: exampleId });
  }, [logEvent]);

  const handleLessonComplete = useCallback((exampleId: string) => {
    if (loggedCompletionRef.current) return;
    loggedCompletionRef.current = true;
    handleExampleAttempt(exampleId);
    void logEvent("learning_completed", {
      elapsed_seconds: Math.floor((Date.now() - (visualizerStartMs ?? startAtMs)) / 1000),
      example_id: exampleId,
    });
  }, [handleExampleAttempt, logEvent, startAtMs, visualizerStartMs]);

  const proceed = useCallback(() => {
    void logEvent("learning_continue", {
      elapsed_seconds: Math.floor((Date.now() - (visualizerStartMs ?? startAtMs)) / 1000),
    });
    goTo("posttest");
  }, [goTo, logEvent, startAtMs, visualizerStartMs]);

  const backToPretest = (
    <BackButtonWithTooltip
      label="Back to Pre-test"
      onClick={() => goTo("pretest")}
      showTooltip={false}
    />
  );
  const showTopBarBack = isAi && lessonPhase !== "intro";

  return (
    <StudyShell
      stageIndex={2}
      heading="Learning"
      fluid
      timer={
        <div className="flex items-center gap-3">
          {showTopBarBack && backToPretest}
          <TimerChip
            label={pastRecommended ? "Time elapsed after recommended" : "Recommended time left"}
            value={formatMMSS(pastRecommended ? elapsed - LEARNING_RECOMMENDED_SECONDS : remaining)}
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
          onLessonPhaseChange={handleLessonPhaseChange}
          introBackButton={backToPretest}
        />
      ) : (
        <StaticMaterialsStub onContinue={proceed} onBackToPretest={backToPretest} />
      )}
    </StudyShell>
  );
}
