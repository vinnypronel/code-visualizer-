/*
 * Derived study metrics for the admin dashboard.
 *
 * Everything here is a pure function over the raw `sessions` rows, so the
 * dashboard can recompute the same numbers on the client when the researcher
 * filters by condition. Nothing in this module touches the network.
 *
 * Scoring caveat: the study harness stores answers verbatim and grades nothing.
 * The keys below are the correct answers for the two Q1 trace tables, and
 * matching is a normalized string compare (quotes, spacing and slashes
 * ignored). It is a fast comparative signal, not a substitute for the
 * researcher reading the raw responses, which is why every scored row can be
 * opened and inspected in the dashboard.
 */

import type { Condition, TestResponses } from "@/lib/studyTypes";

/* One row of public.sessions, as returned by PostgREST. */
export interface SessionRow {
  participant_id: string;
  seq: number;
  condition: Condition;
  consent_completed_at: string | null;
  pretest_started_at: string | null;
  pretest_finished_at: string | null;
  pretest_ended_by: string | null;
  learning_started_at: string | null;
  learning_completed_at: string | null;
  learning_continue_at: string | null;
  posttest_started_at: string | null;
  posttest_finished_at: string | null;
  posttest_ended_by: string | null;
  questionnaire_shown_at: string | null;
  questionnaire_finished_at: string | null;
  pretest_responses: TestResponses | null;
  posttest_responses: TestResponses | null;
  examples_tried: string[] | null;
  created_at: string;
}

/* ── Answer keys ────────────────────────────────────────────────────── */

/*
 * Pre-test Q1: Dog a("Rex",3); Dog b("Bella",5); c = b; b.name = "Max"; b = a;
 * Post-test Q1: Book x("Java",300); Book y("Python",250); z = x; x.title="C++"; x = y;
 * Keys mirror the ids emitted by src/data/tests.ts.
 */
export const PRETEST_KEY: Record<string, string> = {
  "q1.table.step2.col_a": "Rex / 3",
  "q1.table.step2.col_b": "Bella / 5",
  "q1.table.step2.col_c": "(not yet created)",
  "q1.table.step3.col_a": "Rex / 3",
  "q1.table.step3.col_b": "Bella / 5",
  "q1.table.step3.col_c": "Bella / 5",
  "q1.table.step4.col_a": "Rex / 3",
  "q1.table.step4.col_b": "Max / 5",
  "q1.table.step4.col_c": "Max / 5",
  "q1.table.step5.col_a": "Rex / 3",
  "q1.table.step5.col_b": "Rex / 3",
  "q1.table.step5.col_c": "Max / 5",
  "q1.output.line1": "Rex, 3",
  "q1.output.line2": "Max, 5",
};

export const POSTTEST_KEY: Record<string, string> = {
  "q1.table.step2.col_a": "Java / 300",
  "q1.table.step2.col_b": "Python / 250",
  "q1.table.step2.col_c": "(not yet created)",
  "q1.table.step3.col_a": "Java / 300",
  "q1.table.step3.col_b": "Python / 250",
  "q1.table.step3.col_c": "Java / 300",
  "q1.table.step4.col_a": "C++ / 300",
  "q1.table.step4.col_b": "Python / 250",
  "q1.table.step4.col_c": "C++ / 300",
  "q1.table.step5.col_a": "Python / 250",
  "q1.table.step5.col_b": "Python / 250",
  "q1.table.step5.col_c": "C++ / 300",
  "q1.output.line1": "Python, 250",
  "q1.output.line2": "C++, 300",
};

export const ITEMS_PER_TEST = Object.keys(PRETEST_KEY).length;

/*
 * Normalizes an answer so cosmetic differences do not count as wrong:
 * lowercased, quotes and whitespace stripped, separators unified. "Rex" / 3,
 * Rex/3 and rex , 3 all collapse to the same token.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[,/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ItemResult {
  key: string;
  given: string;
  expected: string;
  correct: boolean;
}

export interface ScoreResult {
  correct: number;
  total: number;
  answered: number;
  percent: number | null;
  items: ItemResult[];
}

export function scoreTest(
  responses: TestResponses | null,
  key: Record<string, string>,
): ScoreResult | null {
  if (!responses || Object.keys(responses).length === 0) return null;
  const items: ItemResult[] = Object.entries(key).map(([k, expected]) => {
    const given = responses[k] ?? "";
    return { key: k, given, expected, correct: normalize(given) === normalize(expected) };
  });
  const correct = items.filter((i) => i.correct).length;
  const answered = items.filter((i) => i.given.trim() !== "").length;
  return {
    correct,
    total: items.length,
    answered,
    percent: Math.round((correct / items.length) * 100),
    items,
  };
}

/* ── Per-participant derived view ───────────────────────────────────── */

