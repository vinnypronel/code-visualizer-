/*
 * Pre-generated, reviewed Gemini explanations for the study lessons.
 *
 * The study uses a fixed, finite set of lessons (STUDY_LESSON_IDS), so the whole
 * explanation set is generated once, reviewed, and committed here. Every AI-vis
 * participant then sees the same vetted text, which keeps the stimulus consistent
 * across the condition and means a session never depends on a live API call.
 *
 * This map is written by scripts/generate-ai-explanations.mjs. Until it is run
 * (needs GEMINI_API_KEY), the map is empty and the visualizer falls back to its
 * scripted text, so the app works either way.
 *
 * Keyed by preset id, then by the step index the visualizer is showing.
 */

import { GENERATED_AI_EXPLANATIONS } from "@/data/aiExplanations.generated";

export interface AiStepExplanation {
  /* Shown as "What changed" once the line has run. */
  explanation: string;
  /* Shown as "Why it matters". */
  whyItMatters: string;
}

/*
 * The generated map, or {} until the generator has been run. Kept in a separate
 * file so regenerating never touches this wiring.
 */
export const AI_EXPLANATIONS: Record<string, Record<number, AiStepExplanation>> =
  GENERATED_AI_EXPLANATIONS;

/* The one lookup the visualizer uses. Null means "fall back to scripted text". */
export function getAiExplanation(
  presetId: string,
  step: number,
): AiStepExplanation | null {
  return AI_EXPLANATIONS[presetId]?.[step] ?? null;
}
