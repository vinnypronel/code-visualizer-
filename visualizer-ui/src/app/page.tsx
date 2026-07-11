import VisualizerExperience from "@/components/visualizer/VisualizerExperience";

/*
 * Entry route. The study gate is added in a later commit; for now this renders
 * the working visualizer directly so behavior matches the pre-harness baseline.
 */
export default function Page() {
  return <VisualizerExperience />;
}
