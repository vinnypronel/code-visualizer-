/*
 * Maps a java_jail trace into the shapes the visualizer already renders.
 *
 * This is the loader that was missing. Before it existed, every example on
 * screen was a hand-transcribed TypeScript array, which is why only the four
 * built-in lessons could ever be shown. With this, any traced program renders
 * through exactly the same components.
 *
 * java_jail encodings, confirmed by running the tracer rather than by reading
 * docs:
 *   frame.func_name       "main:3", that is name:line
 *   encoded_locals        { "head": ["REF", 347], "value": 10 }
 *   heap                  { "347": ["INSTANCE", "Node", ["value", 10], ["next", null]] }
 *   arrays                ["ARRAY", 1, 2, 3]
 *   a void return         { "__return__": ["VOID"] }
 *
 * Anchor ids must match what MemoryExecutionView puts in the DOM, since arrows
 * are drawn by querying those attributes:
 *   stack variable        stack-<name>
 *   heap object           heap-<id>
 *   heap field            heap-<id>-<field>
 *   array slot            heap-<id>-<index>
 * and spotlight fields are addressed as "<id>-<field>".
 */

import type {
  ExecutionStep,
  HeapObject,
  Preset,
  RefArrow,
  StackFrame,
  StackVariable,
} from "@/types/visualizer";
import type { JailStep, JailTrace } from "@/lib/javaTracer";
import { MAX_STEPS } from "@/lib/tracerConfig";

/*
 * The type is required by ExecutionStep but carries no meaning for a traced
 * program, so it stays neutral rather than inventing pedagogy the tracer cannot
 * support.
 */
const NEUTRAL_DIAGRAM = {
  type: "variable" as const,
  title: "Your program",
  description: "This step came from running your own code.",
  svgMarkup: "",
};

export interface MappedTrace {
  preset: Preset;
  truncated: boolean;
}

export function traceToPreset(trace: JailTrace, code: string): MappedTrace {
  /*
   * Two shaping decisions happen here, and both exist to match how the
   * hand-written lessons read.
   *
   * First, constructor frames are dropped. The JVM really does jump into
   * Node's constructor on `new Node(10)`, push a frame holding `this`, and
   * leave `value` at 0 for a couple of steps before assigning it. That is true,
   * but a student reading it sees the highlight leap to a line they did not
   * run, a variable they were never taught, and a value that looks wrong. The
   * lesson deliberately shows `new Node(10)` as one step, so generated traces
   * do the same. Ordinary method calls are NOT collapsed, since watching a
   * frame get pushed and popped is the point of tracing.
   *
   * Second, the tracer's `line` means "about to execute this line", while the
   * renderer's steps mean "here is the state after that line ran". So each
   * emitted step pairs the line from one tracer step with the memory state of
   * the next one.
   */
  const visible = trace.trace.filter(
    (step) =>
      step.event !== "instruction_limit_reached" &&
      step.line !== null &&
      !isInsideConstructor(step),
  );

  /*
   * The JVM hands out ids like 347 and 348. The renderer labels objects from
   * those ids, and its friendly labels ("[Object 1]") are keyed on the small
   * numbers the hand-written lessons use. Renumbering in order of first
   * appearance means a traced program is labelled the same way the lesson is,
   * instead of exposing raw JVM addresses to a first-year student.
   */
  const objectIds = new Map<string, string>();
  const renumber = (id: string) => {
    const existing = objectIds.get(id);
    if (existing) return existing;
    const next = String(101 + objectIds.size);
    objectIds.set(id, next);
    return next;
  };

  const frames: Array<{ line: number | null; step: JailStep; state: MemoryState }> = [];
  for (const step of visible) {
    const state = mapState(step, renumber);
    const last = frames[frames.length - 1];
    // Drops the "call" then "step_line" pair the tracer emits for one position.
    if (last && last.line === step.line && sameState(last.state, state)) continue;
    frames.push({ line: step.line, step, state });
  }

  if (frames.length === 0) {
    return {
      preset: { id: "custom", name: "Your code", code, steps: [emptyStep(code)] },
      truncated: false,
    };
  }

  const mapped: ExecutionStep[] = [
    {
      lineHighlight: frames[0].line,
      ...frames[0].state,
      arrows: collectArrows(frames[0].state.stack, frames[0].state.heap),
      explanation: "The program is about to start.",
      bananaDiagram: NEUTRAL_DIAGRAM,
      spotlightStackVars: [],
      spotlightHeapObjects: [],
      spotlightHeapFields: [],
      stdout: frames[0].step.stdout ?? "",
    },
  ];

  for (let i = 1; i < frames.length && mapped.length < MAX_STEPS; i += 1) {
    const ranLine = frames[i - 1].line;
    const { state, step } = frames[i];
    const spotlight = diffAgainst(mapped[mapped.length - 1], state.stack, state.heap);

    mapped.push({
      lineHighlight: ranLine,
      ...state,
      arrows: collectArrows(state.stack, state.heap),
      explanation: describe(step, ranLine),
      bananaDiagram: NEUTRAL_DIAGRAM,
      spotlightStackVars: spotlight.vars,
      spotlightHeapObjects: spotlight.objects,
      spotlightHeapFields: spotlight.fields,
      stdout: step.stdout ?? "",
    });
  }

  return {
    preset: { id: "custom", name: "Your code", code, steps: mapped },
    truncated: mapped.length >= MAX_STEPS,
  };
}

