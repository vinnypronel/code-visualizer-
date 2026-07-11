"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Layers, HardDrive } from "lucide-react";
import { StackFrame, HeapObject, RefArrow, DataMovement, ActiveBlock } from "@/app/page";

export function getFriendlyAddressLabel(value: string): string {
  if (!value) return value;
  const clean = value.replace("@", "");
  if (clean === "101" || clean === "201" || clean === "301") return "[Object 1]";
  if (clean === "102" || clean === "202" || clean === "302") return "[Object 2]";
  if (clean === "303") return "[Object 3]";
  return value;
}

export function getObjectColorStyles(id: string) {
  const clean = id.replace("@", "");
  if (clean === "101" || clean === "201" || clean === "301") {
    return {
      border: "1px solid rgba(59, 130, 246, 0.4)",
      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.5) 100%)",
      glow: "rgba(59, 130, 246, 0.2)",
      badge: "badge-blue",
    };
  }
  if (clean === "102" || clean === "202" || clean === "302") {
    return {
      border: "1px solid rgba(168, 85, 247, 0.4)",
      background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(30, 41, 59, 0.5) 100%)",
      glow: "rgba(168, 85, 247, 0.2)",
      badge: "badge-purple",
    };
  }
  if (clean === "303") {
    return {
      border: "1px solid rgba(16, 185, 129, 0.4)",
      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.5) 100%)",
      glow: "rgba(16, 185, 129, 0.2)",
      badge: "badge-green",
    };
  }
  return {
    border: "1px solid var(--border)",
    background: "var(--bg-panel)",
    glow: "transparent",
    badge: "bg-slate-950 text-slate-500",
  };
}

interface MemoryExecutionViewProps {
  stack: StackFrame[];
  heap: Record<string, HeapObject>;
  arrows: RefArrow[];
  currentStep: number;
  totalSteps: number;
  spotlightStackVars?: string[];
  spotlightHeapObjects?: string[];
  spotlightHeapFields?: string[];
  dataMovement?: DataMovement;
  hoveredElement?: string | null;
  stdout?: string;
  activeBlock?: ActiveBlock;
}