/* Furthest point a participant reached, as an ordinal for the funnel. */
export const FUNNEL_STAGES = [
  "Consented",
  "Pre-test started",
  "Pre-test finished",
  "Learning started",
  "Post-test started",
  "Post-test finished",
  "Questionnaire shown",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round((ms / 60000) * 10) / 10;
}

export interface ParticipantView {
  row: SessionRow;
  participantId: string;
  seq: number;
  condition: Condition;
  pretest: ScoreResult | null;
  posttest: ScoreResult | null;
  /* Post-test percent minus pre-test percent, when both were submitted. */
  gain: number | null;
  pretestMinutes: number | null;
  learningMinutes: number | null;
  posttestMinutes: number | null;
  totalMinutes: number | null;
  examplesTried: string[];
  /* Reached the questionnaire handoff, i.e. finished the measured flow. */
  completed: boolean;
  /* AI-condition participants who never reached the lesson's terminal state. */
  lessonIncomplete: boolean;
  furthestStageIndex: number;
  furthestStage: FunnelStage;
}

export function toParticipantView(row: SessionRow): ParticipantView {
  const pretest = scoreTest(row.pretest_responses, PRETEST_KEY);
  const posttest = scoreTest(row.posttest_responses, POSTTEST_KEY);
  const reached = [
    row.consent_completed_at,
    row.pretest_started_at,
    row.pretest_finished_at,
    row.learning_started_at,
    row.posttest_started_at,
    row.posttest_finished_at,
    row.questionnaire_shown_at,
  ];
  let furthest = 0;
  reached.forEach((ts, i) => {
    if (ts) furthest = i;
  });

  return {
    row,
    participantId: row.participant_id,
    seq: row.seq,
    condition: row.condition,
    pretest,
    posttest,
    gain:
      pretest?.percent != null && posttest?.percent != null
        ? posttest.percent - pretest.percent
        : null,
    pretestMinutes: minutesBetween(row.pretest_started_at, row.pretest_finished_at),
    learningMinutes: minutesBetween(row.learning_started_at, row.learning_continue_at),
    posttestMinutes: minutesBetween(row.posttest_started_at, row.posttest_finished_at),
    totalMinutes: minutesBetween(row.consent_completed_at, row.questionnaire_shown_at),
    examplesTried: row.examples_tried ?? [],
    completed: Boolean(row.questionnaire_shown_at),
    lessonIncomplete: row.condition === "ai" && !row.learning_completed_at,
    furthestStageIndex: furthest,
    furthestStage: FUNNEL_STAGES[furthest],
  };
}

/* ── Aggregates ─────────────────────────────────────────────────────── */

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 10) / 10;
}

/* Population standard deviation. Reported alongside every small-n mean. */
export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

export interface ConditionSummary {
  condition: Condition;
  label: string;
  n: number;
  completed: number;
  pretestMean: number | null;
  pretestSd: number | null;
  posttestMean: number | null;
  posttestSd: number | null;
  gainMean: number | null;
  gainSd: number | null;
  scoredPairs: number;
  learningMedian: number | null;
  pretestMedian: number | null;
  posttestMedian: number | null;
}

const CONDITION_LABEL: Record<Condition, string> = {
  ai: "AI visualizer",
  static: "Static materials",
};

export function conditionLabel(condition: Condition): string {
  return CONDITION_LABEL[condition];
}

export function summarizeCondition(
  views: ParticipantView[],
  condition: Condition,
): ConditionSummary {
  const group = views.filter((v) => v.condition === condition);
  const pre = group.map((v) => v.pretest?.percent).filter((n): n is number => n != null);
  const post = group.map((v) => v.posttest?.percent).filter((n): n is number => n != null);
  const gains = group.map((v) => v.gain).filter((n): n is number => n != null);
  return {
    condition,
    label: CONDITION_LABEL[condition],
    n: group.length,
    completed: group.filter((v) => v.completed).length,
    pretestMean: mean(pre),
    pretestSd: stdDev(pre),
    posttestMean: mean(post),
    posttestSd: stdDev(post),
    gainMean: mean(gains),
    gainSd: stdDev(gains),
    scoredPairs: gains.length,
    learningMedian: median(
      group.map((v) => v.learningMinutes).filter((n): n is number => n != null),
    ),
    pretestMedian: median(
      group.map((v) => v.pretestMinutes).filter((n): n is number => n != null),
    ),
    posttestMedian: median(
      group.map((v) => v.posttestMinutes).filter((n): n is number => n != null),
    ),
  };
}

/* Count of participants who reached at least each funnel stage. */
export function funnelCounts(views: ParticipantView[]): { stage: FunnelStage; count: number }[] {
  return FUNNEL_STAGES.map((stage, i) => ({
    stage,
    count: views.filter((v) => v.furthestStageIndex >= i).length,
  }));
}

