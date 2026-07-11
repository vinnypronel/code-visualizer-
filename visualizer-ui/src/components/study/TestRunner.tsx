"use client";

/*
 * Renders a TestDef as a form: read-only code blocks in monospace with exact
 * indentation, and an editable input for every blank and table cell. Pure and
 * controlled: it holds no state, it reports every change up via onChange.
 */

import type { Field, GridCell, TestDef } from "@/data/tests";
import { TEST_INSTRUCTIONS } from "@/data/tests";
import type { TestResponses } from "@/lib/studyTypes";

interface TestRunnerProps {
  def: TestDef;
  responses: TestResponses;
  onChange: (key: string, value: string) => void;
}

function CodeBlock({ code, caption }: { code: string; caption?: string }) {
  return (
    <div className="my-3">
      {caption && (
        <p className="text-[13px] font-medium mb-2">{caption}</p>
      )}
      <pre
        className="font-mono text-[12.5px] leading-relaxed rounded-lg p-4 overflow-x-auto"
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          whiteSpace: "pre",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

function TextInput({
  value,
  label,
  placeholder,
  onChange,
}: {
  value: string;
  label: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block my-3">
      <span className="block text-[13px] font-medium mb-1.5">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
        style={{
          background: "var(--bg-panel-2)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
    </label>
  );
}

function GridField({
  columns,
  rows,
  caption,
  responses,
  onChange,
}: {
  columns: string[];
  rows: GridCell[][];
  caption?: string;
  responses: TestResponses;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="my-4">
      {caption && <p className="text-[13px] font-medium mb-2">{caption}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left font-semibold px-3 py-2"
                  style={{
                    background: "var(--bg-panel-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) =>
                  cell.t === "ro" ? (
                    <td
                      key={ci}
                      className="px-3 py-2 font-mono"
                      style={{
                        border: "1px solid var(--border)",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cell.text}
                    </td>
                  ) : (
                    <td
                      key={ci}
                      className="p-0"
                      style={{ border: "1px solid var(--border)" }}
                    >
                      <input
                        type="text"
                        value={responses[cell.key] ?? ""}
                        placeholder={cell.placeholder}
                        onChange={(e) => onChange(cell.key, e.target.value)}
                        className="w-full px-3 py-2 text-[12.5px] outline-none bg-transparent"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderField(
  field: Field,
  responses: TestResponses,
  onChange: (key: string, value: string) => void,
) {
  switch (field.kind) {
    case "code":
      return <CodeBlock code={field.code} caption={field.caption} />;
    case "text":
      return (
        <TextInput
          value={responses[field.key] ?? ""}
          label={field.label}
          placeholder={field.placeholder}
          onChange={(v) => onChange(field.key, v)}
        />
      );
    case "grid":
      return (
        <GridField
          columns={field.columns}
          rows={field.rows}
          caption={field.caption}
          responses={responses}
          onChange={onChange}
        />
      );
  }
}

export default function TestRunner({
  def,
  responses,
  onChange,
}: TestRunnerProps) {
  return (
    <div>
      {/* Instruction block, shown verbatim */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
        }}
      >
        <ul className="space-y-1.5 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>
          {TEST_INSTRUCTIONS.map((line) => (
            <li key={line} className="flex gap-2">
              <span style={{ color: "var(--text-muted)" }}>-</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {def.questions.map((q) => (
          <section key={q.id}>
            <h2 className="text-[15px] font-bold mb-1">{q.title}</h2>
            {q.prompt && (
              <p
                className="text-[13px] mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {q.prompt}
              </p>
            )}
            {q.fields.map((field, fi) => (
              <div key={fi}>{renderField(field, responses, onChange)}</div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
