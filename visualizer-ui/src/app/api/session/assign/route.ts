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
import { randomUUID } from "node:crypto";

// Never cache; every call must mint a fresh ID at request time.
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSIGN_ATTEMPTS = 3;

export async function POST(request: Request) {
  try {
    let body: {
      assignment_request_id?: string;
      session_token?: string;
    } = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as typeof body;
      }
    } catch {
      // Older cached clients sent an empty body. They still receive a secure,
      // unique assignment instead of being rejected with status 400.
    }

    const assignmentRequestId = UUID_PATTERN.test(body.assignment_request_id ?? "")
      ? body.assignment_request_id as string
      : randomUUID();
    const sessionToken = UUID_PATTERN.test(body.session_token ?? "")
      ? body.session_token as string
      : randomUUID();

    let rows: AssignResponse[] | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < ASSIGN_ATTEMPTS; attempt += 1) {
      try {
        rows = await callRpc<AssignResponse[]>("assign_participant", {
          p_randomize: RAND_LEARNING_TOOL,
          p_consent_version: CONSENT_VERSION,
          p_assignment_request_id: assignmentRequestId,
          p_session_token: sessionToken,
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt < ASSIGN_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
        }
      }
    }
    if (!rows) throw lastError ?? new Error("assignment failed");

    const row = Array.isArray(rows) ? rows[0] : (rows as AssignResponse);
    if (!row || !row.participant_id || !row.session_token) {
      throw new Error("assign_participant returned no row");
    }
    return Response.json(row satisfies AssignResponse, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "assignment failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
