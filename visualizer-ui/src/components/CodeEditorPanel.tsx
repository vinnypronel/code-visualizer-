"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import type { editor, Position } from "monaco-editor";
import {
  Code2,
  ChevronLeft,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  HelpCircle,
  Eye,
  Play,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
type MonacoEditorInstance = Parameters<OnMount>[0];
type MonacoApi = Parameters<OnMount>[1];
type DecorationCollection = ReturnType<MonacoEditorInstance["createDecorationsCollection"]>;

/*
 * State of a "Run my code" attempt.
 *
 * `title` is the calm one-line summary a first-year student reads first.
 * `detail` is plain-language advice. `verbatim` is the compiler or JVM message
 * exactly as it came back, never reworded and never truncated, because for a
 * compile error that text is the single most useful thing on the screen.
 */
export type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "error"; title: string; detail?: string; verbatim?: string };

interface CodeEditorPanelProps {
  code: string;
  activeLine: number | null;
  activeLines?: number[] | null;
  primaryLabel: string;
  primaryAriaLabel: string;
  stepLabel?: string;
  emphasizeActiveLine?: boolean;
  canGoBack: boolean;
  onStepBack: () => void;
  onPrimary: () => void;
  onReset: () => void;
  onOpenGuide: () => void;
  onShowGuide?: () => void;
  guideHidden?: boolean;
  /* Guide button is hidden for examples the walkthrough has no narration for. */
  showGuideButton?: boolean;
  /* Monaco stays read-only unless `isEditing` is explicitly true. */
  isEditing?: boolean;
  runState?: RunState;
  onCancelEdit?: () => void;
  onCodeChange?: (value: string) => void;
  onRunCode?: () => void;
}

