export type WalkthroughSubPhase = "run" | "observe";
export type WalkthroughPlacement = "top" | "right" | "bottom" | "left" | "center";

export interface WalkthroughStepDef {
  expectedLessonStep: number;
  subPhase: WalkthroughSubPhase;
  title: string;
  lineNumber?: number;
  codeSnippet?: string;
  showCodeOnObserve?: boolean;
  setupNote?: {
    heading: string;
    line1Code: string;
    line1Why: string;
    line2Code: string;
    line2Why: string;
  };
  blueprintNote?: {
    heading: string;
    linesCode: string;
    details: string[];
  };
  explanationText: string;
  actionKind?: "next" | "primary";
  phaseLabel?: string;
  actionButtonLabel: string;
  selector: string;
  placement: WalkthroughPlacement;
}

const RUN_BUTTON = "#onboarding-playback-controls";
const CODE = "#onboarding-code-content";
const MEMORY = "#onboarding-memory-view";

interface ActionLesson {
  lessonStep: number;
  line: number;
  code: string;
  runTitle: string;
  runExplanation: string;
  observeTitle: string;
  observeExplanation: string;
}

function actionCards(actions: ActionLesson[]): WalkthroughStepDef[] {
  return actions.flatMap((action) => [
    {
      expectedLessonStep: action.lessonStep,
      subPhase: "run" as const,
      title: action.runTitle,
      lineNumber: action.line,
      codeSnippet: action.code,
      explanationText: action.runExplanation,
      actionButtonLabel: `Run line ${action.line}`,
      selector: RUN_BUTTON,
      placement: "right" as const,
    },
    {
      expectedLessonStep: action.lessonStep,
      subPhase: "observe" as const,
      title: action.observeTitle,
      lineNumber: action.line,
      codeSnippet: action.code,
      showCodeOnObserve: true,
      explanationText: action.observeExplanation,
      actionButtonLabel: action.lessonStep === actions.length ? "Finish Lesson" : "Continue",
      selector: MEMORY,
      placement: "center" as const,
    },
  ]);
}

const linkedListSteps: WalkthroughStepDef[] = [
  {
    expectedLessonStep: 1,
    subPhase: "run",
    title: "Understanding the basics",
    setupNote: {
      heading: "Lines 1-2: where Java starts",
      line1Code: "public class LinkedListDemo {",
      line1Why: 'Defines the class container "LinkedListDemo". The opening bracket { on line 1 is closed at the end of the class on line 8.',
      line2Code: "public static void main(String[] args) {",
      line2Why: 'Defines the starting "main" method. The opening bracket { on line 2 is closed at the end of the method on line 7.',
    },
    explanationText: "These two lines prepare the program. They do not create a Node or change the visualization yet.",
    actionKind: "next",
    phaseLabel: "Learn the basics",
    actionButtonLabel: "Next",
    selector: CODE,
    placement: "right",
  },
  {
    expectedLessonStep: 1,
    subPhase: "run",
    title: "Meet the Node blueprint",
    blueprintNote: {
      heading: "Lines 10-16: how Java builds a Node",
      linesCode: "class Node {\n  int value;\n  Node next;\n  Node(int value) {\n    this.value = value;\n  }\n}",
      details: [
        'class Node defines the blueprint. The opening bracket { on line 10 is closed at the end on line 16.',
        "int value and Node next give every Node a number and a link. Their starting values are 0 and null.",
        "Node(int value) is the constructor (lines 13-15). Its opening bracket { on line 13 is closed on line 15.",
        "this.value = value stores the supplied number inside the new object.",
      ],
    },
    explanationText: "This class describes what every Node will contain. No Node object exists until Java reaches new Node(...).",
    actionKind: "next",
    phaseLabel: "Understand a Node",
    actionButtonLabel: "Next",
    selector: CODE,
    placement: "right",
  },
  ...actionCards([
    { lessonStep: 1, line: 3, code: "Node head = new Node(10);", runTitle: "Create the first node", runExplanation: 'new Node(10) creates a Node object whose value is 10 and next is null. The Stack variable "head" will point to it.', observeTitle: "First node created", observeExplanation: 'The Stack now contains "head" holding [Object 1], a reference to the Node in memory. [Object 1] contains value 10 and next null.' },
    { lessonStep: 2, line: 4, code: "Node temp = new Node(20);", runTitle: "Create the second node", runExplanation: 'This creates a separate Node containing 20 and a Stack variable named "temp" that points to it.', observeTitle: "Second node created", observeExplanation: 'There are now two separate Node objects. "head" points to [Object 1] containing 10, while "temp" points to [Object 2] containing 20.' },
    { lessonStep: 3, line: 5, code: "head.next = temp;", runTitle: "Link the nodes", runExplanation: 'Java follows "head" to [Object 1], then copies the reference stored in "temp" into the next field of [Object 1].', observeTitle: "Nodes connected", observeExplanation: 'The moving [Object 2] label is a reference value, not the object itself. It is copied into the next field of [Object 1], so the Node containing 10 now points to the Node containing 20.' },
    { lessonStep: 4, line: 6, code: "int value = head.value;", runTitle: "Read a value from a node", runExplanation: 'Java follows "head" to [Object 1], reads its value field, and prepares a new integer variable named "value" on the Stack.', observeTitle: "Lesson complete", observeExplanation: 'The moving 10 is an integer value copied from [Object 1] into the Stack variable "value". The original 10 remains in the Node because reading a primitive copies it.' },
  ]),
];

