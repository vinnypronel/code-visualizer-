/*
 * Authenticated, append-only study logging. The database RPC validates the
 * private per-session token, appends study_events, and updates the sessions
 * summary row atomically.
 */

import { callRpc } from "@/lib/supabaseServer";
import type { LogRequestBody } from "@/lib/studyTypes";
import { acceptsJsonBody, isSameOriginMutation, noStoreHeaders } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";

const CLIENT_EVENTS = new Set([
  "pretest_started", "pretest_finished", "learning_started",
  "learning_completed", "example_attempted", "learning_continue",
  "posttest_started", "posttest_finished", "questionnaire_shown",
  "questionnaire_opened",
]);
const EXAMPLE_IDS = new Set(["linkedlist", "arraylist", "stack", "livetrace"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESPONSE_KEYS = new Set([
  "q1.table.step2.col_a", "q1.table.step2.col_b", "q1.table.step2.col_c",
  "q1.table.step3.col_a", "q1.table.step3.col_b", "q1.table.step3.col_c",
  "q1.table.step4.col_a", "q1.table.step4.col_b", "q1.table.step4.col_c",
  "q1.table.step5.col_a", "q1.table.step5.col_b", "q1.table.step5.col_c",
  "q1.output.line1", "q1.output.line2",
]);

function responsesAreValid(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= RESPONSE_KEYS.size && entries.every(([key, answer]) => (
    RESPONSE_KEYS.has(key) && typeof answer === "string" && answer.length <= 250
  ));
}

function payloadIsValid(body: LogRequestBody): boolean {
  const payload = body.payload ?? {};
  if (payload.elapsed_seconds !== undefined && (
    !Number.isInteger(payload.elapsed_seconds) ||
    payload.elapsed_seconds < 0 ||
    payload.elapsed_seconds > 86_400
  )) return false;
  if (body.event === "example_attempted" || body.event === "learning_completed") {
    if (!payload.example_id || !EXAMPLE_IDS.has(payload.example_id)) return false;
  }
  if (body.event === "pretest_finished" || body.event === "posttest_finished") {
    if (payload.ended_by !== "timer" && payload.ended_by !== "manual") return false;
    if (!responsesAreValid(payload.responses)) return false;
  }
  return true;
}

function sanitizedPayload(body: LogRequestBody) {
  const payload = body.payload ?? {};
  return {
    ...(payload.elapsed_seconds === undefined ? {} : { elapsed_seconds: payload.elapsed_seconds }),
    ...(payload.ended_by === undefined ? {} : { ended_by: payload.ended_by }),
    ...(payload.example_id === undefined ? {} : { example_id: payload.example_id }),
    ...(payload.responses === undefined ? {} : { responses: payload.responses }),
  };
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request not allowed." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!acceptsJsonBody(request, 32_768)) {
    return Response.json({ error: "Invalid request." }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    let body: LogRequestBody;
    try {
      body = (await request.json()) as LogRequestBody;
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400, headers: noStoreHeaders() });
    }
    if (!body?.participant_id || !body?.session_token || !body?.event_id || !body?.event) {
      return Response.json(
        { error: "participant_id, session_token, event_id, and event are required" },
        { status: 400, headers: noStoreHeaders() },
      );
    }
    if (!CLIENT_EVENTS.has(body.event)) {
      return Response.json({ error: "Invalid client event" }, { status: 400, headers: noStoreHeaders() });
    }
    if (
      !/^P\d{3,}$/.test(body.participant_id) ||
      !UUID_PATTERN.test(body.session_token) ||
      !UUID_PATTERN.test(body.event_id) ||
      !Number.isFinite(new Date(body.clientTimestamp).getTime()) ||
      !payloadIsValid(body)
    ) {
      return Response.json({ error: "Invalid study event data" }, { status: 400, headers: noStoreHeaders() });
    }

    const serverTimestamp = await callRpc<string>("record_study_event", {
      p_participant_id: body.participant_id,
      p_session_token: body.session_token,
      p_event_id: body.event_id,
      p_event_type: body.event,
      p_client_timestamp: body.clientTimestamp,
      p_payload: sanitizedPayload(body),
    });

    return Response.json({ ok: true, serverTimestamp }, { headers: noStoreHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "log failed";
    const unauthorized = message.includes("invalid study session") || message.includes("28000");
    console.error("Study event logging failed", err);
    return Response.json(
      { error: unauthorized ? "Invalid study session." : "We could not save this study event." },
      { status: unauthorized ? 401 : 503, headers: noStoreHeaders() },
    );
  }
}
