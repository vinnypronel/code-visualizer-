"use client";

/*
 * The researcher dashboard.
 *
 * Rows arrive fully formed from the server component; every number on screen is
 * derived here so the condition filter recomputes without a round trip. The
 * layout goes compact study snapshot -> comparison -> flow -> per-item breakdown ->
 * raw participant table, which is the order a researcher reads the study in.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, LogOut, Minus, RefreshCw, X } from "lucide-react";
import { POSTTEST, PRETEST, type GridCell, type TestDef } from "@/data/tests";
import {
  conditionLabel,
  endedByCounts,
  EXAMPLE_LABELS,
  funnelCounts,
  itemAccuracy,
  mean,
  median,
  summarizeCondition,
  toCsv,
  toParticipantView,
  type ParticipantView,
  type SessionRow,
} from "@/lib/adminMetrics";
import type { Condition } from "@/lib/studyTypes";
import {
  Card,
  FunnelChart,
  HBarChart,
  ItemAccuracyGrid,
  Legend,
  PhaseTimePlot,
  SERIES,
} from "./charts";
import { GooglePairedScoreChart, type PairedScorePoint } from "./GooglePairedScoreChart";

type Filter = "all" | Condition;

const CONDITIONS: Condition[] = ["ai", "static"];

function pct(value: number | null, suffix = "%"): string {
  return value == null ? "-" : `${value}${suffix}`;
}

export default function AdminDashboard({
  rows,
  fetchedAt,
  error,
}: {
  rows: SessionRow[];
  fetchedAt: string;
  error: string | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [inspect, setInspect] = useState<ParticipantView | null>(null);

  const all = useMemo(() => rows.map(toParticipantView), [rows]);
  const views = useMemo(
    () => (filter === "all" ? all : all.filter((v) => v.condition === filter)),
    [all, filter],
  );

  const summaries = useMemo(() => CONDITIONS.map((c) => summarizeCondition(all, c)), [all]);
  const funnels = useMemo(() => CONDITIONS.map((condition) => ({
    condition,
    stages: funnelCounts(all.filter((view) => view.condition === condition)),
  })), [all]);
  const pairedViews = useMemo(() => views.filter((view) => view.gain != null), [views]);
  const preItems = useMemo(() => itemAccuracy(pairedViews, "pretest"), [pairedViews]);
  const postItems = useMemo(() => itemAccuracy(pairedViews, "posttest"), [pairedViews]);

  const scored = views.filter((v) => v.gain != null);
  const overallGain = mean(scored.map((v) => v.gain as number));
  const medianStudyMinutes = median(
    views.map((v) => v.studyMinutes).filter((n): n is number => n != null),
  );

  const pairedScorePoints: PairedScorePoint[] = views
    .filter((v) => v.pretest?.percent != null && v.posttest?.percent != null)
    .map((v) => ({
      id: v.participantId,
      condition: v.condition,
      pre: v.pretest!.percent!,
      post: v.posttest!.percent!,
    }));

  const preEnded = endedByCounts(views, "pretest");
  const postEnded = endedByCounts(views, "posttest");
  const aiSummary = summaries.find((summary) => summary.condition === "ai")!;
  const staticSummary = summaries.find((summary) => summary.condition === "static")!;
  const comparisonPairs = aiSummary.scoredPairs + staticSummary.scoredPairs;
  const baselineDifference = aiSummary.pretestMean == null || staticSummary.pretestMean == null
    ? null
    : Math.round(Math.abs(aiSummary.pretestMean - staticSummary.pretestMean) * 10) / 10;

  const timeGroups = CONDITIONS.map((condition) => {
    const group = all.filter((view) => view.condition === condition);
    const summary = summaries.find((candidate) => candidate.condition === condition)!;
    return {
      key: condition,
      label: conditionLabel(condition),
      color: SERIES[condition],
      phases: [
        { label: "Pre-test", values: group.map((v) => v.pretestMinutes).filter((n): n is number => n != null), median: summary.pretestMedian },
        { label: "Learning", values: group.map((v) => v.learningMinutes).filter((n): n is number => n != null), median: summary.learningMedian },
        { label: "Post-test", values: group.map((v) => v.posttestMinutes).filter((n): n is number => n != null), median: summary.posttestMedian },
      ],
    };
  });

  const aiParticipants = all.filter((view) => view.condition === "ai");
  const lessonEngagement = Object.entries(EXAMPLE_LABELS).map(([id, label]) => ({
    id,
    label,
    opened: aiParticipants.filter((view) => view.examplesTried.includes(id)).length,
    completed: aiParticipants.filter((view) => view.learningCompleted && view.measuredLessonId === id).length,
  }));

  function handleExport() {
    const blob = new Blob([toCsv(views)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-sessions-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const itemRows = preItems.map((p, i) => {
    const post = postItems[i];
    const breakdown = (item: typeof p | undefined) => item && item.n > 0 ? {
      correct: item.correct,
      incorrect: item.answered - item.correct,
      unanswered: item.n - item.answered,
      answered: item.answered,
      n: item.n,
      percent: Math.round((item.correct / item.n) * 100),
    } : null;
    return {
      label: p.label,
      pre: breakdown(p),
      post: breakdown(post),
    };
  });

  const comparisonScope = (
    <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: "#eef2f7", color: "var(--text-secondary)" }}>
      Always compares both conditions
    </span>
  );

  const filterButton = (value: Filter, label: string, count: number) => {
    const active = filter === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setFilter(value)}
        aria-pressed={active}
        className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
        style={{
          background: active ? "var(--accent)" : "var(--bg-panel)",
          borderColor: active ? "var(--accent)" : "#e2e8f0",
          color: active ? "#ffffff" : "var(--text-secondary)",
        }}
      >
        {label}
        <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
      </button>
    );
  };

  return (
    <main className="h-full overflow-y-auto" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto w-full max-w-[1280px] px-5 py-7 sm:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Study data dashboard
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              Pilot sessions from Supabase. Loaded {new Date(fetchedAt).toLocaleString()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--bg-panel)", borderColor: "#e2e8f0", color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={13} aria-hidden="true" />
              Back to Home
            </button>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--bg-panel)", borderColor: "#e2e8f0", color: "var(--text-secondary)" }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: "var(--action)" }}
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--bg-panel)", borderColor: "#e2e8f0", color: "var(--text-secondary)" }}
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{ background: "#fdeceb", color: "var(--danger)" }}
          >
            {error}
          </p>
        )}

        <div
          className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border px-4 py-3"
          style={{ background: "var(--bg-panel)", borderColor: "#e2e8f0" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Condition
            </span>
            {filterButton("all", "All", all.length)}
            {filterButton("ai", "AI visualizer", all.filter((v) => v.condition === "ai").length)}
            {filterButton("static", "Static materials", all.filter((v) => v.condition === "static").length)}
          </div>

          <div className="hidden h-9 w-px xl:block" style={{ background: "#e2e8f0" }} />

          <dl className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-x-6 gap-y-2 xl:justify-end">
            {[
              { label: "Participants", value: String(views.length), detail: `${all.length} total` },
              { label: "Scored pairs", value: String(scored.length), detail: "pre + post" },
              { label: "Mean gain", value: pct(overallGain, " pp"), detail: "paired participants" },
              { label: "Study duration", value: medianStudyMinutes == null ? "-" : `${medianStudyMinutes}m`, detail: "consent to post-test · median" },
            ].map((metric) => (
              <div key={metric.label} className="flex items-baseline gap-2 whitespace-nowrap">
                <dt className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {metric.label}
                </dt>
                <dd className="text-base font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {metric.value}
                </dd>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {metric.detail}
                </span>
              </div>
            ))}
          </dl>
        </div>

        <Card
          title="Pilot score results"
          subtitle="A compact descriptive check for a very small pilot sample"
          actions={comparisonScope}
          className="mb-5"
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr]">
            {summaries.map((summary) => (
              <section key={summary.condition} className="rounded-xl border p-4" style={{ borderColor: "#dbe4ef", background: "#f8fafc" }}>
                <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[summary.condition] }} />
                  {summary.label}
                </h3>
                <p className="mt-4 flex items-center gap-2 text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  <span>{pct(summary.pretestMean)}</span>
                  <span className="text-base font-normal" style={{ color: "var(--text-muted)" }}>→</span>
                  <span>{pct(summary.posttestMean)}</span>
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Average pre-test → average post-test</p>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: "#dbe4ef" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Average change</span>
                  <strong className="tabular-nums" style={{ color: "var(--text-primary)" }}>{pct(summary.gainMean, " pp")}</strong>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>{summary.scoredPairs} paired participant{summary.scoredPairs === 1 ? "" : "s"}</p>
              </section>
            ))}

            <section className="rounded-xl border p-4" style={{ borderColor: "#f0cf7a", background: "#fff8e6" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#6b4b00" }}>How to use this pilot result</h3>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: "#6b4b00" }}>
                The conditions started <strong>{baselineDifference == null ? "—" : `${baselineDifference} percentage points`}</strong> apart on average.
                With only {comparisonPairs} paired participants, review each person&apos;s record below and use these numbers to check the study workflow and data collection—not to decide which condition performs better.
              </p>
            </section>
          </div>
        </Card>

        <Card
          title="Individual pilot results"
          subtitle="Every paired participant's exact pre-test score, post-test score, and change"
          actions={<span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Responds to the condition filter</span>}
          className="mb-5"
        >
          <GooglePairedScoreChart points={pairedScorePoints} />
        </Card>

        <Card title="Completion funnel by condition" subtitle="Stage-to-stage and overall retention; the largest loss is highlighted" actions={comparisonScope} className="mb-5">
          <div className="grid gap-6 xl:grid-cols-2">
            {funnels.map(({ condition, stages }) => (
              <section key={condition} className="rounded-lg border p-3" style={{ borderColor: "#dbe4ef" }}>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[condition] }} />
                  {conditionLabel(condition)} · n={stages[0]?.count ?? 0}
                </h3>
                <FunnelChart stages={stages} color={SERIES[condition]} />
              </section>
            ))}
          </div>
        </Card>

        <Card title="Time on each phase" subtitle="Participant-level durations with median and sample size" actions={comparisonScope} className="mb-5">
          <PhaseTimePlot groups={timeGroups} />
          {aiSummary.posttestMedian != null && staticSummary.posttestMedian != null && Math.max(aiSummary.posttestMedian, staticSummary.posttestMedian) >= Math.max(1, Math.min(aiSummary.posttestMedian, staticSummary.posttestMedian) * 2) && (
            <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "#fff8e6", color: "#6b4b00" }}>
              <strong>Timing check:</strong> the same post-test has a {aiSummary.posttestMedian}m AI median and {staticSummary.posttestMedian}m static median. Review the participant dots and timing records for idle time, timeouts, or very small phase samples before interpreting this difference.
            </p>
          )}
        </Card>

        <Card
          title="Per-item paired accuracy"
          subtitle={`Correct, incorrect, and unanswered responses among participants with both tests · ${filter === "all" ? "all conditions" : conditionLabel(filter)} · paired n=${pairedViews.length}`}
          actions={<span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Responds to the condition filter</span>}
          className="mb-5"
        >
          <div className="overflow-x-auto"><ItemAccuracyGrid rows={itemRows} /></div>
        </Card>

        <div className="mb-5 grid gap-4 lg:grid-cols-2">

          <Card title="How each timed test ended" subtitle="Submitted manually vs cut off by the 10 minute timer">
            <HBarChart
              labelWidth={132}
              data={[
                { label: "Pre-test, manual", value: preEnded.manual, color: "#64748b" },
                { label: "Pre-test, timer", value: preEnded.timer, color: "#a16207" },
                { label: "Post-test, manual", value: postEnded.manual, color: "#64748b" },
                { label: "Post-test, timer", value: postEnded.timer, color: "#a16207" },
              ]}
            />
            <div className="mt-4">
              <Legend
                items={[
                  { label: "Manual submit", color: "#64748b" },
                  { label: "Timer expiry", color: "#a16207" },
                ]}
              />
            </div>
          </Card>

          <Card title="Lesson engagement (AI only)" subtitle="Participants who opened each lesson and who completed it">
            <div className="flex flex-col gap-3">
              {lessonEngagement.map((lesson) => (
                <div key={lesson.id} className="grid grid-cols-[90px_1fr_54px] items-center gap-3 text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>{lesson.label}</span>
                  <div className="flex flex-col gap-1">
                    <span className="relative h-2.5 overflow-hidden rounded" style={{ background: "#e2e8f0" }}>
                      <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${aiParticipants.length > 0 ? (lesson.opened / aiParticipants.length) * 100 : 0}%`, background: SERIES.ai }} />
                    </span>
                    <span className="relative h-2.5 overflow-hidden rounded" style={{ background: "#e2e8f0" }}>
                      <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${aiParticipants.length > 0 ? (lesson.completed / aiParticipants.length) * 100 : 0}%`, background: "#16815f" }} />
                    </span>
                  </div>
                  <span className="text-right tabular-nums" style={{ color: "var(--text-primary)" }}>{lesson.opened} / {lesson.completed}</span>
                </div>
              ))}
            </div>
            <div className="mt-4"><Legend items={[{ label: "Opened", color: SERIES.ai }, { label: "Completed", color: "#16815f" }]} /></div>
            <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Counts are opened / completed out of {aiParticipants.length} AI participants. The current data does not record assigned-versus-optional identity, step counts, guide hide/show actions, or guide resets; those cannot yet be reported accurately.
            </p>
          </Card>
        </div>

        <Card
          title="Participants"
          subtitle="Click a row to read the submitted answers item by item"
        >
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[820px] text-xs">
              <thead>
                <tr style={{ color: "var(--text-muted)" }}>
                  {["ID", "Condition", "Pre", "Post", "Gain", "Pre min", "Learn min", "Post min", "Furthest stage", "Lesson"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`border-b pb-2 font-medium ${i === 0 || i === 1 || i === 8 || i === 9 ? "text-left" : "text-right"}`}
                        style={{ borderColor: "#e2e8f0" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {views.map((v) => (
                  <tr
                    key={v.participantId}
                    onClick={() => setInspect(v)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-panel-2)]"
                  >
                    <td className="border-b py-2 font-medium" style={{ borderColor: "#f1f5f9", color: "var(--text-primary)" }}>
                      <span className="flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: SERIES[v.condition] }}
                        />
                        {v.participantId}
                      </span>
                    </td>
                    <td className="border-b py-2" style={{ borderColor: "#f1f5f9", color: "var(--text-secondary)" }}>
                      {conditionLabel(v.condition)}
                    </td>
                    <td className="border-b py-2 text-right tabular-nums" style={{ borderColor: "#f1f5f9", color: "var(--text-primary)" }}>
                      {v.pretest ? `${v.pretest.correct}/${v.pretest.total}` : "-"}
                    </td>
                    <td className="border-b py-2 text-right tabular-nums" style={{ borderColor: "#f1f5f9", color: "var(--text-primary)" }}>
                      {v.posttest ? `${v.posttest.correct}/${v.posttest.total}` : "-"}
                    </td>
                    <td
                      className="border-b py-2 text-right tabular-nums"
                      style={{
                        borderColor: "#f1f5f9",
                        color:
                          v.gain == null
                            ? "var(--text-muted)"
                            : v.gain > 0
                              ? "var(--success)"
                              : v.gain < 0
                                ? "var(--danger)"
                                : "var(--text-secondary)",
                      }}
                    >
                      {v.gain == null ? "-" : `${v.gain > 0 ? "+" : ""}${v.gain}%`}
                    </td>
                    <td className="border-b py-2 text-right tabular-nums" style={{ borderColor: "#f1f5f9", color: "var(--text-secondary)" }}>
                      {v.pretestMinutes ?? "-"}
                    </td>
                    <td className="border-b py-2 text-right tabular-nums" style={{ borderColor: "#f1f5f9", color: "var(--text-secondary)" }}>
                      {v.learningMinutes ?? "-"}
                    </td>
                    <td className="border-b py-2 text-right tabular-nums" style={{ borderColor: "#f1f5f9", color: "var(--text-secondary)" }}>
                      {v.posttestMinutes ?? "-"}
                    </td>
                    <td className="border-b py-2" style={{ borderColor: "#f1f5f9", color: "var(--text-secondary)" }}>
                      {v.furthestStage}
                    </td>
                    <td className="border-b py-2" style={{ borderColor: "#f1f5f9", color: "var(--text-secondary)" }}>
                      {v.condition === "static" ? "n/a" : v.lessonIncomplete ? "incomplete" : "complete"}
                    </td>
                  </tr>
                ))}
                {views.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center" style={{ color: "var(--text-muted)" }}>
                      No participants match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="mt-5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Scoring is a normalized string match against the Q1 answer keys (quotes, spacing and
          separators ignored). It is a comparison aid, not a graded result. Open a participant row
          to read the verbatim answers before drawing conclusions.
        </p>
      </div>

      {inspect && <ResponseInspector view={inspect} onClose={() => setInspect(null)} />}
    </main>
  );
}

/* Side panel showing each response in the same structure as the original test. */
function ResponseInspector({ view, onClose }: { view: ParticipantView; onClose: () => void }) {
  const sections: { title: string; score: typeof view.pretest; test: TestDef }[] = [
    { title: "Pre-test", score: view.pretest, test: PRETEST },
    { title: "Post-test", score: view.posttest, test: POSTTEST },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close participant details"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "#0f172a55" }}
      />
      <aside
        className="relative flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l p-5 sm:p-6"
        style={{ background: "var(--bg-panel)", borderColor: "#e2e8f0" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {view.participantId}
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              {conditionLabel(view.condition)} · seq {view.seq} · {view.furthestStage}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {sections.map((section) => (
          <TestResponseReview key={section.title} {...section} />
        ))}

        <dl className="grid grid-cols-2 gap-y-2 text-xs">
          {[
            ["Pre-test minutes", view.pretestMinutes],
            ["Learning minutes", view.learningMinutes],
            ["Post-test minutes", view.posttestMinutes],
            ["Study duration", view.studyMinutes],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt style={{ color: "var(--text-muted)" }}>{label}</dt>
              <dd className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                {value ?? "-"}
              </dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt style={{ color: "var(--text-muted)" }}>Measured lesson</dt>
            <dd style={{ color: "var(--text-primary)" }}>
              {view.measuredLessonId ?? (view.condition === "static" ? "static materials" : "not completed")}
            </dd>
          </div>
          <div className="col-span-2">
            <dt style={{ color: "var(--text-muted)" }}>Examples opened</dt>
            <dd style={{ color: "var(--text-primary)" }}>
              {view.examplesTried.length > 0 ? view.examplesTried.join(", ") : "none"}
            </dd>
          </div>
        </dl>

      </aside>
    </div>
  );
}

type Score = NonNullable<ParticipantView["pretest"]>;
type ScoredItem = Score["items"][number];

function TestResponseReview({
  title,
  score,
  test,
}: {
  title: string;
  score: ParticipantView["pretest"];
  test: TestDef;
}) {
  const question = test.questions[0];
  const responseByKey = new Map(score?.items.map((item) => [item.key, item]));

  return (
    <section className="mb-6 overflow-hidden rounded-xl border" style={{ borderColor: "#dbe4ef" }}>
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ background: "#f8fafc", borderColor: "#dbe4ef" }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
          {score && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              {score.correct} of {score.total} answers correct · {score.answered} answered
            </p>
          )}
        </div>
        {score && (
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums" style={{ background: "#e8f1fb", color: "#175f9f" }}>
            {score.percent}%
          </span>
        )}
      </header>

      {!score ? (
        <p className="px-4 py-4 text-sm" style={{ color: "var(--text-muted)" }}>Not submitted.</p>
      ) : (
        <div className="p-4">
          <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{question.title}</h4>
          {question.prompt && <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{question.prompt}</p>}

          {question.fields.map((field, index) => {
            if (field.kind === "code") {
              return (
                <div key={`code-${index}`} className="mt-3">
                  {field.caption ? (
                    <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{field.caption}</p>
                  ) : null}
                  <details className="rounded-lg border" style={{ borderColor: "#dbe4ef", background: "#f8fafc" }}>
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      {field.caption ? "View the code used for this question" : "View the Java program shown to the participant"}
                    </summary>
                    <pre className="overflow-x-auto border-t px-3 py-3 text-[11px] leading-relaxed" style={{ borderColor: "#dbe4ef", color: "var(--text-primary)", background: "#0f172a" }}>
                      <code style={{ color: "#f8fafc" }}>{field.code}</code>
                    </pre>
                  </details>
                </div>
              );
            }

            if (field.kind === "grid") {
              return (
                <div key={`grid-${index}`} className="mt-4">
                  {field.caption && <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{field.caption}</p>}
                  <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#dbe4ef" }}>
                    <table className="w-full min-w-[620px] table-fixed text-xs">
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          {field.columns.map((column, columnIndex) => (
                            <th key={column} className={`border-b px-2 py-2 text-left font-semibold ${columnIndex === 0 ? "w-20" : ""}`} style={{ borderColor: "#dbe4ef", color: "var(--text-secondary)" }}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {field.rows.map((row, rowIndex) => (
                          <tr key={`row-${rowIndex}`}>
                            {row.map((cell, cellIndex) => (
                              <td key={`cell-${cellIndex}`} className="border-b px-2 py-2 align-top last:border-r-0" style={{ borderColor: "#edf2f7" }}>
                                {renderResponseCell(cell, responseByKey)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }

            const item = responseByKey.get(field.key);
            return (
              <div key={field.key} className="mt-3">
                <p className="mb-1.5 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{field.label}</p>
                {item && <ResponseAnswer item={item} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function renderResponseCell(cell: GridCell, responseByKey: Map<string, ScoredItem>) {
  if (cell.t === "ro") {
    return <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{cell.text}</span>;
  }
  const item = responseByKey.get(cell.key);
  return item ? <ResponseAnswer item={item} compact /> : <span style={{ color: "var(--text-muted)" }}>No response data</span>;
}

function ResponseAnswer({ item, compact = false }: { item: ScoredItem; compact?: boolean }) {
  const blank = item.given.trim() === "";
  const background = item.correct ? "#eef7f3" : blank ? "#fff8e6" : "#fdeceb";
  const border = item.correct ? "#b8dfcf" : blank ? "#f3d58b" : "#f2c5c2";
  const statusColor = item.correct ? "#087a55" : blank ? "#8a5a00" : "#b42318";

  return (
    <div className={`rounded-md border ${compact ? "p-2" : "px-3 py-2.5"}`} style={{ background, borderColor: border }}>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: statusColor }}>
        {item.correct ? <Check size={12} /> : blank ? <Minus size={12} /> : <X size={12} />}
        {item.correct ? "Correct" : blank ? "Unanswered" : "Incorrect"}
      </div>
      <p className="mt-1 break-words text-xs" style={{ color: "var(--text-primary)" }}>
        <span className="font-medium">Participant:</span> {blank ? "No answer" : item.given}
      </p>
      <p className="mt-0.5 break-words text-[11px]" style={{ color: "var(--text-secondary)" }}>
        <span className="font-medium">Correct answer:</span> {item.expected}
      </p>
    </div>
  );
}
