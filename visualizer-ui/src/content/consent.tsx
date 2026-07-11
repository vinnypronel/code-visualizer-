/*
 * Informed consent content transcribed from ConsentForm_CodeViz.docx.
 * Punctuation is normalized to ASCII where needed to follow repo rules.
 */

export const CONSENT_META = {
  irbProtocol: "IRB Protocol #: IRB-FY2026-314",
  version: "Version 1.0 | [Approval Date] | Kean University",
  title: "INFORMED CONSENT FORM",
} as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function ConsentBody() {
  return (
    <div
      className="space-y-4 text-[13px] leading-relaxed"
      style={{ color: "var(--text-secondary)" }}
    >
      <div className="space-y-1">
        <p>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Title of Project:
          </span>{" "}
          Interactive Program Execution Visualization
        </p>
        <p>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Researcher (PI):
          </span>{" "}
          Yan Ma
        </p>
        <p>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Student Researchers:
          </span>{" "}
          Kiana Becca Nunez and Vincent Pronel
        </p>
        <p>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Department:
          </span>{" "}
          Department of Computer Science and Technology
        </p>
        <p>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Contact Information:
          </span>{" "}
          yama@kean.edu
        </p>
      </div>

      <Section title="i) Invitation to Participate">
        <p>
          You are invited to participate in a research study investigating an
          AI-assisted interactive system for learning Java programming concepts.
        </p>
      </Section>

      <Section title="ii) Purpose of Study">
        <p>
          The purpose of this study is to evaluate whether an AI-assisted
          interactive Java execution visualization system improves students&apos;
          understanding of program execution in Java, compared to static
          learning materials. The findings will contribute to the design of more
          effective computer science educational tools.
        </p>
      </Section>

      <Section title="iii) Participant Selection">
        <p>
          To qualify for this study, you must be 18 years of age or older,
          currently enrolled as a student at Kean University, and have
          previously completed CPS 2231. No additional technical background is
          required beyond this prerequisite.
        </p>
      </Section>

      <Section title="iv) Procedures">
        <p>Your participation in this study will include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Completing a short pre-test assessing your current understanding of
            program execution in Java.
          </li>
          <li>
            Studying instructional materials or using the AI-assisted
            interactive visualization system.
          </li>
          <li>
            Completing a short post-test and a brief questionnaire about your
            experience.
          </li>
        </ul>
        <p>
          The study will take approximately 45 minutes, completed entirely
          online at a time and place of your choosing. After completing this
          consent form, you will be directed to the study system and randomly
          assigned to one of two groups: one group will use static instructional
          materials, and the other will use the AI-assisted interactive
          visualization system. Basic demographic information (e.g., age and
          year in program) will be collected. No audio or video recordings will
          be collected.
        </p>
        <p>
          You may withdraw from the study at any time without penalty. Data
          collected up to the point of withdrawal may be retained and used in
          anonymized form.
        </p>
      </Section>

      <Section title="v) Potential Risks">
        <p>
          This study involves minimal risk. The tasks are similar to typical
          course assignments. Some participants may experience:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mild frustration if they find the tasks challenging</li>
          <li>Mild mental fatigue from focused problem-solving</li>
          <li>Mild discomfort from extended screen use</li>
          <li>No physical risks are anticipated</li>
        </ul>
        <p>
          You are not required to complete any task you prefer not to. You may
          take breaks or stop participation at any time without penalty.
        </p>
      </Section>

      <Section title="vi) Potential Benefits">
        <p>
          There are no direct benefits to you for participating. However, your
          participation will contribute to research on improving CS education
          tools, which may benefit future students.
        </p>
      </Section>

      <Section title="vii) Financial Obligation">
        <p>
          There will be no financial obligation on your part if you choose to
          participate in this study.
        </p>
      </Section>

      <Section title="viii) Compensation">
        <p>No compensation is offered for participation in this study.</p>
      </Section>

      <Section title="ix) Confidentiality">
        <p>Your privacy will be protected through the following measures:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            You will be assigned an anonymized participant ID; your name or any
            directly identifying information will not be collected or included
            in any research report or publication.
          </li>
          <li>
            Pre-test, post-test, and questionnaire responses will be stored
            under your participant ID only.
          </li>
          <li>
            All data will be kept in secure, encrypted, password-protected
            storage accessible only to the principal investigator and designated
            student researchers.
          </li>
          <li>
            Results will be reported only in aggregate form; no individual
            participant will be identifiable in any publication or presentation.
          </li>
          <li>
            All data will be retained for five (5) years following publication,
            after which it will be securely deleted.
          </li>
        </ul>
        <p>
          You may withdraw from the study at any time without penalty. Data
          collected up to the point of withdrawal may be retained and used in
          anonymized form.
        </p>
      </Section>

      <Section title="x) Participation">
        <p>
          Participation in this study is completely voluntary. You may withdraw
          from the study at any time with no penalty or drawback to you. Your
          decision to participate or not will not affect your academic standing,
          grades, or your relationship with the researcher or Kean University.
        </p>
      </Section>

      <Section title="Questions/Comments">
        <p>
          If you have any questions about taking part in this research study,
          please contact:
        </p>
        <p>Yan Ma - yama@kean.edu</p>
        <p>
          If you have questions or concerns about your rights as a research
          participant, please contact:
        </p>
        <p>
          Kean University Institutional Review Board (IRB) - (908) 737-3461 or
          IRB@kean.edu
        </p>
      </Section>

      <Section title="Contact Information">
        <p>Principal Investigator: Yan Ma - yama@kean.edu</p>
        <p>IRB: (908) 737-3461 - IRB@kean.edu</p>
      </Section>

      <Section title="Agreement to Participate">
        <p>
          A written signature is not required for this study. In accordance with
          45 CFR 46.117(c), written consent documentation has been waived because
          this study presents no more than minimal risk and collecting a signed
          form would create a greater confidentiality risk than obtaining none.
          By selecting &quot;Yes, I agree&quot; below, you confirm that you have read and
          understood this consent form and that you voluntarily agree to
          participate. If you do not agree, please select &quot;No, I do not agree&quot;
          and you will not be able to proceed with the study. A copy of this
          consent information is available upon request by contacting the
          principal investigator at yama@kean.edu.
        </p>
      </Section>

      <p className="text-[11px] font-mono pt-2" style={{ color: "var(--text-muted)" }}>
        {CONSENT_META.irbProtocol} | {CONSENT_META.version}
      </p>
    </div>
  );
}
