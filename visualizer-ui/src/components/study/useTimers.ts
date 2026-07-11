"use client";

/*
 * Timestamp-based timers. Both hooks derive their display from a stored start
 * time and Date.now() deltas, so backgrounding the tab (which throttles
 * intervals) does not corrupt elapsed or remaining time. The interval only
 * drives repaints; it never accumulates the count itself.
 */

import { useEffect, useRef, useState } from "react";

const TICK_MS = 250;

/* Format a whole number of seconds as M:SS (or MM:SS). */
export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/*
 * Counts down from durationSeconds, anchored to startAtMs. Returns whole
 * seconds remaining. Fires onExpire exactly once when it reaches zero.
 */
export function useCountdown(
  durationSeconds: number,
  startAtMs: number,
  onExpire?: () => void,
): number {
  const [remaining, setRemaining] = useState(durationSeconds);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    function tick() {
      const elapsed = (Date.now() - startAtMs) / 1000;
      const rem = Math.max(0, Math.ceil(durationSeconds - elapsed));
      setRemaining(rem);
      if (rem <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    }
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [durationSeconds, startAtMs]);

  return remaining;
}

/* Counts up from startAtMs. Returns whole seconds elapsed. */
export function useCountUp(startAtMs: number): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    function tick() {
      setElapsed(Math.floor((Date.now() - startAtMs) / 1000));
    }
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [startAtMs]);

  return elapsed;
}
