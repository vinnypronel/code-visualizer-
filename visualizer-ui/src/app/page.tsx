import VisualizerExperience from "@/components/visualizer/VisualizerExperience";
import StudyFlow from "@/components/study/StudyFlow";
import { STUDY_MODE } from "@/lib/studyConfig";

/*
 * Entry route.
 *   STUDY_MODE true  -> the full participant study flow.
 *   STUDY_MODE false -> the visualizer on its own (dev and demo).
 */
export default function Page() {
  return STUDY_MODE ? <StudyFlow /> : <VisualizerExperience />;
}
