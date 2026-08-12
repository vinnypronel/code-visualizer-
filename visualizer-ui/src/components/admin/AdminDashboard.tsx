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
import { ArrowLeft, Download, LogOut, RefreshCw, X } from "lucide-react";
import {
  conditionLabel,
  endedByCounts,
  exampleCounts,
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
  GroupedBarChart,
  HBarChart,
  ItemAccuracyGrid,
  Legend,
  SERIES,
  SlopeChart,
  type SlopePoint,
} from "./charts";

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
  const funnel = useMemo(() => funnelCounts(views), [views]);
  const examples = useMemo(
    () => exampleCounts(all.filter((v) => v.condition === "ai")),
    [all],
  );
  const preItems = useMemo(() => itemAccuracy(views, "pretest"), [views]);
  const postItems = useMemo(() => itemAccuracy(views, "posttest"), [views]);

  const completed = views.filter((v) => v.completed).length;
  const questionnaireOpened = views.filter((v) => v.questionnaireOpened).length;
  const scored = views.filter((v) => v.gain != null);
  const overallGain = mean(scored.map((v) => v.gain as number));
  const medianTotal = median(
    views.map((v) => v.totalMinutes).filter((n): n is number => n != null),
  );

  const slopePoints: SlopePoint[] = views
    .filter((v) => v.pretest?.percent != null && v.posttest?.percent != null)
    .map((v) => ({
      id: v.participantId,
      pre: v.pretest!.percent!,
      post: v.posttest!.percent!,
      color: SERIES[v.condition],
    }));

  const preEnded = endedByCounts(views, "pretest");
  const postEnded = endedByCounts(views, "posttest");

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
    return {
      label: p.label,
      pre: p.n > 0 ? Math.round((p.correct / p.n) * 100) : null,
      post: post && post.n > 0 ? Math.round((post.correct / post.n) * 100) : null,
    };
  });

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
              {
                label: "Form opened",
                value: String(questionnaireOpened),
                detail: views.length > 0 ? `${Math.round((questionnaireOpened / views.length) * 100)}%` : "no rows",
              },
              {
                label: "Submitted",
                value: String(completed),
                detail: views.length > 0 ? `${Math.round((completed / views.length) * 100)}%` : "no rows",
              },
              { label: "Scored pairs", value: String(scored.length), detail: "pre + post" },
              { label: "Mean gain", value: pct(overallGain), detail: "percentage points" },
              { label: "Session", value: medianTotal == null ? "-" : `${medianTotal}m`, detail: "median" },
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

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <Card
            title="Pre-test and post-test accuracy by condition"
            subtitle="Mean percent correct across the 14 graded Q1 items"
            actions={
              <Legend
                items={[
                  { label: "AI visualizer", color: SERIES.ai },
                  { label: "Static materials", color: SERIES.static },
                ]}
              />
            }
          >
            <GroupedBarChart
              categories={["Pre-test", "Post-test", "Gain"]}
              unit="%"
              yMax={100}
              series={summaries.map((s) => ({
                key: s.condition,
                label: s.label,
                color: SERIES[s.condition],
                values: [s.pretestMean, s.posttestMean, s.gainMean],
              }))}
            />
            <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
              {summaries
                .map((s) => `${s.label}: n=${s.scoredPairs} scored, SD gain ${s.gainSd ?? "-"}`)
                .join(" · ")}
              . With a pilot-sized n, read these as directional, not significant.
            </p>
          </Card>

          <Card
            title="Individual score trajectories"
            subtitle="One line per participant, pre-test to post-test"
            actions={
              <Legend
                items={[
                  { label: "AI visualizer", color: SERIES.ai },
                  { label: "Static materials", color: SERIES.static },
                ]}
              />
            }
          >
            <SlopeChart points={slopePoints} />
          </Card>
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <Card title="Completion funnel" subtitle="Participants reaching each stage, with drop-off">
            <FunnelChart stages={funnel.map((f) => ({ stage: f.stage, count: f.count }))} />
          </Card>

          <Card title="Time on each phase" subtitle="Median minutes, by condition">
            <GroupedBarChart
              categories={["Pre-test", "Learning", "Post-test"]}
              unit="m"
              series={summaries.map((s) => ({
                key: s.condition,
                label: s.label,
                color: SERIES[s.condition],
                values: [s.pretestMedian, s.learningMedian, s.posttestMedian],
              }))}
            />
          </Card>
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-3">
          <Card title="Per-item accuracy" subtitle="Share correct on each graded blank" className="lg:col-span-1">
            <ItemAccuracyGrid rows={itemRows} />
          </Card>

          <Card title="How each timed test ended" subtitle="Submitted manually vs cut off by the 10 minute timer">
            <HBarChart
              labelWidth={132}
              data={[
                { label: "Pre-test, manual", value: preEnded.manual, color: SERIES.ai },
                { label: "Pre-test, timer", value: preEnded.timer, color: SERIES.static },
                { label: "Post-test, manual", value: postEnded.manual, color: SERIES.ai },
                { label: "Post-test, timer", value: postEnded.timer, color: SERIES.static },
              ]}
            />
            <div className="mt-4">
              <Legend
                items={[
                  { label: "Manual submit", color: SERIES.ai },
                  { label: "Timer expiry", color: SERIES.static },
                ]}
              />
            </div>
          </Card>

          <Card title="Examples opened" subtitle="AI-condition participants who opened each built-in lesson">
            <HBarChart
              labelWidth={92}
              data={examples.map((e) => ({ label: e.label, value: e.count }))}
              max={all.filter((v) => v.condition === "ai").length}
              emptyMessage="No AI-condition participants yet."
            />
            <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
              Lesson reached its terminal state for{" "}
              {all.filter((v) => v.condition === "ai" && !v.lessonIncomplete).length} of{" "}
              {all.filter((v) => v.condition === "ai").length} AI participants.
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

