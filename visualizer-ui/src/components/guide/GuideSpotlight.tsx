"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export interface GuideRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius?: string;
}

export type GuideSide = "top" | "bottom" | "left" | "right" | "center";

/* The spotlight sits just below the guide card's own portal layer so the card
 * always paints on top of the dimmer and the pointer arrow. */
const SPOTLIGHT_Z = 2147482900;

/* Participants must still be able to click Run This Line while the guide is
 * showing, so every layer this file renders is pointer-events: none. */
const DIM = "rgba(23, 32, 51, 0.52)";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}

/* Tracks a target element's viewport rect for the entire time the guide is
 * visible. Participants can collapse the explanation panel at any point, and
 * that reflows the controls without necessarily producing a window resize or
 * scroll event. Keeping the lightweight rect read alive prevents spotlight
 * openings from being left at a button's former position. */
export function useTargetRect(selector: string | null, active: boolean): GuideRect | null {
  const [rect, setRect] = useState<GuideRect | null>(null);

  useEffect(() => {
    if (!active || !selector || typeof document === "undefined") return;

    let frame = 0;

    const read = () => {
      const el = document.querySelector(selector);
      if (!el) {
        setRect(null);
        return;
      }
      const next = el.getBoundingClientRect();
      const borderRadius = window.getComputedStyle(el).borderRadius;
      setRect((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.borderRadius === borderRadius
          ? prev
          : { top: next.top, left: next.left, width: next.width, height: next.height, borderRadius },
      );
    };

    read();

    const tick = () => {
      read();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const targetElement = document.querySelector(selector);
    const layoutRoot = targetElement?.closest(
      "#onboarding-editor-panel, #onboarding-tutor-panel",
    ) ?? targetElement?.parentElement;
    const resizeObserver = new ResizeObserver(read);
    if (targetElement) resizeObserver.observe(targetElement);
    if (layoutRoot && layoutRoot !== targetElement) resizeObserver.observe(layoutRoot);

    const mutationObserver = layoutRoot
      ? new MutationObserver(read)
      : null;
    mutationObserver?.observe(layoutRoot!, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", read);
    window.addEventListener("scroll", read, true);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", read);
      window.removeEventListener("scroll", read, true);
    };
  }, [selector, active]);

  /* Gated on the way out rather than cleared inside the effect, so a stale
   * rect from a previous target can never be handed back. */
  return active && selector ? rect : null;
}

interface PlaceArgs {
  target: GuideRect | null;
  cardWidth: number;
  cardHeight: number;
  preferred: GuideSide;
  viewportWidth: number;
  viewportHeight: number;
  gap?: number;
  margin?: number;
}

export interface Placement {
  top: number;
  left: number;
  side: GuideSide;
}

function intersects(a: GuideRect, b: GuideRect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

const OPPOSITE: Record<Exclude<GuideSide, "center">, Exclude<GuideSide, "center">> = {
  right: "left",
  left: "right",
  top: "bottom",
  bottom: "top",
};

/* Collision-aware placement. The old code picked a side then hard-clamped to
 * the viewport, which dragged the card onto the very panel it was describing.
 * Here every candidate side is rejected outright if it would overlap the
 * target, and screen center is only used when nothing else fits. */
export function placeGuideCard({
  target,
  cardWidth,
  cardHeight,
  preferred,
  viewportWidth,
  viewportHeight,
  gap = 18,
  margin = 16,
}: PlaceArgs): Placement {
  const centered: Placement = {
    top: Math.max(margin, viewportHeight / 2 - cardHeight / 2),
    left: Math.max(margin, viewportWidth / 2 - cardWidth / 2),
    side: "center",
  };

  if (!target || target.width === 0 || target.height === 0 || preferred === "center") {
    return centered;
  }

  const clampX = (value: number) =>
    Math.max(margin, Math.min(viewportWidth - cardWidth - margin, value));
  const clampY = (value: number) =>
    Math.max(margin, Math.min(viewportHeight - cardHeight - margin, value));

  const targetCenterX = target.left + target.width / 2;
  const targetCenterY = target.top + target.height / 2;

  const build = (side: Exclude<GuideSide, "center">): Placement | null => {
    let top: number;
    let left: number;

    // 58px offset ensures room for the 44px pointer arrow between target & card
    const sideGap = Math.max(gap, 58);

    if (side === "right") {
      left = target.left + target.width + sideGap;
      top = clampY(targetCenterY - cardHeight / 2);
      if (left + cardWidth > viewportWidth - margin) return null;
    } else if (side === "left") {
      left = target.left - cardWidth - sideGap;
      top = clampY(targetCenterY - cardHeight / 2);
      if (left < margin) return null;
    } else if (side === "bottom") {
      top = target.top + target.height + sideGap;
      left = clampX(targetCenterX - cardWidth / 2);
      if (top + cardHeight > viewportHeight - margin) return null;
    } else {
      top = target.top - cardHeight - sideGap;
      left = clampX(targetCenterX - cardWidth / 2);
      if (top < margin) return null;
    }

    const candidate: GuideRect = { top, left, width: cardWidth, height: cardHeight };
    if (intersects(candidate, target)) return null;

    return { top, left, side };
  };

  const order: Array<Exclude<GuideSide, "center">> = [
    preferred as Exclude<GuideSide, "center">,
    OPPOSITE[preferred as Exclude<GuideSide, "center">],
    "bottom",
    "top",
    "right",
    "left",
  ];

  const seen = new Set<string>();
  for (const side of order) {
    if (seen.has(side)) continue;
    seen.add(side);
    const placement = build(side);
    if (placement) return placement;
  }

  return centered;
}

/* One arrow, never several. It is drawn pointing left and rotated into place,
 * so a single translate loop along the screen axis reads as "look over here".
 * The loop runs at roughly 0.4Hz, far below the 3Hz flash threshold. */
function PointerArrow({
  target,
  side,
  reducedMotion,
}: {
  target: GuideRect;
  side: GuideSide;
  reducedMotion: boolean;
}) {
  if (side === "center") return null;

  const length = 44;
  const thickness = 22;
  const standoff = 6;

  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;

  let left: number;
  let top: number;
  let rotation: number;
  let axis: "x" | "y";
  let travel: number;

  if (side === "right") {
    left = target.left + target.width + standoff;
    top = centerY - thickness / 2;
    rotation = 0;
    axis = "x";
    travel = 9;
  } else if (side === "left") {
    left = target.left - length - standoff;
    top = centerY - thickness / 2;
    rotation = 180;
    axis = "x";
    travel = -9;
  } else if (side === "bottom") {
    left = centerX - length / 2;
    top = target.top + target.height + standoff + (length - thickness) / 2;
    rotation = 90;
    axis = "y";
    travel = 9;
  } else {
    left = centerX - length / 2;
    top = target.top - length + standoff - (length - thickness) / 2;
    rotation = -90;
    axis = "y";
    travel = -9;
  }

  const loop =
    axis === "x"
      ? { x: [travel, 0, travel], opacity: 1 }
      : { y: [travel, 0, travel], opacity: 1 };

  const staticState = axis === "x" ? { x: travel / 2, opacity: 1 } : { y: travel / 2, opacity: 1 };

  return (
    <motion.div
      className="fixed pointer-events-none"
      style={{ top, left, width: length, height: thickness }}
      animate={reducedMotion ? staticState : loop}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 2.4, ease: "easeInOut", repeat: Infinity }
      }
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 44 22"
        width={length}
        height={thickness}
        style={{
          transform: `rotate(${rotation}deg)`,
          display: "block",
          filter: "drop-shadow(0px 2px 5px rgba(0, 0, 0, 0.4))",
        }}
      >
        <path
          d="M 42 11 L 17 11"
          stroke="#0b4f7a"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <polygon
          points="2,11 19,3 19,19"
          fill="#0b4f7a"
          stroke="#0b4f7a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

/* Dims everything except the target rect, rings the target, and points one
 * arrow at it. Rendered in its own portal on document.body so no ancestor
 * stacking context or overflow can trap it. */
export default function GuideSpotlight({
  target,
  focusTarget,
  additionalTargets = [],
  side,
  reducedMotion,
}: {
  target: GuideRect | null;
  focusTarget?: GuideRect | null;
  additionalTargets?: Array<GuideRect | null>;
  side: GuideSide;
  reducedMotion: boolean;
}) {
  if (typeof document === "undefined" || !target || target.width === 0 || target.height === 0) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const opening = focusTarget && focusTarget.width > 0 && focusTarget.height > 0
    ? focusTarget
    : target;

  const top = Math.max(0, opening.top);
  const left = Math.max(0, opening.left);
  const right = Math.min(viewportWidth, opening.left + opening.width);
  const bottom = Math.min(viewportHeight, opening.top + opening.height);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: SPOTLIGHT_Z, isolation: "isolate" }}
      aria-hidden="true"
    >
      <svg
        className="fixed inset-0 pointer-events-none"
        width={viewportWidth}
        height={viewportHeight}
        viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
        aria-hidden="true"
      >
        <defs>
          <mask id="guide-spotlight-mask" maskUnits="userSpaceOnUse">
            <rect width={viewportWidth} height={viewportHeight} fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={opening.borderRadius ?? "0px"}
              fill="black"
            />
            {focusTarget && (
              <rect
                x={target.left}
                y={target.top}
                width={target.width}
                height={target.height}
                rx={target.borderRadius ?? "0px"}
                fill="black"
              />
            )}
            {additionalTargets.map((additionalTarget, index) => additionalTarget && (
              <rect
                key={`${additionalTarget.left}-${additionalTarget.top}-${index}`}
                x={additionalTarget.left}
                y={additionalTarget.top}
                width={additionalTarget.width}
                height={additionalTarget.height}
                rx={additionalTarget.borderRadius ?? "0px"}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          width={viewportWidth}
          height={viewportHeight}
          fill={DIM}
          mask="url(#guide-spotlight-mask)"
        />
      </svg>

      <div
        className="guide-spotlight-ring"
        style={{ top, left, width, height, borderRadius: opening.borderRadius ?? "0px" }}
      />

      {focusTarget && (
        <div
          className="guide-spotlight-ring"
          style={{
            top: target.top,
            left: target.left,
            width: target.width,
            height: target.height,
            borderRadius: target.borderRadius ?? "0px",
          }}
        />
      )}

      <PointerArrow target={target} side={side} reducedMotion={reducedMotion} />
    </div>,
    document.body,
  );
}