const arrayListSteps: WalkthroughStepDef[] = [
  {
    expectedLessonStep: 1, subPhase: "run", title: "Understanding the basics",
    setupNote: {
      heading: "Lines 1-2: where Java starts",
      line1Code: "public class ArrayListDemo {",
      line1Why: 'Defines the class container "ArrayListDemo". The opening bracket { on line 1 is closed at the end of the class on line 12.',
      line2Code: "public static void main(String[] args) {",
      line2Why: 'Defines the starting "main" method. The opening bracket { on line 2 is closed at the end of the method on line 11.',
    },
    explanationText: "The class and main method prepare the program. The visualization stays empty until line 3 creates an array.",
    actionKind: "next", phaseLabel: "Learn the basics", actionButtonLabel: "Next", selector: CODE, placement: "right",
  },
  {
    expectedLessonStep: 1, subPhase: "run", title: "How an array works",
    blueprintNote: {
      heading: "Before line 3: arrays and indexes",
      linesCode: "int[] list = new int[3];\nlist[0] = 5;\nlist[1] = 10;",
      details: [
        "int[] means an array whose slots hold integers.",
        "new int[3] creates one fixed row of three slots. Each slot starts at 0.",
        "Array indexes begin at 0, so [0] is the first slot and [1] is the second.",
        "An array cannot grow in place. Resizing requires a second, longer array and copying values into it.",
      ],
    },
    explanationText: "This lesson builds a small array, writes values into it, and then demonstrates the first part of resizing it.",
    actionKind: "next", phaseLabel: "Understand arrays", actionButtonLabel: "Next", selector: CODE, placement: "right",
  },
  ...actionCards([
    { lessonStep: 1, line: 3, code: "int[] list = new int[3];", runTitle: "Create an array", runExplanation: 'new int[3] creates one array object with three integer slots. The Stack variable "list" will store a reference to that array.', observeTitle: "Three slots created", observeExplanation: 'The Stack now contains "list" pointing to [Object 1]. [Object 1] is the array in memory, and all three slots begin with Java default integer value, 0.' },
    { lessonStep: 2, line: 4, code: "list[0] = 5;", runTitle: "Write the first value", runExplanation: 'Java follows "list" to the array and uses index 0 to select its first slot. It then stores 5 in that slot.', observeTitle: "Index 0 now holds 5", observeExplanation: "The first slot changed from 0 to 5. The other slots remain 0 because an assignment changes only the selected index." },
    { lessonStep: 3, line: 5, code: "list[1] = 10;", runTitle: "Write the second value", runExplanation: "Index 1 selects the second slot because array counting starts at 0. Java stores 10 there without changing index 0.", observeTitle: "Index 1 now holds 10", observeExplanation: "The array now reads [5, 10, 0]. The values are adjacent inside the same fixed-size array object." },
    { lessonStep: 4, line: 6, code: "int size = 2;", runTitle: "Record how many slots are used", runExplanation: 'This creates a primitive integer variable named "size" directly on the Stack and stores 2 in it.', observeTitle: "Size is stored on the Stack", observeExplanation: '"size" contains 2 directly; it is not a reference. It records that two array positions currently contain lesson data.' },
    { lessonStep: 5, line: 8, code: "int[] temp = new int[6];", runTitle: "Create a larger array", runExplanation: 'Arrays cannot expand, so new int[6] creates a second array with six slots. "temp" will point to this new array.', observeTitle: "A longer row was created", observeExplanation: 'The old three-slot array still exists as [Object 1]. A separate six-slot array appears as [Object 2], and "temp" points to it.' },
    { lessonStep: 6, line: 9, code: "temp[0] = list[0];", runTitle: "Copy the first value", runExplanation: 'Java reads 5 from index 0 of the old array, then writes a copy into index 0 of the new array. The original value remains in the old array.', observeTitle: "The value 5 was copied", observeExplanation: 'The moving 5 is a primitive integer being copied from [Object 1] to [Object 2]. The arrays do not move, and both index 0 slots now contain 5.' },
  ]),
];

