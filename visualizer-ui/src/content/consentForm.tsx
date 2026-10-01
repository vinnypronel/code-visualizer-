/*
 * Informed consent content transcribed from ConsentForm_CodeViz.docx.
 * Punctuation is normalized to ASCII where needed to follow repo rules.
 */

export const CONSENT_META = {
  irbProtocol: "IRB Protocol #: IRB-FY2026-314",
  version: "Version 1.0 | 7/1/26 | Kean University",
  title: "INFORMED CONSENT FORM",
} as const;

function Highlight({
  children,
  variant = "yellow",
}: {
  children: React.ReactNode;
  variant?: "yellow" | "green" | "blue";
}) {
  const styles = {
    yellow:
      "bg-amber-100 text-amber-950 font-semibold px-1 py-0.5 rounded border border-amber-200/70",
    green:
      "bg-emerald-100/80 text-emerald-950 font-semibold px-1 py-0.5 rounded border border-emerald-200/80",
    blue: "bg-blue-100/80 text-blue-950 font-semibold px-1 py-0.5 rounded border border-blue-200/80",
  };
  return <mark className={`${styles[variant]} inline-block my-0.5`}>{children}</mark>;
}

function Bold({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-slate-900">{children}</strong>;
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 rounded-full bg-blue-600 flex-shrink-0" />
          <h3 className="font-bold text-[13.5px] text-slate-900 tracking-tight">
            {title}
          </h3>
        </div>
        {badge && (
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex-shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-2 pl-3.5 border-l-2 border-slate-200 ml-0.5 text-slate-700">
        {children}
      </div>
    </section>
  );
}

export function ConsentBody() {
  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-slate-700">
      {/* Key Study Takeaways quick-skim card */}
      <div className="rounded-xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/60 border border-amber-300 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-amber-950 font-extrabold text-[13.5px] mb-3">
          <svg className="w-4 h-4 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" />
          </svg>
          Key Study Takeaways (Quick Skim)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            {
              title: "Time Commitment:",
              body: "~45 minutes total, 100% online",
              icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              title: "Eligibility:",
              body: "Kean student, 18+, passed CPS 2231",
              icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
            },
            {
              title: "Privacy & Data:",
              body: "Anonymous ID, zero video/audio recorded",
              icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
            },
            {
              title: "100% Voluntary:",
              body: "Quit anytime; zero impact on grades",
              icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-2.5 bg-white/80 border border-amber-200/70 rounded-lg p-2.5"
            >
              <svg
                className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-[12.5px]">{item.title}</div>
                <div className="text-slate-700 text-[12px] leading-snug">{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Meta Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-[12px]">
        <div>
          <span className="font-bold text-slate-900">Title of Project:</span>{" "}
          <span className="font-semibold text-slate-800">
            Interactive Program Execution Visualization
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-slate-700">
          <div>
            <span className="font-bold text-slate-900">Faculty Mentor / PI:</span>{" "}
            <span>Yan Ma</span>
          </div>
          <div>
            <span className="font-bold text-slate-900">Department:</span>{" "}
            <span>Computer Science &amp; Technology</span>
          </div>
          <div>
            <span className="font-bold text-slate-900">Student Researchers:</span>{" "}
            <span>Vincent Pronel and Kiana Becca Nunez</span>
          </div>
          <div>
            <span className="font-bold text-slate-900">Contact:</span>{" "}
            <a
              href="mailto:yama@kean.edu"
              className="text-blue-600 font-semibold underline hover:text-blue-800"
            >
              yama@kean.edu
            </a>
          </div>
        </div>
      </div>

      <Section title="i) Invitation to Participate">
        <p>
          You are invited to participate in a research study investigating an{" "}
          <Highlight variant="blue">
            AI-assisted interactive system
          </Highlight>{" "}
          for learning <Bold>Java programming concepts</Bold>.
        </p>
      </Section>

      <Section title="ii) Purpose of Study">
        <p>
          The purpose of this study is to evaluate whether an{" "}
          <Bold>AI-assisted interactive Java execution visualization system</Bold>{" "}
          <Highlight variant="yellow">
            improves students&apos; understanding
          </Highlight>{" "}
          of program execution in Java, compared to <Bold>static learning materials</Bold>.
          The findings will contribute to the design of more effective computer science
          educational tools.
        </p>
      </Section>

      <Section title="iii) Participant Selection" badge="Eligibility">
        <p>
          To qualify for this study, you must meet <Bold>all three</Bold> of the following criteria:
        </p>
        <ul className="list-disc pl-5 space-y-1 pt-0.5">
          <li>
            Be <Highlight variant="yellow">18 years of age or older</Highlight>
          </li>
          <li>
            Be <Highlight variant="yellow">currently enrolled as a student at Kean University</Highlight>
          </li>
          <li>
            Have <Highlight variant="yellow">previously completed CPS 2231</Highlight>
          </li>
        </ul>
        <p className="pt-1">
          <Bold>No additional technical background</Bold> is required beyond this prerequisite.
        </p>
      </Section>

      <Section title="iv) Procedures" badge="~45 Mins Online">
        <p>Your participation in this study will include:</p>
        <ul className="list-disc pl-5 space-y-1.5 pt-0.5">
          <li>
            Completing a <Highlight variant="blue">short pre-test</Highlight> assessing
            your current understanding of program execution in Java.
          </li>
          <li>
            <Bold>Studying instructional materials</Bold> or using the{" "}
            <Highlight variant="blue">AI-assisted interactive visualization system</Highlight>.
          </li>
          <li>
            Completing a <Highlight variant="blue">short post-test</Highlight> and a{" "}
            <Bold>brief questionnaire</Bold> about your experience.
          </li>
        </ul>
        <p>
          The study will take <Highlight variant="yellow">approximately 45 minutes</Highlight>,
          completed <Bold>entirely online</Bold> at a time and place of your choosing.
          After completing this consent form, you will be directed to the study system
          and <Bold>randomly assigned to one of two groups</Bold>: one group will use
          static instructional materials, and the other will use the AI-assisted
          interactive visualization system. Basic demographic information (e.g., age and
          year in program) will be collected.
        </p>
        <p>
          <Highlight variant="green">
            No audio or video recordings will be collected.
          </Highlight>
        </p>
        <p>
          <Highlight variant="green">
            You may withdraw from the study at any time without penalty.
          </Highlight>{" "}
          Data collected up to the point of withdrawal may be retained and used in{" "}
          <Bold>anonymized form</Bold>.
        </p>
      </Section>

      <Section title="v) Potential Risks" badge="Minimal Risk">
        <p>
          This study involves <Highlight variant="green">minimal risk</Highlight>. The
          tasks are similar to typical course assignments. Some participants may experience:
        </p>
        <ul className="list-disc pl-5 space-y-1 pt-0.5">
          <li>
            <Bold>Mild frustration</Bold> if they find the tasks challenging
          </li>
          <li>
            <Bold>Mild mental fatigue</Bold> from focused problem-solving
          </li>
          <li>
            <Bold>Mild discomfort</Bold> from extended screen use
          </li>
          <li>
            <Highlight variant="green">No physical risks are anticipated</Highlight>
          </li>
        </ul>
        <p className="pt-1">
          You are <Bold>not required to complete any task you prefer not to</Bold>. You
          may <Highlight variant="green">take breaks or stop participation at any time without penalty</Highlight>.
        </p>
      </Section>

      <Section title="vi) Potential Benefits">
        <p>
          There are <Bold>no direct benefits</Bold> to you for participating. However, your
          participation will <Highlight variant="blue">contribute to research on improving CS education tools</Highlight>,
          which may benefit future students.
        </p>
      </Section>

      <Section title="vii) Financial Obligation">
        <p>
          <Highlight variant="green">
            There will be no financial obligation
          </Highlight>{" "}
          on your part if you choose to participate in this study.
        </p>
      </Section>

      <Section title="viii) Compensation">
        <p>
          <Bold>No compensation</Bold> is offered for participation in this study.
        </p>
      </Section>

      <Section title="ix) Confidentiality" badge="Strictly Confidential">
        <p>Your privacy will be protected through the following measures:</p>
        <ul className="list-disc pl-5 space-y-1.5 pt-0.5">
          <li>
            You will be assigned an <Highlight variant="green">anonymized participant ID</Highlight>;
            your name or any directly identifying information <Bold>will not be collected or included</Bold> in
            any research report or publication.
          </li>
          <li>
            Pre-test, post-test, and questionnaire responses will be{" "}
            <Bold>stored under your participant ID only</Bold>.
          </li>
          <li>
            All data will be kept in{" "}
            <Highlight variant="blue">
              secure, encrypted, password-protected storage
            </Highlight>{" "}
            accessible only to the principal investigator and designated student researchers.
          </li>
          <li>
            Results will be <Bold>reported only in aggregate form</Bold>;{" "}
            <Highlight variant="green">
              no individual participant will be identifiable
            </Highlight>{" "}
            in any publication or presentation.
          </li>
          <li>
            All data will be <Bold>retained for five (5) years</Bold> following publication,
            after which it will be <Bold>securely deleted</Bold>.
          </li>
        </ul>
        <p className="pt-1">
          You may withdraw from the study at any time without penalty. Data collected up to
          the point of withdrawal may be retained and used in <Bold>anonymized form</Bold>.
        </p>
      </Section>

      <Section title="x) Participation" badge="100% Voluntary">
        <p>
          <Highlight variant="yellow">
            Participation in this study is completely voluntary.
          </Highlight>{" "}
          You may <Bold>withdraw from the study at any time with no penalty or drawback to you</Bold>.
          Your decision to participate or not{" "}
          <Highlight variant="green">
            will not affect your academic standing, grades, or your relationship with the researcher or Kean University.
          </Highlight>
        </p>
      </Section>

      <Section title="Questions &amp; Comments">
        <p>
          If you have any questions about taking part in this research study, please contact:
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[12px] font-medium text-slate-800">
          <Bold>Yan Ma</Bold> &mdash;{" "}
          <a
            href="mailto:yama@kean.edu"
            className="text-blue-600 font-semibold underline hover:text-blue-800"
          >
            yama@kean.edu
          </a>
        </div>
        <p className="pt-1">
          If you have questions or concerns about your rights as a research participant, please contact:
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[12px] font-medium text-slate-800">
          <Bold>Kean University Institutional Review Board (IRB)</Bold> &mdash; (908) 737-3461 or{" "}
          <a
            href="mailto:IRB@kean.edu"
            className="text-blue-600 font-semibold underline hover:text-blue-800"
          >
            IRB@kean.edu
          </a>
        </div>
      </Section>

      <Section title="Agreement to Participate">
        <p>
          A <Bold>written signature is not required</Bold> for this study. In accordance with{" "}
          <Bold>45 CFR 46.117(c)</Bold>, written consent documentation has been waived
          because this study presents <Highlight variant="green">no more than minimal risk</Highlight> and
          collecting a signed form would create a greater confidentiality risk than obtaining none.
        </p>
        <p>
          By selecting{" "}
          <strong className="text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">
            &quot;Yes, I agree&quot;
          </strong>{" "}
          below, you confirm that you have read and understood this consent form and that you{" "}
          <Bold>voluntarily agree to participate</Bold>. If you do not agree, please select{" "}
          <strong className="text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded font-bold">
            &quot;No, I do not agree&quot;
          </strong>{" "}
          and you will not be able to proceed with the study.
        </p>
        <p className="text-[12px]">
          A copy of this consent information is available upon request by contacting the principal
          investigator at{" "}
          <a
            href="mailto:yama@kean.edu"
            className="text-blue-600 font-semibold underline hover:text-blue-800"
          >
            yama@kean.edu
          </a>
          .
        </p>
      </Section>

      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>{CONSENT_META.irbProtocol}</span>
        <span>{CONSENT_META.version}</span>
      </div>
    </div>
  );
}
