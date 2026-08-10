/*
 * POST /api/trace
 *
 * Runs participant-supplied Java through the java_jail tracer and returns a
 * Preset the visualizer can render directly, so edited code produces a real
 * trace rather than a hand-written one.
 *
 * This endpoint executes untrusted code. It is gated on ALLOW_CODE_EXECUTION,
 * which is development only by default; see the note in lib/tracerConfig.ts.
 * It is deliberately NOT part of the study flow: participants never reach it
 * during the measured lesson.
 */

import { runJavaTrace } from "@/lib/javaTracer";
import { traceToPreset } from "@/lib/traceToPreset";
import { ALLOW_CODE_EXECUTION, MAX_SOURCE_LENGTH } from "@/lib/tracerConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!ALLOW_CODE_EXECUTION) {
    return Response.json(
      {
        ok: false,
        kind: "config",
        error: "Running your own code is turned off in this build.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, kind: "internal", error: "The request body was not valid JSON." },
      { status: 400 },
    );
  }

  const code = (body as { code?: unknown })?.code;
  if (typeof code !== "string" || code.trim() === "") {
    return Response.json(
      { ok: false, kind: "internal", error: "No code was submitted." },
      { status: 400 },
    );
  }

  if (code.length > MAX_SOURCE_LENGTH) {
    return Response.json({
      ok: false,
      kind: "limit",
      error: `Your program is longer than the ${MAX_SOURCE_LENGTH} character limit.`,
    });
  }

  const result = await runJavaTrace(code);
  if (!result.ok) {
    // 200 with ok:false: the request was fine, the program was not. The client
    // shows result.error to the student verbatim.
    return Response.json({ ok: false, kind: result.kind, error: result.error });
  }

  const { preset, truncated } = traceToPreset(result.trace, code);
  return Response.json({ ok: true, preset, truncated });
}
