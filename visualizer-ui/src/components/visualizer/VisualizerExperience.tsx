"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Check, ChevronDown, Compass } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import AiExplanationPanel from "@/components/AiExplanationPanel";
import OnboardingTour from "@/components/OnboardingTour";
import InteractiveWalkthrough from "@/components/InteractiveWalkthrough";
import PostLessonExplorerModal from "@/components/visualizer/PostLessonExplorerModal";
import {
  LESSON_PRESET_ID,
  SWITCHABLE_PRESET_IDS,
  SHOW_PRESET_SELECTOR,
  TRACE_REQUEST_TIMEOUT_MS,
  hasGuidedWalkthrough,
  showPostLessonTools,
} from "@/lib/studyConfig";
import type { RunState } from "@/components/CodeEditorPanel";
import type { BananaDiagram, ActiveBlock, ExecutionStep, Preset } from "@/types/visualizer";

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
/* Type definitions live in @/types/visualizer. The preset fixture data below
 * is intentionally kept in this file, unchanged, to avoid a risky move of ~900
 * lines of hand-authored step data. See docs/HARNESS.md for the recommended
 * follow-up extraction into src/data. */

const LIVE_TRACE_BANANA: BananaDiagram = {
  type: "variable",
  title: "Real JDI Trace",
  description: "Each step is a verified snapshot from java_jail's JDI tracer, showing the actual JVM state as Sample.java ran on this machine.",
  svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="15" y="18" width="170" height="84" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/><text x="100" y="46" fill="#475569" font-size="9" text-anchor="middle" font-family="monospace">java_jail JDI tracer</text><text x="100" y="63" fill="#3b82f6" font-size="11" text-anchor="middle" font-weight="bold">sample_trace.json</text><text x="100" y="80" fill="#475569" font-size="9" text-anchor="middle">11 real steps · 2 methods</text></svg>`
};
const LT_MAIN: ActiveBlock = { label: "method main()", beginLine: 2, endLine: 7 };
const LT_MUL:  ActiveBlock = { label: "method multiply()", beginLine: 9, endLine: 11 };

const SIMULATION_PRESETS: Record<string, Preset> = {
  linkedlist: {
    id: "linkedlist",
    name: "Linked List: Insertion & Linking",
    code: `public class LinkedListDemo {
    public static void main(String[] args) {
        Node head = new Node(10);
        Node temp = new Node(20);
        head.next = temp;
        int value = head.value;
    }
}

class Node {
    int value;
    Node next;
    Node(int value) {
        this.value = value;
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
              { name: "value", type: "int", value: "10", isReference: false },
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
        spotlightHeapFields: ["101-value"],
        callouts: [
          {
            target: "stack-head",
            title: "Reference variable",
            body: "head does not store the whole Node. It stores an address tag that points to [Object 1] in the Heap.",
            tone: "blue"
          },
          {
            target: "heap-101-value",
            title: "Value inside the object",
            body: "This Node has its own value field. The number 10 is stored inside the Heap object.",
            tone: "green"
          },
          {
            target: "heap-101-next",
            title: "No next node yet",
            body: "null means this next field is not pointing to another Node right now.",
            tone: "amber"
          }
        ],
        explanation: "We just created a new Node object, which we'll call [Object 1], in our Object Storage (The Heap). The variable head on the Stack now holds a remote control pointing to [Object 1]. The node contains value 10, and its next slot is currently empty (null).",
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
              { name: "value", type: "int", value: "10", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "102": {
            id: "102",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "20", isReference: false },
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
        spotlightHeapFields: ["102-value"],
        callouts: [
          {
            target: "stack-head",
            title: "Still points to Object 1",
            body: "head keeps pointing to the first Node. Creating temp did not move or copy Object 1.",
            tone: "blue"
          },
          {
            target: "stack-temp",
            title: "Second reference variable",
            body: "temp is another address tag on the Stack. It points to [Object 2].",
            tone: "purple"
          },
          {
            target: "heap-102-value",
            title: "Value in Object 2",
            body: "This separate Node stores 20 in its value field. It is a different object from the Node holding 10.",
            tone: "green"
          }
        ],
        explanation: "We create a second Node object, which we'll call [Object 2], in our Object Storage with value 20. A new variable temp is added to the Stack, holding a matching remote control pointing to [Object 2].",
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
              { name: "value", type: "int", value: "10", isReference: false },
              { name: "next", type: "Node", value: "@102", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "102": {
            id: "102",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "20", isReference: false },
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
        callouts: [
          {
            target: "stack-temp",
            title: "What gets copied",
            body: "The object is not copied. Only temp's address tag, [Object 2], is copied.",
            tone: "purple"
          },
          {
            target: "heap-101-next",
            title: "The link field",
            body: "Object 1's next field now points to [Object 2]. This is what connects the two Nodes into a chain.",
            tone: "amber"
          },
          {
            target: "heap-102-value",
            title: "End of the chain for now",
            body: "Object 2 still has next = null, so the list stops here.",
            tone: "green"
          }
        ],
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
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="20" y="45" width="50" height="30" rx="4" fill="#1e293b" stroke="#3b82f6"/><text x="45" y="63" fill="#f8fafc" font-size="9" text-anchor="middle">value: 10</text><line x1="70" y1="45" x2="70" y2="75" stroke="#3b82f6"/><rect x="130" y="45" width="50" height="30" rx="4" fill="#1e293b" stroke="#8b5cf6"/><text x="155" y="63" fill="#f8fafc" font-size="9" text-anchor="middle">value: 20</text><path d="M 60 60 L 122 60" fill="none" stroke="#3b82f6" stroke-width="2"/><polygon points="128,60 120,56 120,64" fill="#3b82f6"/></svg>`
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
              { name: "value", type: "int", value: "10", isReference: false }
            ]
          }
        ],
        heap: {
          "101": {
            id: "101",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "10", isReference: false },
              { name: "next", type: "Node", value: "@102", isReference: true }
            ],
            x: 20,
            y: 20
          },
          "102": {
            id: "102",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "20", isReference: false },
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
        spotlightStackVars: ["value", "head"],
        spotlightHeapObjects: ["101"],
        spotlightHeapFields: ["101-value"],
        callouts: [
          {
            target: "stack-head",
            title: "Follow head first",
            body: "For head.value, Java first follows head's address tag to [Object 1] in the Heap.",
            tone: "blue"
          },
          {
            target: "heap-101-value",
            title: "Read this Heap value",
            body: "Inside [Object 1], the value field stores 10. This is the value Java reads.",
            tone: "green"
          },
          {
            target: "stack-value",
            title: "Copied onto the Stack",
            body: "The new local variable value stores the number 10 directly. It does not point to an object.",
            tone: "amber"
          },
          {
            target: "heap-101-next",
            title: "Reference still points onward",
            body: "next still points to [Object 2]. Reading head.value does not change the linked list.",
            tone: "purple"
          }
        ],
        dataMovement: {
          from: "heap-101-value",
          to: "stack-value",
          value: "10"
        },
        explanation: "We read the value: int value = head.value. We follow the remote control held by head to find [Object 1] in Object Storage, grab the number 10 from its value field, and copy it directly into a new local variable value on the Stack.",
        bananaDiagram: {
          type: "dereference",
          title: "Following the Reference",
          description: "Following a reference pointer means going to that specific object in Object Storage to read or edit what's inside.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><circle cx="40" cy="60" r="16" fill="#3b82f622" stroke="#3b82f6"/><text x="40" y="63" fill="#f8fafc" font-size="9" font-weight="bold" text-anchor="middle">head</text><path d="M 58 60 L 120 60" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="2,2"/><polygon points="126,60 118,56 118,64" fill="#3b82f6"/><rect x="128" y="40" width="50" height="40" rx="4" fill="#1e293b" stroke="#3b82f6"/><text x="153" y="58" fill="#e2e8f0" font-size="8" text-anchor="middle">Node [Object 1]</text><text x="153" y="71" fill="#10b981" font-size="8" font-weight="bold" text-anchor="middle">value = 10</text></svg>`
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
        /*
         * The literal travels from the reference that was followed to reach the
         * array, so the value is seen arriving in the slot rather than simply
         * appearing there. This mirrors the wording of the explanation below.
         */
        dataMovement: {
          from: "stack-list",
          to: "heap-201-0",
          value: "5"
        },
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
        dataMovement: {
          from: "stack-list",
          to: "heap-201-1",
          value: "10"
        },
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
    int value;
    Node next;
    Node(int value) { this.value = value; }
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
              { name: "value", type: "int", value: "42", isReference: false },
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
        spotlightHeapFields: ["302-value"],
        explanation: "We create a Node object, which we'll call [Object 2], in Object Storage holding the value 42. The variable n1 on the Stack holds the remote control pointing to [Object 2].",
        bananaDiagram: {
          type: "reference",
          title: "Preparing a New Box",
          description: "Before putting a node on the stack, we create it in Object Storage with the number 42 inside, pointing to no other nodes.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="120" y="40" width="60" height="40" rx="4" fill="#1e293b" stroke="#334155"/><text x="150" y="58" fill="#e2e8f0" font-size="8" text-anchor="middle">Node [Object 2]</text><text x="150" y="70" fill="#94a3b8" font-size="8" text-anchor="middle">value: 42</text></svg>`
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
              { name: "value", type: "int", value: "42", isReference: false },
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
            y: 8
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 62,
            y: 38
          },
          "303": {
            id: "303",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "84", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 20,
            y: 58
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
        spotlightHeapFields: ["303-value"],
        explanation: "We create a second Node object, which we'll call [Object 3], in Object Storage holding the value 84. The variable n2 on the Stack holds the remote control pointing to [Object 3].",
        bananaDiagram: {
          type: "reference",
          title: "Preparing the Next Box",
          description: "We build a second node [Object 3] containing 84 in Object Storage. It is not yet connected to our stack.",
          svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="120" y="40" width="60" height="40" rx="4" fill="#1e293b" stroke="#334155"/><text x="150" y="58" fill="#e2e8f0" font-size="8" text-anchor="middle">Node [Object 3]</text><text x="150" y="70" fill="#10b981" font-size="8" text-anchor="middle">value: 84</text></svg>`
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
            y: 8
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 62,
            y: 38
          },
          "303": {
            id: "303",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "84", isReference: false },
              { name: "next", type: "Node", value: "@302", isReference: true }
            ],
            x: 20,
            y: 58
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
            y: 8
          },
          "302": {
            id: "302",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "42", isReference: false },
              { name: "next", type: "Node", value: "null", isReference: true }
            ],
            x: 62,
            y: 38
          },
          "303": {
            id: "303",
            className: "Node",
            fields: [
              { name: "value", type: "int", value: "84", isReference: false },
              { name: "next", type: "Node", value: "@302", isReference: true }
            ],
            x: 20,
            y: 58
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
  },
  livetrace: {
    id: "livetrace",
    name: "Live Trace: multiply(5, 10)",
    code: `public class Sample {
    public static void main(String[] args) {
        int x = 5;
        int y = 10;
        int result = multiply(x, y);
        System.out.println("Result = " + result);
    }

    public static int multiply(int a, int b) {
        return a * b;
    }
}`,
    steps: [
      // [0] call line=3, entering main
      { lineHighlight: 3, stack: [{ methodName: "main(String[] args)", variables: [] }], heap: {}, arrows: [], spotlightStackVars: [], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "", activeBlock: LT_MAIN, explanation: "Entering main(). A new stack frame is created. No local variables exist yet.", bananaDiagram: LIVE_TRACE_BANANA },
      // [2] step_line line=4, x=5 assigned
      { lineHighlight: 3, stack: [{ methodName: "main(String[] args)", variables: [{ name: "x", type: "int", value: "5", isReference: false }] }], heap: {}, arrows: [], spotlightStackVars: ["x"], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "", activeBlock: LT_MAIN, explanation: "int x = 5 executed. x appears on main's stack frame with value 5.", bananaDiagram: LIVE_TRACE_BANANA },
      // [3] step_line line=5, y=10 assigned, about to call multiply
      { lineHighlight: 4, stack: [{ methodName: "main(String[] args)", variables: [{ name: "x", type: "int", value: "5", isReference: false }, { name: "y", type: "int", value: "10", isReference: false }] }], heap: {}, arrows: [], spotlightStackVars: ["y"], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "", activeBlock: LT_MAIN, explanation: "int y = 10 executed. y added to main's frame. Line 5 calls multiply(x, y), so a new frame is about to be pushed.", bananaDiagram: LIVE_TRACE_BANANA },
      // [4] call line=10, entering multiply, two frames
      { lineHighlight: 5, stack: [{ methodName: "multiply(int a, int b)", variables: [{ name: "a", type: "int", value: "5", isReference: false }, { name: "b", type: "int", value: "10", isReference: false }] }, { methodName: "main(String[] args)", variables: [{ name: "x", type: "int", value: "5", isReference: false }, { name: "y", type: "int", value: "10", isReference: false }] }], heap: {}, arrows: [], spotlightStackVars: ["a", "b"], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "", activeBlock: LT_MUL, explanation: "multiply(5, 10) called, so a second stack frame is pushed on top. Parameters a=5 and b=10 are local to multiply().", bananaDiagram: LIVE_TRACE_BANANA },
      // [5] step_line line=10, inside multiply
      { lineHighlight: 10, stack: [{ methodName: "multiply(int a, int b)", variables: [{ name: "a", type: "int", value: "5", isReference: false }, { name: "b", type: "int", value: "10", isReference: false }], calculation: { expression: "a (5) × b (10)", result: "50" } }, { methodName: "main(String[] args)", variables: [{ name: "x", type: "int", value: "5", isReference: false }, { name: "y", type: "int", value: "10", isReference: false }] }], heap: {}, arrows: [], spotlightStackVars: [], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "", activeBlock: LT_MUL, explanation: "Executing: return a * b → 5 × 10 = 50. The multiply frame is about to pop.", bananaDiagram: LIVE_TRACE_BANANA },
      // [6] return line=10, multiply returning 50
      { lineHighlight: 10, stack: [{ methodName: "multiply(int a, int b)", variables: [{ name: "a", type: "int", value: "5", isReference: false }, { name: "b", type: "int", value: "10", isReference: false }, { name: "return value", type: "int", value: "50", isReference: false }] }, { methodName: "main(String[] args)", variables: [{ name: "x", type: "int", value: "5", isReference: false }, { name: "y", type: "int", value: "10", isReference: false }] }], heap: {}, arrows: [], spotlightStackVars: ["return value"], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "", activeBlock: LT_MUL, explanation: "multiply() returns 50. The frame will be popped, and main() receives the return value and will assign it to result.", bananaDiagram: LIVE_TRACE_BANANA },
      // [8] step_line line=6, result=50 assigned
      { lineHighlight: 5, stack: [{ methodName: "main(String[] args)", variables: [{ name: "x", type: "int", value: "5", isReference: false }, { name: "y", type: "int", value: "10", isReference: false }, { name: "result", type: "int", value: "50", isReference: false }] }], heap: {}, arrows: [], spotlightStackVars: ["result"], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "", activeBlock: LT_MAIN, explanation: "result = 50 assigned on main's stack frame. About to call System.out.println.", bananaDiagram: LIVE_TRACE_BANANA },
      // [9] step_line line=7, println ran, stdout = "Result = 50"
      { lineHighlight: 6, stack: [{ methodName: "main(String[] args)", variables: [{ name: "x", type: "int", value: "5", isReference: false }, { name: "y", type: "int", value: "10", isReference: false }, { name: "result", type: "int", value: "50", isReference: false }] }], heap: {}, arrows: [], spotlightStackVars: [], spotlightHeapObjects: [], spotlightHeapFields: [], stdout: "Result = 50", activeBlock: LT_MAIN, explanation: "System.out.println(\"Result = \" + result) printed \"Result = 50\" to stdout.", bananaDiagram: LIVE_TRACE_BANANA },
    ]
  }
};

// Preset-aware dynamic guided messages helper
function getWalkthroughMessage(presetId: string, step: number) {
  if (presetId === "linkedlist") {
    switch (step) {
      case 0:
        return "Entered main(). No variables or objects have been created yet.";
      case 1:
        return "Created a Node with value 10. head now points to it.";
      case 2:
        return "Created a second Node with value 20. temp points to it.";
      case 3:
        return "Changed head.next from null to the same Node referenced by temp.";
      case 4:
        return "Read head.value and stored the value 10 in a new variable named value.";
      default:
        return "Tracing completed. Feel free to reset, edit code, or try another example preset!";
    }
  } else if (presetId === "arraylist") {
    switch (step) {
      case 0:
        return "Welcome. Start by reading the code, then use the Next Step button on the bottom left to trace one line at a time.";
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
        return "Welcome. Start by reading the code, then use the Next Step button on the bottom left to trace one line at a time.";
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
  } else if (presetId === "livetrace") {
    switch (step) {
      case 0: return "Java entered main(). Its stack frame is ready, but no local variables have been created yet.";
      case 1: return "Line 3 created the integer x and stored 5 directly in main's stack frame.";
      case 2: return "Line 4 created the integer y beside x and stored 10 in it.";
      case 3: return "Line 5 called multiply. Java copied x and y into parameters a and b in a new multiply stack frame.";
      case 4: return "Line 10 evaluated a * b as 5 * 10, producing the integer 50.";
      case 5: return "Line 10 returned 50. The multiply frame is about to be removed because that method is finished.";
      case 6: return "Execution resumed on line 5 in main. The returned 50 was stored in a new integer named result.";
      case 7: return "Line 6 printed 'Result = 50' to the output panel. The visible program is now complete.";
      default: return "Live trace complete.";
    }
  }
  return "Step through the simulation to watch variable cards and memory boxes update dynamically.";
}

/* ─── AI Explanation Seam ───────────────────────────────────────────────────
 * SEAM: real Gemini explanations plug in HERE and nowhere else.
 * Today the tutor panel is scripted: the explanation shown for a step is simply
      case 1:
        return "Nice! Line 3 executed. Notice how local variable head was added to the Stack, pointing to [Object 1] in Object Storage (The Heap).";
      case 2:
        return "Line 4 executed. A new local variable temp was added to the Stack, pointing to a second node [Object 2].";
      case 3:
        return "Great! head.next = temp executed. The next field of [Object 1] now points to [Object 2], chaining the two nodes!";
      case 4:
        return "Success! value = head.value executed. The value 10 was followed from [Object 1] on the Heap and stored directly as a value on the Stack.";
      default:
        return "Tracing completed. Feel free to reset, edit code, or try another example preset!";
    }
  } else if (presetId === "arraylist") {
    switch (step) {
      case 0:
        return "Welcome. Start by reading the code, then use the Next Step button on the bottom left to trace one line at a time.";
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
        return "Welcome. Start by reading the code, then use the Next Step button on the bottom left to trace one line at a time.";
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
  } else if (presetId === "livetrace") {
    switch (step) {
      case 0: return "Real trace from java_jail, entering main(). Step forward to watch variables appear on the stack.";
      case 1: return "Positioned at line 3, about to assign x = 5.";
      case 2: return "x = 5 added to main's stack frame.";
      case 3: return "y = 10 added. Next: multiply() will be called, pushing a second frame.";
      case 4: return "multiply(5, 10) called, and a second stack frame appears with parameters a=5 and b=10.";
      case 5: return "Inside multiply(), about to compute return a * b = 50.";
      case 6: return "multiply() returns 50. See the return value on the frame before it is popped.";
      case 7: return "Back in main(). multiply's frame was popped. Return value 50 is being assigned to result...";
      case 8: return "result = 50 assigned. About to print.";
      case 9: return "System.out.println ran, so 'Result = 50' appears in the stdout panel below.";
      case 10: return "main() returns void. Execution complete. This trace came directly from sample_trace.json.";
      default: return "Live trace complete.";
    }
  }
  return "Step through the simulation to watch variable cards and memory boxes update dynamically.";
}

/* ─── AI Explanation Seam ───────────────────────────────────────────────────
 * SEAM: real Gemini explanations plug in HERE and nowhere else.
 * Today the tutor panel is scripted: the explanation shown for a step is simply
 * the preset's static `explanation` string. When live AI is wired up later,
 * replace the body of this function (e.g. fetch a generated explanation for the
 * given preset + step) without touching the rest of the visualizer. The
 * participant-facing "Gemini" labeling is intentionally left unchanged for now.
 */
function resolveStepExplanation(
  presetId: string,
  step: number,
  fallbackExplanation: string,
): string {
  // TODO(ai-seam): swap this for a real generated explanation source.
  void presetId;
  void step;
  return fallbackExplanation;
}

function getWhyItMatters(presetId: string, step: number, fallback: string): string {
  if (presetId !== "linkedlist") return fallback;

  return [
    "Java begins running this example inside the main method.",
    "head stores a reference to the Node; it does not contain the Node itself.",
    "Each new expression creates a separate object in memory.",
    "Assigning a reference connects the first Node to the second Node.",
    "Reading a field copies its value without changing the object.",
  ][step] ?? fallback;
}

/* ─── Running the participant's own code ─────────────────────────────────────
 * The tracer lives behind POST /api/trace and is owned elsewhere. Everything
 * here is written against its published contract and nothing else:
 *   200 { ok: true, preset }
 *   200 { ok: false, kind, error }   kind: compile | runtime | limit | config | internal
 *   403                              execution disabled
 * Anything outside that, including the endpoint not existing yet, falls through
 * to a plain message rather than an endless spinner.
 */

const CUSTOM_CODE_DIAGRAM: BananaDiagram = {
  type: "variable",
  title: "Your program",
  description:
    "This trace came from the Java you wrote. Each step is one line of your program, with the variables and objects it left in memory.",
  svgMarkup: `<svg viewBox="0 0 200 120" class="w-full h-full"><rect x="15" y="20" width="170" height="80" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/><text x="100" y="55" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="monospace">your code</text><text x="100" y="74" fill="#3b82f6" font-size="10" text-anchor="middle">traced line by line</text></svg>`,
};

interface RunFailureCopy {
  title: string;
  detail?: string;
  verbatim?: string;
}

/*
 * A compile error message is the single most useful thing a student can see, so
 * the server's text is passed through verbatim and in full. The surrounding
 * copy only says calmly whose problem it is and what to do next.
 */
function describeTraceFailure(kind: string, error?: string): RunFailureCopy {
  const verbatim = error && error.trim() ? error : undefined;

  switch (kind) {
    case "compile":
      return {
        title: "Your code did not compile.",
        detail: "Java stopped before running anything. The message below is exactly what the compiler said, and it usually names the line to fix.",
        verbatim,
      };
    case "runtime":
      return {
        title: "Your code compiled, but it stopped while running.",
        detail: "Java started your program and then hit an error partway through. Here is exactly what Java reported.",
        verbatim,
      };
    case "limit":
      return {
        title: "Your program was too big to trace.",
        detail: "This usually means a loop that never ends, or a program with far more steps than the visualizer can show. Try a shorter program.",
        verbatim,
      };
    case "config":
      return {
        title: "The code runner is not set up on this machine yet.",
        detail: "That is a setup problem on our side, not a mistake in your code. You can still switch between the built-in examples and step through them.",
        verbatim,
      };
    default:
      return {
        title: "Something went wrong while running your code.",
        detail: "That is a problem on our side, not a mistake in your code. Try running it again.",
        verbatim,
      };
  }
}

/*
 * Fill in the fields the visualizer panels always read. A traced step legitimately
 * has no teaching diagram attached, and the explanation panel requires one, so a
 * neutral diagram stands in rather than letting the panel crash.
 */
function normalizeTracedPreset(preset: Preset): Preset {
  return {
    ...preset,
    steps: preset.steps.map((step: ExecutionStep) => ({
      ...step,
      arrows: step.arrows ?? [],
      heap: step.heap ?? {},
      stack: step.stack ?? [],
      explanation: step.explanation ?? "",
      bananaDiagram: step.bananaDiagram ?? CUSTOM_CODE_DIAGRAM,
    })),
  };
}

function looksLikePreset(value: unknown): value is Preset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Preset>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.code === "string" &&
    Array.isArray(candidate.steps) &&
    candidate.steps.length > 0
  );
}

export type LessonPhase = "intro" | "ready" | "result" | "complete";

const LESSON_STEP_TITLES: Record<string, string[]> = {
  linkedlist: ["Create the first Node", "Create the second Node", "Link the Nodes", "Read a field"],
  arraylist: ["Create the array", "Write the first value", "Write the second value", "Track the size", "Create a larger array", "Copy a value"],
  stack: ["Create the stack", "Create the first Node", "Set the first top", "Create the second Node", "Preserve the old top", "Set the new top"],
  livetrace: ["Assign x", "Assign y", "Call multiply", "Compute 5 x 10", "Return 50", "Store result", "Print output"],
};

const LESSON_GOALS: Record<string, string> = {
  linkedlist: "Follow four Java lines to see how two Node objects are created, connected, and read.",
  arraylist: "Follow Java as it creates an array, stores values, and grows its storage.",
  stack: "Follow each reference change that builds a last-in, first-out stack.",
  livetrace: "Follow a real JVM trace through variables, a method call, a return value, and output.",
};

const LESSON_VISUALS: Record<string, { src: string; alt: string }> = {
  linkedlist: {
    src: "/lesson-visuals/linked-list.svg",
    alt: "A head reference pointing to a Node containing 10, which links to a Node containing 20 and then null.",
  },
  arraylist: {
    src: "/lesson-visuals/array-resize.svg",
    alt: "Values 5 and 10 being copied from a three-slot array into a new six-slot array.",
  },
  stack: {
    src: "/lesson-visuals/stack-lifo.svg",
    alt: "The value 84 being pushed above 42 at the top of a last-in, first-out stack.",
  },
  livetrace: {
    src: "/lesson-visuals/method-trace.svg",
    alt: "The main method calling multiply with 5 and 10, and multiply returning 50.",
  },
};

interface LessonSummaryContent {
  overview: string;
  finalState: string;
  keyRule: string;
  codeStory: Array<{ code: string; explanation: string }>;
  visualGuide: Array<{ label: string; explanation: string }>;
}

const SUMMARY_JAVA_KEYWORDS = new Set([
  "boolean", "char", "class", "double", "false", "float", "int", "long",
  "new", "null", "return", "short", "static", "this", "true", "void",
]);

/* Lightweight Java highlighting for the small summary snippets. Loading a
 * second Monaco editor here would be much heavier than the few tokens need.
 * These colors mirror the editor's dark Java theme. */
function SummaryJavaCode({ code }: { code: string }) {
  const tokens = code.split(/(\s+|"(?:\\.|[^"\\])*"|\b\d+\b|[A-Za-z_$][\w$]*|.)/g);

  return (
    <code>
      {tokens.map((token, index) => {
        if (!token) return null;
        let color = "#d4d4d4";
        if (SUMMARY_JAVA_KEYWORDS.has(token)) color = "#569cd6";
        else if (/^[A-Z][\w$]*$/.test(token)) color = "#4ec9b0";
        else if (/^\d+$/.test(token)) color = "#b5cea8";
        else if (token.startsWith('"')) color = "#ce9178";

        return <span key={`${index}-${token}`} style={{ color }}>{token}</span>;
      })}
    </code>
  );
}

const LESSON_SUMMARIES: Record<string, LessonSummaryContent> = {
  linkedlist: {
    overview: "This program creates two separate Node objects, connects them into a chain, and reads a value from the first Node. The variables point to the objects; they do not contain the objects themselves.",
    finalState: "head → Node(10) → Node(20) → null, and value = 10.",
    keyRule: "Object variables and next fields copy references. An int variable copies the number itself.",
    codeStory: [
      { code: "Node head = new Node(10);", explanation: "Create the first Node; head points to it." },
      { code: "Node temp = new Node(20);", explanation: "Create a second Node; temp points to it." },
      { code: "head.next = temp;", explanation: "Connect the first Node to the second Node." },
      { code: "int value = head.value;", explanation: "Copy 10 from the first Node into value." },
    ],
    visualGuide: [
      { label: "Variables", explanation: "head and temp hold object references; value directly holds 10." },
      { label: "Memory objects", explanation: "Each Node card is a separate object with its own value and next fields." },
      { label: "Arrows", explanation: "An arrow shows which object a reference points to." },
    ],
  },
  arraylist: {
    overview: "A Java array has numbered slots and a fixed length. This program stores two values, tracks how many are in use, and starts resizing by creating larger storage and copying a value into it.",
    finalState: "list → [5, 10, 0], temp → [5, 0, 0, 0, 0, 0], and size = 2.",
    keyRule: "An array cannot grow in place. Resizing means creating new storage and copying the existing values into it.",
    codeStory: [
      { code: "int[] list = new int[3];", explanation: "Create three slots, all starting at 0." },
      { code: "list[0] = 5;  list[1] = 10;", explanation: "Store values at indexes 0 and 1." },
      { code: "int size = 2;", explanation: "Record that two slots contain list values." },
      { code: "int[] temp = new int[6];", explanation: "Create a separate, larger array." },
      { code: "temp[0] = list[0];", explanation: "Copy 5 into the new storage." },
    ],
    visualGuide: [
      { label: "Variables", explanation: "list and temp point to different arrays; size directly holds 2." },
      { label: "Indexed slots", explanation: "Each box is one slot. Array indexes begin at 0." },
      { label: "Changed marker", explanation: "Green identifies the slot updated by the current line." },
    ],
  },
  stack: {
    overview: "This program pushes two values onto a linked stack. Each push places a new Node at the top while keeping a link to the older Node underneath it.",
    finalState: "s.top → Node(84) → Node(42) → null. The next value removed would be 84.",
    keyRule: "Link the new Node to the old top before moving top. A stack is last in, first out (LIFO).",
    codeStory: [
      { code: "MyStack s = new MyStack();", explanation: "Create an empty stack with top = null." },
      { code: "Node n1 = new Node(42);  s.top = n1;", explanation: "Make 42 the first top value." },
      { code: "Node n2 = new Node(84);", explanation: "Create the next Node to push." },
      { code: "n2.next = s.top;", explanation: "Link 84 to the previous top, 42." },
      { code: "s.top = n2;", explanation: "Move top to 84 and finish the push." },
    ],
    visualGuide: [
      { label: "Variables", explanation: "s, n1, and n2 hold references to objects." },
      { label: "Top field", explanation: "top identifies the newest Node in the stack." },
      { label: "Next arrows", explanation: "Following next moves from newer Nodes to older Nodes." },
    ],
  },
  livetrace: {
    overview: "This program calls multiply(5, 10). Java temporarily adds a multiply stack frame, computes 50, returns that value to main, and prints the result.",
    finalState: "multiply is finished; main has x = 5, y = 10, result = 50, and output “Result = 50”.",
    keyRule: "Each method call gets its own temporary stack frame. Primitive arguments and return values are copied between frames.",
    codeStory: [
      { code: "int x = 5;  int y = 10;", explanation: "Store 5 and 10 in main's frame." },
      { code: "multiply(x, y)", explanation: "Open a new frame with a = 5 and b = 10." },
      { code: "return a * b;", explanation: "Compute and return 50." },
      { code: "int result = multiply(x, y);", explanation: "Remove multiply's frame and store 50 in main." },
      { code: "System.out.println(...);", explanation: "Print Result = 50." },
    ],
    visualGuide: [
      { label: "Stack frames", explanation: "The top card is the method currently running." },
      { label: "Return value", explanation: "50 moves from multiply back into main." },
      { label: "Object area", explanation: "It stays empty because this example creates no objects." },
      { label: "Output", explanation: "stdout shows text printed by System.out.println." },
    ],
  },
};

function getLessonStepTitle(presetId: string, lessonStep: number): string {
  return LESSON_STEP_TITLES[presetId]?.[lessonStep - 1] ?? `Program step ${lessonStep}`;
}

function getReadyPrompt(presetId: string, lessonStep: number): string {
  if (presetId === "linkedlist") {
    return [
      "Watch for a new variable, a new Node, and the arrow connecting them.",
      "Watch for a second variable and a separate Node object.",
      "Watch the next field change from null to a reference arrow.",
      "Watch Java copy 10 from the first Node into the variable value.",
    ][lessonStep - 1] ?? "Watch the memory view for the marked change.";
  }
  return "Watch the Variables and Objects areas for the marked change.";
}

function LessonProgress({ presetId, current, total, phase }: { presetId: string; current: number; total: number; phase: LessonPhase }) {
  return (
    <ol id="onboarding-lesson-progress" className="lesson-progress" aria-label="Lesson progress">
      {Array.from({ length: total }, (_, index) => {
        const step = index + 1;
        const state = step < current || phase === "complete" ? "done" : step === current ? "active" : "upcoming";
        return (
          <li key={step} className={`lesson-progress-item lesson-progress-${state}`} aria-current={state === "active" ? "step" : undefined}>
            <span className="lesson-progress-number">{state === "done" ? "✓" : step}</span>
            <span className="lesson-progress-title">{getLessonStepTitle(presetId, step)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function LessonCustomDropdown({
  preset,
  presets,
  onPresetChange,
}: {
  preset: Preset;
  presets: Preset[];
  onPresetChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-3 min-w-[320px] px-3.5 py-2 text-xs font-semibold border transition-all ${
          isOpen
            ? "rounded-t-lg rounded-b-none border-b-transparent border-[#0284c7] bg-[var(--bg-panel)] shadow-sm"
            : "rounded-lg border-[var(--border)] bg-[var(--bg-panel)] hover:border-[#0284c7]"
        }`}
        style={{ color: "var(--text-primary)" }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{preset.name}</span>
        <ChevronDown
          size={15}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#0284c7]" : ""}`}
        />
      </button>

      {isOpen && (
        <motion.div
          className="absolute left-0 right-0 top-full z-50 border border-t-0 rounded-b-lg overflow-hidden shadow-xl"
          initial={reduceMotion ? false : { opacity: 0, y: -7, scaleY: 0.94, clipPath: "inset(0 0 100% 0)" }}
          animate={{ opacity: 1, y: 0, scaleY: 1, clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "var(--bg-panel)",
            borderColor: "#0284c7",
            transformOrigin: "top center",
          }}
          role="listbox"
        >
          {presets.map((option) => {
            const isSelected = option.id === preset.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onPresetChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-xs font-medium flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-sky-50 dark:bg-sky-950/40 text-[#0284c7] font-bold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-[var(--text-primary)]"
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span>{option.name}</span>
                {isSelected && <Check size={14} className="text-[#0284c7]" />}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function LessonIntro({
  preset,
  presets,
  onPresetChange,
  onBegin,
  backButton,
}: {
  preset: Preset;
  presets: Preset[];
  onPresetChange: (id: string) => void;
  onBegin: () => void;
  /*
   * Rendered at the left end of the action row. The study harness passes its
   * "Back to Pre-test" control here so the intro screen carries the two
   * navigation choices side by side instead of splitting them between the page
   * and the top bar. Undefined outside the study, where there is nothing to go
   * back to.
   */
  backButton?: React.ReactNode;
}) {
  const total = Math.max(1, preset.steps.length - 1);
  const lessonVisual = LESSON_VISUALS[preset.id];

  return (
    <section className="lesson-intro">
      <div className="lesson-intro-inner">
        <div className="lesson-kicker">Guided Java Lesson: Code Visualizer</div>
        {SHOW_PRESET_SELECTOR && (
          <div className="lesson-example-select">
            <span>Choose your lesson</span>
            <LessonCustomDropdown preset={preset} presets={presets} onPresetChange={onPresetChange} />
          </div>
        )}
        <h1>{preset.name}</h1>
        <p className="lesson-goal">{LESSON_GOALS[preset.id] ?? `Trace this example through ${total} program changes.`}</p>
        <LessonProgress presetId={preset.id} current={1} total={total} phase="intro" />
        {/*
         * Back sits under the first step, Begin under the last, so each button
         * lands beneath the step it leads to. Space-between rather than a fixed
         * offset, because the step count varies by lesson (four here, seven for
         * the live trace).
         */}
        <div className="lesson-intro-actions w-full flex items-center justify-between">
          <span className="lesson-intro-action-start">{backButton}</span>
          <button type="button" className="btn-primary lesson-begin-button ml-auto" onClick={onBegin}>
            <span>Begin Lesson</span>
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
      {lessonVisual && (
        <figure className="lesson-intro-visual" key={lessonVisual.src}>
          <Image src={lessonVisual.src} alt={lessonVisual.alt} width={420} height={240} priority />
        </figure>
      )}
    </section>
  );
}

function LessonComplete({
  presetId,
  isCustomCode,
  onTryAnother,
  onContinueToNextStage,
}: {
  presetId: string;
  isCustomCode: boolean;
  onTryAnother: () => void;
  onContinueToNextStage?: () => void;
}) {
  const summary = isCustomCode ? null : LESSON_SUMMARIES[presetId];
  const lessonVisual = isCustomCode ? null : LESSON_VISUALS[presetId];
  const completedExampleName = isCustomCode
    ? "Your custom Java program"
    : SIMULATION_PRESETS[presetId]?.name ?? "Java program";

  return (
    <section className="lesson-complete">
      <div className="lesson-complete-inner">
        <h1 className="lesson-summary-title">Lesson Summary: {completedExampleName}</h1>
        {summary && (
          <>
            <p className="lesson-summary-overview">{summary.overview}</p>

            <div className="lesson-summary-grid">
              <section className="lesson-summary-section" aria-labelledby="summary-code-heading">
                <h2 id="summary-code-heading">What the code did</h2>
                <ol className="lesson-summary-code-story">
                  {summary.codeStory.map((item, index) => (
                    <li key={`${item.code}-${index}`}>
                      <span className="lesson-summary-step-number">{index + 1}</span>
                      <div>
                        <SummaryJavaCode code={item.code} />
                        <p>{item.explanation}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="lesson-summary-section" aria-labelledby="summary-visual-heading">
                <h2 id="summary-visual-heading">How to read the visualization</h2>
                {lessonVisual && (
                  <figure className="lesson-summary-visual">
                    <Image src={lessonVisual.src} alt={lessonVisual.alt} width={420} height={240} />
                  </figure>
                )}
                <div className="lesson-summary-visual-guide">
                  {summary.visualGuide.map((item) => (
                    <p key={item.label}><strong>{item.label}</strong><span>{item.explanation}</span></p>
                  ))}
                </div>
              </section>
            </div>

            <div className="lesson-summary-final-state">
              <div><span>Final state</span><strong>{summary.finalState}</strong></div>
              <div><span>Main rule to remember</span><strong>{summary.keyRule}</strong></div>
            </div>
          </>
        )}
        <p className="lesson-finish-note">
          {onContinueToNextStage
            ? "The required lesson is finished. Continue to the post-test when you are ready."
            : "The lesson is finished."}
        </p>
        <div className="lesson-summary-actions flex flex-wrap items-center justify-center gap-3">
          {onContinueToNextStage && (
            <button type="button" className="btn-primary" onClick={onContinueToNextStage}>
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
          )}
          <button type="button" className="btn-ghost lesson-try-another-button" onClick={onTryAnother}>
            <Compass size={15} aria-hidden="true" /> Try another
          </button>
        </div>

      </div>
    </section>
  );
}

interface VisualizerExperienceProps {
  /*
   * Called when the lesson reaches its terminal "complete" phase. The study
   * harness uses this to tell whether a participant actually finished the
   * intervention. The lesson state machine stays local to this component, so
   * the parent gets a notification rather than owning the state.
   */
  onLessonComplete?: (exampleId: string) => void;
  onContinueToNextStage?: () => void;
  onExampleAttempt?: (exampleId: string) => void;
  /*
   * Reported whenever the lesson state machine moves. The study harness uses it
   * to place its back control: the intro screen renders one inline, so the top
   * bar hides its own to avoid showing the same action twice.
   */
  onLessonPhaseChange?: (phase: LessonPhase) => void;
  /* Back control rendered in the intro screen's action row. */
  introBackButton?: React.ReactNode;
}

interface PendingCodeTransfer {
  text: string;
  sourceX: number;
  sourceY: number;
  targetSelectors: string[];
  settleDelayMs: number;
}

interface CodeTransferFlight extends PendingCodeTransfer {
  id: string;
  targetSelector: string;
  targetX: number;
  targetY: number;
  delay: number;
  duration: number;
}

function CodeTransferChip({
  flight,
  onFinish,
}: {
  flight: CodeTransferFlight;
  onFinish: (flight: CodeTransferFlight) => void;
}) {
  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chip = chipRef.current;
    if (!chip) return;
    const animation = chip.animate(
      [
        { left: `${flight.sourceX}px`, top: `${flight.sourceY}px`, opacity: 0, transform: "translate(-50%, -50%) scale(0.88)" },
        { left: `${flight.sourceX}px`, top: `${flight.sourceY}px`, opacity: 1, transform: "translate(-50%, -50%) scale(1)", offset: 0.1 },
        { left: `${flight.targetX}px`, top: `${flight.targetY}px`, opacity: 1, transform: "translate(-50%, -50%) scale(1)", offset: 0.64 },
        { left: `${flight.targetX}px`, top: `${flight.targetY}px`, opacity: 1, transform: "translate(-50%, -50%) scale(0.96)", offset: 0.93 },
        { left: `${flight.targetX}px`, top: `${flight.targetY}px`, opacity: 0, transform: "translate(-50%, -50%) scale(0.72)" },
      ],
      {
        duration: flight.duration,
        delay: flight.delay,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      },
    );
    animation.onfinish = () => onFinish(flight);
    return () => animation.cancel();
  }, [flight, onFinish]);

  return (
    <div
      ref={chipRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: flight.sourceX,
        top: flight.sourceY,
        zIndex: 80,
        maxWidth: "min(300px, 38vw)",
        overflow: "hidden",
        padding: "6px 10px",
        border: "1px solid #10b981",
        borderRadius: 7,
        color: "#e2e8f0",
        background: "#07101f",
        boxShadow: "0 8px 22px rgba(16, 185, 129, 0.28)",
        fontFamily: "var(--font-geist-mono), monospace",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "block", marginBottom: 2, color: "#6ee7b7", fontSize: 7, fontWeight: 800, letterSpacing: "0.08em", lineHeight: 1, textTransform: "uppercase" }}>
        Java runs
      </span>
      <code style={{ display: "block", overflow: "hidden", fontSize: 11, fontWeight: 650, textOverflow: "ellipsis" }}>
        {flight.text}
      </code>
    </div>
  );
}

import { useStudy } from "@/components/study/StudyProvider";

export default function VisualizerExperience({
  onLessonComplete,
  onContinueToNextStage,
  onExampleAttempt,
  onLessonPhaseChange,
  introBackButton,
}: VisualizerExperienceProps = {}) {
  const { setSelectedLessonId } = useStudy();
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftW, setLeftW]   = useState(540); // px

  const [presetId, setPresetId]       = useState<string>(LESSON_PRESET_ID);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("intro");
  const [isTourOpen, setIsTourOpen]   = useState(false);
  const [tourInitialStep, setTourInitialStep] = useState(0);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState<boolean>(false);
  const [isGuideHidden, setIsGuideHidden] = useState(false);
  const [walkthroughHighlightedLines, setWalkthroughHighlightedLines] = useState<number[] | null>(null);
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  /*
   * Everything below is post-lesson only. `hasFinishedLesson` latches once the
   * lesson reaches its terminal phase, so the tools stay reachable after the
   * participant leaves the completion screen to explore, and stay unreachable
   * before they get there.
   */
  const [hasFinishedLesson, setHasFinishedLesson] = useState(false);
  const [customPreset, setCustomPreset] = useState<Preset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftCode, setDraftCode] = useState<string>("");
  const [runState, setRunState] = useState<RunState>({ status: "idle" });
  const [codeTransferFlights, setCodeTransferFlights] = useState<CodeTransferFlight[]>([]);
  const pendingCodeTransferRef = useRef<PendingCodeTransfer | null>(null);
  const runAbortRef = useRef<AbortController | null>(null);

  const activePreset = customPreset ?? SIMULATION_PRESETS[presetId] ?? SIMULATION_PRESETS[LESSON_PRESET_ID];
  const currentStepData = activePreset.steps[currentStep] || activePreset.steps[0];
  const previousStepData = activePreset.steps[Math.max(0, currentStep - 1)] || activePreset.steps[0];
  const totalSteps = activePreset.steps.length;
  const totalLessonSteps = Math.max(1, totalSteps - 1);
  const focusStepIndex = lessonPhase === "ready"
    ? Math.min(currentStep + 1, totalSteps - 1)
    : currentStep;
  const focusStepData = activePreset.steps[focusStepIndex] || currentStepData;
  const lessonStep = lessonPhase === "ready" ? currentStep + 1 : currentStep;
  const showResult = lessonPhase === "result";
  const hiddenRunStepIndex = lessonPhase === "result"
    ? Math.min(currentStep + 1, totalSteps - 1)
    : focusStepIndex;
  const hiddenRunLine = activePreset.steps[hiddenRunStepIndex]?.lineHighlight;
  const workspacePrimaryLabel = isGuideHidden && currentStep < totalSteps - 1
    ? `Run Line ${hiddenRunLine ?? hiddenRunStepIndex + 1}`
    : showResult
      ? (currentStep === totalSteps - 1 ? "View Lesson Summary" : "Continue")
      : "Run This Line";
  const workspacePrimaryAriaLabel = isGuideHidden && currentStep < totalSteps - 1
    ? `Run highlighted line ${hiddenRunLine ?? hiddenRunStepIndex + 1}`
    : showResult
      ? (currentStep === totalSteps - 1 ? "View lesson summary" : "Continue to next step")
      : "Run highlighted line";
  const previousStackVariableNames = new Set(
    previousStepData.stack.flatMap((frame) => frame.variables.map((variable) => variable.name)),
  );
  const enteringStackVars = currentStepData.stack
    .flatMap((frame) => frame.variables.map((variable) => variable.name))
    .filter((name) => !previousStackVariableNames.has(name));
  const previousHeapObjectIds = new Set(Object.keys(previousStepData.heap));
  const enteringHeapObjects = Object.keys(currentStepData.heap)
    .filter((id) => !previousHeapObjectIds.has(id));

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  const handleLeftDrag = useCallback((dx: number) => {
    setLeftW(w => clamp(w + dx, 280, 680));
  }, []);

  const isCustomCode = customPreset !== null;
  const guideAvailable = hasGuidedWalkthrough(presetId, isCustomCode);
  const postLessonToolsAvailable = showPostLessonTools(lessonPhase, hasFinishedLesson);

  /* Cancel an in-flight trace request whenever we leave or replace the run. */
  const abortPendingRun = useCallback(() => {
    runAbortRef.current?.abort();
    runAbortRef.current = null;
  }, []);

  useEffect(() => abortPendingRun, [abortPendingRun]);

  const handleReset = useCallback(() => {
    abortPendingRun();
    setCurrentStep(0);
    setIsTourOpen(false);
    setIsWalkthroughActive(false);
    setIsGuideHidden(false);
    setIsEditing(false);
    setRunState({ status: "idle" });
    pendingCodeTransferRef.current = null;
    setCodeTransferFlights([]);
    /*
     * Replaying a traced program keeps that program. Discarding it here would
     * silently throw away code the user just wrote, which is the one thing a
     * restart button must never do. A traced program has no lesson intro of its
     * own, so it restarts straight at its first step. Leaving custom code is an
     * explicit act: pick a built-in example from the switcher.
     */
    setLessonPhase(customPreset ? "ready" : "intro");
  }, [abortPendingRun, customPreset]);

  const handleStepBack = useCallback(() => {
    if (lessonPhase === "ready" && currentStep > 0) {
      setLessonPhase("result");
      return;
    }
    if (lessonPhase === "result" && currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setLessonPhase("ready");
      return;
    }
    setCurrentStep(0);
    setLessonPhase("ready");
  }, [currentStep, lessonPhase]);

  const runReadyLine = useCallback(() => {
      const nextStepIndex = Math.min(totalSteps - 1, currentStep + 1);
      const nextStep = activePreset.steps[nextStepIndex] ?? currentStepData;
      const previousVariableNames = new Set(
        currentStepData.stack.flatMap((frame) => frame.variables.map((variable) => variable.name)),
      );
      const nextVariableNames = nextStep.stack.flatMap((frame) => frame.variables.map((variable) => variable.name));
      const newVariableNames = nextVariableNames.filter((name) => !previousVariableNames.has(name));
      const previousObjectIds = new Set(Object.keys(currentStepData.heap));
      const newObjectIds = Object.keys(nextStep.heap).filter((id) => !previousObjectIds.has(id));
      const previousCalculations = new Set(
        currentStepData.stack.flatMap((frame) => frame.calculation
          ? [`${frame.methodName}:${frame.calculation.expression}:${frame.calculation.result}`]
          : []),
      );
      const hasNewCalculation = nextStep.stack.some((frame) => frame.calculation && !previousCalculations.has(
        `${frame.methodName}:${frame.calculation.expression}:${frame.calculation.result}`,
      ));
      const hasNewStdout = Boolean(nextStep.stdout && nextStep.stdout !== currentStepData.stdout);

      const targets = [
        /* A `new` expression's main result is the allocated heap object, so
         * make that the single flying chip's destination. The new local
         * reference and initialized fields still pulse after it lands. */
        ...newObjectIds.map((id) => `[data-ref-target="heap-${id}"]`),
        ...(hasNewStdout ? ['[data-code-transfer-target="stdout"]'] : []),
        ...(hasNewCalculation ? ['[data-code-transfer-target="calculation"]'] : []),
        ...(nextStep.dataMovement ? [`[data-ref-source="${nextStep.dataMovement.to}"]`] : []),
        ...(nextStep.spotlightHeapFields ?? []).map((field) => `[data-ref-source="heap-${field}"]`),
        ...newVariableNames.map((name) => `[data-ref-source="stack-${name}"]`),
        ...(nextStep.spotlightStackVars ?? [])
          .filter((name) => !newVariableNames.includes(name))
          .map((name) => `[data-ref-source="stack-${name}"]`),
        ...(nextStep.spotlightHeapObjects ?? [])
          .filter((id) => !newObjectIds.includes(id))
          .map((id) => `[data-ref-target="heap-${id}"]`),
      ].filter((selector, index, selectors) => selectors.indexOf(selector) === index);

      const workspace = containerRef.current;
      const highlightedLines = workspace
        ? Array.from(workspace.querySelectorAll<HTMLElement>(".exec-highlight-line"))
        : [];
      const sourceElement = highlightedLines.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const sourceRect = sourceElement?.getBoundingClientRect();
      const codePanelRect = workspace?.querySelector<HTMLElement>(".visualizer-code-panel")?.getBoundingClientRect();
      const executedLine = activePreset.code
        .split("\n")[Math.max(0, (nextStep.lineHighlight ?? 1) - 1)]
        ?.trim() ?? "Run highlighted line";

      /* A dataMovement step already animates the actual value or reference.
       * Do not cover that useful animation with a second black code chip. */
      pendingCodeTransferRef.current = nextStep.dataMovement ? null : {
        text: executedLine,
        sourceX: sourceRect ? sourceRect.left + sourceRect.width / 2 : (codePanelRect?.left ?? 0) + (codePanelRect?.width ?? 0) / 2,
        sourceY: sourceRect ? sourceRect.top + sourceRect.height / 2 : (codePanelRect?.top ?? 0) + 120,
        /* If this trace frame has no item-level diff, land in Variables—not
         * the center of the whole workbench, which visually reads as the empty
         * Objects area on a fresh program. */
        targetSelectors: targets.length > 0 ? targets.slice(0, 3) : ["#onboarding-stack-zone"],
        /* A returning method frame must finish popping before we measure the
         * destination. Otherwise the remaining frame is still lower in the
         * stack and the transfer lands at its old position. */
        settleDelayMs: nextStep.stack.length < currentStepData.stack.length ? 760 : 0,
      };

      setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
      setLessonPhase("result");
  }, [activePreset, currentStep, currentStepData, totalSteps]);

  const handlePrimary = useCallback(() => {
    if (lessonPhase === "ready") {
      runReadyLine();
      return;
    }
    if (lessonPhase === "result") {
      if (currentStep >= totalSteps - 1) {
        setLessonPhase("complete");
        /* Latch here rather than in an effect: finishing the lesson is the one
         * event that unlocks the post-lesson tools, and it happens here. */
        setHasFinishedLesson(true);
        onLessonComplete?.(presetId);
      } else {
        setLessonPhase("ready");
      }
    }
  }, [currentStep, lessonPhase, onLessonComplete, presetId, runReadyLine, totalSteps]);

  /* With the guide hidden, the participant does not need an otherwise empty
   * ready-state click between observing one result and running the next line. */
  const handleWorkspacePrimary = useCallback(() => {
    if (isGuideHidden && lessonPhase === "result" && currentStep < totalSteps - 1) {
      runReadyLine();
      return;
    }
    handlePrimary();
  }, [currentStep, handlePrimary, isGuideHidden, lessonPhase, runReadyLine, totalSteps]);

  useEffect(() => {
    if (lessonPhase !== "result" || !pendingCodeTransferRef.current) return;
    const pending = pendingCodeTransferRef.current;
    pendingCodeTransferRef.current = null;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        const workspace = containerRef.current;
        if (!workspace) return;
        const workspaceRect = workspace.getBoundingClientRect();
        /* StudyShell uses CSS zoom on larger displays. getBoundingClientRect()
         * returns zoomed viewport pixels, while absolutely positioned children
         * use the workspace's unzoomed CSS coordinate system. Convert between
         * them or a valid Variables target overshoots into the Objects area. */
        const workspaceScale = workspace.offsetWidth > 0
          ? workspaceRect.width / workspace.offsetWidth
          : 1;
        const primaryDestination = pending.targetSelectors
          .map((selector) => ({
            selector,
            target: workspace.querySelector<HTMLElement>(selector),
          }))
          .find(({ target }) => target !== null);
        if (!primaryDestination?.target) return;

        const targetRect = primaryDestination.target.getBoundingClientRect();
        const sourceX = (pending.sourceX - workspaceRect.left) / workspaceScale;
        const sourceY = (pending.sourceY - workspaceRect.top) / workspaceScale;
        const targetX = (targetRect.left - workspaceRect.left + targetRect.width / 2) / workspaceScale;
        const targetY = (targetRect.top - workspaceRect.top + targetRect.height / 2) / workspaceScale;
        const travelDistance = Math.hypot(targetX - sourceX, targetY - sourceY);

        /* One Java line runs once. Fly one chip to its primary destination,
         * then pulse every affected destination together after it lands. */
        setCodeTransferFlights([{
          ...pending,
          id: `${currentStep}-${Date.now()}`,
          targetSelector: primaryDestination.selector,
          sourceX,
          sourceY,
          targetX,
          targetY,
          delay: 0,
          duration: Math.min(3000, Math.max(2200, 1600 + travelDistance * 1.15)),
        }]);
      });
    }, pending.settleDelayMs);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [currentStep, lessonPhase]);

  const finishCodeTransfer = useCallback((flight: CodeTransferFlight) => {
    setCodeTransferFlights((flights) => flights.filter((candidate) => candidate.id !== flight.id));
    flight.targetSelectors.forEach((selector) => {
      const target = containerRef.current?.querySelector<HTMLElement>(selector);
      if (!target) return;
      target.animate(
        [
          { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.5)" },
          { boxShadow: "0 0 0 7px rgba(16, 185, 129, 0.18)", offset: 0.55 },
          { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0)" },
        ],
        { duration: 650, easing: "ease-out" },
      );
    });
  }, []);

  /*
   * Loading an example. `inPlace` is what the post-lesson switcher uses: the
   * new example opens in the workspace at its own step 1 instead of bouncing
   * back to the intro screen, which would read as the whole lesson restarting.
   * The intro picker keeps the original behaviour, since that is where it is.
   */
  const handlePresetChange = useCallback((id: string, options?: { inPlace?: boolean }) => {
    abortPendingRun();
    setCustomPreset(null);
    setIsEditing(false);
    setRunState({ status: "idle" });
    setPresetId(id);
    setSelectedLessonId(id);
    setCurrentStep(0);
    setLessonPhase(options?.inPlace ? "ready" : "intro");
    setIsGuideHidden(false);
    if (options?.inPlace) onExampleAttempt?.(id);
    /* A newly loaded guided example starts at its first required card. */
    setIsWalkthroughActive(Boolean(options?.inPlace && hasGuidedWalkthrough(id)));
  }, [abortPendingRun, onExampleAttempt, setSelectedLessonId]);

  const handleStartEdit = useCallback(() => {
    abortPendingRun();
    setDraftCode(activePreset.code);
    setIsEditing(true);
    setRunState({ status: "idle" });
    setIsWalkthroughActive(false);
    setIsGuideHidden(false);
    setIsTourOpen(false);
    setCurrentStep(0);
    setLessonPhase("ready");
  }, [abortPendingRun, activePreset.code]);

  const handleCancelEdit = useCallback(() => {
    abortPendingRun();
    setIsEditing(false);
    setDraftCode("");
    setRunState({ status: "idle" });
  }, [abortPendingRun]);

  const handleRunCode = useCallback(async () => {
    const code = draftCode;
    if (!code.trim()) {
      setRunState({
        status: "error",
        title: "There is no code to run.",
        detail: "Type some Java into the editor first, then run it.",
      });
      return;
    }

    abortPendingRun();
    const controller = new AbortController();
    runAbortRef.current = controller;
    /* Never leave the user staring at a spinner: the request is given a hard
     * deadline, and a timeout is reported like any other failure. */
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TRACE_REQUEST_TIMEOUT_MS);

    setRunState({ status: "running" });

    try {
      const response = await fetch("/api/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });

      if (response.status === 403) {
        setRunState({
          status: "error",
          title: "Running your own code is turned off right now.",
          detail: "You can still switch between the built-in examples and step through them.",
        });
        return;
      }

      if (response.status === 404) {
        setRunState({
          status: "error",
          title: "The code runner is not available yet.",
          detail: "This part of the visualizer is still being connected. Everything else still works: you can switch examples and step through them.",
        });
        return;
      }

      if (!response.ok) {
        setRunState({
          status: "error",
          title: "The code runner could not be reached.",
          detail: `The server answered with status ${response.status}. Wait a moment and try again.`,
        });
        return;
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        setRunState({
          status: "error",
          title: "The code runner sent back something unexpected.",
          detail: "The answer was not in the format the visualizer understands. Try running it again.",
        });
        return;
      }

      const body = (payload ?? {}) as { ok?: boolean; preset?: unknown; kind?: string; error?: string };

      if (body.ok !== true) {
        setRunState({ status: "error", ...describeTraceFailure(body.kind ?? "internal", body.error) });
        return;
      }

      if (!looksLikePreset(body.preset)) {
        setRunState({
          status: "error",
          title: "Your code ran, but no steps came back.",
          detail: "The visualizer needs at least one step to show. Try a program with a main method that creates a variable or an object.",
        });
        return;
      }

      const traced = normalizeTracedPreset(body.preset);
      setCustomPreset(traced);
      setPresetId(traced.id);
      setIsEditing(false);
      setDraftCode("");
      setRunState({ status: "idle" });
      /* No narration exists for code the user wrote, so the guide stays off. */
      setIsWalkthroughActive(false);
      setIsGuideHidden(false);
      setCurrentStep(0);
      setLessonPhase("ready");
    } catch (error) {
      if (controller.signal.aborted && !timedOut) return; // superseded or unmounted
      if (timedOut || (error instanceof DOMException && error.name === "AbortError")) {
        setRunState({
          status: "error",
          title: "The code runner took too long to answer.",
          detail: "Nothing was changed. Try running it again, or try a shorter program.",
        });
        return;
      }
      setRunState({
        status: "error",
        title: "Could not reach the code runner.",
        detail: "Check that you are still connected, then try running it again.",
      });
    } finally {
      clearTimeout(timeoutId);
      if (runAbortRef.current === controller) runAbortRef.current = null;
    }
  }, [abortPendingRun, draftCode]);

  // Report the terminal lesson phase upward. "Review Lesson" resets back to
  // "intro", so this can fire again on a second pass; the listener is expected
  // to be idempotent.
  useEffect(() => {
    if (lessonPhase === "complete") onLessonComplete?.(presetId);
  }, [lessonPhase, onLessonComplete, presetId]);

  useEffect(() => {
    onLessonPhaseChange?.(lessonPhase);
  }, [lessonPhase, onLessonPhaseChange]);

  /* Traced code has no scripted narration, so its own step explanation and a
   * neutral diagram stand in for the authored lesson copy. */
  const stepDiagram = focusStepData.bananaDiagram ?? CUSTOM_CODE_DIAGRAM;
  const stepExplanation = isCustomCode
    ? (focusStepData.explanation || "Step through your program to watch the Variables and Objects areas change.")
    : resolveStepExplanation(presetId, focusStepIndex, getWalkthroughMessage(presetId, focusStepIndex));

  if (lessonPhase === "intro") {
    return (
      <LessonIntro
        preset={activePreset}
        presets={Object.values(SIMULATION_PRESETS)}
        onPresetChange={handlePresetChange}
        backButton={introBackButton}
        onBegin={() => {
          setSelectedLessonId(activePreset.id);
          onExampleAttempt?.(activePreset.id);
          setLessonPhase("ready");
          setTourInitialStep(0);
          setIsTourOpen(true);
        }}
      />
    );
  }

  if (lessonPhase === "complete") {
    return (
      <>
        <LessonComplete
          presetId={presetId}
          isCustomCode={isCustomCode}
          onTryAnother={() => setIsExploreOpen(true)}
          onContinueToNextStage={onContinueToNextStage}
        />
        <PostLessonExplorerModal
          isOpen={isExploreOpen}
          examples={SWITCHABLE_PRESET_IDS.filter((id) => SIMULATION_PRESETS[id]).map((id) => ({
            id,
            name: SIMULATION_PRESETS[id].name,
          }))}
          activeExampleId={presetId}
          onClose={() => setIsExploreOpen(false)}
          onLoadExample={(id) => {
            setIsExploreOpen(false);
            setHasFinishedLesson(true);
            onLessonComplete?.(presetId);
            handlePresetChange(id, { inPlace: true });
          }}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden select-none font-sans" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      <LessonProgress presetId={presetId} current={lessonStep} total={totalLessonSteps} phase={lessonPhase} />
      {/* Main Workspace Layout */}
      <div ref={containerRef} className="visualizer-main flex flex-1 min-h-0 overflow-hidden relative">
        {codeTransferFlights.map((flight) => (
          <CodeTransferChip
            key={flight.id}
            flight={flight}
            onFinish={finishCodeTransfer}
          />
        ))}
        
        {/* Left Panel: Monaco Code Editor */}
        <div
          className="visualizer-code-panel flex flex-col overflow-hidden flex-shrink-0"
          style={{ "--code-panel-width": `${leftW}px` } as React.CSSProperties}
        >
          <CodeEditorPanel
            code={isEditing ? draftCode : activePreset.code}
            /* No line highlight while editing: the steps belong to the old
             * program until the new one has actually been traced. */
            activeLine={isEditing ? null : focusStepData.lineHighlight}
            activeLines={isEditing ? null : walkthroughHighlightedLines}
            primaryLabel={workspacePrimaryLabel}
            primaryAriaLabel={workspacePrimaryAriaLabel}
            stepLabel={isGuideHidden ? `Step ${lessonStep} of ${totalLessonSteps}` : undefined}
            emphasizeActiveLine={isGuideHidden}
            canGoBack={currentStep > 0}
            onStepBack={handleStepBack}
            onPrimary={handleWorkspacePrimary}
            onReset={handleReset}
            onOpenGuide={() => {
              setIsWalkthroughActive(false);
              setIsGuideHidden(false);
              setTourInitialStep(0);
              setIsTourOpen(true);
            }}
            showGuideButton={guideAvailable}
            canEdit={postLessonToolsAvailable}
            isEditing={isEditing}
            runState={runState}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onCodeChange={setDraftCode}
            onRunCode={handleRunCode}
          />
        </div>

        {/* Column Resizer (Left) */}
        <Resizer onDrag={handleLeftDrag} />

        {/* Center Panel: Memory & Execution View */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative canvas-bg">
          <MemoryExecutionView
            stack={currentStepData.stack}
            heap={currentStepData.heap}
            arrows={currentStepData.arrows}
            currentStep={currentStep}
            totalSteps={totalSteps}
            spotlightStackVars={showResult ? currentStepData.spotlightStackVars : []}
            spotlightHeapObjects={showResult ? currentStepData.spotlightHeapObjects : []}
            spotlightHeapFields={showResult ? currentStepData.spotlightHeapFields : []}
            enteringStackVars={showResult ? enteringStackVars : []}
            enteringHeapObjects={showResult ? enteringHeapObjects : []}
            dataMovement={showResult ? currentStepData.dataMovement : undefined}
            callouts={[]}
            hoveredElement={null}
            stdout={currentStepData.stdout}
            activeBlock={undefined}
          />
        </div>
      </div>

      {/* No key remount here: the panel keeps its own collapse choice across steps
        * and handles the ready to result transition internally. */}
      <AiExplanationPanel
        explanation={stepExplanation}
        diagram={stepDiagram}
        currentStep={lessonStep}
        totalSteps={totalLessonSteps}
        showResult={showResult}
        readyPrompt={isCustomCode ? "Watch the Variables and Objects areas for the marked change." : getReadyPrompt(presetId, lessonStep)}
        whyItMatters={isCustomCode ? stepDiagram.description : getWhyItMatters(presetId, focusStepIndex, stepDiagram.description)}
      />

      {isTourOpen && (
        <OnboardingTour
          isOpen
          initialStep={tourInitialStep}
          onClose={() => setIsTourOpen(false)}
          /* The walkthrough only opens for examples it has narration for. */
          onStartWalkthrough={() => {
            setIsGuideHidden(false);
            setIsWalkthroughActive(guideAvailable);
          }}
          onHideGuide={() => {
            setIsGuideHidden(true);
            setIsWalkthroughActive(false);
          }}
        />
      )}

      <InteractiveWalkthrough
        key={presetId}
        isActive={isWalkthroughActive && guideAvailable}
        currentLessonStep={lessonStep}
        lessonPhase={lessonPhase}
        presetId={presetId}
        isCustomCode={isCustomCode}
        onStepBack={handleStepBack}
        onHide={() => {
          setIsGuideHidden(true);
          setIsWalkthroughActive(false);
        }}
        onBackToOrientation={() => {
          setIsWalkthroughActive(false);
          setTourInitialStep(4);
          setIsTourOpen(true);
        }}
        onHighlightedLinesChange={setWalkthroughHighlightedLines}
      />

      <PostLessonExplorerModal
        isOpen={isExploreOpen}
        examples={SWITCHABLE_PRESET_IDS.filter((id) => SIMULATION_PRESETS[id]).map((id) => ({
          id,
          name: SIMULATION_PRESETS[id].name,
        }))}
        activeExampleId={presetId}
        onClose={() => setIsExploreOpen(false)}
        onLoadExample={(id) => {
          setIsExploreOpen(false);
          setHasFinishedLesson(true);
          onLessonComplete?.(presetId);
          handlePresetChange(id, { inPlace: true });
        }}
      />

      {false && <>{/* Legacy developer status footer, hidden from participants. */}
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
      </footer></>}
    </div>
  );
}