const stackSteps: WalkthroughStepDef[] = [
  {
    expectedLessonStep: 1, subPhase: "run", title: "Understanding the basics",
    setupNote: {
      heading: "Lines 1-2: where Java starts",
      line1Code: "public class StackDemo {",
      line1Why: 'Defines the class container "StackDemo". The opening bracket { on line 1 is closed at the end of the class on line 11.',
      line2Code: "public static void main(String[] args) {",
      line2Why: 'Defines the starting "main" method. The opening bracket { on line 2 is closed at the end of the method on line 10.',
    },
    explanationText: "These lines prepare the program. The next lines will build a stack, one object and reference at a time.",
    actionKind: "next", phaseLabel: "Learn the basics", actionButtonLabel: "Next", selector: CODE, placement: "right",
  },
  {
    expectedLessonStep: 1, subPhase: "run", title: "Meet the stack blueprints",
    blueprintNote: {
      heading: "Lines 13-22: the stack and node recipes",
      linesCode: "class MyStack {\n  Node top;\n}\n\nclass Node {\n  int value;\n  Node next;\n  Node(int value) { this.value = value; }\n}",
      details: [
        "MyStack has one reference named top that identifies the first Node in the stack.",
        "Each Node stores an integer value and a next reference to the Node below it.",
        "new Node(number) runs the constructor and stores that number in value.",
        "A push first links the new Node to the old top, then changes top to the new Node.",
      ],
    },
    explanationText: "These classes are recipes only. The objects appear when main reaches each new expression.",
    actionKind: "next", phaseLabel: "Understand the stack", actionButtonLabel: "Next", selector: CODE, placement: "right",
  },
  ...actionCards([
    { lessonStep: 1, line: 3, code: "MyStack s = new MyStack();", runTitle: "Create the stack tracker", runExplanation: 'new MyStack() creates one MyStack object. Its top field starts as null because no Node has been pushed yet; "s" will point to it.', observeTitle: "An empty stack was created", observeExplanation: 'The Stack variable "s" points to [Object 1], the MyStack object in memory. [Object 1].top is null, which means the stack contains no Nodes.' },
    { lessonStep: 2, line: 4, code: "Node n1 = new Node(42);", runTitle: "Create the first node", runExplanation: 'new Node(42) creates a Node whose value is 42 and next is null. "n1" will point to it, but it is not the stack top yet.', observeTitle: "The first node is ready", observeExplanation: '"n1" points to [Object 2], a Node containing 42. [Object 1].top is still null, so the Node has been created but not pushed.' },
    { lessonStep: 3, line: 5, code: "s.top = n1;", runTitle: "Push the first node", runExplanation: 'Java follows "s" to [Object 1] and copies the reference in "n1" into its top field.', observeTitle: "The stack now contains 42", observeExplanation: 'The moving [Object 2] label is a copied reference. [Object 1].top now points to the Node containing 42, making it both the top and bottom Node.' },
    { lessonStep: 4, line: 7, code: "Node n2 = new Node(84);", runTitle: "Create another node", runExplanation: 'This creates a separate Node containing 84. "n2" points to it, but the existing stack still starts at the Node containing 42.', observeTitle: "The second node is ready", observeExplanation: '"n2" points to [Object 3], while [Object 1].top still points to [Object 2]. The new Node is not connected to the stack yet.' },
    { lessonStep: 5, line: 8, code: "n2.next = s.top;", runTitle: "Link the new node to the old top", runExplanation: 'Java copies the current top reference from [Object 1].top into [Object 3].next. This preserves the Node already on the stack.', observeTitle: "The old stack is preserved", observeExplanation: 'The moving [Object 2] is a reference copied into [Object 3].next. The new Node containing 84 now points down to the old Node containing 42.' },
    { lessonStep: 6, line: 9, code: "s.top = n2;", runTitle: "Make 84 the new top", runExplanation: 'Java copies the reference in "n2" into [Object 1].top. The tracker will now start at the new Node.', observeTitle: "Push complete", observeExplanation: 'The stack order is now top -> 84 -> 42. [Object 1].top points to [Object 3], and [Object 3].next keeps the link to [Object 2].' },
  ]),
];

