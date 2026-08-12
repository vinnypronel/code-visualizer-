/*
 * POST /api/session/assign
 *
 * Called once, immediately after a participant consents. Mints the participant
 * ID atomically via the Supabase RPC (never on the client), stores the
 * condition and consent timestamp, and returns { participant_id, seq,
 * condition }. The condition is decided by the RAND_LEARNING_TOOL flag and the
 * an atomic randomized block inside the RPC. A browser-generated request ID
 * makes a retry return the same assignment instead of creating a second row.
 */

import { CONSENT_VERSION, RAND_LEARNING_TOOL } from "@/lib/studyConfig";
import { callRpc } from "@/lib/supabaseServer";
import type { AssignResponse } from "@/lib/studyTypes";

// Never cache; every call must mint a fresh ID at request time.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      assignment_request_id?: string;
      session_token?: string;
    };
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      !body.assignment_request_id ||
      !body.session_token ||
      !uuidPattern.test(body.assignment_request_id) ||
      !uuidPattern.test(body.session_token)
    ) {
      return Response.json({ error: "Valid assignment and session IDs are required" }, { status: 400 });
    }
    const rows = await callRpc<AssignResponse[]>("assign_participant", {
      p_randomize: RAND_LEARNING_TOOL,
      p_consent_version: CONSENT_VERSION,
      p_assignment_request_id: body.assignment_request_id,
      p_session_token: body.session_token,
    });
    const row = Array.isArray(rows) ? rows[0] : (rows as AssignResponse);
    if (!row || !row.participant_id || !row.session_token) {
      throw new Error("assign_participant returned no row");
    }
    return Response.json(row satisfies AssignResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "assignment failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