/* Side panel showing every submitted answer next to the expected value. */
function ResponseInspector({ view, onClose }: { view: ParticipantView; onClose: () => void }) {
  const router = useRouter();
  const [markingSubmitted, setMarkingSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const sections: { title: string; score: typeof view.pretest }[] = [
    { title: "Pre-test", score: view.pretest },
    { title: "Post-test", score: view.posttest },
  ];

  async function markQuestionnaireSubmitted() {
    setMarkingSubmitted(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/admin/questionnaire-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_id: view.participantId }),
      });
      if (!response.ok) throw new Error("Could not mark the questionnaire as submitted.");
      onClose();
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setMarkingSubmitted(false);
    }
  }

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
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l p-6"
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
          <div key={section.title} className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              {section.title}
              {section.score && (
                <span style={{ color: "var(--text-secondary)" }}>
                  {" "}
                  {section.score.correct}/{section.score.total} correct
                </span>
              )}
            </h3>
            {!section.score ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Not submitted.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {section.score.items.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-start justify-between gap-3 rounded px-2 py-1.5"
                    style={{ background: item.correct ? "#eef7f3" : "#fdeceb" }}
                  >
                    <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {item.key.replace("q1.", "")}
                    </span>
                    <span className="text-right text-[11px]">
                      <span className="block" style={{ color: "var(--text-primary)" }}>
                        {item.given.trim() === "" ? "(blank)" : item.given}
                      </span>
                      {!item.correct && (
                        <span className="block" style={{ color: "var(--text-muted)" }}>
                          expected {item.expected}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <dl className="grid grid-cols-2 gap-y-2 text-xs">
          {[
            ["Pre-test minutes", view.pretestMinutes],
            ["Learning minutes", view.learningMinutes],
            ["Post-test minutes", view.posttestMinutes],
            ["Total minutes", view.totalMinutes],
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

        <div className="mt-5 border-t pt-4" style={{ borderColor: "#e2e8f0" }}>
          <p className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            Questionnaire: {view.questionnaireSubmitted ? "submitted" : view.questionnaireOpened ? "opened, submission not yet confirmed" : "not opened"}
          </p>
          {!view.questionnaireSubmitted && (
            <button
              type="button"
              onClick={markQuestionnaireSubmitted}
              disabled={markingSubmitted}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--action)" }}
            >
              {markingSubmitted ? "Saving…" : "Mark questionnaire submitted"}
            </button>
          )}
          {submitError && <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>{submitError}</p>}
        </div>
      </aside>
    </div>
  );
}