const liveTraceSteps: WalkthroughStepDef[] = [
  {
    expectedLessonStep: 1, subPhase: "run", title: "Understanding the basics",
    setupNote: {
      heading: "Lines 1-2: where Java starts",
      line1Code: "public class Sample {",
      line1Why: 'Defines the class container "Sample". The opening bracket { on line 1 is closed at the end of the class on line 12.',
      line2Code: "public static void main(String[] args) {",
      line2Why: 'Defines the starting "main" method. The opening bracket { on line 2 is closed at the end of the method on line 7.',
    },
    explanationText: "This is a real execution trace. This example uses only primitive integers, so its changes happen in stack frames rather than object memory.",
    actionKind: "next", phaseLabel: "Learn the basics", actionButtonLabel: "Next", selector: CODE, placement: "right",
  },
  {
    expectedLessonStep: 1, subPhase: "run", title: "Meet the multiply method",
    blueprintNote: {
      heading: "Lines 9-11: a second method",
      linesCode: "public static int multiply(int a, int b) {\n  return a * b;\n}",
      details: [
        "multiply accepts two integer inputs named a and b.",
        "Calling it creates a new stack frame above main with its own local variables.",
        "return a * b multiplies the inputs and sends one integer result back to main.",
        "When multiply returns, its temporary stack frame is removed.",
      ],
    },
    explanationText: "Watch the Stack grow when main calls multiply, then shrink when the method returns 50.",
    actionKind: "next", phaseLabel: "Understand methods", actionButtonLabel: "Next", selector: CODE, placement: "right",
  },
  ...actionCards([
    { lessonStep: 1, line: 3, code: "int x = 5;", runTitle: "Create x", runExplanation: 'This declares an integer variable named "x" in the main stack frame and stores 5 directly in it.', observeTitle: "x now holds 5", observeExplanation: 'The main stack frame now shows x = 5. Integers are primitive values, so x stores the number itself rather than a reference to an object.' },
    { lessonStep: 2, line: 4, code: "int y = 10;", runTitle: "Create y", runExplanation: 'This declares another integer variable named "y" in the same main stack frame and stores 10 in it.', observeTitle: "y now holds 10", observeExplanation: "The main frame now contains x = 5 and y = 10. Each variable has its own value." },
    { lessonStep: 3, line: 5, code: "int result = multiply(x, y);", runTitle: "Call multiply", runExplanation: "Java reads x and y, copies 5 and 10 into the method parameters a and b, and pushes a new multiply frame above main.", observeTitle: "A method frame was pushed", observeExplanation: "The multiply frame is now on top with a = 5 and b = 10. The main frame remains underneath, paused until multiply returns." },
    { lessonStep: 4, line: 10, code: "return a * b;", runTitle: "Evaluate the multiplication", runExplanation: "Inside multiply, Java reads a as 5 and b as 10, then evaluates the expression 5 * 10.", observeTitle: "The expression produces 50", observeExplanation: "The multiply frame remains visible while Java computes the expression. The next trace event will return the resulting 50 to main." },
    { lessonStep: 5, line: 10, code: "return a * b;", runTitle: "Return 50 to main", runExplanation: "The return keyword sends the computed integer 50 back to the waiting call in main. multiply is now finished.", observeTitle: "multiply returns 50", observeExplanation: "A temporary return value of 50 is shown in the multiply frame. That frame is ready to be removed; a and b will disappear with it." },
    { lessonStep: 6, line: 5, code: "int result = multiply(x, y);", runTitle: "Store the returned value", runExplanation: 'Execution resumes in main. The returned 50 is assigned to a new integer variable named "result".', observeTitle: "result now holds 50", observeExplanation: 'The multiply frame is gone. The main frame now contains x = 5, y = 10, and result = 50.' },
    { lessonStep: 7, line: 6, code: "System.out.println(\"Result = \" + result);", runTitle: "Print the result", runExplanation: 'Java joins the text "Result = " with the value in result, producing "Result = 50", then sends that text to the program output.', observeTitle: "Program complete", observeExplanation: 'The output panel displays "Result = 50". main has reached the end of its visible instructions, so the traced program is finished.' },
  ]),
];

export const GUIDED_WALKTHROUGHS: Record<string, WalkthroughStepDef[]> = {
  linkedlist: linkedListSteps,
  arraylist: arrayListSteps,
  stack: stackSteps,
  livetrace: liveTraceSteps,
};
