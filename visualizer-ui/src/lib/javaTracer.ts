/*
 * Server-only bridge to the java_jail tracer.
 *
 * java_jail's traceprinter reads one JSON job on stdin and writes one JSON
 * trace on stdout. We spawn it directly rather than through a shell, so the
 * participant's source is never interpolated into a command line and cannot be
 * used for shell injection. The child is killed on a wall clock timeout and its
 * output is capped, because the code being traced is not trusted.
 *
 * Failures are returned as values, never thrown, so the route handler can turn
 * each one into a message a student can act on.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import {
  JAVA_BIN,
  JAVA_JAIL_CLASSPATH,
  JAVA_JAIL_DIR,
  MAX_TRACE_OUTPUT_BYTES,
  TRACER_MAIN_CLASS,
  TRACE_TIMEOUT_MS,
} from "@/lib/tracerConfig";

/* One entry in java_jail's trace array. Only the fields we consume are typed. */
export interface JailFrame {
  func_name: string;
  encoded_locals: Record<string, unknown>;
  ordered_varnames: string[];
}

export interface JailStep {
  event: string;
  line: number | null;
  func_name?: string;
  stdout?: string;
  stack_to_render?: JailFrame[];
  heap?: Record<string, unknown>;
  exception_msg?: string;
}

export interface JailTrace {
  code: string;
  trace: JailStep[];
  userlog?: string;
}

export type TraceFailureKind = "compile" | "runtime" | "limit" | "internal";

export type TraceResult =
  | { ok: true; trace: JailTrace }
  | { ok: false; kind: TraceFailureKind; error: string };

/*
 * The tracer reports compile failures inside the trace as a single event rather
 * than as a non-zero exit code, so the caller has to look at the events, not at
 * the process result, to know whether the program built.
 */
const COMPILE_EVENTS = new Set(["uncaught_exception", "compile_error"]);

export async function runJavaTrace(code: string): Promise<TraceResult> {
  const payload = JSON.stringify({
    usercode: code,
    options: {},
    args: [],
    stdin: "",
  });

  const cwd = path.resolve(process.cwd(), JAVA_JAIL_DIR);
  const classpath = JAVA_JAIL_CLASSPATH.join(path.delimiter);

  let raw: string;
  try {
    raw = await spawnTracer(payload, cwd, classpath);
  } catch (err) {
    if (err instanceof TracerTimeout) {
      return {
        ok: false,
        kind: "limit",
        error:
          "Your program took too long to finish. Check for a loop or a recursion that never stops.",
      };
    }
    if (err instanceof TracerOverflow) {
      return {
        ok: false,
        kind: "limit",
        error:
          "Your program produced more output than the visualizer can show. Try a smaller example.",
      };
    }
    return {
      ok: false,
      kind: "internal",
      error: err instanceof Error ? err.message : "The tracer could not be started.",
    };
  }

  // The tracer writes a UTF-8 byte order mark, which JSON.parse rejects.
  const cleaned = raw.replace(/^﻿/, "").trim();
  if (!cleaned) {
    return { ok: false, kind: "internal", error: "The tracer returned nothing." };
  }

  let parsed: JailTrace;
  try {
    parsed = JSON.parse(cleaned) as JailTrace;
  } catch {
    return {
      ok: false,
      kind: "internal",
      error: "The tracer returned output that could not be read as JSON.",
    };
  }

  if (!Array.isArray(parsed.trace) || parsed.trace.length === 0) {
    return {
      ok: false,
      kind: "compile",
      error: parsed.userlog?.trim() || "Your code did not compile.",
    };
  }

  /*
   * A program that fails to compile still yields a one entry trace carrying the
   * compiler's message. That message is the most useful thing a student can
   * read, so it is passed through untouched.
   */
  const first = parsed.trace[0];
  if (parsed.trace.length === 1 && COMPILE_EVENTS.has(first.event)) {
    return {
      ok: false,
      kind: "compile",
      error: first.exception_msg?.trim() || parsed.userlog?.trim() || "Your code did not compile.",
    };
  }

  return { ok: true, trace: parsed };
}

class TracerTimeout extends Error {}
class TracerOverflow extends Error {}

function spawnTracer(payload: string, cwd: string, classpath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(JAVA_BIN, ["-cp", classpath, TRACER_MAIN_CLASS], {
      cwd,
      shell: false,
      windowsHide: true,
    });

    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new TracerTimeout()));
    }, TRACE_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_TRACE_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(() => reject(new TracerOverflow()));
        return;
      }
      chunks.push(chunk);
    });

    // Drained but ignored: the tracer reports program errors inside the trace.
    child.stderr.on("data", () => {});

    child.on("error", (err) => finish(() => reject(err)));
    child.on("close", () => finish(() => resolve(Buffer.concat(chunks).toString("utf8"))));

    child.stdin.on("error", () => {
      // A child that died before reading stdin surfaces through "close".
    });
    child.stdin.end(payload);
  });
}
