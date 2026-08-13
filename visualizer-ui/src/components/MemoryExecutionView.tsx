"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Layers, HardDrive } from "lucide-react";
import {
  StackFrame,
  HeapObject,
  RefArrow,
  DataMovement,
  ActiveBlock,
  MemoryCallout,
} from "@/types/visualizer";

export function getFriendlyAddressLabel(value: string): string {
  if (!value) return value;
  const clean = value.replace("@", "");
  if (clean === "101" || clean === "201" || clean === "301")
    return "[Object 1]";
  if (clean === "102" || clean === "202" || clean === "302")
    return "[Object 2]";
  if (clean === "303") return "[Object 3]";
  return value;
}

export function getObjectColorStyles(id: string) {
  const clean = id.replace("@", "");
  if (clean === "101" || clean === "201" || clean === "301") {
    return {
      border: "1px solid rgba(16, 185, 129, 0.4)",
      background: "linear-gradient(135deg, #e7f3ee 0%, #ffffff 100%)",
      glow: "rgba(16, 185, 129, 0.2)",
      badge: "badge-green",
    };
  }
  if (clean === "102" || clean === "202" || clean === "302") {
    return {
      border: "1px solid rgba(5, 150, 105, 0.4)",
      background: "linear-gradient(135deg, #e8f1f8 0%, #ffffff 100%)",
      glow: "rgba(5, 150, 105, 0.2)",
      badge: "badge-green",
    };
  }
  if (clean === "303") {
    return {
      border: "1px solid rgba(52, 211, 153, 0.4)",
      background: "linear-gradient(135deg, #fbeceb 0%, #ffffff 100%)",
      glow: "rgba(52, 211, 153, 0.2)",
      badge: "badge-cyan",
    };
  }
  return {
    border: "1px solid var(--border)",
    background: "var(--bg-panel)",
    glow: "transparent",
    badge: "bg-[#eef2f6] text-[#5f6b7a]",
  };
}

interface BoxOffset {
  dx: number;
  dy: number;
}

interface DragSession {
  key: string;
  el: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  baseDx: number;
  baseDy: number;
  currentDx: number;
  currentDy: number;
  minDx: number;
  maxDx: number;
  minDy: number;
  maxDy: number;
  /* Visual-to-local pixel ratio captured at press time, 1 when unzoomed. */
  scale: number;
  moved: boolean;
}

// A press only becomes a drag past this many pixels, so a plain click on a
// badge or a text selection still behaves normally.
const DRAG_THRESHOLD_PX = 4;

// Keep a dragged box fully inside its zone, with a little breathing room.
const DRAG_EDGE_PADDING_PX = 8;

// The Objects heading is an absolutely positioned overlay on top of the heap
// canvas, so heap cards need a taller reserved strip than stack frames, whose
// Stack heading scrolls with the column content.
const HEAP_TOP_INSET_PX = 48;
const STACK_TOP_INSET_PX = 8;

// Elements that must keep their own pointer behaviour if any are added later.
const DRAG_IGNORE_SELECTOR =
  'button, a, input, select, textarea, [role="button"]';

/*
 * The study shell scales itself up on large monitors with CSS zoom. Under
 * zoom, getBoundingClientRect and pointer clientX/clientY report VISUAL
 * pixels, while SVG coordinates and CSS transforms in this view are in
 * unscaled local pixels. Every measured delta therefore has to be divided by
 * this factor, or arrows, callouts and drags land progressively further off
 * the further the monitor scales up.
 *
 * Comparing the visual width against the layout width yields the cumulative
 * scale, and returns exactly 1 when no zoom is in effect.
 */
