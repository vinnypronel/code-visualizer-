"use client";

/*
 * Shared scaling for the guide cards.
 *
 * The study shell scales itself up on large monitors with CSS zoom, but the
 * guide cards are portaled to document.body, so they sit outside that zoom and
 * stayed at their original size while everything around them grew. These
 * breakpoints mirror the .study-shell rules in globals.css so a card grows by
 * the same factor as the screen behind it.
 *
 * Callers apply the value as `zoom` and divide the card's top/left by it. Both
 * placement and drag positions are measured in viewport pixels, so dividing
 * cancels the zoom back out of the position while keeping it in the size.
 */

import { useEffect, useState } from "react";

const GUIDE_SCALE_STEPS = [
  { min: 2800, scale: 1.6 },
  { min: 2200, scale: 1.4 },
  { min: 1800, scale: 1.25 },
  { min: 1600, scale: 1.12 },
];

export function guideScaleForWidth(width: number): number {
  return GUIDE_SCALE_STEPS.find((step) => width >= step.min)?.scale ?? 1;
}

export function useGuideScale(): number {
  /* Starts at 1 so the server render and first client render agree. */
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => setScale(guideScaleForWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}
