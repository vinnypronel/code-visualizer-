/*
 * Structured pre-test and post-test definitions.
 *
 * Rendered by TestRunner. Every code block is read-only; every blank and table
 * cell is an editable input captured into the responses JSON. Pre-test and
 * post-test use the SAME response key scheme so analysis is symmetric across the two.
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
  "Complete every response field before continuing.",
  "You have 10 minutes to complete this section.",
  "When every response is complete, click the button below to continue.",
];

/*
 * Builder for the object-reference trace table. Row 1 is prefilled and
 * read-only; rows 2 to 5 are editable (three cells each). `col1` is the label
 * for the object-1 column and `row1Values` are the three prefilled row-1 cells.
 */
function objectRefTable(
  columns: [string, string, string],
  row1Values: [string, string, string],
  keyPrefix = "q1",
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
      { t: "in", key: `${keyPrefix}.table.step${s}.col_a` },
      { t: "in", key: `${keyPrefix}.table.step${s}.col_b` },
      { t: "in", key: `${keyPrefix}.table.step${s}.col_c` },
    ]);
  }
  return {
    kind: "grid",
    caption: "1.1 Trace the values after each step in the table below:",
    columns: ["After Step", ...columns],
    rows,
  };
}

export const PRETEST: TestDef = {
  id: "pretest",
  questions: [
    {
      id: "q1",
      title: "Q1. Object Reference Trace",
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
          "q1"
        ),
        {
          kind: "code",
          caption: "1.2 After Step 5, what does the following code print?",
          code: `System.out.println(b.name + ", " + b.age);
System.out.println(c.name + ", " + c.age);`,
        },
        { kind: "text", key: "q1.output.line1", label: "1.2a) Line 1 output" },
        { kind: "text", key: "q1.output.line2", label: "1.2b) Line 2 output" },
      ],
    },
  ],
};

export const POSTTEST: TestDef = {
  id: "posttest",
  questions: [
    {
      id: "q1",
      title: "Q1. Object Reference Trace",
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
          "q1"
        ),
        {
          kind: "code",
          caption: "1.2 After Step 5, what does the following code print?",
          code: `System.out.println(x.title + ", " + x.pages);
System.out.println(z.title + ", " + z.pages);`,
        },
        { kind: "text", key: "q1.output.line1", label: "1.2a) Line 1 output" },
        { kind: "text", key: "q1.output.line2", label: "1.2b) Line 2 output" },
      ],
    },
  ],
};
