/*
 * Shared type definitions for the mock-driven Java execution visualizer.
 * Extracted verbatim from the original src/app/page.tsx so the visualizer
 * internals stay unchanged. Do not alter shapes here without checking the
 * three panel components that consume them.
 */

export interface StackVariable {
  name: string;
  type: string;
  value: string;
  isReference: boolean;
}

export interface StackFrame {
  methodName: string;
  variables: StackVariable[];
}

export interface HeapField {
  name: string;
  type: string;
  value: string;
  isReference: boolean;
}

export interface HeapObject {
  id: string; // e.g. "101"
  className: string; // e.g. "Node"
  isArray?: boolean;
  arrayValues?: string[]; // for arrays
  fields?: HeapField[];
  x?: number; // relative placement percentages
  y?: number;
}

export interface RefArrow {
  id: string;
  source: string; // e.g. "stack-head", "heap-101-next"
  target: string; // e.g. "heap-101", "heap-102"
  label: string;
  color?: string; // "blue" | "purple" | "cyan" | "emerald"
}

export interface BananaDiagram {
  type: "variable" | "reference" | "dereference" | "array-index";
  title: string;
  description: string;
  svgMarkup: string; // Custom SVG to render for the concept
}

export interface DataMovement {
  from: string; // e.g. "heap-101-val"
  to: string;   // e.g. "stack-val"
  value: string; // e.g. "10"
}

export interface MemoryCallout {
  target: string; // e.g. "stack-head", "heap-101-val", "heap-101-next"
  title: string;
  body: string;
  tone?: "blue" | "purple" | "green" | "amber";
}

export interface ActiveBlock {
  label: string;
  beginLine: number;
  endLine: number;
}

export interface ExecutionStep {
  lineHighlight: number | null;
  stack: StackFrame[];
  heap: Record<string, HeapObject>;
  arrows: RefArrow[];
  explanation: string;
  bananaDiagram: BananaDiagram;
  spotlightStackVars?: string[];
  spotlightHeapObjects?: string[];
  spotlightHeapFields?: string[];
  dataMovement?: DataMovement;
  callouts?: MemoryCallout[];
  stdout?: string;
  activeBlock?: ActiveBlock;
}

export interface Preset {
  id: string;
  name: string;
  code: string;
  steps: ExecutionStep[];
}
