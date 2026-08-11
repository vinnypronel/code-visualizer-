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
      <div className="flex flex-col lg:flex-row items-start gap-8 w-full max-w-[1440px] -ml-3 sm:-ml-6 mr-auto">
        {/* Scrollable Consent Form Text Box */}
        <div
          className="w-full lg:w-[560px] max-w-[560px] rounded-xl overflow-hidden shadow-sm flex-shrink-0"
          style={{
            background: "#ffffff",
            border: "1.5px solid #64748b",
          }}
        >
          <div className="p-5 h-[590px] max-h-[74vh] overflow-y-auto panel-scroll">
            <ConsentBody />
          </div>
        </div>

        {/* Agreement Question Section Moved All The Way Down + Continue Button Placed Farther Right */}
        <div className="flex-1 w-full min-w-[340px] flex flex-col justify-end self-stretch pb-1">
          <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between gap-6 w-full mt-auto">
            {/* Agreement Question & Option Boxes (Untouched Sizing) */}
            <fieldset className="space-y-2.5 w-full max-w-[440px] flex-shrink-0">
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
              ).map((opt) => {
                const isSelected = choice === opt.key;
                const isAgree = opt.key === "agree";
                return (
                  <label
                    key={opt.key}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 cursor-pointer transition-all shadow-sm w-full"
                    style={{
                      background: isSelected
                        ? isAgree
                          ? "#ecfdf5"
                          : "#fef2f2"
                        : "#ffffff",
                      border: isSelected
                        ? isAgree
                          ? "2px solid #059669"
                          : "2px solid #dc2626"
                        : "1.5px solid #64748b",
                      color: isSelected
                        ? isAgree
                          ? "#047857"
                          : "#b91c1c"
                        : "#0f172a",
                    }}
                  >
                    <input
                      type="radio"
                      name="consent"
                      value={opt.key}
                      checked={isSelected}
                      onChange={() => setChoice(opt.key)}
                      className={`w-4 h-4 flex-shrink-0 ${isAgree ? "accent-emerald-600" : "accent-red-600"}`}
                    />
                    <span className="text-[12.5px] font-semibold leading-snug">{opt.label}</span>
                  </label>
                );
              })}
            </fieldset>

            {/* Continue Button Shifted Farther Right */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0 self-end xl:self-end pb-0.5 ml-auto">
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
      </div>
    </StudyShell>
  );
}
