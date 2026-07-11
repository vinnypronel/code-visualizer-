"use client";

/*
 * Static-materials learning condition.
 *
 * This is the non-AI condition: the same Java execution concepts are presented
 * as fixed reading material, with no interactive visualization or AI help. The
 * surrounding StudyShell chrome stays identical to the AI condition.
 */

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="font-mono text-[12.5px] leading-relaxed rounded-lg p-4 overflow-x-auto my-3"
      style={{
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        whiteSpace: "pre",
      }}
    >
      {children}
    </pre>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl p-5"
      style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-[17px] font-bold mb-3">{title}</h2>
      <div
        className="space-y-3 text-[13px] leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {children}
      </div>
    </section>
  );
}

export default function StaticMaterialsStub() {
  return (
    <div className="h-full w-full overflow-y-auto panel-scroll">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-2">
            Java Execution Reading Materials
          </h1>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Read these materials carefully. They explain how to trace recursive
            calls, return values, object references, and variable reassignment.
          </p>
        </div>

        <Section title="Tracing a Program Step by Step">
          <p>
            A trace is a written record of what happens as a program runs. When
            tracing Java code, move one execution step at a time and record the
            important change caused by that step.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>For a method call, write down the method name and argument.</li>
            <li>For an assignment, write the new value of the variable.</li>
            <li>For an object update, write which object field changed.</li>
            <li>For a return statement, write the returned value.</li>
          </ul>
        </Section>

        <Section title="Recursion">
          <p>
            A recursive method is a method that calls itself. Each call gets its
            own stack frame, which means each call has its own value for the
            parameter and local variables.
          </p>
          <p>
            A recursive trace usually has two phases. First, the calls build up
            until the base case is reached. Second, the return values move back
            through the waiting calls.
          </p>
          <CodeBlock>{`static int f(int n) {
    if (n == 0) {
        return 1;
    } else {
        return n * f(n - 1);
    }
}`}</CodeBlock>
          <p>
            In this example, the base case is the branch for n == 0. The call
            f(3) waits for f(2), f(2) waits for f(1), and f(1) waits for f(0).
            Once f(0) returns 1, the waiting calls can finish in reverse order.
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>f(3) calls f(2)</li>
            <li>f(2) calls f(1)</li>
            <li>f(1) calls f(0)</li>
            <li>f(0) returns 1</li>
            <li>f(1) returns 1 * 1</li>
            <li>f(2) returns 2 * 1</li>
            <li>f(3) returns 3 * 2</li>
          </ol>
        </Section>

        <Section title="Objects and References">
          <p>
            In Java, a variable whose type is a class stores a reference to an
            object. The object itself is separate from the variable. Multiple
            variables can refer to the same object.
          </p>
          <CodeBlock>{`Dog a = new Dog("Rex", 3);
Dog b = new Dog("Bella", 5);
Dog c = b;
b.name = "Max";
b = a;`}</CodeBlock>
          <p>
            After c = b, both c and b refer to the same Dog object. When b.name
            changes to &quot;Max&quot;, the object changes, so c also sees the name
            &quot;Max&quot;.
            Later, b = a changes only the variable b. It does not change c and
            it does not copy the object.
          </p>
        </Section>

        <Section title="How to Fill a Trace Table">
          <p>
            For each numbered step, update only what changed at that step and
            carry forward anything that stayed the same. If a variable has not
            been created yet, mark it as not yet created. If two variables refer
            to the same object, changes through either variable affect that same
            object.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Do not treat object assignment as copying all fields.</li>
            <li>Do not erase an object just because one variable stops pointing to it.</li>
            <li>For print statements, use the values that exist after the final step.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