export default function CodeEditorPanel({
  code,
  activeLine,
  activeLines,
  primaryLabel,
  primaryAriaLabel,
  stepLabel,
  emphasizeActiveLine = false,
  canGoBack,
  onStepBack,
  onPrimary,
  onReset,
  onOpenGuide,
  onShowGuide,
  guideHidden = false,
  showGuideButton = true,
  isEditing = false,
  runState = { status: "idle" },
  onCancelEdit,
  onCodeChange,
  onRunCode,
}: CodeEditorPanelProps) {
  const isRunThisLine = primaryLabel.startsWith("Run Line") || primaryLabel === "Run This Line";
  const [copied, setCopied] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);
  const decorationsRef = useRef<DecorationCollection | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);

    // Register Monaco Hover Provider for beginner-friendly CS terminology
    monaco.languages.registerHoverProvider("java", {
      provideHover: (model: editor.ITextModel, position: Position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const cleanWord = word.word;
        if (cleanWord === "new") {
          return {
            contents: [
              { value: "**The `new` keyword**" },
              { value: "Tells your computer to carve out space over in the Heap (storage warehouse) for a new object or array!" }
            ]
          };
        }
        if (cleanWord === "next") {
          return {
            contents: [
              { value: "**The `next` variable reference**" },
              { value: "Points to the address tag of the next box, linking them in memory." }
            ]
          };
        }
        if (cleanWord === "list" || cleanWord === "temp") {
          return {
            contents: [
              { value: `**The \`${cleanWord}\` reference**` },
              { value: "An address tag stored on the workbench (stack) that points to a specific block of memory in the warehouse (heap)." }
            ]
          };
        }
        if (cleanWord === "head") {
          return {
            contents: [
              { value: "**The `head` reference**" },
              { value: "A card on the workbench holding the address of the very first node in our chain." }
            ]
          };
        }
        return null;
      }
    });
  };

  // A guide card can describe a range; otherwise highlight the execution line.
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    const linesToHighlight = activeLines ?? (
      activeLine !== null && activeLine !== undefined ? [activeLine] : []
    );

    if (linesToHighlight.length > 0) {
      decorationsRef.current = editorRef.current.createDecorationsCollection(
        linesToHighlight.map((line) => ({
          range: new monacoRef.current.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "exec-highlight-line",
            marginClassName: "exec-highlight-margin",
          },
        })),
      );
      editorRef.current.revealLineInCenter(linesToHighlight[0]);
    }
  }, [activeLine, activeLines, code, editorReady]);

  return (
    <div
      id="onboarding-editor-panel"
      className={`flex flex-col h-full bg-slate-950 ${emphasizeActiveLine ? "manual-editor-line-focus" : ""}`}
      style={{ background: "#1e1e1e" }}
    >
      {/* Header Panel */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">Java Code</span>
        </div>

        {isEditing ? (
          <span className="text-[10px] text-amber-300">You are editing. Change the code, then run it.</span>
        ) : (
          <span className="text-[10px] text-slate-500">Highlighted line is the current lesson step</span>
        )}
      </div>

      {/* Monaco Code Window */}
      <div id="onboarding-code-content" className="flex-1 min-h-0 overflow-hidden relative">
        <MonacoEditor
          height="100%"
          language="java"
          value={code}
          theme="vs-dark"
          onMount={handleEditorMount}
          onChange={(value) => {
            if (isEditing) onCodeChange?.(value ?? "");
          }}
          options={{
            fontSize: 13,
            lineHeight: 24,
            fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            glyphMargin: false,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            renderLineHighlight: "gutter",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            /* Read-only unless the user has explicitly entered edit mode. */
            readOnly: !isEditing,
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="absolute bottom-3 right-3 p-1.5 rounded-md bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all z-10"
          title="Copy Code"
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>
      </div>

      {/*
        Result of a run, kept directly under the editor so the message and the
        code it refers to are read together. A compile error is shown verbatim
        and in full.
      */}
      {runState.status === "error" && (
        <div
          className="flex-shrink-0 border-t px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--bg-panel)", maxHeight: "38%", overflowY: "auto" }}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-[1px]" style={{ color: "#b45309" }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {runState.title}
              </p>
              {runState.detail && (
                <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {runState.detail}
                </p>
              )}
              {runState.verbatim && (
                <pre
                  className="mt-2 whitespace-pre-wrap break-words rounded-md border p-2.5 text-[11px] leading-relaxed"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-panel-2)",
                    color: "var(--text-primary)",
                    fontFamily: "'Geist Mono', 'Fira Code', monospace",
                  }}
                >
                  {runState.verbatim}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        id="onboarding-code-controls"
        className="code-step-controls flex items-center justify-between border-t flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel-2)" }}
      >
        {isEditing ? (
          <>
            <button
              type="button"
              className="lesson-guide-button"
              onClick={onCancelEdit}
              disabled={runState.status === "running"}
            >
              <X size={14} aria-hidden="true" /> Cancel editing
            </button>

            <button
              type="button"
              onClick={onRunCode}
              disabled={runState.status === "running"}
              className="btn-primary min-w-[138px] justify-center"
              aria-label="Run my code"
            >
              {runState.status === "running" ? (
                <>
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  <span>Running…</span>
                </>
              ) : (
                <>
                  <Play size={15} aria-hidden="true" />
                  <span>Run my code</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* The lesson progress rail above the workspace is the single step counter,
              * so this footer only carries the controls. */}
            <div className="code-step-controls-left flex items-center">
              {showGuideButton && (
                <button id="onboarding-guide-button" type="button" className="lesson-guide-button" onClick={onOpenGuide}>
                  <HelpCircle size={14} aria-hidden="true" /> Reset Guide
                </button>
              )}
              {showGuideButton && guideHidden && onShowGuide && (
                <button
                  id="onboarding-show-guide-button"
                  type="button"
                  className="lesson-guide-button"
                  onClick={onShowGuide}
                >
                  <Eye size={14} aria-hidden="true" /> Show Guide
                </button>
              )}
            </div>

            <div className="code-step-controls-right flex items-center">
              {stepLabel && (
                <span
                  className="lesson-toolbar-step"
                  aria-label={stepLabel}
                >
                  {stepLabel}
                </span>
              )}
              <button id="onboarding-restart-button" onClick={onReset} className="icon-button" title="Back to lesson selection" aria-label="Back to lesson selection">
                <RotateCcw size={15} />
              </button>
              <button id="onboarding-step-back" onClick={onStepBack} disabled={!canGoBack} className="icon-button" title="Previous step" aria-label="Previous step">
                <ChevronLeft size={16} />
              </button>
              <div className={isRunThisLine ? "run-line-button-slot" : undefined}>
                <button
                  id="onboarding-playback-controls"
                  onClick={onPrimary}
                  className={`btn-primary code-toolbar-primary justify-center ${isRunThisLine ? "run-line-button" : ""}`}
                  aria-label={primaryAriaLabel}
                >
                  <span>{primaryLabel}</span>
                  <ArrowRight className="btn-arrow" size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
