"use client";

/*
 * The participant flow, as a single switch over the current phase. All session
 * state lives in StudyProvider, so moving between phases never loses data.
 */

import { useStudy } from "@/components/study/StudyProvider";
import ConsentScreen from "@/components/study/screens/ConsentScreen";
import DeclinedScreen from "@/components/study/screens/DeclinedScreen";
import AssignedScreen from "@/components/study/screens/AssignedScreen";
import TimedTestScreen from "@/components/study/screens/TimedTestScreen";
import LearningScreen from "@/components/study/screens/LearningScreen";
import HandoffScreen from "@/components/study/screens/HandoffScreen";
import { PRETEST, POSTTEST } from "@/data/tests";
import {
  PRETEST_DURATION_SECONDS,
  POSTTEST_DURATION_SECONDS,
} from "@/lib/studyConfig";

export default function StudyFlow() {
  const { session } = useStudy();

  switch (session.phase) {
    case "consent":
      return <ConsentScreen />;
    case "declined":
      return <DeclinedScreen />;
    case "assigned":
      return <AssignedScreen />;
    case "pretest":
      return (
        <TimedTestScreen
          which="pretest"
          def={PRETEST}
          durationSeconds={PRETEST_DURATION_SECONDS}
          stageIndex={1}
          heading="Pre-test"
          startEvent="pretest_started"
          finishEvent="pretest_finished"
          nextPhase="learning"
        />
      );
    case "learning":
      return <LearningScreen />;
    case "posttest":
      return (
        <TimedTestScreen
          which="posttest"
          def={POSTTEST}
          durationSeconds={POSTTEST_DURATION_SECONDS}
          stageIndex={3}
          heading="Post-test"
          startEvent="posttest_started"
          finishEvent="posttest_finished"
          nextPhase="handoff"
        />
      );
    case "handoff":
      return <HandoffScreen />;
    default:
      return <ConsentScreen />;
  }
}
