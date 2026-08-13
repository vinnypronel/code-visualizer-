import type { Condition } from "@/lib/studyTypes";
import { conditionLabel } from "@/lib/adminMetrics";
import { SERIES } from "./charts";

export interface PairedScorePoint {
  id: string;
  condition: Condition;
  pre: number;
  post: number;
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value} pp`;
}

export function GooglePairedScoreChart({ points }: { points: PairedScorePoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>No participant has submitted both tests yet.</p>;
  }

  const conditions = (["ai", "static"] as Condition[]).filter((condition) =>
    points.some((point) => point.condition === condition),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-slate-500 bg-white" />Pre-test</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-slate-700" />Post-test</span>
        <span>The connecting line shows the direction and size of the participant&apos;s change.</span>
      </div>

      <div className={`grid gap-4 ${conditions.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {conditions.map((condition) => {
          const conditionPoints = points
            .filter((point) => point.condition === condition)
            .sort((a, b) => a.id.localeCompare(b.id));
          const color = SERIES[condition];

          return (
            <section key={condition} className="rounded-xl border p-4" style={{ borderColor: "#dbe4ef", background: "#ffffff" }}>
              <header className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                  {conditionLabel(condition)}
                </h3>
                <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>paired n={conditionPoints.length}</span>
              </header>

              <div className="mb-1 ml-16 flex justify-between text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              <ul className="flex flex-col gap-4">
                {conditionPoints.map((point) => {
                  const change = point.post - point.pre;
                  const left = Math.min(point.pre, point.post);
                  const width = Math.abs(point.post - point.pre);
                  const changeColor = change > 0 ? "#087a55" : change < 0 ? "#b42318" : "#475569";
                  const changeBackground = change > 0 ? "#eef7f3" : change < 0 ? "#fdeceb" : "#f1f5f9";

                  return (
                    <li key={point.id} className="grid grid-cols-[52px_1fr_64px] items-center gap-3">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{point.id}</span>
                      <div>
                        <div className="relative h-5" aria-label={`${point.id}: ${point.pre}% pre-test to ${point.post}% post-test, ${signed(change)}`}>
                          <span className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ background: "#e2e8f0" }} />
                          <span
                            className="absolute top-1/2 h-1 -translate-y-1/2"
                            style={{ left: `${left}%`, width: `${Math.max(width, 0.7)}%`, background: color }}
                          />
                          <span
                            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                            style={{ left: `${point.pre}%`, borderColor: color }}
                            title={`Pre-test: ${point.pre}%`}
                          />
                          <span
                            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
                            style={{ left: `${point.post}%`, background: color }}
                            title={`Post-test: ${point.post}%`}
                          />
                        </div>
                        <p className="mt-1 text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          Pre <strong>{point.pre}%</strong> <span className="px-1">→</span> Post <strong>{point.post}%</strong>
                        </p>
                      </div>
                      <span className="rounded-md px-2 py-1 text-center text-[11px] font-semibold tabular-nums" style={{ color: changeColor, background: changeBackground }}>
                        {signed(change)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
