"use client";

/*
 * STUB: static-materials learning condition.
 *
 * This is the non-AI condition. It intentionally contains no real learning
 * content yet, only a clearly marked placeholder. The static materials (the
 * same concepts the visualizer teaches, presented as fixed text/diagrams) will
 * be authored here later. The surrounding study chrome (header, stepper, timer,
 * Continue) is identical to the AI condition by construction, since both are
 * rendered inside the same StudyShell.
 */
export default function StaticMaterialsStub() {
  return (
    <div className="h-full w-full overflow-y-auto panel-scroll">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <p
          className="text-[12px] font-mono px-3 py-2 rounded-md mb-6"
          style={{
            background: "#f59e0b14",
            border: "1px solid #f59e0b44",
            color: "var(--warning)",
          }}
        >
          [PLACEHOLDER STATIC MATERIALS] TODO: author the static learning content
          for the non-AI condition here.
        </p>
        <h2 className="text-lg font-bold mb-2">Static learning materials</h2>
        <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
          This condition will present the same concepts as the interactive
          visualizer (the stack and heap, references, recursion, object
          reference semantics) as fixed reading materials and diagrams. Content
          is not written yet.
        </p>
      </div>
    </div>
  );
}
