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
    >
      <div className="flex flex-col justify-between max-w-[1060px] mx-auto">
        {/* Expanded Scrollable Consent Form Text Box - Darker Crisp Outline */}
        <div
          className="rounded-lg p-5 h-[430px] max-h-[52vh] overflow-y-auto panel-scroll flex-shrink-0 shadow-sm"
          style={{
            background: "#ffffff",
            border: "1.5px solid #64748b",
          }}
        >
          <ConsentBody />
        </div>

        {/* Agreement Question Section Pushed Down + Continue Button Moved Farther Right */}
        <div className="mt-5 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <fieldset className="space-y-2.5 flex-1 w-full min-w-0">
            <legend className="text-[14px] font-extrabold mb-2" style={{ color: "#0f172a" }}>
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
                className="flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-all shadow-sm"
                style={{
                  background:
                    choice === opt.key ? "#ecfdf5" : "#ffffff",
                  border:
                    choice === opt.key
                      ? "2px solid #059669"
                      : "1.5px solid #64748b",
                  color: choice === opt.key ? "#047857" : "#0f172a",
                }}
              >
                <input
                  type="radio"
                  name="consent"
                  value={opt.key}
                  checked={choice === opt.key}
                  onChange={() => setChoice(opt.key)}
                  className="accent-emerald-600 w-4 h-4"
                />
                <span className="text-[13px] font-semibold">{opt.label}</span>
              </label>
            ))}
          </fieldset>

          {/* Continue Button Moved Farther Right */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0 self-end pb-0.5 pl-4">
            {assignError && (
              <span className="text-[12px]" style={{ color: "var(--danger)" }}>
                {assignError}
              </span>
            )}
            <button
              className="btn-primary min-w-[140px] justify-center text-xs py-2.5 px-6 shadow-lg"
              disabled={choice === null || isAssigning}
              style={{
                opacity: choice === null || isAssigning ? 0.5 : 1,
                cursor: choice === null || isAssigning ? "not-allowed" : "pointer",
              }}
              onClick={onContinue}
            >
              {isAssigning ? "Please wait..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </StudyShell>
  );
}
