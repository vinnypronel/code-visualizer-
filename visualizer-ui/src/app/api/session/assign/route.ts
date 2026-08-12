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
import { acceptsJsonBody, isSameOriginMutation, noStoreHeaders } from "@/lib/requestSecurity";
import { verifyAssignmentChallenge } from "@/lib/turnstile";

// Never cache; every call must mint a fresh ID at request time.
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSIGN_ATTEMPTS = 3;

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request not allowed." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!acceptsJsonBody(request, 4_096)) {
    return Response.json({ error: "Invalid request." }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    let body: {
      assignment_request_id?: string;
      session_token?: string;
      turnstile_token?: string;
    } = {};
    try {
      const parsed: unknown = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as typeof body;
      }
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400, headers: noStoreHeaders() });
    }

    if (
      !UUID_PATTERN.test(body.assignment_request_id ?? "") ||
      !UUID_PATTERN.test(body.session_token ?? "")
    ) {
      return Response.json({ error: "Invalid assignment request." }, { status: 400, headers: noStoreHeaders() });
    }
    const assignmentRequestId = body.assignment_request_id as string;
    const sessionToken = body.session_token as string;
    const challengePassed = await verifyAssignmentChallenge(
      request,
      body.turnstile_token ?? "",
      assignmentRequestId,
    );
    if (!challengePassed) {
      return Response.json(
        { error: "Session verification failed. Please try again." },
        { status: 403, headers: noStoreHeaders() },
      );
    }

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
      headers: noStoreHeaders(),
    });
  } catch (err) {
    console.error("Participant assignment failed", err);
    return Response.json(
      { error: "We could not start the study session. Please try again." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}