export default function MemoryExecutionView({
  stack,
  heap,
  arrows,
  currentStep,
  totalSteps,
  spotlightStackVars = [],
  spotlightHeapObjects = [],
  spotlightHeapFields = [],
  dataMovement,
  hoveredElement = null,
  stdout,
  activeBlock,
}: MemoryExecutionViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgPaths, setSvgPaths] = useState<Array<{ id: string; d: string; color: string }>>([]);
  const [anim, setAnim] = useState<{ value: string; x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Check if current step has any active spotlight focal points
  const hasSpotlight =
    spotlightStackVars.length > 0 ||
    spotlightHeapObjects.length > 0 ||
    spotlightHeapFields.length > 0;

  const updatePaths = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const calculated = arrows
      .map((arrow) => {
        const sourceEl = container.querySelector(`[data-ref-source="${arrow.source}"]`);
        const targetEl = container.querySelector(`[data-ref-target="${arrow.target}"]`);

        if (!sourceEl || !targetEl) return null;

        const sRect = sourceEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();

        // Calculate start coordinate: center-right of source badge
        const x1 = sRect.right - containerRect.left;
        const y1 = sRect.top + sRect.height / 2 - containerRect.top;

        // Calculate end coordinate: center-left of target container card
        const x2 = tRect.left - containerRect.left;
        const y2 = tRect.top + tRect.height / 2 - containerRect.top;

        const dx = Math.abs(x2 - x1);
        const cp1x = x1 + Math.max(dx * 0.45, 40);
        const cp1y = y1;
        const cp2x = x2 - Math.max(dx * 0.45, 40);
        const cp2y = y2;

        const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

        return {
          id: arrow.id,
          d,
          color: arrow.color || "blue",
        };
      })
      .filter(Boolean) as Array<{ id: string; d: string; color: string }>;

    setSvgPaths(calculated);
  }, [arrows]);

  // Recalculate reference paths on step updates
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePaths();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStep, stack, heap, arrows, updatePaths]);

  // Recalculate paths on resize events
  useEffect(() => {
    window.addEventListener("resize", updatePaths);
    const observer = new ResizeObserver(() => updatePaths());
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", updatePaths);
      observer.disconnect();
    };
  }, [updatePaths]);

  // Handle micro-animations for data movement (value sliding)
  useEffect(() => {
    setAnim(null);
    if (!dataMovement || !containerRef.current) return;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;

      const fromEl = container.querySelector(`[data-ref-source="${dataMovement.from}"]`);
      const toEl = container.querySelector(`[data-ref-source="${dataMovement.to}"]`);

      if (fromEl && toEl) {
        const containerRect = container.getBoundingClientRect();
        const fRect = fromEl.getBoundingClientRect();
        const tRect = toEl.getBoundingClientRect();

        // Calculate center points relative to the container
        const x1 = fRect.left - containerRect.left + fRect.width / 2;
        const y1 = fRect.top - containerRect.top + fRect.height / 2;
        const x2 = tRect.left - containerRect.left + tRect.width / 2;
        const y2 = tRect.top - containerRect.top + tRect.height / 2;

        setAnim({
          value: dataMovement.value,
          x1,
          y1,
          x2,
          y2,
        });
      }
    }, 180); // Small delay to let the DOM elements position themselves first

    return () => clearTimeout(timer);
  }, [currentStep, dataMovement]);

  // Hex color codes mapping for path stroke colors
  const strokeColorMap: Record<string, string> = {
    blue: "#3b82f6",
    purple: "#a855f7",
    cyan: "#06b6d4",
    emerald: "#10b981",
  };

  return (
    <div id="onboarding-memory-view" ref={containerRef} className="flex flex-col h-full bg-slate-950/40 relative overflow-hidden">
      
      {/* Visualizer SVG Reference Overlay Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
        <defs>
          <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Arrowheads for different color references */}
          <marker
            id="arrow-blue"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
          </marker>
          <marker
            id="arrow-purple"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a855f7" />
          </marker>
          <marker
            id="arrow-cyan"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
          </marker>
          <marker
            id="arrow-emerald"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
          </marker>
        </defs>

        {/* Dynamic Curved Reference Arrows */}
        {svgPaths.map((p) => {
          const colorHex = strokeColorMap[p.color] || "#3b82f6";
          return (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={colorHex}
              strokeWidth={2}
              markerEnd={`url(#arrow-${p.color})`}
              className="ref-pointer ref-pointer-active"
              style={{ filter: "url(#glow-filter)" }}
            />
          );
        })}
      </svg>

      {/* Floating Animated Copy Badge (Data sliding) */}
      {anim && (
        <div
          key={currentStep} // Key triggers React re-mount which fires CSS animation keyframe
          className="animate-slide-value pointer-events-none px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold font-mono text-xs shadow-lg shadow-amber-500/40 flex items-center justify-center border border-amber-300"
          style={{
            "--start-x": `${anim.x1}px`,
            "--start-y": `${anim.y1}px`,
            "--target-x": `${anim.x2}px`,
            "--target-y": `${anim.y2}px`,
            transform: "translate(-50%, -50%)",
          } as React.CSSProperties}
        >
          {anim.value}
        </div>
      )}

      {/* Panel Headers */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0 z-30"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-purple-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">Memory &amp; Execution View</span>
        </div>
        <div className="flex items-center gap-3.5 text-[9px] text-slate-500 font-semibold tracking-wider font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-blue-500" /> main
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-purple-500" /> temp
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-cyan-500" /> link
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-emerald-500" /> nodes
          </span>
        </div>
      </div>

      {/* Split canvas zones */}
      <div className="flex-1 flex min-h-0 relative z-10">
        
        {/* The Stack Zone (Left Column) */}
        <div
          className="w-[280px] flex-shrink-0 flex flex-col border-r px-4 py-4 overflow-y-auto bg-slate-950/80"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1.5 mb-4 flex-shrink-0">
            <Layers size={13} className="text-slate-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Local Variables (The Stack)</h3>
              <span className="text-[9px] text-slate-500 font-sans block leading-normal mt-0.5 font-normal">
                Small, temporary data and address tags.
              </span>
            </div>
          </div>

          {activeBlock && (
            <div className="mb-3 flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">scope</span>
              <span className="badge badge-blue text-[9px] py-0.5 px-1.5 font-mono">
                {activeBlock.label} · lines {activeBlock.beginLine}–{activeBlock.endLine}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {stack.map((frame, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg shadow-black/40"
              >
                {/* Method Frame Header */}
                <div className="bg-slate-900 px-3.5 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {frame.methodName}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                    Frame
                  </span>
                </div>

                {/* Local Variables List */}
                <div className="p-3 space-y-2">
                  {frame.variables.length === 0 ? (
                    <span className="text-[10px] text-slate-500 block text-center py-3 px-4 font-mono max-w-[200px] mx-auto leading-normal">
                      Stack is currently empty. Click the Play or Next Step button to load your variables on the workbench!
                    </span>
                  ) : (
                    frame.variables.map((v, vIdx) => {
                      const isHovered = hoveredElement === `stack-${v.name}`;
                      const isSpotlighted = spotlightStackVars.includes(v.name);
                      
                      const varClass = isHovered
                        ? "hover-pulse"
                        : hasSpotlight
                          ? isSpotlighted
                            ? "spotlight-active-blue"
                            : "spotlight-dim"
                          : "";

                      const friendlyVal = getFriendlyAddressLabel(v.value);
                      const styles = getObjectColorStyles(v.value.replace("@", ""));

                      return (
                        <div
                          key={vIdx}
                          data-ref-source={`stack-${v.name}`}
                          className={`flex items-center justify-between bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/20 transition-all ${varClass}`}
                        >
                          <div className="flex flex-col leading-tight">
                            <span className="text-[8px] text-slate-500 font-mono font-bold">
                              {v.type}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-300">
                              {v.name}
                            </span>
                          </div>

                          {/* Values layout */}
                          {v.isReference ? (
                            <span
                              className={`badge ${styles.badge} font-mono text-[10px] py-1 px-2 cursor-help`}
                            >
                              {friendlyVal}
                            </span>
                          ) : (
                            <span className="badge badge-green font-mono text-[10px] py-1 px-2">
                              {v.value}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>

          {stdout && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex-shrink-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono block mb-1.5">stdout</span>
              <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950/60 rounded-lg px-3 py-2 border border-slate-800/40 whitespace-pre-wrap leading-relaxed">
                {stdout}
              </pre>
            </div>
          )}
        </div>

        {/* The Heap Zone (Right Canvas Area) */}
        <div className="flex-1 relative overflow-y-auto px-6 py-6 min-h-0">
          <div className="absolute top-4 left-6 flex items-center gap-1.5 pointer-events-none">
            <HardDrive size={13} className="text-slate-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Object Storage (The Heap)</h3>
              <span className="text-[9px] text-slate-500 font-sans block leading-normal mt-0.5 font-normal">
                Large, complex data structures created with the "new" keyword.
              </span>
            </div>
          </div>

          {/* Cards Space */}
          <div className="relative w-full h-full min-h-[420px]">
            {Object.values(heap).length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-center gap-2 pointer-events-none p-6 border-2 border-dashed border-slate-800/40 rounded-2xl m-4">
                <HardDrive size={24} className="opacity-30" />
                <span className="text-xs font-mono max-w-[280px] leading-relaxed">
                  Waiting for an object to be created... Click the Play or Next Step button to run a "new" constructor line!
                </span>
              </div>
            ) : (
              Object.values(heap).map((obj) => {
                const isCardHovered = hoveredElement === `heap-${obj.id}`;
                const isCardSpotlighted = spotlightHeapObjects.includes(obj.id);
                
                const cardClass = isCardHovered
                  ? "hover-pulse"
                  : hasSpotlight
                    ? isCardSpotlighted
                      ? "spotlight-active-purple"
                      : "spotlight-dim"
                    : "";

                const friendlyName = getFriendlyAddressLabel(obj.id);
                const styles = getObjectColorStyles(obj.id);

                return (
                  <div
                    key={obj.id}
                    data-ref-target={`heap-${obj.id}`}
                    className={`absolute p-0.5 rounded-xl shadow-xl shadow-black/50 transition-all ${cardClass}`}
                    style={{
                      left: `${obj.x}%`,
                      top: `${obj.y}%`,
                      background: styles.background,
                      border: styles.border,
                      transition: "opacity 0.35s ease, transform 0.35s ease",
                    }}
                  >
                    <div className="bg-slate-900/90 backdrop-blur-md rounded-[10px] w-[180px] overflow-hidden">
                      {/* Object Header */}
                      <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          {friendlyName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-200">
                          {obj.className}
                        </span>
                      </div>

                      {/* Fields/Slots renderer */}
                      <div className="p-2.5">
                        {obj.isArray ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">
                              Slots (length: {obj.arrayValues?.length})
                            </span>
                            <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800/40">
                              {obj.arrayValues?.map((val, aIdx) => {
                                const isSlotSpotlighted = spotlightHeapFields.includes(`${obj.id}-${aIdx}`);
                                const slotClass = hasSpotlight
                                  ? isSlotSpotlighted
                                    ? "spotlight-active-green"
                                    : "spotlight-dim"
                                  : "";

                                return (
                                  <div
                                    key={aIdx}
                                    data-ref-source={`heap-${obj.id}-${aIdx}`}
                                    className={`flex flex-col items-center p-1 rounded bg-slate-950 border border-transparent ${slotClass}`}
                                  >
                                    <span className="text-[8px] text-slate-500 font-mono">[{aIdx}]</span>
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                      {val}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {obj.fields?.map((field, fIdx) => {
                              const isFieldSpotlighted = spotlightHeapFields.includes(`${obj.id}-${field.name}`);
                              const fieldClass = hasSpotlight
                                ? isFieldSpotlighted
                                  ? "spotlight-active-purple bg-purple-950/20"
                                  : "spotlight-dim"
                                : "";

                              const friendlyFieldVal = getFriendlyAddressLabel(field.value);
                              const fStyles = getObjectColorStyles(field.value.replace("@", ""));

                              return (
                                <div
                                  key={fIdx}
                                  data-ref-source={`heap-${obj.id}-${field.name}`}
                                  className={`flex items-center justify-between text-[11px] font-mono py-1 px-1.5 border-b border-slate-800/40 last:border-0 rounded border border-transparent ${fieldClass}`}
                                >
                                  <span className="text-slate-400 font-semibold">{field.name}</span>
                                  
                                  {/* Field reference value */}
                                  {field.isReference ? (
                                    <span
                                      className={`badge py-0.5 px-1.5 text-[9px] font-bold ${
                                        field.value !== "null" ? fStyles.badge : "bg-slate-950 text-slate-500"
                                      }`}
                                    >
                                      {friendlyFieldVal}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 font-bold">{field.value}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
