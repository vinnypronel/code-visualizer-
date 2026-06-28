"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import AiExplanationPanel from "@/components/AiExplanationPanel";
import OnboardingTour from "@/components/OnboardingTour";

/* Lazy-load panels that use browser APIs */
const CodeEditorPanel = dynamic(() => import("@/components/CodeEditorPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-400 text-xs bg-slate-950">
      Loading editor…
    </div>
  ),
});

const MemoryExecutionView = dynamic(() => import("@/components/MemoryExecutionView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-400 text-xs bg-slate-950">
      Loading visualizer…
    </div>
  ),
});

/* ─── Resizer Component ─────────────────────────────────────────────────── */
interface ResizerProps {
  onDrag: (dx: number) => void;
}

function Resizer({ onDrag }: ResizerProps) {
  const dragging = useRef(false);
  const lastX    = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current    = e.clientX;
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(e.clientX - lastX.current);
      lastX.current = e.clientX;
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor    = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [onDrag]);

  return (
    <div
      className="resizer"
      onMouseDown={onMouseDown}
      style={{ width: 4, cursor: "col-resize", flexShrink: 0 }}
    />
  );
}

/* ─── Simulation Presets & Steps Data ────────────────────────────────────── */

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
}

export interface Preset {
  id: string;
  name: string;
  code: string;
  steps: ExecutionStep[];
}

