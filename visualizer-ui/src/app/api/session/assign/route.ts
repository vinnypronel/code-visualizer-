/*
 * POST /api/session/assign
 *
 * Called once, immediately after a participant consents. Mints the participant
 * ID atomically via the Supabase RPC (never on the client), stores the
 * condition and consent timestamp, and returns { participant_id, seq,
 * condition }. The condition is decided by the RAND_LEARNING_TOOL flag and the
 * atomic sequence parity inside the RPC.
 */

import { RAND_LEARNING_TOOL } from "@/lib/studyConfig";
import { callRpc } from "@/lib/supabaseServer";
import type { AssignResponse } from "@/lib/studyTypes";

// Never cache; every call must mint a fresh ID at request time.
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const rows = await callRpc<AssignResponse[]>("assign_participant", {
      p_randomize: RAND_LEARNING_TOOL,
    });
    const row = Array.isArray(rows) ? rows[0] : (rows as AssignResponse);
    if (!row || !row.participant_id) {
      throw new Error("assign_participant returned no row");
    }
    return Response.json(row satisfies AssignResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "assignment failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