/*
 * True while execution is inside a constructor body. The tracer names such
 * frames "<init>:13", so the topmost frame is the one to test.
 */
function isInsideConstructor(step: JailStep): boolean {
  const top = step.stack_to_render?.[0]?.func_name ?? "";
  return top.startsWith("<init>");
}

interface MemoryState {
  stack: StackFrame[];
  heap: Record<string, HeapObject>;
}

type Renumber = (jvmId: string) => string;

function mapState(step: JailStep, renumber: Renumber): MemoryState {
  const heap = mapHeap(step.heap ?? {}, renumber);
  const stack = (step.stack_to_render ?? []).map((frame) => mapFrame(frame, heap, renumber));
  return { stack, heap };
}

function sameState(a: MemoryState, b: MemoryState): boolean {
  return (
    JSON.stringify(a.stack) === JSON.stringify(b.stack) &&
    JSON.stringify(a.heap) === JSON.stringify(b.heap)
  );
}

/* Frame names arrive as "main:3"; the line number is shown elsewhere already. */
function mapFrame(
  frame: { func_name: string; encoded_locals: Record<string, unknown>; ordered_varnames: string[] },
  heap: Record<string, HeapObject>,
  renumber: Renumber,
): StackFrame {
  const order = frame.ordered_varnames ?? Object.keys(frame.encoded_locals ?? {});
  const variables: StackVariable[] = [];

  for (const name of order) {
    if (!(name in (frame.encoded_locals ?? {}))) continue;
    const encoded = frame.encoded_locals[name];
    // A void return carries no value worth showing on the workbench.
    if (isVoid(encoded)) continue;
    variables.push({
      name: name === "__return__" ? "return" : name,
      type: typeOf(encoded, heap, renumber),
      value: displayValue(encoded, renumber),
      isReference: isRef(encoded),
    });
  }

  return { methodName: frame.func_name.split(":")[0], variables };
}

function mapHeap(raw: Record<string, unknown>, renumber: Renumber): Record<string, HeapObject> {
  const out: Record<string, HeapObject> = {};

  for (const [jvmId, encoded] of Object.entries(raw)) {
    if (!Array.isArray(encoded)) continue;
    const kind = encoded[0];
    const id = renumber(jvmId);

    if (kind === "INSTANCE") {
      const fields = encoded.slice(2).filter(Array.isArray) as unknown[][];
      out[id] = {
        id,
        className: String(encoded[1] ?? "Object"),
        fields: fields.map((pair) => ({
          name: String(pair[0]),
          type: typeOf(pair[1], out, renumber),
          value: displayValue(pair[1], renumber),
          isReference: isRef(pair[1]),
        })),
      };
      continue;
    }

    if (kind === "ARRAY") {
      out[id] = {
        id,
        className: "array",
        isArray: true,
        arrayValues: encoded.slice(1).map((v) => displayValue(v, renumber)),
      };
    }
  }

  return out;
}

/*
 * Every reference becomes an arrow, whether it starts on the workbench or
 * inside another object. Ids are deduplicated because the same variable can
 * appear in more than one frame.
 */
