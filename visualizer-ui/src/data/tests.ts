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
  "This is not a real test. It does not affect your grades.",
  "No identifying information is collected.",
  "Answer on your own. Do not search the web or use AI tools.",
  "Trace step by step.",
  "Partial answers are welcome.",
  "You have 10 minutes.",
  "Click Continue when done.",
];

/* Builder for the 6-row recursion trace table (columns: Step #, What happened). */
function traceTable(keyPrefix: string): Field {
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
          label: "1.1  Which line(s) are the base case?",
        },
        traceTable("q1.trace"),
        {
          kind: "text",
          key: "q1.base_case_step",
          label: "1.3  Which step hits the base case?",
        },
        {
          kind: "text",
          key: "q1.final_value",
          label: "1.4  Final return value of f(3)?",
        },
      ],
    },
    {
      id: "q2",
      title: "Q2. Object Reference Trace",
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
          caption: "2.2  After Step 5, what does this print?",
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
          label: "1.1  Which line(s) are the base case?",
        },
        traceTable("q1.trace"),
        {
          kind: "text",
          key: "q1.base_case_step",
          label: "1.3  Which step hits the base case?",
        },
        {
          kind: "text",
          key: "q1.final_value",
          label: "1.4  Final return value of g(3)?",
        },
      ],
    },
    {
      id: "q2",
      title: "Q2. Object Reference Trace",
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
          caption: "2.2  After Step 5, what does this print?",
          code: `System.out.println(x.title + ", " + x.pages);
System.out.println(z.title + ", " + z.pages);`,
        },
        { kind: "text", key: "q2.output.line1", label: "Line 1 output" },
        { kind: "text", key: "q2.output.line2", label: "Line 2 output" },
      ],
    },
  ],
};
