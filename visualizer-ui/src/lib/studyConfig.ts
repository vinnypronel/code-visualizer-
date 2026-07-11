/*
 * Study harness configuration.
 *
 * These are plain, non-secret build-time flags. Flip them to control how the
 * app behaves. This file is safe to import from both server and client code.
 * Do NOT put secrets here (Supabase keys live only in server env vars).
 */

import type { Condition } from "@/lib/studyTypes";

/*
 * STUDY_MODE
 *   false -> dev and demo mode. `/` renders the visualizer directly, no study.
 *   true  -> `/` renders the full participant study flow.
 *
 * Default is true so the harness is what runs. Flip to false for local demos of
 * the visualizer on its own.
 */
export const STUDY_MODE = true;

/*
 * RAND_LEARNING_TOOL
 *   false -> every participant gets the AI-assisted tool.
 *   true  -> assign the learning tool by participant ID parity.
 *            Odd seq  (P001, P003, ...) -> AI tool.
 *            Even seq (P002, P004, ...) -> static materials.
 */
export const RAND_LEARNING_TOOL = true;

/* Timer durations, in seconds. Pre-test and post-test both count down. */
export const PRETEST_DURATION_SECONDS = 10 * 60;
export const POSTTEST_DURATION_SECONDS = 10 * 60;

/* Recommended (not enforced) time on the learning phase. */
export const LEARNING_RECOMMENDED_MINUTES = 15;

/*
 * Deterministic condition assignment from the atomic sequence number.
 * Shared by the client (to render the right branch) and the server (to store
 * the condition when the participant row is created).
 */
export function conditionForSeq(seq: number): Condition {
  if (!RAND_LEARNING_TOOL) return "ai";
  return seq % 2 === 1 ? "ai" : "static";
}

/* External Microsoft Forms questionnaire, injected at build time. May be empty
 * during development; the handoff screen degrades gracefully if unset. */
export const MSFORMS_URL = process.env.NEXT_PUBLIC_MSFORMS_URL ?? "";
