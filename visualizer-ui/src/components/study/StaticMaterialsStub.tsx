"use client";

import { CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";

/*
 * Static-materials learning condition.
 *
 * Teaches Java object-reference concepts (primitives vs. references, heap allocation
 * with 'new', aliasing, field mutation, and reference reassignment) through distinct
 * conceptual examples.
 *
 * Intentionally does NOT use the 5-step Dog / Book test sequence or worked answers,
 * ensuring participants learn general transferable principles rather than memorizing
 * a specific test trace template.
 */

const JAVA_TOKEN_PATTERN =
  /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|\b(?:class|new|int|boolean|double|this|public|private|protected|static|void|return|null)\b|\b(?:String|System|Account|Car|Point|Rectangle)\b|\b\d+\b)/g;
const JAVA_KEYWORDS = [
  "class",
  "new",
  "int",
  "boolean",
  "double",
  "this",
  "public",
  "private",
  "protected",
  "static",
  "void",
  "return",
  "null",
];
const JAVA_TYPES = ["String", "System", "Account", "Car", "Point", "Rectangle"];

function isJavaToken(token: string): boolean {
  return (
    token.startsWith("//") ||
    token.startsWith('"') ||
    /^\d+$/.test(token) ||
    JAVA_KEYWORDS.includes(token) ||
    JAVA_TYPES.includes(token)
  );
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
          style={
            isJavaToken(token) ? { color: javaTokenColor(token) } : undefined
          }
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
      className="font-mono text-[12.5px] leading-relaxed rounded-lg px-4 py-3 overflow-x-auto my-2.5"
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

function Section({
  title,
  tag,
  children,
  className = "",
}: {
  title: string;
  tag?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl p-5 border shadow-xs ${className}`}
      style={{
        background: "var(--bg-panel)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-3 border-b pb-2" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">{title}</h2>
        {tag && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
            {tag}
          </span>
        )}
      </div>
      <div className="space-y-3 text-[13px] leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

export default function StaticMaterialsStub({
  onContinue,
  reviewMode = false,
}: {
  onContinue?: () => void;
  reviewMode?: boolean;
}) {
  return (
    <div className="h-full w-full overflow-y-auto panel-scroll bg-[var(--bg-base)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200 mb-2">
            <span>📘</span> Static Learning Module
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Mastering Java Object References &amp; Memory Execution
          </h1>
          <p className="text-[13.5px] text-slate-600 mt-1 max-w-3xl">
            Review these core computer science principles. Understanding how Java manages variables, memory pointers, and object state will enable you to trace any Java program with accuracy.
          </p>
        </div>

        {/* 2-Column Grid of Core Concepts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Column 1 */}
          <div className="flex flex-col gap-6">
            {/* Concept 1: Primitives vs References */}
            <Section title="1) Value Types vs. Reference Types" tag="Memory Model">
              <p>
                In Java, variables store data differently depending on their type:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="font-bold text-slate-900 text-xs mb-1">Primitive Types (e.g. int, double)</div>
                  <p className="text-[12px] text-slate-600">
                    The variable directly contains the <strong>literal value</strong>. Assigning one variable to another creates a completely independent copy.
                  </p>
                  <CodeBlock>{`int a = 10;
int b = a;  // copies the value 10
b = 25;     // a is STILL 10!`}</CodeBlock>
                </div>
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
                  <div className="font-bold text-blue-950 text-xs mb-1">Reference Types (Classes &amp; Objects)</div>
                  <p className="text-[12px] text-slate-700">
                    The variable does <strong>not</strong> contain the object itself. It holds a <strong>memory reference (pointer)</strong> to the object on the Heap.
                  </p>
                  <CodeBlock>{`Car c1 = new Car("Red", 2);
Car c2 = c1; // copies the POINTER
// c1 and c2 point to SAME car!`}</CodeBlock>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[12px] text-amber-950">
                <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Key Takeaway:</strong> Assigning an object variable never creates a duplicate object. It only copies the arrow (pointer) to the existing object.
                </span>
              </div>
            </Section>

            {/* Concept 2: Instantiation with 'new' */}
            <Section title="2) Creating Objects on the Heap with 'new'" tag="Object Creation">
              <p>
                Every time the <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-blue-700 font-bold">new</code> operator executes, Java allocates a <strong>brand-new, independent object</strong> in memory with its own set of fields.
              </p>
              <CodeBlock>{`class Point {
    int x;
    int y;
    Point(int x, int y) {
        this.x = x;
        this.y = y;
    }
}

Point p1 = new Point(5, 10);
Point p2 = new Point(5, 10); // A separate new object!`}</CodeBlock>
              <p>
                Even though <code className="font-mono text-xs">p1</code> and <code className="font-mono text-xs">p2</code> were initialized with identical arguments, they refer to <strong>two separate objects</strong> at different memory addresses.
              </p>
              <div className="bg-slate-100 rounded-lg p-2.5 font-mono text-[12px] text-slate-800 border border-slate-200">
                p1.x = 99; <span className="text-slate-500">{"// Changes p1 only! p2.x remains 5."}</span>
              </div>
            </Section>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-6">
            {/* Concept 3: Aliasing & Shared Modifications */}
            <Section title="3) Aliasing &amp; Shared Field Changes" tag="Aliasing">
              <p>
                <strong>Aliasing</strong> occurs when two or more reference variables point to the <strong>exact same object</strong> in memory.
              </p>
              <CodeBlock>{`class Account {
    String owner;
    int balance;
    Account(String owner, int balance) {
        this.owner = owner;
        this.balance = balance;
    }
}

Account primary = new Account("Alice", 100);
Account linked = primary; // Both variables point to object 1`}</CodeBlock>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[12.5px] text-emerald-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <ArrowRight size={14} /> Modifying via an alias:
                </div>
                <p>
                  If you write <code className="font-mono font-bold bg-white px-1 rounded border border-emerald-300">linked.balance = 250;</code>, the data inside the shared object changes.
                </p>
                <p>
                  Since <code className="font-mono font-bold">primary</code> refers to that same object, reading <code className="font-mono font-bold">primary.balance</code> will also evaluate to <strong>250</strong>!
                </p>
              </div>
            </Section>

            {/* Concept 4: Variable Reassignment vs Field Change */}
            <Section title="4) Reassignment vs. Object Mutation" tag="Critical Distinction">
              <p>
                One of the most important concepts in Java is distinguishing between changing a <em>field</em> inside an object versus changing <em>where a variable points</em>:
              </p>
              <div className="space-y-2 text-[12px]">
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  <div className="font-bold text-slate-900 mb-0.5">A. Modifying an Object Field (Mutation):</div>
                  <code className="font-mono text-blue-700 font-bold block mb-1">obj.fieldName = &quot;NewValue&quot;;</code>
                  <p className="text-slate-600">
                    Modifies the data inside the object. All variables currently referencing that object will immediately observe this change.
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  <div className="font-bold text-slate-900 mb-0.5">B. Reassigning a Variable (Redirecting Pointer):</div>
                  <code className="font-mono text-blue-700 font-bold block mb-1">obj = otherObj;</code>
                  <p className="text-slate-600">
                    Moves <strong>only that specific variable&apos;s pointer</strong> to a different object. It does <em>not</em> modify any fields, nor does it redirect any other variables.
                  </p>
                </div>
              </div>
            </Section>
          </div>
        </div>

        {/* Section 5: Step-by-Step Code Tracing Strategy */}
        <Section title="5) Systematic Program Tracing Strategy" tag="How to Trace">
          <p>
            When tracing any Java program that manipulates objects and references, follow this step-by-step strategy:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[12px] pt-1">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="font-bold text-blue-800 text-xs mb-1">Step 1: Check Declarations</div>
                <p className="text-slate-600">
                  Before a variable is declared in the code, it does not exist yet (marked as &quot;not yet created&quot;).
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="font-bold text-blue-800 text-xs mb-1">Step 2: Track &apos;new&apos; Allocations</div>
                <p className="text-slate-600">
                  Each <code className="font-mono font-bold text-blue-700">new</code> expression creates a new object container with its constructor values.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="font-bold text-blue-800 text-xs mb-1">Step 3: Track Aliases vs Reassignments</div>
                <p className="text-slate-600">
                  <code className="font-mono font-bold text-blue-700">b = a</code> points b to a&apos;s object. <code className="font-mono font-bold text-blue-700">b.field = v</code> changes the object itself.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="font-bold text-blue-800 text-xs mb-1">Step 4: Carry State Forward</div>
                <p className="text-slate-600">
                  In a step-by-step trace table, only modify values that changed in that step; carry all other values forward unchanged.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-200 text-[12.5px] font-mono leading-relaxed border border-slate-700">
            <span className="text-amber-400 font-bold">{"// Golden Rule for Output Statements:"}</span>
            <div className="text-slate-300 mt-1">
              When evaluating <span className="text-emerald-400">System.out.println(var.field)</span> after all steps finish, ask:
            </div>
            <div className="text-blue-300 pl-4 mt-0.5">
              &quot;Which object does <span className="text-white font-bold">var</span> point to at this exact final moment, and what are its current field values?&quot;
            </div>
          </div>
        </Section>

        {/* Learning Summary Card */}
        <section
          className="rounded-xl p-5 border shadow-sm"
          style={{
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="flex items-center gap-2.5 mb-3 border-b pb-2.5"
            style={{ borderColor: "var(--border)" }}
          >
            <CheckCircle2
              size={20}
              className="text-emerald-600 flex-shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-[16px] font-bold text-slate-900">
              {reviewMode ? "Summary: Key Principles to Remember" : "Summary: Ready for the Post-Test"}
            </h2>
          </div>

          <p className="text-[13px] mb-3.5 text-slate-700">
            {reviewMode
              ? "These are the 4 fundamental Java object-reference concepts to keep in mind:"
              : "Before advancing to the post-test, remember these 4 core Java execution principles:"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-[12.5px]">
            <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
              <div className="font-bold mb-1 text-blue-900">
                1) Reference Variables are Arrows
              </div>
              <p className="text-slate-700 leading-snug">
                Object variables do not hold data directly; they store memory addresses that point to objects on the heap.
              </p>
            </div>

            <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
              <div className="font-bold mb-1 text-blue-900">
                2) Assignment Copies the Reference
              </div>
              <p className="text-slate-700 leading-snug">
                Executing <code>var2 = var1</code> copies the pointer, creating an alias so both variables point to the same object.
              </p>
            </div>

            <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
              <div className="font-bold mb-1 text-blue-900">
                3) Aliasing Shares Field Mutations
              </div>
              <p className="text-slate-700 leading-snug">
                Changing a field through one reference (e.g. <code>var1.name = &quot;...&quot;</code>) changes the object in heap memory for all aliases.
              </p>
            </div>

            <div className="rounded-lg p-3 border border-slate-200 bg-slate-50">
              <div className="font-bold mb-1 text-blue-900">
                4) Reassignment Only Moves One Arrow
              </div>
              <p className="text-slate-700 leading-snug">
                Writing <code>var1 = other</code> redirects where <code>var1</code> points. It does not affect other variables pointing to the original object.
              </p>
            </div>
          </div>
        </section>

        {!reviewMode && onContinue && (
          <div
            className="flex flex-col items-start justify-between gap-4 border-t py-6 sm:flex-row sm:items-center"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Reading Complete</h2>
              <p className="mt-1 text-[13px] text-slate-600">
                You have reviewed all the core Java object-reference concepts. When you are ready, continue to the post-test.
              </p>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