const SIMULATION_PRESETS: Record<string, Preset> = {
  linkedlist: {
    id: "linkedlist",
    name: "Linked List: Insertion & Linking",
    code: `public class LinkedListDemo {
    public static void main(String[] args) {
        Node head = new Node(10);
        Node temp = new Node(20);
        head.next = temp;
        int val = head.val;
    }
}

class Node {
    int val;
    Node next;
    Node(int val) {
        this.val = val;
    }
}`,
    steps: [
      {
        lineHighlight: 2,
        stack: [
          { methodName: "main(String[] args)", variables: [] }
        ],
        heap: {},
        arrows: [],
        spotlightStackVars: [],
        spotlightHeapObjects: [],
        spotlightHeapFields: [],
        explanation: "We enter the main function on our workbench (the Stack). Let's see how variables and memory are created by stepping forward.",
        bananaDiagram: {
          type: "variable",
          title: "The Workbench (Stack)",
          description: "The Stack is like a workbench for your running code. It holds local cards (variables) that are created inside a function.",
          svgMarkup: `<svg viewBox="0 0 160 120" class="w-full h-full"><rect x="20" y="20" width="120" height="80" rx="6" fill="#1e293b" stroke="#334155" stroke-width="2"/><text x="80" y="45" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">Workbench</text><text x="80" y="70" fill="#94a3b8" font-size="10" text-anchor="middle">Holds local cards</text></svg>`
        }
      },
      {
        lineHighlight: 3,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "head", type: "Node", value: "@101", isReference: true }
            ]
          }
        ],
        heap: {
          "101": {
            id: "101",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "10", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 20,
            y: 20
          }
        },
        arrows: [
          { id: "head-to-101", source: "stack-head", target: "heap-101", label: "head", color: "blue" }
        ],
        spotlightStackVars: ["head"],
        spotlightHeapObjects: ["101"],
        spotlightHeapFields: ["101-val"],
        explanation: "We just created a new Node object, which we'll call [Object 1], in our Object Storage (The Heap). The variable head on the Stack now holds a remote control pointing to [Object 1]. The node contains val 10, and its next slot is currently empty (null).",
        bananaDiagram: {
          type: "reference",
          title: "Address Tags (References)",
          description: "A reference variable doesn't hold the actual object; it just holds a friendly address tag (like [Object 1]) acting as a remote control pointing to where the object is stored in Object Storage (The Heap).",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="10" y="35" width="50" height="30" rx="4" fill="#3b82f622" stroke="#3b82f6" stroke-width="1.5"/><text x="35" y="54" fill="#f8fafc" font-size="10" font-weight="600" text-anchor="middle">head: [Object 1]</text><path d="M 60 50 Q 100 20 135 42" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="3,3"/><polygon points="140,45 130,45 135,37" fill="#3b82f6"/><rect x="140" y="35" width="50" height="30" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5"/><text x="165" y="54" fill="#94a3b8" font-size="10" text-anchor="middle">Warehouse Box</text></svg>`
        }
      },
      {
        lineHighlight: 4,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "head", type: "Node", value: "@101", isReference: true },
              { name: "temp", type: "Node", value: "@102", isReference: true }
            ]
          }
        ],
        heap: {
          "101": {
            id: "101",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "10", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "102": {
            id: "102",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "20", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 60
          }
        },
        arrows: [
          { id: "head-to-101", source: "stack-head", target: "heap-101", label: "head", color: "blue" },
          { id: "temp-to-102", source: "stack-temp", target: "heap-102", label: "temp", color: "purple" }
        ],
        spotlightStackVars: ["temp"],
        spotlightHeapObjects: ["102"],
        spotlightHeapFields: ["102-val"],
        explanation: "We create a second Node object, which we'll call [Object 2], in our Object Storage with val 20. A new variable temp is added to the Stack, holding a matching remote control pointing to [Object 2].",
        bananaDiagram: {
          type: "reference",
          title: "Multiple Objects in Storage",
          description: "Both objects sit independently in Object Storage (The Heap). The Stack holds two remote controls: head and temp.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="15" y="20" width="40" height="20" rx="3" fill="#3b82f622" stroke="#3b82f6"/><text x="35" y="33" fill="#94a3b8" font-size="8" text-anchor="middle">head</text><rect x="15" y="70" width="40" height="20" rx="3" fill="#8b5cf622" stroke="#8b5cf6"/><text x="35" y="83" fill="#94a3b8" font-size="8" text-anchor="middle">temp</text><circle cx="140" cy="30" r="12" fill="#1e293b" stroke="#3b82f6"/><text x="140" y="33" fill="#f8fafc" font-size="8" text-anchor="middle">10</text><circle cx="140" cy="80" r="12" fill="#1e293b" stroke="#8b5cf6"/><text x="140" y="83" fill="#f8fafc" font-size="8" text-anchor="middle">20</text><path d="M 55 30 L 128 30" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="2,2"/><path d="M 55 80 L 128 80" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="2,2"/></svg>`
        }
      },
      {
        lineHighlight: 5,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "head", type: "Node", value: "@101", isReference: true },
              { name: "temp", type: "Node", value: "@102", isReference: true }
            ]
          }
        ],
        heap: {
          "101": {
            id: "101",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "10", isReference: false },
              { name: "next", type: "Node", value: "@102", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "102": {
            id: "102",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "20", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 60
          }
        },
        arrows: [
          { id: "head-to-101", source: "stack-head", target: "heap-101", label: "head", color: "blue" },
          { id: "temp-to-102", source: "stack-temp", target: "heap-102", label: "temp", color: "purple" },
          { id: "next-to-102", source: "heap-101-next", target: "heap-102", label: "next", color: "purple" }
        ],
        spotlightStackVars: ["temp", "head"],
        spotlightHeapObjects: ["101", "102"],
        spotlightHeapFields: ["101-next"],
        dataMovement: {
          from: "stack-temp",
          to: "heap-101-next",
          value: "@102"
        },
        explanation: "We connect them! By setting head.next = temp, we copy the reference pointer from our variable temp so that the next field inside [Object 1] now points directly to [Object 2]. Now, [Object 1] points to [Object 2].",
        bananaDiagram: {
          type: "reference",
          title: "Linking Objects",
          description: "By storing a reference pointer inside one object's 'next' slot, we chain the objects together, creating a Linked List.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="20" y="45" width="50" height="30" rx="4" fill="#1e293b" stroke="#3b82f6"/><text x="45" y="63" fill="#f8fafc" font-size="9" text-anchor="middle">val: 10</text><line x1="70" y1="45" x2="70" y2="75" stroke="#3b82f6"/><rect x="130" y="45" width="50" height="30" rx="4" fill="#1e293b" stroke="#8b5cf6"/><text x="155" y="63" fill="#f8fafc" font-size="9" text-anchor="middle">val: 20</text><path d="M 60 60 L 122 60" fill="none" stroke="#3b82f6" stroke-width="2"/><polygon points="128,60 120,56 120,64" fill="#3b82f6"/></svg>`
        }
      },
      {
        lineHighlight: 6,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "head", type: "Node", value: "@101", isReference: true },
              { name: "temp", type: "Node", value: "@102", isReference: true },
              { name: "val", type: "int", value: "10", isReference: false }
            ]
          }
        ],
        heap: {
          "101": {
            id: "101",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "10", isReference: false },
              { name: "next", type: "Node", value: "@102", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "102": {
            id: "102",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "20", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 60
          }
        },
        arrows: [
          { id: "head-to-101", source: "stack-head", target: "heap-101", label: "head", color: "blue" },
          { id: "temp-to-102", source: "stack-temp", target: "heap-102", label: "temp", color: "purple" },
          { id: "next-to-102", source: "heap-101-next", target: "heap-102", label: "next", color: "purple" }
        ],
        spotlightStackVars: ["val", "head"],
        spotlightHeapObjects: ["101"],
        spotlightHeapFields: ["101-val"],
        dataMovement: {
          from: "heap-101-val",
          to: "stack-val",
          value: "10"
        },
        explanation: "We read the value: int val = head.val. We follow the remote control held by head to find [Object 1] in Object Storage, grab the number 10 from its val field, and copy it directly into a new local variable val on the Stack.",
        bananaDiagram: {
          type: "dereference",
          title: "Following the Reference",
          description: "Following a reference pointer means going to that specific object in Object Storage to read or edit what's inside.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><circle cx="40" cy="60" r="16" fill="#3b82f622" stroke="#3b82f6"/><text x="40" y="63" fill="#f8fafc" font-size="9" font-weight="bold" text-anchor="middle">head</text><path d="M 58 60 L 120 60" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="2,2"/><polygon points="126,60 118,56 118,64" fill="#3b82f6"/><rect x="128" y="40" width="50" height="40" rx="4" fill="#1e293b" stroke="#3b82f6"/><text x="153" y="58" fill="#e2e8f0" font-size="8" text-anchor="middle">Node [Object 1]</text><text x="153" y="71" fill="#10b981" font-size="8" font-weight="bold" text-anchor="middle">val = 10</text></svg>`
        }
      }
    ]
  },
  arraylist: {
    id: "arraylist",
    name: "Array List: Contiguous Storage & Resizing",
    code: `public class ArrayListDemo {
    public static void main(String[] args) {
        int[] list = new int[3];
        list[0] = 5;
        list[1] = 10;
        int size = 2;
        
        int[] temp = new int[6];
        temp[0] = list[0];
    }
}`,
    steps: [
      {
        lineHighlight: 2,
        stack: [
          { methodName: "main(String[] args)", variables: [] }
        ],
        heap: {},
        arrows: [],
        spotlightStackVars: [],
        spotlightHeapObjects: [],
        spotlightHeapFields: [],
        explanation: "We open our workbench. Let's trace how a row of contiguous slots (arrays) work in memory by stepping forward.",
        bananaDiagram: {
          type: "variable",
          title: "Row of Boxes (Arrays)",
          description: "An array is a fixed row of values stored in Object Storage (The Heap). Each slot has a position number (index) starting from 0.",
          svgMarkup: `<svg viewBox="0 0 160 120" class="w-full h-full"><rect x="10" y="30" width="140" height="60" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5"/><line x1="55" y1="30" x2="55" y2="90" stroke="#334155"/><line x1="100" y1="30" x2="100" y2="90" stroke="#334155"/><text x="32" y="65" fill="#f8fafc" font-size="12" text-anchor="middle">[0]</text><text x="77" y="65" fill="#f8fafc" font-size="12" text-anchor="middle">[1]</text><text x="122" y="65" fill="#f8fafc" font-size="12" text-anchor="middle">[2]</text></svg>`
        }
      },
      {
        lineHighlight: 3,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "list", type: "int[]", value: "@201", isReference: true }
            ]
          }
        ],
        heap: {
          "201": {
            id: "201",
            className: "int[]",
            isArray: true,
            arrayValues: ["0", "0", "0"],
            x: 20,
            y: 30
          }
        },
        arrows: [
          { id: "list-to-201", source: "stack-list", target: "heap-201", label: "list", color: "blue" }
        ],
        spotlightStackVars: ["list"],
        spotlightHeapObjects: ["201"],
        spotlightHeapFields: [],
        explanation: "We create a new array of size 3, which we'll call [Object 1], in our Object Storage (The Heap). The slots start with 0 inside. The variable list on the Stack holds the remote control pointing to [Object 1].",
        bananaDiagram: {
          type: "array-index",
          title: "Placing the Row",
          description: "We claim a continuous space for 3 values in Object Storage at [Object 1], and point the list variable to it.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="15" y="45" width="40" height="30" rx="4" fill="#3b82f622" stroke="#3b82f6"/><text x="35" y="64" fill="#f8fafc" font-size="10" text-anchor="middle">list: [Obj 1]</text><path d="M 55 60 L 115 60" fill="none" stroke="#3b82f6" stroke-width="1.5"/><polygon points="122,60 114,56 114,64" fill="#3b82f6"/><rect x="125" y="45" width="60" height="30" rx="3" fill="#1e293b" stroke="#334155"/><text x="155" y="64" fill="#94a3b8" font-size="9" text-anchor="middle">[ 0, 0, 0 ]</text></svg>`
        }
      },
      {
        lineHighlight: 4,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "list", type: "int[]", value: "@201", isReference: true }
            ]
          }
        ],
        heap: {
          "201": {
            id: "201",
            className: "int[]",
            isArray: true,
            arrayValues: ["5", "0", "0"],
            x: 20,
            y: 30
          }
        },
        arrows: [
          { id: "list-to-201", source: "stack-list", target: "heap-201", label: "list", color: "blue" }
        ],
        spotlightStackVars: ["list"],
        spotlightHeapObjects: ["201"],
        spotlightHeapFields: ["201-0"],
        explanation: "We write 5 to the first slot: list[0] = 5. We follow the remote control list to find the array [Object 1], locate index 0, and write 5 inside it.",
        bananaDiagram: {
          type: "array-index",
          title: "Writing to a Position",
          description: "Using list[0] = 5 directly targets the very first slot in the row inside Object Storage to update its value.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="10" y="40" width="180" height="40" fill="#1e293b" stroke="#334155"/><line x1="70" y1="40" x2="70" y2="80" stroke="#334155"/><text x="40" y="65" fill="#10b981" font-size="14" font-weight="bold" text-anchor="middle">5</text><text x="110" y="65" fill="#475569" font-size="14" text-anchor="middle">0</text><text x="40" y="93" fill="#94a3b8" font-size="8" text-anchor="middle">index 0</text></svg>`
        }
      },
      {
        lineHighlight: 5,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "list", type: "int[]", value: "@201", isReference: true }
            ]
          }
        ],
        heap: {
          "201": {
            id: "201",
            className: "int[]",
            isArray: true,
            arrayValues: ["5", "10", "0"],
            x: 20,
            y: 30
          }
        },
        arrows: [
          { id: "list-to-201", source: "stack-list", target: "heap-201", label: "list", color: "blue" }
        ],
        spotlightStackVars: ["list"],
        spotlightHeapObjects: ["201"],
        spotlightHeapFields: ["201-1"],
        explanation: "We write 10 to the second slot: list[1] = 10. We follow the remote control list to find the array [Object 1], locate index 1, and write 10 inside it.",
        bananaDiagram: {
          type: "array-index",
          title: "Side-by-Side Boxes",
          description: "Writing to position 1 changes the second slot in the row, leaving the neighboring slots completely untouched.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="10" y="40" width="180" height="40" fill="#1e293b" stroke="#334155"/><line x1="70" y1="40" x2="70" y2="80" stroke="#334155"/><line x1="130" y1="40" x2="130" y2="80" stroke="#334155"/><text x="40" y="65" fill="#f8fafc" font-size="12" text-anchor="middle">5</text><text x="100" y="65" fill="#10b981" font-size="12" font-weight="bold" text-anchor="middle">10</text><text x="100" y="93" fill="#94a3b8" font-size="8" text-anchor="middle">index 1</text></svg>`
        }
      },
      {
        lineHighlight: 6,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "list", type: "int[]", value: "@201", isReference: true },
              { name: "size", type: "int", value: "2", isReference: false }
            ]
          }
        ],
        heap: {
          "201": {
            id: "201",
            className: "int[]",
            isArray: true,
            arrayValues: ["5", "10", "0"],
            x: 20,
            y: 30
          }
        },
        arrows: [
          { id: "list-to-201", source: "stack-list", target: "heap-201", label: "list", color: "blue" }
        ],
        spotlightStackVars: ["size"],
        spotlightHeapObjects: [],
        spotlightHeapFields: [],
        explanation: "We store the number 2 in a new local variable size on the Stack to keep track of how many slots in our array we have filled so far.",
        bananaDiagram: {
          type: "variable",
          title: "Values vs References",
          description: "Basic values (primitives) are stored directly on the Stack. References are remote controls pointing to objects in Object Storage.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="10" y="25" width="80" height="30" rx="3" fill="#10b98122" stroke="#10b981"/><text x="50" y="44" fill="#f8fafc" font-size="9" text-anchor="middle">size: 2 (int)</text><rect x="110" y="25" width="80" height="30" rx="3" fill="#3b82f622" stroke="#3b82f6"/><text x="150" y="44" fill="#f8fafc" font-size="9" text-anchor="middle">list: [Obj 1]</text><text x="100" y="80" fill="#94a3b8" font-size="8" text-anchor="middle" font-style="italic">Stored directly vs. referencing heap</text></svg>`
        }
      },
      {
        lineHighlight: 8,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "list", type: "int[]", value: "@201", isReference: true },
              { name: "size", type: "int", value: "2", isReference: false },
              { name: "temp", type: "int[]", value: "@202", isReference: true }
            ]
          }
        ],
        heap: {
          "201": {
            id: "201",
            className: "int[]",
            isArray: true,
            arrayValues: ["5", "10", "0"],
            x: 20,
            y: 30
          },
          "202": {
            id: "202",
            className: "int[]",
            isArray: true,
            arrayValues: ["0", "0", "0", "0", "0", "0"],
            x: 55,
            y: 50
          }
        },
        arrows: [
          { id: "list-to-201", source: "stack-list", target: "heap-201", label: "list", color: "blue" },
          { id: "temp-to-202", source: "stack-temp", target: "heap-202", label: "temp", color: "purple" }
        ],
        spotlightStackVars: ["temp"],
        spotlightHeapObjects: ["202"],
        spotlightHeapFields: [],
        explanation: "Since arrays cannot change size, we create a brand new, longer array of size 6, which we'll call [Object 2], in Object Storage. The variable temp on the Stack now holds a remote control pointing to [Object 2].",
        bananaDiagram: {
          type: "variable",
          title: "Making a Longer Row",
          description: "A row of boxes cannot expand. To grow, we must create a brand new, longer row in Object Storage and copy the values over.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="10" y="25" width="70" height="20" rx="3" fill="#1e293b" stroke="#334155"/><text x="45" y="37" fill="#94a3b8" font-size="8" text-anchor="middle">Old Array (Size 3)</text><rect x="10" y="65" width="140" height="20" rx="3" fill="#1e293b" stroke="#3b82f6"/><text x="80" y="77" fill="#f8fafc" font-size="8" text-anchor="middle">New Array (Size 6)</text></svg>`
        }
      },
      {
        lineHighlight: 9,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "list", type: "int[]", value: "@201", isReference: true },
              { name: "size", type: "int", value: "2", isReference: false },
              { name: "temp", type: "int[]", value: "@202", isReference: true }
            ]
          }
        ],
        heap: {
          "201": {
            id: "201",
            className: "int[]",
            isArray: true,
            arrayValues: ["5", "10", "0"],
            x: 20,
            y: 30
          },
          "202": {
            id: "202",
            className: "int[]",
            isArray: true,
            arrayValues: ["5", "0", "0", "0", "0", "0"],
            x: 55,
            y: 50
          }
        },
        arrows: [
          { id: "list-to-201", source: "stack-list", target: "heap-201", label: "list", color: "blue" },
          { id: "temp-to-202", source: "stack-temp", target: "heap-202", label: "temp", color: "purple" }
        ],
        spotlightStackVars: ["list", "temp"],
        spotlightHeapObjects: ["201", "202"],
        spotlightHeapFields: ["201-0", "202-0"],
        dataMovement: {
          from: "heap-201-0",
          to: "heap-202-0",
          value: "5"
        },
        explanation: "We copy the old data: we follow the remote control list to find the old array [Object 1], grab the value 5 from index 0, and copy it into index 0 of our new array [Object 2].",
        bananaDiagram: {
          type: "array-index",
          title: "Copying Values Over",
          description: "We read the value from the old array and write it into the new array. Once copied, the old array is no longer needed.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="10" y="25" width="60" height="25" fill="#1e293b" stroke="#334155"/><text x="40" y="42" fill="#f8fafc" font-size="10" text-anchor="middle">list[0]: 5</text><rect x="120" y="65" width="60" height="25" fill="#1e293b" stroke="#3b82f6"/><text x="150" y="82" fill="#10b981" font-size="10" font-weight="bold" text-anchor="middle">temp[0]: 5</text><path d="M 50 50 Q 80 70 120 75" fill="none" stroke="#10b981" stroke-width="1.5"/><polygon points="120,75 112,70 115,79" fill="#10b981"/></svg>`
        }
      }
    ]
  },
  stack: {
    id: "stack",
    name: "Stack: LIFO Stack Push Operations",
    code: `public class StackDemo {
    public static void main(String[] args) {
        MyStack s = new MyStack();
        Node n1 = new Node(42);
        s.top = n1;
        
        Node n2 = new Node(84);
        n2.next = s.top;
        s.top = n2;
    }
}

class MyStack {
    Node top;
}

class Node {
    int val;
    Node next;
    Node(int val) { this.val = val; }
}`,
    steps: [
      {
        lineHighlight: 2,
        stack: [
          { methodName: "main(String[] args)", variables: [] }
        ],
        heap: {},
        arrows: [],
        spotlightStackVars: [],
        spotlightHeapObjects: [],
        spotlightHeapFields: [],
        explanation: "We open our workbench. We will build a stack data structure by pushing objects on top of one another.",
        bananaDiagram: {
          type: "variable",
          title: "Pile of Boxes (Stack)",
          description: "A stack is like a pile of items where you can only add (push) or remove (pop) from the very top.",
          svgMarkup: `<svg viewBox="0 0 160 120" class="w-full h-full"><rect x="40" y="20" width="80" height="30" rx="4" fill="#1e293b" stroke="#8b5cf6" stroke-width="2"/><text x="80" y="38" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">s (Stack Obj)</text><path d="M 80 50 L 80 80" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="3,3"/><rect x="50" y="80" width="60" height="25" rx="3" fill="#1e293b" stroke="#334155"/><text x="80" y="96" fill="#94a3b8" font-size="9" text-anchor="middle">top node</text></svg>`
        }
      },
      {
        lineHighlight: 3,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "s", type: "MyStack", value: "@301", isReference: true }
            ]
          }
        ],
        heap: {
          "301": {
            id: "301",
            className: "MyStack",
            fields: [
              { name: "top", type: "Node", value: "null", isReference: true }
            ],
            x: 20,
            y: 20
          }
        },
        arrows: [
          { id: "s-to-301", source: "stack-s", target: "heap-301", label: "s", color: "blue" }
        ],
        spotlightStackVars: ["s"],
        spotlightHeapObjects: ["301"],
        spotlightHeapFields: ["301-top"],
        explanation: "We create a MyStack object, which we'll call [Object 1], in Object Storage. Its top reference is empty (null). The variable s on the Stack holds the remote control pointing to [Object 1].",
        bananaDiagram: {
          type: "reference",
          title: "The Pile Tracker",
          description: "We use a tracking card whose only job is to write down the reference of whatever node is currently at the top of the stack.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="15" y="45" width="40" height="30" rx="4" fill="#8b5cf622" stroke="#8b5cf6"/><text x="35" y="64" fill="#f8fafc" font-size="10" text-anchor="middle">s: [Obj 1]</text><path d="M 55 60 L 115 60" fill="none" stroke="#8b5cf6" stroke-width="1.5"/><polygon points="122,60 114,56 114,64" fill="#8b5cf6"/><rect x="125" y="45" width="60" height="30" rx="3" fill="#1e293b" stroke="#334155"/><text x="155" y="64" fill="#94a3b8" font-size="8" text-anchor="middle">top: null</text></svg>`
        }
      },
      {
        lineHighlight: 4,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "s", type: "MyStack", value: "@301", isReference: true },
              { name: "n1", type: "Node", value: "@302", isReference: true }
            ]
          }
        ],
        heap: {
          "301": {
            id: "301",
            className: "MyStack",
            fields: [
              { name: "top", type: "Node", value: "null", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 35
          }
        },
        arrows: [
          { id: "s-to-301", source: "stack-s", target: "heap-301", label: "s", color: "blue" },
          { id: "n1-to-302", source: "stack-n1", target: "heap-302", label: "n1", color: "purple" }
        ],
        spotlightStackVars: ["n1"],
        spotlightHeapObjects: ["302"],
        spotlightHeapFields: ["302-val"],
        explanation: "We create a Node object, which we'll call [Object 2], in Object Storage holding the value 42. The variable n1 on the Stack holds the remote control pointing to [Object 2].",
        bananaDiagram: {
          type: "reference",
          title: "Preparing a New Box",
          description: "Before putting a node on the stack, we create it in Object Storage with the number 42 inside, pointing to no other nodes.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="120" y="40" width="60" height="40" rx="4" fill="#1e293b" stroke="#334155"/><text x="150" y="58" fill="#e2e8f0" font-size="8" text-anchor="middle">Node [Object 2]</text><text x="150" y="70" fill="#94a3b8" font-size="8" text-anchor="middle">val: 42</text></svg>`
        }
      },
      {
        lineHighlight: 5,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "s", type: "MyStack", value: "@301", isReference: true },
              { name: "n1", type: "Node", value: "@302", isReference: true }
            ]
          }
        ],
        heap: {
          "301": {
            id: "301",
            className: "MyStack",
            fields: [
              { name: "top", type: "Node", value: "@302", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 35
          }
        },
        arrows: [
          { id: "s-to-301", source: "stack-s", target: "heap-301", label: "s", color: "blue" },
          { id: "n1-to-302", source: "stack-n1", target: "heap-302", label: "n1", color: "purple" },
          { id: "top-to-302", source: "heap-301-top", target: "heap-302", label: "top", color: "purple" }
        ],
        spotlightStackVars: ["s", "n1"],
        spotlightHeapObjects: ["301", "302"],
        spotlightHeapFields: ["301-top"],
        dataMovement: {
          from: "stack-n1",
          to: "heap-301-top",
          value: "@302"
        },
        explanation: "We push the node onto the stack: we follow the remote control s to [Object 1], find its top field, and copy the reference from n1 into it. Now the top field of [Object 1] points directly to [Object 2].",
        bananaDiagram: {
          type: "reference",
          title: "First Box on the Pile",
          description: "The stack tracker's 'top' slot now points to [Object 2], which becomes the bottom and top of our stack.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="15" y="45" width="45" height="30" fill="#1e293b" stroke="#8b5cf6"/><text x="37" y="64" fill="#94a3b8" font-size="9" text-anchor="middle">Stack top</text><path d="M 60 60 Q 90 40 125 50" fill="none" stroke="#8b5cf6" stroke-width="1.5"/><polygon points="130,52 122,46 122,54" fill="#8b5cf6"/><rect x="130" y="45" width="50" height="30" fill="#1e293b" stroke="#334155"/><text x="155" y="64" fill="#f8fafc" font-size="9" text-anchor="middle">Node 42</text></svg>`
        }
      },
      {
        lineHighlight: 7,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "s", type: "MyStack", value: "@301", isReference: true },
              { name: "n1", type: "Node", value: "@302", isReference: true },
              { name: "n2", type: "Node", value: "@303", isReference: true }
            ]
          }
        ],
        heap: {
          "301": {
            id: "301",
            className: "MyStack",
            fields: [
              { name: "top", type: "Node", value: "@302", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 75
          },
          "303": {
            id: "303",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "84", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 25
          }
        },
        arrows: [
          { id: "s-to-301", source: "stack-s", target: "heap-301", label: "s", color: "blue" },
          { id: "n1-to-302", source: "stack-n1", target: "heap-302", label: "n1", color: "purple" },
          { id: "n2-to-303", source: "stack-n2", target: "heap-303", label: "n2", color: "emerald" },
          { id: "top-to-302", source: "heap-301-top", target: "heap-302", label: "top", color: "purple" }
        ],
        spotlightStackVars: ["n2"],
        spotlightHeapObjects: ["303"],
        spotlightHeapFields: ["303-val"],
        explanation: "We create a second Node object, which we'll call [Object 3], in Object Storage holding the value 84. The variable n2 on the Stack holds the remote control pointing to [Object 3].",
        bananaDiagram: {
          type: "reference",
          title: "Preparing the Next Box",
          description: "We build a second node [Object 3] containing 84 in Object Storage. It is not yet connected to our stack.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="120" y="40" width="60" height="40" rx="4" fill="#1e293b" stroke="#334155"/><text x="150" y="58" fill="#e2e8f0" font-size="8" text-anchor="middle">Node [Object 3]</text><text x="150" y="70" fill="#10b981" font-size="8" text-anchor="middle">val: 84</text></svg>`
        }
      },
      {
        lineHighlight: 8,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "s", type: "MyStack", value: "@301", isReference: true },
              { name: "n1", type: "Node", value: "@302", isReference: true },
              { name: "n2", type: "Node", value: "@303", isReference: true }
            ]
          }
        ],
        heap: {
          "301": {
            id: "301",
            className: "MyStack",
            fields: [
              { name: "top", type: "Node", value: "@302", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 75
          },
          "303": {
            id: "303",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "84", isReference: false },
              { name: "next", type: "Node", value: "@302", isReference: true }
            ],
            x: 60,
            y: 25
          }
        },
        arrows: [
          { id: "s-to-301", source: "stack-s", target: "heap-301", label: "s", color: "blue" },
          { id: "n1-to-302", source: "stack-n1", target: "heap-302", label: "n1", color: "purple" },
          { id: "n2-to-303", source: "stack-n2", target: "heap-303", label: "n2", color: "emerald" },
          { id: "top-to-302", source: "heap-301-top", target: "heap-302", label: "top", color: "purple" },
          { id: "n2next-to-302", source: "heap-303-next", target: "heap-302", label: "next", color: "purple" }
        ],
        spotlightStackVars: ["s", "n2"],
        spotlightHeapObjects: ["301", "303"],
        spotlightHeapFields: ["301-top", "303-next"],
        dataMovement: {
          from: "heap-301-top",
          to: "heap-303-next",
          value: "@302"
        },
        explanation: "We link them: we find our new node [Object 3], locate its next field, and copy the address of the current top node [Object 2] into it. Now [Object 3] links to [Object 2].",
        bananaDiagram: {
          type: "reference",
          title: "The Box Handshake",
          description: "CRITICAL: Connect the new node's next slot to the current top node [Object 2] first. If we updated the stack tracker first, we would lose the existing nodes!",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="130" y="15" width="50" height="30" fill="#1e293b" stroke="#3b82f6"/><text x="155" y="34" fill="#f8fafc" font-size="9" text-anchor="middle">New: 84</text><rect x="130" y="70" width="50" height="30" fill="#1e293b" stroke="#334155"/><text x="155" y="89" fill="#94a3b8" font-size="9" text-anchor="middle">Old: 42</text><path d="M 155 45 L 155 64" fill="none" stroke="#3b82f6" stroke-width="2"/><polygon points="155,68 151,60 159,60" fill="#3b82f6"/></svg>`
        }
      },
      {
        lineHighlight: 9,
        stack: [
          {
            methodName: "main(String[] args)",
            variables: [
              { name: "s", type: "MyStack", value: "@301", isReference: true },
              { name: "n1", type: "Node", value: "@302", isReference: true },
              { name: "n2", type: "Node", value: "@303", isReference: true }
            ]
          }
        ],
        heap: {
          "301": {
            id: "301",
            className: "MyStack",
            fields: [
              { name: "top", type: "Node", value: "@303", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 60,
            y: 75
          },
          "303": {
            id: "303",
            className: "Node",
            fields: [
              { name: "val", type: "int", value: "84", isReference: false },
              { name: "next", type: "Node", value: "@302", isReference: true }
            ],
            x: 60,
            y: 25
          }
        },
        arrows: [
          { id: "s-to-301", source: "stack-s", target: "heap-301", label: "s", color: "blue" },
          { id: "n1-to-302", source: "stack-n1", target: "heap-302", label: "n1", color: "purple" },
          { id: "n2-to-303", source: "stack-n2", target: "heap-303", label: "n2", color: "emerald" },
          { id: "top-to-303", source: "heap-301-top", target: "heap-303", label: "top", color: "emerald" },
          { id: "n2next-to-302", source: "heap-303-next", target: "heap-302", label: "next", color: "purple" }
        ],
        spotlightStackVars: ["s", "n2"],
        spotlightHeapObjects: ["301", "303"],
        spotlightHeapFields: ["301-top"],
        dataMovement: {
          from: "stack-n2",
          to: "heap-301-top",
          value: "@303"
        },
        explanation: "We update the top of the stack: we follow s to find [Object 1], and update its top field to point to [Object 3]. The stack top now points to [Object 3], which chains down to [Object 2].",
        bananaDiagram: {
          type: "reference",
          title: "Completing the Push",
          description: "Now we update our tracker to point to the new node [Object 3]. The stack now goes: top tracker -> node [Object 3] (84) -> node [Object 2] (42).",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="15" y="45" width="45" height="30" fill="#1e293b" stroke="#8b5cf6"/><text x="37" y="64" fill="#94a3b8" font-size="9" text-anchor="middle">s.top</text><path d="M 60 60 Q 90 25 125 30" fill="none" stroke="#8b5cf6" stroke-width="1.5"/><polygon points="130,32 122,26 122,34" fill="#8b5cf6"/><rect x="130" y="15" width="50" height="30" fill="#1e293b" stroke="#334155"/><text x="155" y="34" fill="#f8fafc" font-size="9" text-anchor="middle">Node 84</text><rect x="130" y="70" width="50" height="30" fill="#1e293b" stroke="#334155"/><text x="155" y="89" fill="#f8fafc" font-size="9" text-anchor="middle">Node 42</text><path d="M 155 45 L 155 64" stroke="#e2e8f0" stroke-width="1"/></svg>`
        }
      }
    ]
  }
};

