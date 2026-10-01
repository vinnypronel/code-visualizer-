"use client";

/*
 * Inertial momentum smooth scrolling (Lenis) for a single scroll container,
 * following the project's smooth-scroll guide. Pass a ref to the element that
 * has the overflow; its first child is treated as the moving content.
 *
 * Disabled for reduced-motion preferences and touch devices so the native
 * scroll stays untouched where momentum emulation would feel wrong.
 */

import { useEffect, type RefObject } from "react";
import Lenis from "lenis";

export function useSmoothScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch =
      window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window;
    if (reduce || isTouch) return;

    const content = wrapper.firstElementChild as HTMLElement | null;
    if (!content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [ref]);
}