function visualScale(el: HTMLElement): number {
  const visualWidth = el.getBoundingClientRect().width;
  const layoutWidth = el.offsetWidth;
  if (!layoutWidth || !visualWidth) return 1;
  return visualWidth / layoutWidth;
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
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
  enteringStackVars?: string[];
  enteringHeapObjects?: string[];
  dataMovement?: DataMovement;
  callouts?: MemoryCallout[];
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
  enteringStackVars = [],
  enteringHeapObjects = [],
  dataMovement,
  callouts = [],
  hoveredElement = null,
  stdout,
  activeBlock,
}: MemoryExecutionViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgPaths, setSvgPaths] = useState<
    Array<{ id: string; signature: string; d: string; color: string }>
  >([]);
  const [anim, setAnim] = useState<{
    value: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [calloutPositions, setCalloutPositions] = useState<
    Array<{ callout: MemoryCallout; top: number; left: number }>
  >([]);

  // Participant-placed offsets for draggable memory boxes, keyed by identity
  // (heap object id, or method frame occurrence) so a box stays where it was
  // put even though the step data is rebuilt from scratch on every step.
  const [boxOffsets, setBoxOffsets] = useState<Record<string, BoxOffset>>({});
  const dragRef = useRef<DragSession | null>(null);

  // Frames are keyed by method name plus occurrence, never by array index,
  // because a later step can push or pop frames above a frame the participant
  // already moved.
  const stackFrameKeys = useMemo(() => {
    const seen: Record<string, number> = {};
    return stack.map((frame) => {
      const occurrence = seen[frame.methodName] ?? 0;
      seen[frame.methodName] = occurrence + 1;
      return `frame:${frame.methodName}#${occurrence}`;
    });
  }, [stack]);

  const hasMovedBoxes = Object.keys(boxOffsets).length > 0;

  // Check if current step has any active spotlight focal points
  const hasSpotlight =
    spotlightStackVars.length > 0 ||
    spotlightHeapObjects.length > 0 ||
    spotlightHeapFields.length > 0;
  const animatedValue = anim ? getFriendlyAddressLabel(anim.value) : "";
  const animatedAction = anim?.value.trim().startsWith("@")
    ? "Copy reference"
    : "Copy value";

  const updatePaths = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const calculated = arrows
      .map((arrow) => {
        const sourceEl = container.querySelector(
          `[data-ref-source="${arrow.source}"]`,
        );
        const targetEl = container.querySelector(
          `[data-ref-target="${arrow.target}"]`,
        );

        if (!sourceEl || !targetEl) return null;

        const sRect = sourceEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        const scale = visualScale(container);

        // Calculate start coordinate: center-right of source badge
        const x1 = (sRect.right - containerRect.left) / scale;
        const y1 = (sRect.top + sRect.height / 2 - containerRect.top) / scale;

        /*
         * Where the arrow lands depends on where the card sits. Coming into
         * the left edge is right when the card is off to the side, but when it
         * sits below the badge, entering from the left forced the curve to
         * swing out and wrap around the card. In that case it drops into the
         * middle of the card's top edge instead.
         *
         * "Below" means the vertical drop is larger than the sideways travel,
         * so a card that is merely lower and far to the side still gets the
         * side entry it reads better with.
         */
        const targetCenterX = tRect.left + tRect.width / 2;
        const verticalDrop = tRect.top - sRect.bottom;
        const sidewaysTravel = Math.abs(targetCenterX - sRect.right);
        const enterFromTop = verticalDrop > 0 && verticalDrop > sidewaysTravel;

        const x2 = enterFromTop
          ? (targetCenterX - containerRect.left) / scale
          : (tRect.left - containerRect.left) / scale;
        const y2 = enterFromTop
          ? (tRect.top - containerRect.top) / scale
          : (tRect.top + tRect.height / 2 - containerRect.top) / scale;

        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const cp1x = x1 + Math.max(dx * 0.45, 40);
        const cp1y = y1;
        /* Approach straight down into the top edge, or in from the left. */
        const cp2x = enterFromTop ? x2 : x2 - Math.max(dx * 0.45, 40);
        const cp2y = enterFromTop ? y2 - Math.max(dy * 0.45, 40) : y2;

        const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

        return {
          id: arrow.id,
          signature: `${arrow.id}|${arrow.source}|${arrow.target}`,
          d,
          color: arrow.color || "blue",
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      signature: string;
      d: string;
      color: string;
    }>;

    setSvgPaths(calculated);
  }, [arrows]);

  const updateCalloutPositions = useCallback(() => {
    if (!containerRef.current || callouts.length === 0) {
      setCalloutPositions([]);
      return;
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const width = 220;
    const gap = 10;
    const estimatedHeight = 92;
    const nextPositions: Array<{
      callout: MemoryCallout;
      top: number;
      left: number;
    }> = [];

    callouts.forEach((callout, index) => {
      const targetEl =
        container.querySelector(`[data-ref-source="${callout.target}"]`) ||
        container.querySelector(`[data-ref-target="${callout.target}"]`);

      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      const scale = visualScale(container);
      const boundsWidth = container.offsetWidth;
      const boundsHeight = container.offsetHeight;
      let left = callout.target.startsWith("stack-")
        ? (targetRect.left - containerRect.left) / scale - width - gap
        : (targetRect.right - containerRect.left) / scale + gap;
      let top = (targetRect.top - containerRect.top) / scale - 4;

      if (left < 12) {
        left = (targetRect.right - containerRect.left) / scale + gap;
      }

      if (left + width > boundsWidth - 12) {
        left = (targetRect.left - containerRect.left) / scale - width - gap;
      }

      left = Math.max(12, Math.min(boundsWidth - width - 12, left));
      top = Math.max(
        64,
        Math.min(boundsHeight - estimatedHeight - 12, top + index * 4),
      );

      nextPositions.push({ callout, left, top });
    });

    nextPositions
      .sort((a, b) => a.top - b.top)
      .forEach((position, index, positions) => {
        for (let prevIndex = 0; prevIndex < index; prevIndex += 1) {
          const previous = positions[prevIndex];
          const horizontallyClose =
            Math.abs(position.left - previous.left) < width * 0.75;
          const verticallyClose =
            position.top < previous.top + estimatedHeight + 8;

          if (horizontallyClose && verticallyClose) {
            position.top = previous.top + estimatedHeight + 8;
          }
        }

        position.top = Math.min(
          position.top,
          containerRect.height - estimatedHeight - 12,
        );
      });

    setCalloutPositions(nextPositions);
  }, [callouts]);

  // While a box is being dragged the offset is written straight to the node
  // instead of through React state. That keeps the drag at pointer rate and,
  // because no re-render happens mid-drag, it cannot race the 50ms step
  // recompute or the ResizeObserver. The offset is committed to state on drop.
  const handleBoxPointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      key: string,
      topInset: number,
    ) => {
      if (event.button !== 0 || dragRef.current) return;
      if ((event.target as HTMLElement).closest(DRAG_IGNORE_SELECTOR)) return;

      const el = event.currentTarget;
      const bounds = el.closest("[data-drag-bounds]");
      if (!bounds) return;

      const elRect = el.getBoundingClientRect();
      const boundsRect = bounds.getBoundingClientRect();
      const base = boxOffsets[key] ?? { dx: 0, dy: 0 };
      /* Travel limits are measured in visual px but applied as local px. */
      const scale = visualScale(el);

      dragRef.current = {
        key,
        el,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        baseDx: base.dx,
        baseDy: base.dy,
        currentDx: base.dx,
        currentDy: base.dy,
        // Travel limits are derived once, from the gap between the box edges
        // and its zone edges at press time.
        minDx:
          base.dx +
          (boundsRect.left / scale + DRAG_EDGE_PADDING_PX - elRect.left / scale),
        maxDx:
          base.dx +
          (boundsRect.right / scale - DRAG_EDGE_PADDING_PX - elRect.right / scale),
        minDy: base.dy + (boundsRect.top / scale + topInset - elRect.top / scale),
        maxDy:
          base.dy +
          (boundsRect.bottom / scale - DRAG_EDGE_PADDING_PX - elRect.bottom / scale),
        scale,
        moved: false,
      };
    },
    [boxOffsets],
  );

  const handleBoxPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      /* Pointer coordinates are visual px; the transform below is local px. */
      const rawDx = (event.clientX - drag.startX) / drag.scale;
      const rawDy = (event.clientY - drag.startY) / drag.scale;

      if (!drag.moved) {
        if (
          Math.abs(rawDx) < DRAG_THRESHOLD_PX &&
          Math.abs(rawDy) < DRAG_THRESHOLD_PX
        )
          return;
        drag.moved = true;
        // Capture only once this is genuinely a drag, so a plain click is
        // never retargeted away from the badge the participant pressed.
        // Capture can throw if the pointer is already gone, which must not
        // abort the drag bookkeeping.
        try {
          drag.el.setPointerCapture(event.pointerId);
        } catch {
          // Ignore, the drag still tracks pointer moves on this element.
        }
        drag.el.style.cursor = "grabbing";
        drag.el.style.zIndex = "25";
      }

      drag.currentDx = clamp(drag.baseDx + rawDx, drag.minDx, drag.maxDx);
      drag.currentDy = clamp(drag.baseDy + rawDy, drag.minDy, drag.maxDy);
      drag.el.style.translate = `${drag.currentDx}px ${drag.currentDy}px`;

      // Arrows are re-derived from live rects on every move, so they stay
      // attached to the box while it travels instead of snapping on drop.
      // Reading the rects straight after the style write picks up the new
      // position, and the browser already coalesces pointermove to about one
      // event per frame, so this does not run hotter than the display.
      updatePaths();
      updateCalloutPositions();
    },
    [updatePaths, updateCalloutPositions],
  );

  const handleBoxPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;

      if (drag.el.hasPointerCapture(event.pointerId)) {
        try {
          drag.el.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore, the pointer was already released by the browser.
        }
      }
      drag.el.style.cursor = "";
      drag.el.style.zIndex = "";

      if (!drag.moved) return;

      setBoxOffsets((previous) => ({
        ...previous,
        [drag.key]: { dx: drag.currentDx, dy: drag.currentDy },
      }));
      updatePaths();
      updateCalloutPositions();
    },
    [updatePaths, updateCalloutPositions],
  );

  const resetBoxLayout = useCallback(() => {
    setBoxOffsets({});
  }, []);

  // Recalculate reference paths on step updates
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePaths();
      updateCalloutPositions();
    }, 50);
    return () => clearTimeout(timer);
  }, [
    currentStep,
    stack,
    heap,
    arrows,
    callouts,
    boxOffsets,
    updatePaths,
    updateCalloutPositions,
  ]);

  // Recalculate paths on resize events
  useEffect(() => {
    const handleResize = () => {
      updatePaths();
      updateCalloutPositions();
    };

    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [updatePaths, updateCalloutPositions]);

  // Handle micro-animations for data movement (value sliding)
  useEffect(() => {
    const clearTimer = setTimeout(() => setAnim(null), 0);
    if (!dataMovement || !containerRef.current) {
      return () => clearTimeout(clearTimer);
    }

    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;

      const fromEl = container.querySelector(
        `[data-ref-source="${dataMovement.from}"]`,
      );
      const toEl = container.querySelector(
        `[data-ref-source="${dataMovement.to}"]`,
      );

      if (fromEl && toEl) {
        const containerRect = container.getBoundingClientRect();
        const fRect = fromEl.getBoundingClientRect();
        const tRect = toEl.getBoundingClientRect();

        // Calculate center points relative to the container
        const scale = visualScale(container);
        const x1 = (fRect.left - containerRect.left + fRect.width / 2) / scale;
        const y1 = (fRect.top - containerRect.top + fRect.height / 2) / scale;
        const x2 = (tRect.left - containerRect.left + tRect.width / 2) / scale;
        const y2 = (tRect.top - containerRect.top + tRect.height / 2) / scale;

        setAnim({
          value: dataMovement.value,
          x1,
          y1,
          x2,
          y2,
        });
      }
    }, 180); // Small delay to let the DOM elements position themselves first

    return () => {
      clearTimeout(clearTimer);
      clearTimeout(timer);
    };
  }, [currentStep, dataMovement]);

  // Hex color codes mapping for path stroke colors
  const strokeColorMap: Record<string, string> = {
    blue: "#3b82f6",
    purple: "#a855f7",
    cyan: "#06b6d4",
    emerald: "#10b981",
  };

  return (
    <div
      id="onboarding-memory-view"
      ref={containerRef}
      className="flex flex-col h-full relative overflow-hidden"
      style={{ background: "var(--bg-panel-2)" }}
    >
      {/* Visualizer SVG Reference Overlay Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
        <defs>
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
              key={p.signature}
              d={p.d}
              fill="none"
              stroke={colorHex}
              strokeWidth={2}
              markerEnd={`url(#arrow-${p.color})`}
              className="ref-pointer ref-pointer-active reveal-arrow"
            />
          );
        })}
      </svg>

      {/* Moving teaching label that distinguishes references from plain values. */}
      {anim && (
        <div
          key={currentStep} // Key triggers React re-mount which fires CSS animation keyframe
          className="animate-slide-value pointer-events-none flex min-w-max flex-col items-center justify-center rounded-md border px-3 py-1.5 font-mono shadow-sm"
          style={
            {
              "--start-x": `${anim.x1}px`,
              "--start-y": `${anim.y1}px`,
              "--target-x": `${anim.x2}px`,
              "--target-y": `${anim.y2}px`,
              transform: "translate(-50%, -50%)",
              background: "var(--bg-panel)",
              borderColor: "var(--accent)",
            } as React.CSSProperties
          }
        >
          <span
            className="text-[8px] font-bold uppercase leading-none"
            style={{ color: "var(--text-muted)" }}
          >
            {animatedAction}
          </span>
          <span
            className="mt-1 text-[11px] font-bold leading-none"
            style={{ color: "var(--accent)" }}
          >
            {animatedValue}
          </span>
        </div>
      )}

      {/* Plain-English teaching callouts anchored to memory items */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {calloutPositions.map(({ callout, top, left }) => (
          <MemoryCalloutBox
            key={`${callout.target}-${callout.title}`}
            callout={callout}
            top={top}
            left={left}
          />
        ))}
      </div>
      {/* Panel Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0 z-30"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[var(--accent)]" />
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            What Java Is Doing: Visualization Workbench
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasMovedBoxes && (
            <button
              type="button"
              onClick={resetBoxLayout}
              className="text-[10px] underline underline-offset-2 hover:opacity-70"
              style={{ color: "var(--text-muted)", background: "transparent" }}
            >
              Reset layout
            </button>
          )}
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Changed items are marked
          </span>
        </div>
      </div>

      <div className="memory-zones flex-1 flex min-h-0 relative z-10">
        {/* The Stack Zone (Left Column) */}
        <div
          id="onboarding-stack-zone"
          data-drag-bounds
          className="memory-variables-zone w-[280px] flex-shrink-0 flex flex-col border-r px-4 py-4 overflow-y-auto"
          style={{
            borderColor: "var(--border)",
            background: "var(--bg-panel)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-4 flex-shrink-0">
            <Layers size={13} style={{ color: "var(--text-secondary)" }} />
            <div>
              <h3
                className="text-xs font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Stack
              </h3>
              <span
                className="text-[9px] font-sans block leading-normal mt-0.5 font-normal"
                style={{ color: "var(--text-secondary)" }}
              >
                Local variables and references
              </span>
            </div>
          </div>

          {activeBlock && (
            <div className="mb-3 flex items-center gap-1.5 flex-shrink-0">
              <span
                className="text-[9px] uppercase tracking-wider font-bold font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                scope
              </span>
              <span className="badge badge-blue text-[9px] py-0.5 px-1.5 font-mono">
                {activeBlock.label} · lines {activeBlock.beginLine}-
                {activeBlock.endLine}
              </span>
            </div>
          )}

          <div className="space-y-4">
            {stack.map((frame, idx) => {
              const frameKey = stackFrameKeys[idx];
              const frameOffset = boxOffsets[frameKey] ?? { dx: 0, dy: 0 };

              return (
                <div
                  key={idx}
                  className="rounded-lg border overflow-hidden shadow-sm"
                  onPointerDown={(event) =>
                    handleBoxPointerDown(event, frameKey, STACK_TOP_INSET_PX)
                  }
                  onPointerMove={handleBoxPointerMove}
                  onPointerUp={handleBoxPointerUp}
                  onPointerCancel={handleBoxPointerUp}
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-panel)",
                    // The CSS translate property is used instead of transform so
                    // the offset survives the spotlight and hover classes, which
                    // set transform with !important.
                    translate: `${frameOffset.dx}px ${frameOffset.dy}px`,
                    cursor: "grab",
                    touchAction: "none",
                  }}
                >
                  {/* Method Frame Header */}
                  <div
                    className="px-3.5 py-2 border-b flex items-center justify-between"
                    style={{
                      background: "#e8f1f8",
                      borderColor: "var(--border)",
                    }}
                  >
                    <span
                      className="text-xs font-mono font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {frame.methodName}
                    </span>
                    <span
                      className="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded font-mono"
                      style={{
                        color: "var(--text-secondary)",
                        background: "#ffffff",
                      }}
                    >
                      Frame
                    </span>
                  </div>

                  {/* Local Variables List */}
                  <div className="p-3 space-y-2">
                    {frame.variables.length === 0 ? (
                      <span
                        className="text-[10px] block text-center py-3 px-4 font-mono max-w-[200px] mx-auto leading-normal"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No variables yet.
                      </span>
                    ) : (
                      frame.variables.map((v, vIdx) => {
                        const isHovered = hoveredElement === `stack-${v.name}`;
                        const isSpotlighted = spotlightStackVars.includes(
                          v.name,
                        );
                        const isNewVariable = enteringStackVars.includes(
                          v.name,
                        );

                        /* Stage 1: the variable is created on the stack first. */
                        const varClass = isHovered
                          ? "hover-pulse"
                          : hasSpotlight
                            ? isSpotlighted
                              ? `spotlight-active-blue${isNewVariable ? " reveal-stage-1" : ""}`
                              : "spotlight-dim"
                            : "";

                        const friendlyVal = getFriendlyAddressLabel(v.value);
                        const styles = getObjectColorStyles(
                          v.value.replace("@", ""),
                        );

                        return (
                          <div
                            key={vIdx}
                            data-ref-source={`stack-${v.name}`}
                            className={`flex items-center justify-between p-2.5 rounded-md border transition-all ${varClass}`}
                            style={{
                              background: "var(--bg-panel-2)",
                              borderColor: "var(--border)",
                            }}
                          >
                            <div className="flex flex-col leading-tight">
                              <span
                                className="text-[8px] font-mono font-bold"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {v.type}
                              </span>
                              <span
                                className="text-xs font-mono font-bold"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {v.name}
                              </span>
                              {isSpotlighted && (
                                <span className="changed-badge mt-1">
                                  Changed
                                </span>
                              )}
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

                    {frame.calculation && (
                      <div
                        className="spotlight-active-green mt-2 rounded-md border-2 px-3 py-2.5"
                        style={{
                          background: "rgba(16, 185, 129, 0.1)",
                          borderColor: "#10b981",
                        }}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className="text-[9px] font-mono font-bold uppercase tracking-wider"
                            style={{ color: "#047857" }}
                          >
                            Expression evaluated
                          </span>
                          <span className="changed-badge">Changed</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 font-mono font-bold">
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {frame.calculation.expression}
                          </span>
                          <span
                            className="text-[12px]"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            =
                          </span>
                          <span
                            className="rounded-md px-2.5 py-1 text-sm"
                            style={{ color: "#047857", background: "#d1fae5" }}
                          >
                            {frame.calculation.result}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {stdout && (
            <div
              className="mt-4 pt-3 border-t flex-shrink-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-[9px] uppercase tracking-wider font-bold font-mono block mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                stdout
              </span>
              <pre
                className="text-[11px] font-mono rounded-md px-3 py-2 border whitespace-pre-wrap leading-relaxed"
                style={{
                  color: "var(--success)",
                  background: "var(--bg-panel-2)",
                  borderColor: "var(--border)",
                }}
              >
                {stdout}
              </pre>
            </div>
          )}
        </div>

        {/* The Heap Zone (Right Canvas Area) */}
        <div
          id="onboarding-heap-zone"
          data-drag-bounds
          className="memory-objects-zone flex-1 relative overflow-y-auto px-6 py-6 min-h-0"
        >
          <div className="absolute top-4 left-6 flex items-center gap-1.5 pointer-events-none">
            <HardDrive size={13} style={{ color: "var(--text-secondary)" }} />
            <div>
              <h3
                className="text-xs font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Objects: Memory
              </h3>
              <span
                className="text-[9px] font-sans block leading-normal mt-0.5 font-normal"
                style={{ color: "var(--text-secondary)" }}
              >
                Created with <code>new</code>{" "}
                <span style={{ color: "var(--text-muted)" }}>(Heap)</span>
              </span>
            </div>
          </div>

          {/* Cards Space */}
          <div className="memory-objects-canvas relative w-full h-full min-h-[300px]">
            {Object.values(heap).length === 0 ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2 pointer-events-none p-6"
                style={{ color: "var(--text-muted)" }}
              >
                <HardDrive size={24} className="opacity-30" />
                <span className="text-xs">No objects yet.</span>
              </div>
            ) : (
              Object.values(heap).map((obj) => {
                const isCardHovered = hoveredElement === `heap-${obj.id}`;
                const isCardSpotlighted = spotlightHeapObjects.includes(obj.id);
                const isNewObject = enteringHeapObjects.includes(obj.id);

                /* Stage 2: the object the variable points at arrives next. */
                const cardClass = isCardHovered
                  ? "hover-pulse"
                  : hasSpotlight
                    ? isCardSpotlighted
                      ? `spotlight-active-purple${isNewObject ? " reveal-stage-2" : ""}`
                      : "spotlight-dim"
                    : "";

                const friendlyName = getFriendlyAddressLabel(obj.id);
                const styles = getObjectColorStyles(obj.id);
                const cardKey = `heap:${obj.id}`;
                const cardOffset = boxOffsets[cardKey] ?? { dx: 0, dy: 0 };

                return (
                  <div
                    key={obj.id}
                    data-ref-target={`heap-${obj.id}`}
                    className={`memory-object-card absolute p-0.5 rounded-lg shadow-md transition-all ${cardClass}`}
                    onPointerDown={(event) =>
                      handleBoxPointerDown(event, cardKey, HEAP_TOP_INSET_PX)
                    }
                    onPointerMove={handleBoxPointerMove}
                    onPointerUp={handleBoxPointerUp}
                    onPointerCancel={handleBoxPointerUp}
                    style={{
                      left: `${obj.x}%`,
                      top: `${obj.y}%`,
                      background: styles.background,
                      border: styles.border,
                      // Objects that appear on a later step have no stored
                      // offset, so they still land in their automatic spot.
                      translate: `${cardOffset.dx}px ${cardOffset.dy}px`,
                      cursor: "grab",
                      touchAction: "none",
                      transition: "opacity 0.35s ease, transform 0.35s ease",
                    }}
                  >
                    <div
                      className="rounded-md w-[210px] overflow-hidden"
                      style={{ background: "var(--bg-panel)" }}
                    >
                      {/* Object Header */}
                      <div
                        className="px-3 py-1.5 border-b flex items-center justify-between gap-1.5"
                        style={{
                          background: "#e8f1f8",
                          borderColor: "var(--border)",
                        }}
                      >
                        <span
                          className="text-[10px] font-bold font-mono flex-shrink-0"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {friendlyName}
                        </span>
                        <span
                          className="text-[10px] font-mono font-bold flex-shrink-0"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {obj.className}
                        </span>
                        {isCardSpotlighted && (
                          <span className="changed-badge flex-shrink-0">
                            Changed
                          </span>
                        )}
                      </div>

                      {/* Fields/Slots renderer */}
                      <div className="p-2.5">
                        {obj.isArray ? (
                          <div className="flex flex-col gap-1.5">
                            <span
                              className="text-[9px] uppercase tracking-wider font-bold font-mono"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Slots (length: {obj.arrayValues?.length})
                            </span>
                            <div
                              className="grid grid-cols-3 gap-1 p-1 rounded-md border"
                              style={{
                                background: "var(--bg-panel-2)",
                                borderColor: "var(--border)",
                              }}
                            >
                              {obj.arrayValues?.map((value, aIdx) => {
                                const isSlotSpotlighted =
                                  spotlightHeapFields.includes(
                                    `${obj.id}-${aIdx}`,
                                  );
                                /* An array slot is a field like any other, so
                                 * it earns the same stage-3 reveal and the same
                                 * CHANGED marker. Without them the panel says
                                 * "Changed items are marked" while the one cell
                                 * the line actually wrote stays unmarked. */
                                const slotClass = hasSpotlight
                                  ? isSlotSpotlighted
                                    ? "spotlight-active-green"
                                    : ""
                                  : "";

                                return (
                                  <div
                                    key={aIdx}
                                    data-ref-source={`heap-${obj.id}-${aIdx}`}
                                    className={`flex flex-col items-center p-1 rounded border ${slotClass}`}
                                    style={{
                                      background: "var(--bg-panel)",
                                      borderColor: "var(--border)",
                                    }}
                                  >
                                    <span
                                      className="text-[8px] font-mono"
                                      style={{ color: "var(--text-muted)" }}
                                    >
                                      [{aIdx}]
                                    </span>
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                      {value}
                                    </span>
                                    {isSlotSpotlighted && (
                                      <span className="changed-badge mt-1">
                                        Changed
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {obj.fields?.map((field, fIdx) => {
                              const isFieldSpotlighted =
                                spotlightHeapFields.includes(
                                  `${obj.id}-${field.name}`,
                                );
                              /* Stage 3: a field changing inside an object is
                               * the last thing to land, alongside the arrow. */
                              const fieldClass = hasSpotlight
                                ? isFieldSpotlighted
                                  ? "spotlight-active-purple bg-purple-950/20"
                                  : ""
                                : "";

                              const friendlyFieldVal = getFriendlyAddressLabel(
                                field.value,
                              );
                              const fStyles = getObjectColorStyles(
                                field.value.replace("@", ""),
                              );

                              return (
                                <div
                                  key={fIdx}
                                  data-ref-source={`heap-${obj.id}-${field.name}`}
                                  className={`flex items-center justify-between gap-2 text-[11px] font-mono py-1 px-1.5 border-b last:border-0 rounded ${fieldClass}`}
                                  style={{ borderColor: "var(--border)" }}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="font-semibold flex-shrink-0"
                                      style={{ color: "var(--text-secondary)" }}
                                    >
                                      {field.name}
                                    </span>
                                    {isFieldSpotlighted && (
                                      <span className="changed-badge text-[7px] px-1 py-0 flex-shrink-0">
                                        Changed
                                      </span>
                                    )}
                                  </div>

                                  {/* Field reference value */}
                                  <div className="flex items-center flex-shrink-0 gap-1.5">
                                    {field.isReference ? (
                                      <span
                                        className={`badge flex-shrink-0 whitespace-nowrap py-0.5 px-1.5 text-[9px] font-bold ${
                                          field.value !== "null"
                                            ? fStyles.badge
                                            : "bg-[#eef2f6] text-[#5f6b7a]"
                                        }`}
                                      >
                                        {friendlyFieldVal}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-400 font-bold flex-shrink-0">
                                        {field.value}
                                      </span>
                                    )}
                                  </div>
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

function MemoryCalloutBox({
  callout,
  top,
  left,
}: {
  callout: MemoryCallout;
  top: number;
  left: number;
}) {
  const toneClass =
    callout.tone === "purple"
      ? "border-[#b9d2e5] bg-[#e8f1f8] text-[#172033]"
      : callout.tone === "green"
        ? "border-[#b8dccf] bg-[#e7f3ee] text-[#172033]"
        : callout.tone === "amber"
          ? "border-[#efc5c0] bg-[#fbeceb] text-[#172033]"
          : "border-[#bfdee2] bg-[#edf6f7] text-[#172033]";

  return (
    <aside
      className={`absolute w-[220px] rounded-lg border px-2.5 py-2 shadow-md ${toneClass}`}
      style={{ top, left }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider font-mono">
        {callout.title}
      </p>
      <p className="mt-1 text-[10px] leading-relaxed">{callout.body}</p>
    </aside>
  );
}
