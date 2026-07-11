/*
 * Structured pre-test and post-test definitions.
 *
 * Rendered by TestRunner. Every code block is read-only; every blank and table
 * cell is an editable input captured into the responses JSON. Pre-test and
 * post-test use the SAME response key scheme (q1.*, q2.*) so analysis is
 * symmetric across the two. Column headers differ between the tests, but the
 * captured keys do not.
 *
 * Nothing here is auto-graded. Responses are captured and stored only.
 */

/* A single cell in a grid: read-only display text, or an editable input. */
export type GridCell =
  | { t: "ro"; text: string }
  | { t: "in"; key: string; placeholder?: string };

export type Field =
  | { kind: "code"; code: string; caption?: string }
  | { kind: "text"; key: string; label: string; placeholder?: string }
  | { kind: "grid"; columns: string[]; rows: GridCell[][]; caption?: string };

export interface Question {
  id: string;
  title: string;
  prompt?: string;
  fields: Field[];
}

export interface TestDef {
  id: "pretest" | "posttest";
  questions: Question[];
}

/* Shared instruction block, shown verbatim at the top of both tests. */
export const TEST_INSTRUCTIONS: string[] = [
  "This is not a real test. Your responses will not affect your grade, GPA, or academic standing in any way.",
  "This activity is solely for research purposes. No personally identifying information (such as your name or email address) is collected, and your performance will never be linked to your identity.",
  "Please answer the questions on your own - do not search online or use AI tools.",
  "Trace through each program step by step and fill in the table as completely as you can.",
  "Partial responses are welcome.",
  "You have 10 minutes to complete this section.",
  "When you are done, click the button below to continue.",
];

/* Builder for the 6-row recursion trace table (columns: Step #, What happened). */
function traceTable(keyPrefix: string): Extract<Field, { kind: "grid" }> {
  const rows: GridCell[][] = [];
  for (let i = 1; i <= 6; i++) {
    rows.push([
      { t: "ro", text: String(i) },
      { t: "in", key: `${keyPrefix}.step${i}` },
    ]);
  }
  return {
    kind: "grid",
    columns: ["Step #", "What happened in this step?"],
    rows,
  };
}

/*
 * Builder for the object-reference trace table. Row 1 is prefilled and
 * read-only; rows 2 to 5 are editable (three cells each). `col1` is the label
 * for the object-1 column and `row1Values` are the three prefilled row-1 cells.
 */
function objectRefTable(
  columns: [string, string, string],
  row1Values: [string, string, string],
): Field {
  const rows: GridCell[][] = [
    [
      { t: "ro", text: "1" },
      { t: "ro", text: row1Values[0] },
      { t: "ro", text: row1Values[1] },
      { t: "ro", text: row1Values[2] },
    ],
  ];
  for (let s = 2; s <= 5; s++) {
    rows.push([
      { t: "ro", text: String(s) },
      { t: "in", key: `q2.table.step${s}.col_a` },
      { t: "in", key: `q2.table.step${s}.col_b` },
      { t: "in", key: `q2.table.step${s}.col_c` },
    ]);
  }
  return {
    kind: "grid",
    columns: ["After Step", ...columns],
    rows,
  };
}

export const PRETEST: TestDef = {
  id: "pretest",
  questions: [
    {
      id: "q1",
      title: "Q1. Recursion Trace",
      prompt: "Consider the following recursive method:",
      fields: [
        {
          kind: "code",
          code: `static int f(int n) {
    if (n == 0){
        return 1;
    } else {
        return n * f(n - 1);
    }
}`,
        },
        {
          kind: "text",
          key: "q1.base_case",
          label: "1.1 Which line(s) of code represent the base case?",
        },
        {
          ...traceTable("q1.trace"),
          caption:
            "1.2 Trace the execution of f(3). For each step, describe what happened - follow the tracing format we used in CPS 2231. Each method call and each return value counts as a separate step.",
        },
        {
          kind: "text",
          key: "q1.base_case_step",
          label: "1.3 At which step does it hit the base case?",
        },
        {
          kind: "text",
          key: "q1.final_value",
          label: "1.4 What is the final return value of f(3)?",
        },
      ],
    },
    {
      id: "q2",
      title: "Q2. Object Reference Trace",
      prompt: "Consider the following Java program:",
      fields: [
        {
          kind: "code",
          code: `class Dog {
    String name;
    int age;
    Dog(String name, int age) {
        this.name = name;
        this.age  = age;
    }
}

Dog a = new Dog("Rex", 3);    // Step 1
Dog b = new Dog("Bella", 5);  // Step 2
Dog c = b;                    // Step 3
b.name = "Max";               // Step 4
b = a;                        // Step 5`,
        },
        objectRefTable(
          ["a.name / a.age", "b.name / b.age", "c.name / c.age"],
          ['"Rex" / 3', "(not yet created)", "(not yet created)"],
        ),
        {
          kind: "code",
          caption: "2.2 After Step 5, what does the following code print?",
          code: `System.out.println(b.name + ", " + b.age);
System.out.println(c.name + ", " + c.age);`,
        },
        { kind: "text", key: "q2.output.line1", label: "Line 1 output" },
        { kind: "text", key: "q2.output.line2", label: "Line 2 output" },
      ],
    },
  ],
};

export const POSTTEST: TestDef = {
  id: "posttest",
  questions: [
    {
      id: "q1",
      title: "Q1. Recursion Trace",
      prompt: "Consider the following recursive method:",
      fields: [
        {
          kind: "code",
          code: `static int g(int n) {
    if (n == 0){
        return 1;
    } else {
        return g(n - 2) + n;
    }
}`,
        },
        {
          kind: "text",
          key: "q1.base_case",
          label: "1.1 Which line(s) of code represent the base case?",
        },
        {
          ...traceTable("q1.trace"),
          caption:
            "1.2 Trace the execution of g(3). For each step, describe what happened - follow the tracing format we used in CPS 2231. Each method call and each return value counts as a separate step.",
        },
        {
          kind: "text",
          key: "q1.base_case_step",
          label: "1.3 At which step does it hit the base case?",
        },
        {
          kind: "text",
          key: "q1.final_value",
          label: "1.4 What is the final return value of g(3)?",
        },
      ],
    },
    {
      id: "q2",
      title: "Q2. Object Reference Trace",
      prompt: "Consider the following Java program:",
      fields: [
        {
          kind: "code",
          code: `class Book {
    String title;
    int pages;
    Book(String title, int pages) {
        this.title = title;
        this.pages = pages;
    }
}

Book x = new Book("Java", 300);   // Step 1
Book y = new Book("Python", 250); // Step 2
Book z = x;                       // Step 3
x.title = "C++";                  // Step 4
x = y;                            // Step 5`,
        },
        objectRefTable(
          ["x.title / x.pages", "y.title / y.pages", "z.title / z.pages"],
          ['"Java" / 300', "(not yet created)", "(not yet created)"],
        ),
        {
          kind: "code",
          caption: "2.2 After Step 5, what does the following code print?",
          code: `System.out.println(x.title + ", " + x.pages);
System.out.println(z.title + ", " + z.pages);`,
        },
        { kind: "text", key: "q2.output.line1", label: "Line 1 output" },
        { kind: "text", key: "q2.output.line2", label: "Line 2 output" },
      ],
    },
  ],
};
