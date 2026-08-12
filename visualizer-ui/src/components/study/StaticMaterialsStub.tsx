"use client";

import { CheckCircle2 } from "lucide-react";

/*
 * Static-materials learning condition.
 *
 * This is the non-AI condition: the object-reference concepts measured by the
 * tests are presented as fixed reading material, with no visualization or AI
 * assistance. A third example is used so participants learn transferable Java
 * rules rather than receiving the Dog or Book test answers.
 */

const JAVA_TOKEN_PATTERN = /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|\b(?:class|new|int|this|public|private|protected|static|void|return)\b|\b(?:String|Student|System)\b|\b\d+\b)/g;
const JAVA_KEYWORDS = ["class", "new", "int", "this", "public", "private", "protected", "static", "void", "return"];
const JAVA_TYPES = ["String", "Student", "System"];

function isJavaToken(token: string): boolean {
  return token.startsWith("//") || token.startsWith('"') || /^\d+$/.test(token) ||
    JAVA_KEYWORDS.includes(token) || JAVA_TYPES.includes(token);
}

function javaTokenColor(token: string): string {
  if (token.startsWith("//")) return "#94a3b8";
  if (token.startsWith('"')) return "#ce9178";
  if (/^\d+$/.test(token)) return "#b5cea8";
  if (JAVA_TYPES.includes(token)) return "#4ec9b0";
  return "#569cd6";
}

function JavaCode({ code }: { code: string }) {
  return (
    <code>
      {code.split(JAVA_TOKEN_PATTERN).map((token, index) => (
        <span
          key={`${index}-${token}`}
          style={isJavaToken(token) ? { color: javaTokenColor(token) } : undefined}
        >
          {token}
        </span>
      ))}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="font-mono text-[12.5px] leading-relaxed rounded-lg px-5 py-4 overflow-x-auto my-3"
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        color: "#d4d4d4",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        whiteSpace: "pre",
        tabSize: 4,
      }}
    >
      <JavaCode code={children} />
    </pre>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-[17px] font-bold mb-3">{title}</h2>
      <div
        className="space-y-3 text-[13px] leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      >
        {children}
      </div>
    </section>
  );
}

const TRACE_ROWS = [
  ["1", "Maya / 19", "not yet created", "not yet created"],
  ["2", "Maya / 19", "Leo / 21", "not yet created"],
  ["3", "Maya / 19", "Leo / 21", "Leo / 21"],
  ["4", "Maya / 19", "Noah / 21", "Noah / 21"],
  ["5", "Maya / 19", "Maya / 19", "Noah / 21"],
];

