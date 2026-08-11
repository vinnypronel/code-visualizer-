"use client";

import { XCircle } from "lucide-react";
import { useStudy } from "@/components/study/StudyProvider";
import { BackButtonWithTooltip } from "@/components/study/screens/TimedTestScreen";

/* Terminal screen shown when a participant does not consent. No ID is minted
 * and nothing is logged. */
export default function DeclinedScreen() {
  const { returnToConsent } = useStudy();

  const handleCloseWindow = () => {
    window.close();
    // Fallback if browser blocks closing non-script opened tabs
    setTimeout(() => {
      window.location.href = "about:blank";
    }, 150);
  };

  return (
    <div
      className="flex h-full w-full items-center justify-center p-6"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div
        className="max-w-md text-center rounded-xl p-8 shadow-md"
        style={{ background: "#ffffff", border: "1.5px solid #64748b" }}
      >
        <h1 className="text-xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Thank you</h1>
        <p className="text-[13.5px] leading-relaxed mb-6 font-medium" style={{ color: "#334155" }}>
          You have chosen not to participate. You may now close this window. No
          information has been collected.
        </p>

        <div className="flex items-center justify-center gap-3 pt-3 border-t" style={{ borderColor: "#cbd5e1" }}>
          <BackButtonWithTooltip
            label="Back to Consent Form"
            onClick={returnToConsent}
            tooltipText="Return to the Consent Form to change your response."
          />
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md shadow-sm cursor-pointer"
            onClick={handleCloseWindow}
          >
            <XCircle size={15} aria-hidden="true" />
            <span>Close Window</span>
          </button>
        </div>
      </div>
    </div>
  );
}
