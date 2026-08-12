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

/* The initial selection shown before a participant chooses a lesson. */
export const LESSON_PRESET_ID = "linkedlist";

/*
 * Every AI-condition participant chooses one of the four fully guided lessons
 * before beginning. The choice is recorded when Begin Lesson is selected.
 */
export const SHOW_PRESET_SELECTOR = true;

/* Development-only escape hatches must remain unavailable to participants. */
const SHOW_DEVELOPER_LESSON_TOOLS = process.env.NODE_ENV !== "production";

/*
 * Post-lesson tools: swapping to another built-in example, and editing the Java
 * and running it for real.
 *
 * These are deliberately unavailable while the measured lesson is in progress.
 * The post-test asks about linked lists, so a participant who spends the
 * learning phase on the Stack example, or on code they wrote themselves,
 * produces data we cannot use. They unlock only once the lesson has reached its
 * terminal "complete" phase, at which point the measurement is already done and
 * exploring is a good thing.
 *
 * A developer keeps them everywhere, using the same guard as the preset picker,
 * so a production build compiles the mid-lesson path out entirely.
 */
export function showPostLessonTools(lessonPhase: string, hasFinishedLesson: boolean): boolean {
  return lessonPhase === "complete" || hasFinishedLesson || SHOW_DEVELOPER_LESSON_TOOLS;
}

/*
 * Preset ids the interactive guided walkthrough has narration written for.
 *
 * The walkthrough calls out specific source lines ("Run line 3: Node head =
 * new Node(10);"), so pointing it at any other example would have it
 * confidently describe code that is not on screen. That is worse than showing
 * no guide at all. Add an id here only once InteractiveWalkthrough actually
 * carries steps for it.
 */
export const WALKTHROUGH_PRESET_IDS: readonly string[] = [
  "linkedlist",
  "arraylist",
  "stack",
  "livetrace",
];

/*
 * Examples a participant may switch to after finishing the lesson.
 *
 * Every example listed here has a matching required walkthrough. Live Trace is
 * included after its raw JDI events are condensed into meaningful Java actions
 * in the visualizer preset.
 */
export const SWITCHABLE_PRESET_IDS: readonly string[] = [
  "linkedlist",
  "arraylist",
  "stack",
  "livetrace",
];

/*
 * Whether the guided walkthrough has content for this preset. Code the
 * participant wrote and ran themselves never has narration, so it is always
 * false there, regardless of the id the tracer hands back.
 */
export function hasGuidedWalkthrough(presetId: string, isCustomCode = false): boolean {
  if (isCustomCode) return false;
  return WALKTHROUGH_PRESET_IDS.includes(presetId);
}

/* How long the browser waits on /api/trace before giving up, in milliseconds. */
export const TRACE_REQUEST_TIMEOUT_MS = 25_000;

/*
 * Deterministic condition assignment from the atomic sequence number.
 * Shared by the client (to render the right branch) and the server (to store
 * the condition when the participant row is created).
 */
export function conditionForSeq(seq: number): Condition {
  if (!RAND_LEARNING_TOOL) return "ai";
  return seq % 2 === 1 ? "ai" : "static";
}

/*
 * Rough time the external questionnaire takes, shown on the handoff screen.
 * PLACEHOLDER: confirm the real number against the Microsoft Form.
 */
export const QUESTIONNAIRE_MINUTES = 5;

/* Dev jump signal for previewing the thank-you state inside HandoffScreen. */
export const DEV_THANK_YOU_STORAGE_KEY = "visualizer-dev-thank-you";
export const DEV_THANK_YOU_EVENT = "visualizer:dev-show-thank-you";

/* External Microsoft Forms questionnaire URL. Public link, safe for browser. */
export const MSFORMS_URL = process.env.NEXT_PUBLIC_MSFORMS_URL ?? "";
