"use client";

/*
 * Renders a TestDef as a form: read-only code blocks in monospace with exact
 * indentation, and an editable input for every blank and table cell. Pure and
 * controlled: it holds no state, it reports every change up via onChange.
 */

import { useRef } from "react";
import { Code2 } from "lucide-react";
import type { Field, GridCell, TestDef } from "@/data/tests";
import { TEST_INSTRUCTIONS } from "@/data/tests";
import type { TestResponses } from "@/lib/studyTypes";

interface TestRunnerProps {
  def: TestDef;
  responses: TestResponses;
  onChange: (key: string, value: string) => void;
}

function highlightJavaLine(line: string) {
  const commentIdx = line.indexOf("//");
  let codePart = line;
  let commentPart = "";

  if (commentIdx !== -1) {
    codePart = line.slice(0, commentIdx);
    commentPart = line.slice(commentIdx);
  }

  const stringRegex = /(".*?"|'.*?')/g;
  const parts: { type: "string" | "code"; value: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = stringRegex.exec(codePart)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "code", value: codePart.slice(lastIndex, match.index) });
    }
    parts.push({ type: "string", value: match[0] });
    lastIndex = stringRegex.lastIndex;
  }
  if (lastIndex < codePart.length) {
    parts.push({ type: "code", value: codePart.slice(lastIndex) });
  }

  const renderCodeTokens = (codeStr: string) => {
    const tokens = codeStr.split(/(\s+|[().,;={}\[\]])/);
    return tokens.map((token, i) => {
      if (!token) return null;
      if (["class", "public", "static", "void", "new", "int", "return", "this", "if", "else", "for", "while", "boolean", "double"].includes(token)) {
        return <span key={i} style={{ color: "#569cd6", fontWeight: "bold" }}>{token}</span>;
      }
      if (["String", "Dog", "Node", "Object", "System", "ArrayList", "LinkedList", "Stack"].includes(token)) {
        return <span key={i} style={{ color: "#4ec9b0", fontWeight: "600" }}>{token}</span>;
      }
      if (/^\d+$/.test(token)) {
        return <span key={i} style={{ color: "#b5cea8" }}>{token}</span>;
      }
      return <span key={i} style={{ color: "#e2e8f0" }}>{token}</span>;
    });
  };

  return (
    <>
      {parts.map((p, idx) =>
        p.type === "string" ? (
          <span key={idx} style={{ color: "#ce9178" }}>{p.value}</span>
        ) : (
          <span key={idx}>{renderCodeTokens(p.value)}</span>
        )
      )}
      {commentPart && (
        <span style={{ color: "#6a9955", fontStyle: "italic" }}>{commentPart}</span>
      )}
    </>
  );
}

function CodeBlock({ code, caption }: { code: string; caption?: string }) {
  const lines = code.split("\n");

  return (
    <div className="my-4">
      {caption && (
        <p className="text-[13.5px] font-bold mb-2.5" style={{ color: "#0f172a" }}>
          {caption}
        </p>
      )}
      <div className="rounded-xl border border-[#30363d] overflow-hidden shadow-lg" style={{ background: "#0d1117" }}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] text-[11px] font-mono select-none" style={{ color: "#8b949e" }}>
          <div className="flex items-center gap-2">
            <Code2 size={14} style={{ color: "#38bdf8" }} />
            <span className="font-bold tracking-wide uppercase text-[10px] text-slate-300">
              Java Source Code
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{lines.length} lines</span>
        </div>

        {/* Code view with line numbers */}
        <div className="p-4 overflow-x-auto font-mono text-[12.5px] leading-relaxed flex">
          {/* Line numbers column */}
          <div className="select-none text-right pr-4 border-r border-[#21262d] font-mono text-[12px] space-y-0.5" style={{ color: "#484f58", minWidth: "2.5rem" }}>
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code lines */}
          <div className="pl-4 space-y-0.5 whitespace-pre flex-1">
            {lines.map((line, i) => (
              <div key={i}>{highlightJavaLine(line)}</div>
            ))}
          </div>
        </div>
      </div>
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
        className="w-full rounded-md px-3 py-2 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        style={{
          background: "#ffffff",
          border: "1px solid #94a3b8",
          color: "#000000",
        }}
      />
    </label>
  );
}

function parseDualCell(val: string) {
  const trimmed = val.trim();
  if (
    trimmed === "(not yet created)" ||
    trimmed.toLowerCase() === "not yet created" ||
    trimmed.toLowerCase() === "(not yet created)"
  ) {
    return { isNotCreated: true, sub1: "(not yet created)", sub2: "" };
  }
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    return {
      isNotCreated: false,
      sub1: parts[0].trim(),
      sub2: parts.slice(1).join("/").trim(),
    };
  }
  return { isNotCreated: false, sub1: trimmed, sub2: "" };
}

