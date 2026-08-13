"use client";

/*
 * Chart primitives for the study dashboard.
 *
 * Hand-rolled SVG rather than a charting dependency: the shapes needed here are
 * a handful of bar and dot forms, and the study data is small enough that a
 * library would add weight without adding capability.
 *
 * Color follows one rule: condition is the only categorical dimension, so it
 * gets a fixed two-slot hue order (blue = AI visualizer, orange = static
 * materials) that never re-assigns when a filter changes the series count.
 * Funnel stages are ordinal and use a single-hue blue ramp. Text always wears a
 * text token, never the series color.
 */

import { useId, useState, type ReactNode } from "react";

export const SERIES = {
  ai: "#2a78d6",
  static: "#eb6834",
} as const;

/* Ordinal blue ramp, light to dark. Lightest step still clears 2:1 on white. */
export const RAMP = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab"];

const GRID = "#e2e8f0";
const AXIS_TEXT = "var(--text-muted)";

/* ── Shared surface ─────────────────────────────────────────────────── */

export function Card({
  title,
  subtitle,
  children,
  actions,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-xl border p-5 ${className}`}
      style={{ background: "var(--bg-panel)", borderColor: "#e2e8f0" }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ── Stat tile ──────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{ background: "var(--bg-panel)", borderColor: "#e2e8f0" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        className="mt-1.5 text-2xl font-semibold tabular-nums"
        style={{ color: accent ?? "var(--text-primary)" }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ── Horizontal bars ────────────────────────────────────────────────── */

export interface HBarDatum {
  label: string;
  value: number;
  color?: string;
  note?: string;
}

/*
 * Horizontal bars, labels outside the plot. `max` fixes the scale so several
 * charts can share one; otherwise it comes from the data.
 */
export function HBarChart({
  data,
  max,
  unit = "",
  labelWidth = 128,
  emptyMessage = "No data yet.",
}: {
  data: HBarDatum[];
  max?: number;
  unit?: string;
  labelWidth?: number;
  emptyMessage?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const domainMax = Math.max(max ?? 0, ...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d, i) => {
        const pct = (d.value / domainMax) * 100;
        const color = d.color ?? RAMP[4];
        return (
          <li
            key={d.label}
            className="flex items-center gap-3"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="shrink-0 truncate text-xs"
              style={{ width: labelWidth, maxWidth: "38%", color: "var(--text-secondary)" }}
              title={d.label}
            >
              {d.label}
            </span>
            <span className="relative h-4 min-w-0 flex-1 overflow-hidden rounded" style={{ background: GRID }}>
              <span
                className="absolute inset-y-0 left-0 rounded transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  background: color,
                  opacity: hover == null || hover === i ? 1 : 0.55,
                }}
              />
            </span>
            <span
              className="w-20 shrink-0 text-right text-xs tabular-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {d.value}
              {unit}
              {d.note && (
                <span style={{ color: "var(--text-muted)" }}> {d.note}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Grouped vertical bars ──────────────────────────────────────────── */

export interface GroupedSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
}

/* A centered scale keeps negative and positive percentage-point gains honest. */
export function GainChart({
  data,
}: {
  data: { key: string; label: string; value: number | null; n: number; color: string }[];
}) {
  const values = data.map((d) => d.value).filter((value): value is number => value != null);
  const domain = Math.max(10, Math.ceil(Math.max(...values.map(Math.abs), 0) / 5) * 5);

  return (
    <div>
      <div className="mb-1 grid grid-cols-[110px_1fr_62px] gap-3 text-[10px] font-medium" style={{ color: AXIS_TEXT }}>
        <span />
        <span className="flex justify-between"><span>-{domain} pp</span><span>0</span><span>+{domain} pp</span></span>
        <span className="text-right">Paired n</span>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((datum) => {
          const value = datum.value ?? 0;
          const width = Math.min(50, (Math.abs(value) / domain) * 50);
          return (
            <div key={datum.key} className="grid grid-cols-[110px_1fr_62px] items-center gap-3">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{datum.label}</span>
              <div className="relative h-8 rounded" style={{ background: "#f8fafc" }}>
                <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: "#64748b" }} />
                {datum.value != null && (
                  <span
                    className="absolute top-1/2 h-5 -translate-y-1/2 rounded"
                    style={{
                      background: datum.color,
                      left: value >= 0 ? "50%" : `${50 - width}%`,
                      width: `${Math.max(width, 0.8)}%`,
                    }}
                    title={`${datum.label}: ${value > 0 ? "+" : ""}${value} percentage points`}
                  />
                )}
              </div>
              <span className="text-right text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {datum.value == null ? "-" : `${value > 0 ? "+" : ""}${value} pp`} · {datum.n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface PhaseTimeGroup {
  key: string;
  label: string;
  color: string;
  phases: { label: string; values: number[]; median: number | null }[];
}

/* Every recorded duration is visible; the vertical marker is the median. */
export function PhaseTimePlot({ groups }: { groups: PhaseTimeGroup[] }) {
  const allValues = groups.flatMap((group) => group.phases.flatMap((phase) => phase.values));
  const domain = Math.max(1, Math.ceil(Math.max(...allValues, 0) * 2) / 2);

  return (
    <div>
      <div className="mb-2 grid grid-cols-[145px_1fr_70px] gap-3 text-[10px]" style={{ color: AXIS_TEXT }}>
        <span>Condition and phase</span>
        <span className="flex justify-between"><span>0m</span><span>{domain / 2}m</span><span>{domain}m</span></span>
        <span className="text-right">Median</span>
      </div>
      <div className="flex flex-col gap-2">
        {groups.flatMap((group) => group.phases.map((phase) => (
          <div key={`${group.key}-${phase.label}`} className="grid grid-cols-[145px_1fr_70px] items-center gap-3">
            <span className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: group.color }} />
              {group.label} · {phase.label} <span style={{ color: "var(--text-muted)" }}>(n={phase.values.length})</span>
            </span>
            <span className="relative h-7 overflow-hidden rounded" style={{ background: "#f8fafc" }}>
              <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: GRID }} />
              {phase.median != null && (
                <span className="absolute inset-y-0 w-0.5" style={{ left: `${Math.min(100, (phase.median / domain) * 100)}%`, background: "#0f172a" }} />
              )}
              {phase.values.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white"
                  style={{
                    background: group.color,
                    left: `${Math.min(100, (value / domain) * 100)}%`,
                    top: `${3 + (index % 3) * 6}px`,
                  }}
                  title={`${group.label}, ${phase.label}: ${value} minutes`}
                />
              ))}
            </span>
            <span className="text-right text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {phase.median == null ? "-" : `${phase.median}m`}
            </span>
          </div>
        )))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>Dots are participants; the dark marker is the median.</p>
    </div>
  );
}

/*
 * Grouped columns, one group per category, one bar per series. Bars carry a 2px
 * surface gap between them and a 4px rounded top anchored to the baseline.
 */
export function GroupedBarChart({
  categories,
  series,
  unit = "",
  yMax,
  height = 220,
}: {
  categories: string[];
  series: GroupedSeries[];
  unit?: string;
  yMax?: number;
  height?: number;
}) {
  const clipId = useId();
  const [hover, setHover] = useState<{ c: number; s: number } | null>(null);
  const allValues = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const domainMax = Math.max(yMax ?? 0, ...allValues, 1);
  const padLeft = 34;
  const padBottom = 26;
  const padTop = 8;
  const width = 100; // percentage-based viewBox width unit
  const plotH = height - padBottom - padTop;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(domainMax * t));

  const groupW = (width - padLeft) / Math.max(categories.length, 1);
  const barW = Math.min(groupW / (series.length + 1), 14);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Grouped bar chart: ${series.map((s) => s.label).join(" and ")}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={width} height={height} />
          </clipPath>
        </defs>
        {ticks.map((t) => {
          const y = padTop + plotH - (t / domainMax) * plotH;
          return <line key={t} x1={padLeft} x2={width} y1={y} y2={y} stroke={GRID} strokeWidth={0.5} />;
        })}
        {categories.map((cat, ci) =>
          series.map((s, si) => {
            const value = s.values[ci];
            if (value == null) return null;
            const h = (value / domainMax) * plotH;
            const x =
              padLeft + ci * groupW + groupW / 2 - (series.length * (barW + 1)) / 2 + si * (barW + 1);
            const dim = hover != null && !(hover.c === ci && hover.s === si);
            return (
              <rect
                key={`${cat}-${s.key}`}
                x={x}
                y={padTop + plotH - h}
                width={barW}
                height={Math.max(h, 0.5)}
                rx={2}
                fill={s.color}
                opacity={dim ? 0.5 : 1}
                onMouseEnter={() => setHover({ c: ci, s: si })}
                onMouseLeave={() => setHover(null)}
              />
            );
          }),
        )}
      </svg>

      <div className="mt-1 flex" style={{ paddingLeft: "34%" }}>
        {categories.map((cat) => (
          <span
            key={cat}
            className="flex-1 text-center text-xs"
            style={{ color: AXIS_TEXT }}
          >
            {cat}
          </span>
        ))}
      </div>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr style={{ color: "var(--text-muted)" }}>
            <th className="pb-1 text-left font-medium">Series</th>
            {categories.map((c) => (
              <th key={c} className="pb-1 text-right font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.key} style={{ color: "var(--text-secondary)" }}>
              <td className="py-0.5">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
              </td>
              {s.values.map((v, i) => (
                <td key={i} className="py-0.5 text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {v == null ? "-" : `${v}${unit}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Funnel ─────────────────────────────────────────────────────────── */

export function FunnelChart({
  stages,
  color = RAMP[4],
}: {
  stages: { stage: string; count: number }[];
  color?: string;
}) {
  const total = stages[0]?.count ?? 0;
  const drops = stages.map((stage, index) => index === 0 ? 0 : Math.max(0, stages[index - 1].count - stage.count));
  const largestDropIndex = drops.indexOf(Math.max(...drops));
  return (
    <ol className="flex flex-col gap-2">
      {stages.map((s, i) => {
        const pct = total > 0 ? (s.count / total) * 100 : 0;
        const largest = i === largestDropIndex && drops[i] > 0;
        return (
          <li key={s.stage} className="rounded-md px-1.5 py-1" style={{ background: largest ? "#fff1f0" : "transparent" }}>
            <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs sm:w-36" style={{ color: "var(--text-secondary)" }}>
              {s.stage}
            </span>
            <span className="relative h-5 min-w-0 flex-1 overflow-hidden rounded" style={{ background: GRID }}>
              <span
                className="absolute inset-y-0 left-0 rounded transition-[width] duration-500"
                style={{ width: `${pct}%`, background: color, opacity: 1 - Math.min(i, 7) * 0.06 }}
              />
            </span>
            <span className="w-28 shrink-0 text-right text-xs tabular-nums sm:w-32" style={{ color: "var(--text-primary)" }}>
              {s.count} · {Math.round(pct)}% overall
            </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Pre / post slope ───────────────────────────────────────────────── */

export interface SlopePoint {
  id: string;
  pre: number;
  post: number;
  color: string;
}

/*
 * Slope chart: one line per participant from pre-test to post-test percent.
 * The single most direct read on whether the intervention moved anyone, and it
 * shows individual trajectories rather than hiding them inside a mean.
 */
export function SlopeChart({
  points,
  height = 240,
}: {
  points: SlopePoint[];
  height?: number;
}) {
  const [hover, setHover] = useState<SlopePoint | null>(null);
  if (points.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No participant has submitted both tests yet.
      </p>
    );
  }
  const padTop = 14;
  const padBottom = 22;
  const plotH = height - padTop - padBottom;
  const xLeft = 8;
  const xRight = 92;
  const y = (pct: number) => padTop + plotH - (pct / 100) * plotH;
  const duplicateCounts = new Map<string, number>();
  points.forEach((point) => {
    const key = `${point.pre}-${point.post}`;
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  });
  const duplicateIndexes = new Map<string, number>();

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex shrink-0 flex-col justify-between py-2 text-[10px] tabular-nums" style={{ height, color: AXIS_TEXT }}>
          <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
        </div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="min-w-0 flex-1" style={{ height }} role="img" aria-label="Pre-test to post-test score change per participant">
        {[0, 25, 50, 75, 100].map((t) => (
          <line key={t} x1={0} x2={100} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={0.4} />
        ))}
        {points.map((p) => {
          const duplicateKey = `${p.pre}-${p.post}`;
          const duplicateIndex = duplicateIndexes.get(duplicateKey) ?? 0;
          duplicateIndexes.set(duplicateKey, duplicateIndex + 1);
          const duplicateCount = duplicateCounts.get(duplicateKey) ?? 1;
          const offset = (duplicateIndex - (duplicateCount - 1) / 2) * 3;
          const dim = hover != null && hover.id !== p.id;
          return (
            <g
              key={p.id}
              opacity={dim ? 0.35 : 1}
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${p.id}: ${p.pre}% pre-test to ${p.post}% post-test (${p.post - p.pre > 0 ? "+" : ""}${p.post - p.pre} pp)`}</title>
              <line
                x1={xLeft}
                y1={y(p.pre) + offset}
                x2={xRight}
                y2={y(p.post) + offset}
                stroke={p.color}
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={xLeft} cy={y(p.pre) + offset} r={2.4} fill={p.color} stroke="var(--bg-panel)" strokeWidth={1} />
              <circle cx={xRight} cy={y(p.post) + offset} r={2.4} fill={p.color} stroke="var(--bg-panel)" strokeWidth={1} />
            </g>
          );
        })}
      </svg>
      </div>
      <div className="flex justify-between px-1 text-xs" style={{ color: AXIS_TEXT }}>
        <span>Pre-test</span>
        <span>{hover ? `${hover.id}: ${hover.pre}% → ${hover.post}% (${hover.post - hover.pre > 0 ? "+" : ""}${hover.post - hover.pre} pp)` : `${points.length} paired participant${points.length === 1 ? "" : "s"}`}</span>
        <span>Post-test</span>
      </div>
    </div>
  );
}

/* ── Per-item accuracy heat strip ───────────────────────────────────── */

export function ItemAccuracyGrid({
  rows,
}: {
  rows: { label: string; pre: AccuracyBreakdown | null; post: AccuracyBreakdown | null }[];
}) {
  const cell = (value: AccuracyBreakdown | null) => value == null ? <span style={{ color: "var(--text-muted)" }}>-</span> : (
    <div className="min-w-40 rounded-md border p-2" style={{ borderColor: "#dbe4ef", background: "#f8fafc" }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{value.percent}% correct</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{value.answered}/{value.n} answered</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full" style={{ background: GRID }}>
        <span style={{ width: `${(value.correct / value.n) * 100}%`, background: "#16815f" }} />
        <span style={{ width: `${(value.incorrect / value.n) * 100}%`, background: "#c2413b" }} />
        <span style={{ width: `${(value.unanswered / value.n) * 100}%`, background: "#cbd5e1" }} />
      </div>
      <p className="mt-1 text-[10px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
        {value.correct} correct · {value.incorrect} incorrect · {value.unanswered} unanswered · n={value.n}
      </p>
    </div>
  );

  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ color: "var(--text-muted)" }}>
          <th className="pb-2 text-left font-medium">Item</th>
          <th className="pb-2 text-right font-medium">Pre-test</th>
          <th className="pb-2 text-right font-medium">Post-test</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          return (
            <tr key={r.label}>
              <td className="border-b py-2 pr-3 font-medium" style={{ color: "var(--text-secondary)", borderColor: "#edf2f7" }}>
                {r.label}
              </td>
              <td className="border-b py-2 pl-2" style={{ borderColor: "#edf2f7" }}>{cell(r.pre)}</td>
              <td className="border-b py-2 pl-2" style={{ borderColor: "#edf2f7" }}>{cell(r.post)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export interface AccuracyBreakdown {
  correct: number;
  incorrect: number;
  unanswered: number;
  answered: number;
  n: number;
  percent: number;
}
