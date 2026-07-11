/*
 * POST /api/session/log
 *
 * Records a lifecycle event for a participant. The SERVER stamps the
 * authoritative timestamp for each event; the client-sent timestamp is ignored
 * for the stored value (kept only in the request for reference). Maps each
 * event to the matching session columns and patches the row.
 */

import { patchSession } from "@/lib/supabaseServer";
import type { LogRequestBody } from "@/lib/studyTypes";

export const dynamic = "force-dynamic";

function patchForEvent(
  body: LogRequestBody,
  serverNow: string,
): Record<string, unknown> {
  const payload = body.payload ?? {};
  switch (body.event) {
    case "pretest_started":
      return { pretest_started_at: serverNow };
    case "pretest_finished":
      return {
        pretest_finished_at: serverNow,
        pretest_ended_by: payload.ended_by ?? null,
        pretest_responses: payload.responses ?? {},
      };
    case "learning_started":
      return { learning_started_at: serverNow };
    case "learning_continue":
      return { learning_continue_at: serverNow };
    case "posttest_started":
      return { posttest_started_at: serverNow };
    case "posttest_finished":
      return {
        posttest_finished_at: serverNow,
        posttest_ended_by: payload.ended_by ?? null,
        posttest_responses: payload.responses ?? {},
      };
    case "questionnaire_shown":
      return { questionnaire_shown_at: serverNow };
    default:
      throw new Error(`unknown event: ${String(body.event)}`);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LogRequestBody;
    if (!body?.participant_id || !body?.event) {
      return Response.json(
        { error: "participant_id and event are required" },
        { status: 400 },
      );
    }
    const serverNow = new Date().toISOString();
    const patch = patchForEvent(body, serverNow);
    await patchSession(body.participant_id, patch);
    return Response.json({ ok: true, serverTimestamp: serverNow });
  } catch (err) {
    const message = err instanceof Error ? err.message : "log failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
