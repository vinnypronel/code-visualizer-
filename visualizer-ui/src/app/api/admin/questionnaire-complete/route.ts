import { isAdminAuthenticated } from "@/lib/adminAuth";
import { markQuestionnaireFinished } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      participant_id?: string;
      finished_at?: string;
    };
    const participantId = body.participant_id?.trim();
    if (!participantId || !/^P\d{3,}$/.test(participantId)) {
      return Response.json({ error: "A valid participant_id is required" }, { status: 400 });
    }

    const finishedAt = body.finished_at ?? new Date().toISOString();
    if (!Number.isFinite(new Date(finishedAt).getTime())) {
      return Response.json({ error: "finished_at must be an ISO timestamp" }, { status: 400 });
    }

    const updated = await markQuestionnaireFinished(participantId, finishedAt);
    if (!updated) return Response.json({ error: "Participant not found" }, { status: 404 });
    return Response.json({ ok: true, participant_id: participantId, finished_at: finishedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update questionnaire status";
    return Response.json({ error: message }, { status: 500 });
  }
}
