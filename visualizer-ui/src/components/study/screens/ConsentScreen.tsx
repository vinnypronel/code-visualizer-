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
      <div className="flex flex-col lg:flex-row items-stretch gap-6 max-w-[1240px] mx-auto">
        {/* Left Column: Expanded Scrollable Consent Form Text Box */}
        <div
          className="flex-1 min-w-0 rounded-xl overflow-hidden shadow-sm flex flex-col"
          style={{
            background: "#ffffff",
            border: "1.5px solid #64748b",
          }}
        >
          <div className="p-6 h-[520px] max-h-[66vh] overflow-y-auto panel-scroll flex-1">
            <ConsentBody />
          </div>
        </div>

        {/* Right Column: Agreement Question Card */}
        <div
          className="w-full lg:w-[420px] flex-shrink-0 flex flex-col justify-between p-6 rounded-xl shadow-sm"
          style={{
            background: "#ffffff",
            border: "1.5px solid #64748b",
          }}
        >
          <div>
            <h3 className="text-[16px] font-extrabold mb-1" style={{ color: "#0f172a" }}>
              Study Participation
            </h3>
            <p className="text-[12.5px] mb-5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Please review the consent details on the left, then select your response below to proceed.
            </p>

            <fieldset className="space-y-3">
              <legend className="text-[13.5px] font-bold mb-2" style={{ color: "#0f172a" }}>
                Do you agree to participate in this study?
              </legend>
              {(
                [
                  {
                    key: "agree",
                    label:
                      "Yes, I agree - I have read and understood the information and I voluntarily agree to participate.",
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
                    className="flex items-start gap-3 rounded-lg p-3.5 cursor-pointer transition-all shadow-sm"
                    style={{
                      background: isSelected
                        ? isAgree
                          ? "#ecfdf5"
                          : "#fef2f2"
                        : "#f8fafc",
                      border: isSelected
                        ? isAgree
                          ? "2px solid #059669"
                          : "2px solid #dc2626"
                        : "1.5px solid #cbd5e1",
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
                      className={`w-4 h-4 mt-0.5 ${isAgree ? "accent-emerald-600" : "accent-red-600"}`}
                    />
                    <span className="text-[12.5px] font-semibold leading-snug">{opt.label}</span>
                  </label>
                );
              })}
            </fieldset>
          </div>

          {/* Continue Button at Bottom of Right Card */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col gap-2">
            {assignError && (
              <span className="text-[12px] font-semibold" style={{ color: "var(--danger)" }}>
                {assignError}
              </span>
            )}
            <button
              className="btn-primary w-full justify-center text-sm py-3 shadow-md"
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