/*
 * Per-item accuracy across a group, so the researcher can see which trace step
 * breaks down rather than only the aggregate score.
 */
export interface ItemAccuracy {
  key: string;
  label: string;
  correct: number;
  answered: number;
  n: number;
}

const ITEM_LABELS: Record<string, string> = {
  "q1.table.step2.col_a": "Step 2 - col 1",
  "q1.table.step2.col_b": "Step 2 - col 2",
  "q1.table.step2.col_c": "Step 2 - col 3",
  "q1.table.step3.col_a": "Step 3 - col 1",
  "q1.table.step3.col_b": "Step 3 - col 2",
  "q1.table.step3.col_c": "Step 3 - col 3",
  "q1.table.step4.col_a": "Step 4 - col 1",
  "q1.table.step4.col_b": "Step 4 - col 2",
  "q1.table.step4.col_c": "Step 4 - col 3",
  "q1.table.step5.col_a": "Step 5 - col 1",
  "q1.table.step5.col_b": "Step 5 - col 2",
  "q1.table.step5.col_c": "Step 5 - col 3",
  "q1.output.line1": "Output line 1",
  "q1.output.line2": "Output line 2",
};

export function itemAccuracy(
  views: ParticipantView[],
  which: "pretest" | "posttest",
): ItemAccuracy[] {
  const key = which === "pretest" ? PRETEST_KEY : POSTTEST_KEY;
  const scored = views.map((v) => v[which]).filter((s): s is ScoreResult => s != null);
  return Object.keys(key).map((k) => {
    const items = scored.map((s) => s.items.find((i) => i.key === k)).filter(Boolean) as ItemResult[];
    return {
      key: k,
      label: ITEM_LABELS[k] ?? k,
      correct: items.filter((i) => i.correct).length,
      answered: items.filter((i) => i.given.trim() !== "").length,
      n: scored.length,
    };
  });
}

export const EXAMPLE_LABELS: Record<string, string> = {
  linkedlist: "Linked list",
  arraylist: "ArrayList",
  stack: "Stack",
  livetrace: "Live trace",
};

export function exampleCounts(views: ParticipantView[]): { id: string; label: string; count: number }[] {
  return Object.keys(EXAMPLE_LABELS).map((id) => ({
    id,
    label: EXAMPLE_LABELS[id],
    count: views.filter((v) => v.examplesTried.includes(id)).length,
  }));
}

/* How each timed test ended, split by condition. */
export function endedByCounts(
  views: ParticipantView[],
  which: "pretest" | "posttest",
): { timer: number; manual: number } {
  const field = which === "pretest" ? "pretest_ended_by" : "posttest_ended_by";
  return {
    timer: views.filter((v) => v.row[field] === "timer").length,
    manual: views.filter((v) => v.row[field] === "manual").length,
  };
}

/* ── CSV export ─────────────────────────────────────────────────────── */

const CSV_COLUMNS: { header: string; get: (v: ParticipantView) => string | number | null }[] = [
  { header: "participant_id", get: (v) => v.participantId },
  { header: "seq", get: (v) => v.seq },
  { header: "condition", get: (v) => v.condition },
  { header: "completed", get: (v) => (v.completed ? "yes" : "no") },
  { header: "furthest_stage", get: (v) => v.furthestStage },
  { header: "pretest_correct", get: (v) => v.pretest?.correct ?? null },
  { header: "pretest_percent", get: (v) => v.pretest?.percent ?? null },
  { header: "posttest_correct", get: (v) => v.posttest?.correct ?? null },
  { header: "posttest_percent", get: (v) => v.posttest?.percent ?? null },
  { header: "gain_percent", get: (v) => v.gain },
  { header: "pretest_minutes", get: (v) => v.pretestMinutes },
  { header: "learning_minutes", get: (v) => v.learningMinutes },
  { header: "posttest_minutes", get: (v) => v.posttestMinutes },
  { header: "total_minutes", get: (v) => v.totalMinutes },
  { header: "pretest_ended_by", get: (v) => v.row.pretest_ended_by },
  { header: "posttest_ended_by", get: (v) => v.row.posttest_ended_by },
  { header: "lesson_completed", get: (v) => (v.row.learning_completed_at ? "yes" : "no") },
  { header: "examples_tried", get: (v) => v.examplesTried.join(" ") },
  { header: "consent_completed_at", get: (v) => v.row.consent_completed_at },
  { header: "questionnaire_shown_at", get: (v) => v.row.questionnaire_shown_at },
];

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(views: ParticipantView[]): string {
  const header = CSV_COLUMNS.map((c) => c.header).join(",");
  const rows = views.map((v) => CSV_COLUMNS.map((c) => csvCell(c.get(v))).join(","));
  return [header, ...rows].join("\n");
}