// Preset-aware dynamic guided messages helper
function getWalkthroughMessage(presetId: string, step: number) {
  if (presetId === "linkedlist") {
    switch (step) {
      case 0:
        return "👋 Welcome! Let's trace how node linking works in memory. Click the Next Step button (arrow) below the code editor to begin.";
      case 1:
        return "Nice! Line 3 executed. Notice how local variable head was added to the Stack, pointing to [Object 1] in Object Storage (The Heap).";
      case 2:
        return "Line 4 executed. A new local variable temp was added to the Stack, pointing to a second node [Object 2].";
      case 3:
        return "Great! head.next = temp executed. The next field of [Object 1] now points to [Object 2], chaining the two nodes!";
      case 4:
        return "Success! val = head.val executed. The value 10 was followed from [Object 1] on the Heap and stored directly as a value on the Stack.";
      default:
        return "Tracing completed. Feel free to reset, edit code, or try another example preset!";
    }
  } else if (presetId === "arraylist") {
    switch (step) {
      case 0:
        return "👋 Welcome! Let's trace how a row of boxes (arrays) work in memory. Click the Next Step button on the bottom left to begin.";
      case 1:
        return "Great! Line 3 executed. Notice how a reference list appeared on the Stack pointing to a row of 3 slots [Object 1] in Object Storage.";
      case 2:
        return "Line 4 executed! We followed the reference list to find [Object 1] and wrote 5 into its first slot (index 0).";
      case 3:
        return "Line 5 executed! We wrote 10 into the second slot (index 1) of our array [Object 1].";
      case 4:
        return "Line 6 executed! A new variable size is added to the Stack to keep track of how many elements are in our list.";
      case 5:
        return "Line 8 executed! Since arrays cannot change size, we allocate a brand new, longer row of 6 slots [Object 2] at temp.";
      case 6:
        return "Line 9 executed! We copy the value 5 from index 0 of the old array [Object 1] to index 0 of the new array [Object 2].";
      default:
        return "ArrayList trace completed. Try stepping back or choosing another preset!";
    }
  } else if (presetId === "stack") {
    switch (step) {
      case 0:
        return "👋 Welcome! Let's trace how push operations work in a LIFO stack. Click the Next Step button on the bottom left to begin.";
      case 1:
        return "Line 3 executed. We create a stack tracker [Object 1] in Object Storage, pointing to null because it's empty.";
      case 2:
        return "Line 4 executed. A new node [Object 2] is created in Object Storage, holding the value 42.";
      case 3:
        return "Line 5 executed! The stack's top field of [Object 1] is updated to point to node [Object 2]. Now we have our first element in the stack.";
      case 4:
        return "Line 7 executed. A second node [Object 3] is created in Object Storage, holding the value 84.";
      case 5:
        return "Line 8 executed! We point [Object 3]'s next field to the current stack top [Object 2]. This preserves the old stack.";
      case 6:
        return "Line 9 executed! We update stack top field to point to [Object 3]. Node [Object 3] is now the new top, pointing down to [Object 2].";
      default:
        return "Stack trace completed. Feel free to explore how memory updates!";
    }
  }
  return "Step through the simulation to watch variable cards and memory boxes update dynamically.";
}

