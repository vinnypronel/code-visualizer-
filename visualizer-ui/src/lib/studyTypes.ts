/*
 * Shared study-harness types. Used by the client provider, the study screens,
 * and the server route handlers so the two sides agree on shapes.
 */

/* Which learning-phase condition a participant is assigned to. */
export type Condition = "ai" | "static";

/*
 * The participant flow, as a linear state machine. "declined" is a terminal
 * leaf reached only when a participant does not consent (no ID is minted).
 */
export type Phase =
  | "consent"
  | "declined"
  | "assigned"
  | "pretest"
  | "learning"
  | "posttest"
  | "handoff";

/*
 * Test responses are a flat map keyed by a stable question/field id, e.g.
 * "q1.base_case", "q1.trace.step3", "q2.table.step2.a". Pre-test and post-test
 * use the SAME key scheme so analysis is symmetric across the two.
 */
export type TestResponses = Record<string, string>;

/* How a timed test ended. */
export type EndedBy = "timer" | "manual";

/* The subset of session state the client tracks in memory during a run. */
export interface SessionState {
  participantId: string | null;
  seq: number | null;
  condition: Condition | null;
  phase: Phase;
  pretestResponses: TestResponses;
  posttestResponses: TestResponses;
}

/* Response shape returned by POST /api/session/assign. */
export interface AssignResponse {
  participant_id: string;
  seq: number;
  condition: Condition;
}

/*
 * Events posted to POST /api/session/log. The server stamps its own
 * authoritative timestamp per event; `clientTimestamp` is recorded for
 * reference only. `payload` carries event-specific fields (ended_by,
 * responses, etc.).
 */
export type LogEvent =
  | "pretest_started"
  | "pretest_finished"
  | "learning_started"
  | "learning_continue"
  | "posttest_started"
  | "posttest_finished"
  | "questionnaire_shown"
  | "questionnaire_finished";

export interface LogRequestBody {
  participant_id: string;
  event: LogEvent;
  clientTimestamp: string;
  payload?: {
    ended_by?: EndedBy;
    responses?: TestResponses;
    elapsed_seconds?: number;
  };
}
