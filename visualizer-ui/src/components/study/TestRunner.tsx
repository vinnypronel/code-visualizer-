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
        <p className="text-[13px] font-semibold mb-2" style={{ color: "#0f172a" }}>{caption}</p>
      )}
      <pre
        className="font-mono text-[12.5px] leading-relaxed rounded-lg p-4 overflow-x-auto"
        style={{
          background: "var(--bg-base)",
          border: "1px solid #94a3b8",
          color: "#000000",
          fontWeight: 500,
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
      <span className="block text-[13px] font-semibold mb-1.5" style={{ color: "#0f172a" }}>{label}</span>
      <input
        type="text"
        required
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-3 py-2 text-[13px] font-semibold outline-none transition-colors focus:border-slate-500"
        style={{
          background: "#ffffff",
          border: "1px solid #94a3b8",
          color: "#000000",
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
      {caption && <p className="text-[13px] font-semibold mb-2" style={{ color: "#0f172a" }}>{caption}</p>}
      <div className="overflow-x-auto rounded-lg border shadow-sm" style={{ borderColor: "#64748b" }}>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left font-bold px-3.5 py-2.5"
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #94a3b8",
                    color: "#0f172a",
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
                      className="px-3.5 py-2.5 font-mono font-bold"
                      style={{
                        border: "1px solid #94a3b8",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        background: "#f8fafc",
                      }}
                    >
                      {cell.text}
                    </td>
                  ) : (
                    <td
                      key={ci}
                      className="p-0"
                      style={{ border: "1px solid #94a3b8" }}
                    >
                      <input
                        type="text"
                        required
                        value={responses[cell.key] ?? ""}
                        placeholder={cell.placeholder}
                        onChange={(e) => onChange(cell.key, e.target.value)}
                        className="w-full px-3.5 py-2.5 text-[12.5px] font-bold outline-none bg-white focus:bg-emerald-50/40"
                        style={{ color: "#000000" }}
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
          border: "1px solid #94a3b8",
        }}
      >
        <ul className="space-y-1.5 text-[12.5px] font-medium" style={{ color: "#0f172a" }}>
          {TEST_INSTRUCTIONS.map((line) => (
            <li key={line} className="flex gap-2">
              <span style={{ color: "#475569" }}>-</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {def.questions.map((q) => (
          <section key={q.id}>
            <h2 className="text-[16px] font-extrabold mb-1" style={{ color: "#0f172a" }}>{q.title}</h2>
            {q.prompt && (
              <p
                className="text-[13px] font-semibold mb-2"
                style={{ color: "#334155" }}
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