function DualBoxCell({
  cellVal,
  onChange,
  colHeader,
}: {
  cellVal: string;
  onChange: (val: string) => void;
  colHeader?: string;
}) {
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);
  const { isNotCreated, sub1, sub2 } = parseDualCell(cellVal);

  const headerParts = colHeader ? colHeader.split("/").map((s) => s.trim()) : [];
  const placeholder1 = headerParts[0] || "value 1";
  const placeholder2 = headerParts[1] || "value 2";

  const handleSub1Change = (v1: string) => {
    const trimmed = v1.trim();
    if (
      trimmed.toLowerCase() === "not yet created" ||
      trimmed.toLowerCase() === "(not yet created)" ||
      trimmed.toLowerCase() === "not created"
    ) {
      onChange("(not yet created)");
      return;
    }
    if (!v1 && !sub2) {
      onChange("");
    } else if (v1 && sub2) {
      onChange(`${v1} / ${sub2}`);
    } else {
      onChange(v1);
    }
  };

  const handleSub2Change = (v2: string) => {
    if (!sub1 && !v2) {
      onChange("");
    } else if (sub1 && v2) {
      onChange(`${sub1} / ${v2}`);
    } else if (v2) {
      onChange(`/ ${v2}`);
    } else {
      onChange(sub1);
    }
  };

  const handleKeyDown1 = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowRight") {
      const target = e.currentTarget;
      if (target.selectionStart === target.value.length) {
        e.preventDefault();
        inputRef2.current?.focus();
        inputRef2.current?.select();
      }
    }
  };

  const handleKeyDown2 = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft") {
      const target = e.currentTarget;
      if (target.selectionStart === 0) {
        e.preventDefault();
        inputRef1.current?.focus();
        inputRef1.current?.select();
      }
    }
  };

  const monoStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "12.5px",
    lineHeight: "1.25rem",
  };

  if (isNotCreated) {
    return (
      <div className="w-full h-full flex items-center px-3.5 py-2 font-mono text-[12.5px] font-bold text-slate-900 bg-white">
        <input
          type="text"
          value="(not yet created)"
          onChange={(e) => {
            if (e.target.value !== "(not yet created)") {
              onChange(e.target.value);
            }
          }}
          className="w-full font-mono text-[12.5px] font-bold text-slate-900 bg-transparent outline-none"
          style={monoStyle}
        />
      </div>
    );
  }

  const sub1Len = sub1 ? sub1.length : placeholder1.length;
  const sub2Len = sub2 ? sub2.length : placeholder2.length;

  return (
    <div className="w-full h-full flex items-center px-3.5 py-2.5 font-mono text-[12.5px] font-bold text-slate-900 bg-white">
      <input
        ref={inputRef1}
        type="text"
        value={sub1}
        placeholder={placeholder1}
        onChange={(e) => handleSub1Change(e.target.value)}
        onKeyDown={handleKeyDown1}
        className="font-mono text-[12.5px] font-bold text-slate-900 bg-transparent outline-none p-0 m-0 border-none text-left"
        style={{
          ...monoStyle,
          width: `${Math.max(sub1Len, 2)}ch`,
        }}
      />
      <span className="font-mono font-bold text-[12.5px] text-slate-900 select-none whitespace-pre">
        {" / "}
      </span>
      <input
        ref={inputRef2}
        type="text"
        value={sub2}
        placeholder={placeholder2}
        onChange={(e) => handleSub2Change(e.target.value)}
        onKeyDown={handleKeyDown2}
        className="font-mono text-[12.5px] font-bold text-slate-900 bg-transparent outline-none p-0 m-0 border-none text-left"
        style={{
          ...monoStyle,
          width: `${Math.max(sub2Len, 2)}ch`,
        }}
      />
    </div>
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
  const monoFontStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "12.5px",
    lineHeight: "1.25rem",
  };

  return (
    <div className="my-4">
      {caption && <p className="text-[13.5px] font-bold mb-2.5" style={{ color: "#0f172a" }}>{caption}</p>}
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
                {row.map((cell, ci) => {
                  if (cell.t === "ro") {
                    const isPrefilledAnswer = ci > 0;
                    return (
                      <td
                        key={ci}
                        className="px-3.5 py-2.5 font-mono text-[12.5px] font-bold"
                        style={{
                          border: isPrefilledAnswer ? "2px solid #10b981" : "1px solid #94a3b8",
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          background: isPrefilledAnswer ? "#a7f3d0" : "#f8fafc",
                          boxSizing: "border-box",
                          ...monoFontStyle,
                        }}
                      >
                        {cell.text}
                      </td>
                    );
                  }

                  const cellVal = responses[cell.key] ?? "";
                  const colHeader = columns[ci];

                  return (
                    <td
                      key={ci}
                      className="p-0 transition-colors"
                      style={{
                        border: "1px solid #94a3b8",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box",
                      }}
                    >
                      <DualBoxCell
                        cellVal={cellVal}
                        colHeader={colHeader}
                        onChange={(val) => onChange(cell.key, val)}
                      />
                    </td>
                  );
                })}
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
        <ol className="space-y-1.5 text-[12.5px] font-medium" style={{ color: "#0f172a" }}>
          {TEST_INSTRUCTIONS.map((line, index) => (
            <li key={line} className="flex gap-2">
              <span className="font-bold select-none min-w-[18px]" style={{ color: "#475569" }}>{index + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
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
