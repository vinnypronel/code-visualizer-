"use client";

import { useState } from "react";
import StudyShell from "@/components/study/StudyShell";
import { useStudy } from "@/components/study/StudyProvider";
import { ConsentBody, CONSENT_META } from "@/content/consent";

export default function ConsentScreen() {
  const { acceptConsent, declineConsent, isAssigning, assignError } = useStudy();
  const [choice, setChoice] = useState<"agree" | "disagree" | null>(null);

  const onContinue = () => {
    if (choice === "agree") {
      void acceptConsent();
    } else if (choice === "disagree") {
      declineConsent();
    }
  };

  return (
    <StudyShell
      stageIndex={0}
      heading={CONSENT_META.title}
      subheading="Please read the following before deciding whether to take part."
      footer={
        <>
          {assignError && (
            <span className="text-[12px]" style={{ color: "var(--danger)" }}>
              {assignError}
            </span>
          )}
          <button
            className="btn-primary"
            disabled={choice === null || isAssigning}
            style={{
              opacity: choice === null || isAssigning ? 0.5 : 1,
              cursor: choice === null || isAssigning ? "not-allowed" : "pointer",
            }}
            onClick={onContinue}
          >
            {isAssigning ? "Please wait..." : "Continue"}
          </button>
        </>
      }
    >
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
      >
        <ConsentBody />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-[13px] font-semibold mb-2">
          Do you agree to participate in this study?
        </legend>
        {(
          [
            {
              key: "agree",
              label:
                "Yes, I agree - I have read and understood the information above and I voluntarily agree to participate.",
            },
            {
              key: "disagree",
              label:
                "No, I do not agree - I do not wish to participate and will not be able to proceed with the study.",
            },
          ] as const
        ).map((opt) => (
          <label
            key={opt.key}
            className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors"
            style={{
              background:
                choice === opt.key ? "var(--accent-glow)" : "var(--bg-panel-2)",
              border: `1px solid ${
                choice === opt.key ? "var(--border-active)" : "var(--border)"
              }`,
            }}
          >
            <input
              type="radio"
              name="consent"
              value={opt.key}
              checked={choice === opt.key}
              onChange={() => setChoice(opt.key)}
            />
            <span className="text-[13px]">{opt.label}</span>
          </label>
        ))}
      </fieldset>
    </StudyShell>
  );
}
