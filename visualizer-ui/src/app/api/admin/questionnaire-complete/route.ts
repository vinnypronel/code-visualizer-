import { isAdminAuthenticated } from "@/lib/adminAuth";
import { markQuestionnaireFinished } from "@/lib/supabaseServer";
import { acceptsJsonBody, isSameOriginMutation, noStoreHeaders } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return Response.json({ error: "Request not allowed." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders() });
  }
  if (!acceptsJsonBody(request, 8_192)) {
    return Response.json({ error: "Invalid request." }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    const body = (await request.json()) as {
      participant_id?: string;
      finished_at?: string;
    };
    const participantId = body.participant_id?.trim();
    if (!participantId || !/^P\d{3,}$/.test(participantId)) {
      return Response.json({ error: "A valid participant_id is required" }, { status: 400, headers: noStoreHeaders() });
    }

    const finishedAt = body.finished_at ?? new Date().toISOString();
    if (!Number.isFinite(new Date(finishedAt).getTime())) {
      return Response.json({ error: "finished_at must be an ISO timestamp" }, { status: 400, headers: noStoreHeaders() });
    }

    const updated = await markQuestionnaireFinished(participantId, finishedAt);
    if (!updated) return Response.json({ error: "Participant not found" }, { status: 404, headers: noStoreHeaders() });
    return Response.json({ ok: true, participant_id: participantId, finished_at: finishedAt }, { headers: noStoreHeaders() });
  } catch (err) {
    console.error("Questionnaire status update failed", err);
    return Response.json(
      { error: "Could not update questionnaire status." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
}