/* ─── HomePage Layout ───────────────────────────────────────────────────── */
export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftW, setLeftW]   = useState(540); // px
  const [rightW, setRightW] = useState(360); // px

  const [presetId, setPresetId]       = useState<string>("linkedlist");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying]     = useState<boolean>(false);
  const [typedCode, setTypedCode]     = useState<string>("");

  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-start tour for first-time visitors
  useEffect(() => {
    const hasSeen = localStorage.getItem("has_seen_onboarding");
    if (hasSeen !== "true") {
      setIsTourOpen(true);
    }
  }, []);

  const activePreset = SIMULATION_PRESETS[presetId] || SIMULATION_PRESETS.linkedlist;
  const currentStepData = activePreset.steps[currentStep] || activePreset.steps[0];
  const totalSteps = activePreset.steps.length;

  // Handle auto-playback loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500); // Give plenty of time to view slide transitions
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, totalSteps]);

  // Sync typed code with preset selection
  useEffect(() => {
    setTypedCode(activePreset.code);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [presetId, activePreset.code]);

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  const handleLeftDrag = useCallback((dx: number) => {
    setLeftW(w => clamp(w + dx, 280, 680));
  }, []);

  const handleRightDrag = useCallback((dx: number) => {
    setRightW(w => clamp(w - dx, 280, 640));
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
  }, [totalSteps]);

  const handleRun = useCallback(() => {
    // Restart animation walk from the beginning
    setCurrentStep(0);
    setIsPlaying(true);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-slate-950 text-slate-100 font-sans">
      {/* Top Bar Header */}
      <TopBar onStartTour={() => setIsTourOpen(true)} />

      {/* State-Driven Walkthrough Banner */}
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-slate-850 px-5 py-2.5 flex items-center justify-between text-xs text-slate-300 font-medium z-20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Guided Walkthrough</span>
          <span className="text-slate-700 font-normal">|</span>
          <p className="text-slate-200 font-sans tracking-wide leading-relaxed">
            {getWalkthroughMessage(presetId, currentStep)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-purple text-[9.5px] font-semibold py-0.5">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden relative">
        
        {/* Left Panel: Monaco Code Editor */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{ width: leftW, borderRight: "1px solid var(--border)" }}
        >
          <CodeEditorPanel
            code={typedCode}
            onChange={setTypedCode}
            activeLine={currentStepData.lineHighlight}
            presetId={presetId}
            onPresetChange={setPresetId}
            presets={Object.values(SIMULATION_PRESETS)}
            currentStep={currentStep}
            totalSteps={totalSteps}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onStepBack={handleStepBack}
            onStepForward={handleStepForward}
            onReset={handleReset}
            onRun={handleRun}
          />
        </div>

        {/* Column Resizer (Left) */}
        <Resizer onDrag={handleLeftDrag} />

        {/* Center Panel: Memory & Execution View */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative bg-slate-950 canvas-bg">
          <MemoryExecutionView
            stack={currentStepData.stack}
            heap={currentStepData.heap}
            arrows={currentStepData.arrows}
            currentStep={currentStep}
            totalSteps={totalSteps}
            spotlightStackVars={currentStepData.spotlightStackVars}
            spotlightHeapObjects={currentStepData.spotlightHeapObjects}
            spotlightHeapFields={currentStepData.spotlightHeapFields}
            dataMovement={currentStepData.dataMovement}
            hoveredElement={hoveredElement}
          />
        </div>

        {/* Column Resizer (Right) */}
        <Resizer onDrag={handleRightDrag} />

        {/* Right Panel: AI conversational Tutor Panel */}
        <div
          id="onboarding-tutor-panel"
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{ width: rightW, borderLeft: "1px solid var(--border)" }}
        >
          <AiExplanationPanel
            explanation={currentStepData.explanation}
            diagram={currentStepData.bananaDiagram}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onHoverElement={setHoveredElement}
            presetId={presetId}
          />
        </div>
      </div>

      {/* Onboarding Tour Component */}
      <OnboardingTour isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

      {/* Footer Status Indicators */}
      <footer
        className="flex items-center justify-between px-5 flex-shrink-0 border-t"
        style={{
          height: 28,
          borderColor: "var(--border)",
          background: "var(--bg-panel)",
          fontSize: 11,
          color: "var(--text-secondary)"
        }}
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Workspace Active: <strong>Java Mode</strong>
          </span>
          <span style={{ opacity: 0.2 }}>|</span>
          <span>Pedagogical Memory Visualizer v2.0</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span>Next.js 15 App Router</span>
          <span style={{ opacity: 0.2 }}>|</span>
          <span>UR²PhD CS Education Research</span>
        </div>
      </footer>
    </div>
  );
}
