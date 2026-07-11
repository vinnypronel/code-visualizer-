/*
 * ============================================================================
 * PLACEHOLDER CONSENT CONTENT - NOT THE REAL DOCUMENT
 * ============================================================================
 * The informed consent below is a STRUCTURAL PLACEHOLDER. It must be replaced,
 * word for word, with the approved IRB consent document before any participant
 * is run. Do not reword or summarize the real document when transcribing it.
 *
 * To finish this:
 *   1. Drop the approved consent file into  visualizer-ui/docs/  (see
 *      docs/README.md for the expected filename).
 *   2. Transcribe it verbatim into ConsentBody below, including every section.
 *   3. Fill CONSENT_META.irbProtocol and CONSENT_META.version from the document.
 *   4. Have the rendered page checked against the original before running anyone.
 *
 * Every placeholder is tagged [PLACEHOLDER] so nothing ships by accident.
 * ============================================================================
 */

export const CONSENT_META = {
  // [PLACEHOLDER] Replace with the real IRB protocol number from the document.
  irbProtocol: "[PLACEHOLDER: IRB protocol number]",
  // [PLACEHOLDER] Replace with the real consent version / date line.
  version: "[PLACEHOLDER: consent version and date]",
  title: "[PLACEHOLDER: Informed Consent to Participate in Research]",
} as const;

export function ConsentBody() {
  return (
    <div className="space-y-4 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      <p
        className="text-[12px] font-mono px-3 py-2 rounded-md"
        style={{
          background: "#f59e0b14",
          border: "1px solid #f59e0b44",
          color: "var(--warning)",
        }}
      >
        [PLACEHOLDER CONSENT] This is not the approved consent text. Replace the
        contents of ConsentBody in src/content/consent.tsx with the verbatim IRB
        document before running participants.
      </p>

      <section className="space-y-1">
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          [PLACEHOLDER] Purpose of the study
        </h3>
        <p>
          [PLACEHOLDER] Describe the purpose of the research exactly as written
          in the approved consent document.
        </p>
      </section>

      <section className="space-y-1">
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          [PLACEHOLDER] What you will do
        </h3>
        <p>
          [PLACEHOLDER] Describe the procedures: a short pre-test, a learning
          activity, a short post-test, and a questionnaire. Use the approved
          wording.
        </p>
      </section>

      <section className="space-y-1">
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          [PLACEHOLDER] Risks, benefits, confidentiality, and voluntariness
        </h3>
        <p>
          [PLACEHOLDER] Transcribe the risks, benefits, data handling, and the
          statement that participation is voluntary and may be stopped at any
          time, from the approved document.
        </p>
      </section>

      <section className="space-y-1">
        <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          [PLACEHOLDER] Contact
        </h3>
        <p>
          [PLACEHOLDER] Researcher and IRB contact information from the approved
          document.
        </p>
      </section>

      <p className="text-[11px] font-mono pt-2" style={{ color: "var(--text-muted)" }}>
        {CONSENT_META.irbProtocol} &middot; {CONSENT_META.version}
      </p>
    </div>
  );
}