function collectArrows(stack: StackFrame[], heap: Record<string, HeapObject>): RefArrow[] {
  const arrows: RefArrow[] = [];
  const seen = new Set<string>();

  const push = (source: string, target: string, label: string, color: string) => {
    const id = `${source}->${target}`;
    if (seen.has(id)) return;
    seen.add(id);
    arrows.push({ id, source, target, label, color });
  };

  for (const frame of stack) {
    for (const variable of frame.variables) {
      if (!variable.isReference) continue;
      const target = refId(variable.value);
      if (!target || !heap[target]) continue;
      push(`stack-${variable.name}`, `heap-${target}`, variable.name, "blue");
    }
  }

  for (const object of Object.values(heap)) {
    for (const field of object.fields ?? []) {
      if (!field.isReference) continue;
      const target = refId(field.value);
      if (!target || !heap[target]) continue;
      push(`heap-${object.id}-${field.name}`, `heap-${target}`, field.name, "purple");
    }
  }

  return arrows;
}

/* What changed since the previous step, which drives the CHANGED markers. */
function diffAgainst(
  previous: ExecutionStep | null,
  stack: StackFrame[],
  heap: Record<string, HeapObject>,
) {
  const vars: string[] = [];
  const objects: string[] = [];
  const fields: string[] = [];

  const before = new Map<string, string>();
  for (const frame of previous?.stack ?? []) {
    for (const variable of frame.variables) {
      before.set(`${frame.methodName}.${variable.name}`, variable.value);
    }
  }

  for (const frame of stack) {
    for (const variable of frame.variables) {
      const key = `${frame.methodName}.${variable.name}`;
      if (before.get(key) !== variable.value) vars.push(variable.name);
    }
  }

  const previousHeap = previous?.heap ?? {};
  for (const [id, object] of Object.entries(heap)) {
    const old = previousHeap[id];
    if (!old) {
      objects.push(id);
      continue;
    }
    for (const field of object.fields ?? []) {
      const oldField = (old.fields ?? []).find((f) => f.name === field.name);
      if (!oldField || oldField.value !== field.value) fields.push(`${id}-${field.name}`);
    }
    (object.arrayValues ?? []).forEach((value, index) => {
      if ((old.arrayValues ?? [])[index] !== value) fields.push(`${id}-${index}`);
    });
  }

  return { vars, objects, fields };
}

/*
 * Plain factual sentences only. The tracer knows what happened, it does not
 * know why, and inventing a reason would be worse than saying nothing.
 */
function describe(step: JailStep, ranLine: number | null): string {
  const method = step.stack_to_render?.[0]?.func_name?.split(":")[0];
  const where = ranLine !== null ? `Line ${ranLine} ran.` : "The next statement ran.";

  switch (step.event) {
    case "call":
      return method
        ? `${where} ${method} was called, so a new stack frame appeared for it.`
        : `${where} A method was called, so a new stack frame appeared.`;
    case "return":
      return method
        ? `${where} ${method} is about to return.`
        : `${where} The method is about to return.`;
    case "exception":
    case "uncaught_exception":
      return step.exception_msg?.trim() || "The program threw an exception.";
    default:
      return where;
  }
}

function emptyStep(code: string): ExecutionStep {
  return {
    lineHighlight: firstBodyLine(code),
    stack: [],
    heap: {},
    arrows: [],
    explanation: "Your program ran but produced no steps to show.",
    bananaDiagram: NEUTRAL_DIAGRAM,
    stdout: "",
  };
}

function firstBodyLine(code: string): number {
  const index = code.split("\n").findIndex((line) => line.includes("main("));
  return index >= 0 ? index + 2 : 1;
}

function isRef(value: unknown): value is [string, number] {
  return Array.isArray(value) && value[0] === "REF";
}

function isVoid(value: unknown): boolean {
  return Array.isArray(value) && value[0] === "VOID";
}

function refId(display: string): string | null {
  const match = /^@?(\d+)$/.exec(display.trim());
  return match ? match[1] : null;
}

function displayValue(value: unknown, renumber: Renumber): string {
  if (isRef(value)) return renumber(String(value[1]));
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return String(value[0]);
  return String(value);
}

function typeOf(value: unknown, heap: Record<string, HeapObject>, renumber: Renumber): string {
  if (isRef(value)) return heap[renumber(String(value[1]))]?.className ?? "Object";
  if (value === null) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "int" : "double";
  if (typeof value === "string") return "String";
  return "";
}
