"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Code2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { Preset } from "@/types/visualizer";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorPanelProps {
  code: string;
  onChange: (val: string) => void;
  activeLine: number | null;
  presetId: string;
  onPresetChange: (id: string) => void;
  presets: Preset[];
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onRun: () => void;
}

export default function CodeEditorPanel({
  code,
  onChange,
  activeLine,
  presetId,
  onPresetChange,
  presets,
  currentStep,
  totalSteps,
  isPlaying,
  setIsPlaying,
  onStepBack,
  onStepForward,
  onReset,
  onRun,
}: CodeEditorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Gentle pulse cue timer: triggers when user has been idle on Step 1 (index 0) for 5 seconds
  useEffect(() => {
    setShowPulse(false);
    if (currentStep === 0 && !isPlaying) {
      const timer = setTimeout(() => {
        setShowPulse(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isPlaying]);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Monaco Hover Provider for beginner-friendly CS terminology
    monaco.languages.registerHoverProvider("java", {
      provideHover: (model: any, position: any) => {
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

  // Sync Monaco line highlighting decorations with activeLine
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    if (activeLine !== null && activeLine !== undefined) {
      decorationsRef.current = editorRef.current.createDecorationsCollection([
        {
          range: new monacoRef.current.Range(activeLine, 1, activeLine, 1),
          options: {
            isWholeLine: true,
            className: "exec-highlight-line",
            glyphMarginClassName: "exec-highlight-glyph",
          },
        },
      ]);
      editorRef.current.revealLineInCenter(activeLine);
    }
  }, [activeLine, code]);

  // Sync Inline Monaco code decorations for keywords
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const decorations: any[] = [];
    const monaco = monacoRef.current;

    const keywords = ["new"];
    keywords.forEach(keyword => {
      const matches = model.findMatches(keyword, true, false, true, null, true);
      matches.forEach((match: any) => {
        decorations.push({
          range: match.range,
          options: {
            inlineClassName: "monaco-info-icon",
          }
        });
      });
    });

    const decorationsCollection = editorRef.current.createDecorationsCollection(decorations);
    return () => {
      decorationsCollection.clear();
    };
  }, [code]);

  return (
    <div id="onboarding-editor-panel" className="flex flex-col h-full bg-slate-950" style={{ background: "var(--bg-panel)" }}>
      {/* Header Panel */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-blue-500" />
          <span className="text-xs font-semibold text-slate-200">Java Code Editor</span>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">Example:</span>
          <select
            value={presetId}
            onChange={(e) => onPresetChange(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-blue-500/50 hover:bg-slate-900 transition-colors"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monaco Code Window */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <MonacoEditor
          height="100%"
          language="java"
          value={code}
          onChange={(val) => onChange(val ?? "")}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            glyphMargin: true, // Required for glyph line decorations
            scrollBeyondLastLine: false,
            wordWrap: "on",
            renderLineHighlight: "gutter",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            readOnly: false, // Students can edit code if they want
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all z-10"
          title="Copy Code"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>
      </div>

      {/* Playback Controls Panel (Directly below code editor) */}
      <div
        className="flex flex-col gap-2.5 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel-2)" }}
      >
        <div className="flex items-center justify-between">
          {/* Simulation Progress Tracker */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Timeline</span>
            <span className="badge badge-blue font-mono text-[10px]">
              Step {currentStep + 1} / {totalSteps}
            </span>
          </div>

          {/* Quick Run & Visualize button */}
          <button
            onClick={onRun}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 text-white"
            style={{ background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)" }}
          >
            <Zap size={12} fill="currentColor" />
            <span>Run &amp; Visualize</span>
          </button>
        </div>

        {/* Step-by-Step Navigation Controls */}
        <div className="flex items-center justify-center gap-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800/40">
          {/* Reset */}
          <button
            onClick={onReset}
            disabled={currentStep === 0 && !isPlaying}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Reset to Start"
          >
            <RotateCcw size={14} />
          </button>

          <div className="w-px h-4 bg-slate-800" />

          {/* Step Back */}
          <button
            onClick={onStepBack}
            disabled={currentStep === 0}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Step Back"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? "Pause Simulation" : "Auto Play Trace"}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-0.5" />}
          </button>

          {/* Step Forward */}
          <button
            id="onboarding-playback-controls"
            onClick={() => {
              setShowPulse(false);
              onStepForward();
            }}
            disabled={currentStep === totalSteps - 1}
            className={`p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all ${
              showPulse ? "animate-pulse ring-2 ring-blue-500/50 bg-blue-500/10 text-blue-400 font-bold" : ""
            }`}
            title="Step Forward"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
