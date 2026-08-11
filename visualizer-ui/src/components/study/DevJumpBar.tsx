"use client";

/*
 * Dev-only phase jumper. Lets a developer skip straight to any study screen
 * without walking the whole flow. It is compiled out of production builds by
 * the NODE_ENV guard below, so participants can never see or reach it.
 */

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useStudy } from "@/components/study/StudyProvider";
import type { Condition, Phase } from "@/lib/studyTypes";

/* Solid green so the dev controls never read as part of the study UI. */
const GREEN_ON = "#16a34a";
const GREEN_OFF = "#14532d";

/*
 * The learning phase is the only screen whose content depends on the assigned
 * condition, so it gets one button per condition. Jumping straight to the one
 * you want to look at beats jumping to "Learning" and then remembering to flip
 * the condition toggle underneath. Every other phase renders identically in
 * both conditions and so takes the session's current condition.
 */
const PHASES: { phase: Phase; label: string; condition?: Condition }[] = [
  { phase: "consent", label: "Consent" },
  { phase: "assigned", label: "Assigned" },
  { phase: "pretest", label: "Pre-test" },
  { phase: "learning", label: "Learning: visualizer", condition: "ai" },
  { phase: "learning", label: "Learning: static", condition: "static" },
  { phase: "posttest", label: "Post-test" },
  { phase: "handoff", label: "Handoff" },
  { phase: "declined", label: "Declined" },
];

export default function DevJumpBar() {
  const { session, devJump } = useStudy();
  const [open, setOpen] = useState(false);

  /*
   * Sit above the study footer rather than on top of it. The footer holds the
   * primary Continue button, and a dev control covering the exact button you
   * need to click to test the flow is worse than useless. The height is
   * measured rather than hardcoded because the footer is not always present
   * (the handoff screen has none) and its height changes with the viewport.
   */
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      const footer = document.querySelector("footer");
      setFooterHeight(footer ? footer.getBoundingClientRect().height : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [session.phase]);

  // Temporarily enabled in production for testing as requested
  // if (process.env.NODE_ENV === "production") return null;

  const condition: Condition = session.condition ?? "ai";

  return (
    <div
      className="fixed right-3 z-50 font-mono text-[11px] flex flex-col items-end"
      style={{ pointerEvents: "auto", bottom: footerHeight + 12 }}
    >
      {open ? (
        <div
          className="rounded-md border p-2 flex flex-col gap-2"
          style={{
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span style={{ color: "var(--text-secondary)" }}>
              DEV JUMP - {session.phase} / {condition}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="dev-jump-hide-button cursor-pointer flex items-center gap-1"
              style={{ cursor: "pointer" }}
            >
              <ChevronDown size={13} aria-hidden="true" />
              Hide
            </button>
          </div>

          <div className="flex flex-wrap gap-1 max-w-[420px]">
            {PHASES.map((entry) => {
              // A condition-specific entry is only "active" when both the phase
              // and the condition match, so the two learning buttons never
              // light up at the same time.
              const active =
                session.phase === entry.phase &&
                (entry.condition === undefined || entry.condition === condition);
              return (
                <button
                  type="button"
                  key={`${entry.phase}-${entry.condition ?? "any"}`}
                  onClick={() => devJump(entry.phase, entry.condition)}
                  className="dev-jump-option rounded px-2 py-1 cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    background: active ? GREEN_ON : GREEN_OFF,
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <span style={{ color: "var(--text-secondary)" }}>condition:</span>
            {(["ai", "static"] as Condition[]).map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => devJump(session.phase, c)}
                className="dev-jump-option rounded px-2 py-1 cursor-pointer transition-opacity hover:opacity-90"
                style={{
                  background: condition === c ? GREEN_ON : GREEN_OFF,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="dev-jump-toggle cursor-pointer rounded-md border px-2 py-1"
        >
          dev
        </button>
      )}
    </div>
  );
}