function WorkedTraceTable() {
  const headings = [
    "After step",
    "first.name / age",
    "second.name / age",
    "saved.name / age",
  ];

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ background: "var(--bg-panel-2)" }}>
            {headings.map((heading) => (
              <th
                key={heading}
                className="border px-3 py-2 text-left font-bold whitespace-nowrap"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TRACE_ROWS.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td
                  key={`${row[0]}-${index}`}
                  className="border px-3 py-2 font-mono whitespace-nowrap"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StaticMaterialsStub({
  onContinue,
  onBackToPretest,
}: {
  onContinue: () => void;
  onBackToPretest?: React.ReactNode;
}) {
  return (
    <div className="h-full w-full overflow-y-auto panel-scroll">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-2">Java Object-Reference Reading: Static Learning</h1>
          <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            Read each section carefully. These materials teach the Java concepts
            needed to trace object references and determine a program&apos;s final output.
          </p>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Section 1 & Section 3 */}
          <div className="space-y-6">
            <Section title="1. Track Variables and Objects Separately">
              <p>
                A variable whose type is a class does not contain the whole object.
                It contains a <strong style={{ color: "var(--text-primary)" }}>reference</strong> that identifies an object. The object separately contains its fields.
              </p>
              <CodeBlock>{`Student first = new Student("Maya", 19);`}</CodeBlock>
              <p>
                This creates one Student object with name = &quot;Maya&quot; and age = 19.
                The variable <code>first</code> stores a reference to that object.
              </p>
              <CodeBlock>{`class Student {
    String name;
    int age;

    Student(String name, int age) {
        this.name = name;
        this.age = age;
    }
}`}</CodeBlock>
              <p>
                The constructor receives the values inside <code>new Student(...)</code> and stores them in the new object&apos;s fields.
              </p>
            </Section>

            <Section title="3. Carry the State Forward in a Trace Table">
              <p>
                After each step, record what every variable would read at that
                moment. Change only the affected entries and carry all unchanged
                values into the next row. Write “not yet created” until a variable
                has been declared.
              </p>
              <WorkedTraceTable />
              <p>
                Row 4 changes both <code>second</code> and <code>saved</code> because
                they share object 2. Row 5 changes only <code>second</code> because
                reassignment redirects one variable.
              </p>
            </Section>
          </div>

          {/* Right Column: Section 2 & Section 4 */}
          <div className="space-y-6">
            <Section title="2. Follow Five Object-Reference Operations">
              <p>
                This example uses different names and values from the test, but it
                practices the same Java rules.
              </p>
              <CodeBlock>{`Student first = new Student("Maya", 19);  // Step 1
Student second = new Student("Leo", 21); // Step 2
Student saved = second;                   // Step 3
second.name = "Noah";                    // Step 4
second = first;                           // Step 5`}</CodeBlock>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong style={{ color: "var(--text-primary)" }}>Step 1 creates object 1.</strong> <code>first</code> refers to the Student containing Maya / 19.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Step 2 creates object 2.</strong> <code>second</code> refers to a separate Student containing Leo / 21.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Step 3 copies a reference.</strong> <code>saved = second</code> does not create or copy an object. Both variables now refer to object 2.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Step 4 changes a field.</strong> The name inside object 2 becomes Noah. Both <code>second.name</code> and <code>saved.name</code> therefore read Noah.</li>
                <li><strong style={{ color: "var(--text-primary)" }}>Step 5 reassigns one variable.</strong> <code>second</code> is redirected to object 1. <code>saved</code> still refers to object 2.</li>
              </ol>
            </Section>

            <Section title="4. Determine the Final Printed Output">
              <p>
                Evaluate output using the references that exist after the final
                step. First identify the object a variable refers to, and then read
                the requested fields from that object.
              </p>
              <CodeBlock>{`System.out.println(second.name + ", " + second.age);
System.out.println(saved.name + ", " + saved.age);`}</CodeBlock>
              <p>
                After step 5, <code>second</code> refers to object 1 and <code>saved</code> still refers to object 2. The output is:
              </p>
              <CodeBlock>{`Maya, 19
Noah, 21`}</CodeBlock>
            </Section>
          </div>
        </div>

        {/* Section 5: Full Width Summary */}
        <Section title="5. Rules to Use on Any Similar Program">
          <ul className="list-disc pl-5 space-y-2">
            <li>Every <code>new</code> expression creates a separate object.</li>
            <li>A class-type assignment such as <code>saved = second</code> copies a reference, not all the object&apos;s fields.</li>
            <li>If two variables refer to the same object, a field change through either variable is visible through both.</li>
            <li>Reassigning a variable changes only that variable&apos;s reference. It does not redirect other variables.</li>
            <li>An object does not disappear merely because one variable stops referring to it.</li>
            <li>For each trace-table row, carry forward values that did not change.</li>
            <li>For output, use the variable-to-object relationships after the final step.</li>
          </ul>
          <p
            className="rounded-lg border p-3 font-semibold mt-3"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-panel-2)",
              color: "var(--text-primary)",
            }}
          >
            For every line, ask: “Did Java create an object, copy a reference,
            change an object&apos;s field, or redirect one variable?”
          </p>
        </Section>
        
        {/* Learning Summary Card */}
        <section
          className="rounded-xl p-5 border shadow-sm"
          style={{
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2.5 mb-3 border-b pb-2.5" style={{ borderColor: "var(--border)" }}>
            <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" aria-hidden="true" />
            <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
              Summary: Ready for the Post-Test
            </h2>
          </div>

          <p className="text-[13px] mb-3.5 text-[var(--text-primary)]">
            Before continuing to the post-test, keep these 4 core Java object-reference takeaways in mind:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[12.5px]">
            <div className="rounded-lg p-3 border bg-[var(--bg-panel-2)]" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold mb-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                1. Reference vs. Object
              </div>
              <p style={{ color: "var(--text-primary)" }}>
                Class variables store memory addresses (references), not full objects. Multiple variables can refer to the same object.
              </p>
            </div>

            <div className="rounded-lg p-3 border bg-[var(--bg-panel-2)]" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold mb-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                2. Assignment Copies References
              </div>
              <p style={{ color: "var(--text-primary)" }}>
                Writing <code>b = a</code> copies the reference address from <code>a</code> into <code>b</code> without creating a new object.
              </p>
            </div>

            <div className="rounded-lg p-3 border bg-[var(--bg-panel-2)]" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold mb-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                3. Shared Field Modifications
              </div>
              <p style={{ color: "var(--text-primary)" }}>
                Modifying <code>b.name = &quot;...&quot;</code> changes data inside the shared object, immediately visible through all variables pointing to it.
              </p>
            </div>

            <div className="rounded-lg p-3 border bg-[var(--bg-panel-2)]" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold mb-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                4. Reassignment Only Redirects One Variable
              </div>
              <p style={{ color: "var(--text-primary)" }}>
                Reassigning <code>b = c</code> changes where <code>b</code> points. It does not alter other variables or erase existing objects.
              </p>
            </div>
          </div>
        </section>

        <div
          className="flex flex-col items-start justify-between gap-4 border-t py-6 sm:flex-row sm:items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-4">
            {onBackToPretest}
            <div>
              <h2 className="text-[15px] font-bold">Reading complete</h2>
              <p className="mt-1 text-[13px]" style={{ color: "var(--text-primary)" }}>
                You reviewed every object-reference concept used in the trace exercise.
              </p>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={onContinue}>
            <span>Continue to post-test</span>
            <svg
              className="btn-arrow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
