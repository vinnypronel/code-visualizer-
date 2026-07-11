"use client";

import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";

/* Shows the freshly minted participant ID, then advances into the pre-test. */
export default function AssignedScreen() {
  const { session, goTo } = useStudy();

  return (
    <StudyShell
      stageIndex={1}
      heading="Your participant ID"
      subheading="The app will keep this ID attached to your answers automatically."
      footer={
        <button className="btn-primary" onClick={() => goTo("pretest")}>
          Continue to the pre-test
        </button>
      }
    >
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-[11px] uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Participant ID
        </p>
        <p
          className="font-mono font-bold"
          style={{ fontSize: 44, letterSpacing: "2px", color: "var(--accent)" }}
        >
          {session.participantId ?? "----"}
        </p>
        <p className="text-[13px] mt-4" style={{ color: "var(--text-secondary)" }}>
          You do not need to enter this later. It is shown here so the researcher
          can help if there is a technical issue.
        </p>
      </div>
    </StudyShell>
  );
}
