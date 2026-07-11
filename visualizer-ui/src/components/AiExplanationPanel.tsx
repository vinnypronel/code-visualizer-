"use client";

import { useState, useEffect } from "react";
import { Sparkles, Info, ChevronDown } from "lucide-react";
import { BananaDiagram } from "@/types/visualizer";

interface AiExplanationPanelProps {
  explanation: string;
  diagram: BananaDiagram;
  currentStep: number;
  totalSteps: number;
  onHoverElement: (id: string | null) => void;
}

// Custom hook to stream tutor speech text letter-by-letter
function useStreamText(text: string, speed = 10) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      setDisplayed((_) => {
        const nextText = text.slice(0, index + 1);
        index++;
        if (index >= text.length) {
          clearInterval(interval);
        }
        return nextText;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

// Regex to capture variables head, temp, val, list, size, s, n1, n2 and friendly tags like [Object 1], [Object 2]
const TOKEN_REGEX = /(\bhead\b|\btemp\b|\bval\b|\blist\b|\bsize\b|\bs\b|\bn1\b|\bn2\b|\[Object \d+\])/gi;

interface AiExplanationPanelProps {
  explanation: string;
  diagram: BananaDiagram;
  currentStep: number;
  totalSteps: number;
  onHoverElement: (id: string | null) => void;
  presetId?: string;
}

export default function AiExplanationPanel({
  explanation,
  diagram,
  currentStep,
  totalSteps,
  onHoverElement,
  presetId = "linkedlist",
}: AiExplanationPanelProps) {
  const streamedExplanation = useStreamText(explanation, 8);
  const isStreamingFinished = streamedExplanation.length === explanation.length;
  const [conceptOpen, setConceptOpen] = useState(false);

  // Auto-collapse concept guide when moving to a new step to focus on the code line
  useEffect(() => {
    setConceptOpen(false);
  }, [currentStep]);

  // Parse streamed text and wrap variables and references in hover spans
  const renderParsedContent = (raw: string) => {
    return raw.split("\n").map((line, li) => {
      const parts = line.split(TOKEN_REGEX);
      return (
        <p key={li} className="mb-2 last:mb-0">
          {parts.map((part, pi) => {
            const lower = part.toLowerCase();
            const isVar = ["head", "temp", "val", "list", "size", "s", "n1", "n2"].includes(lower);
            const isAddress = part.startsWith("[Object");

            if (isVar) {
              const targetId = `stack-${lower}`;
              return (
                <span
                  key={pi}
                  className="underline decoration-dotted decoration-blue-400 hover:decoration-solid hover:text-blue-300 cursor-pointer font-semibold transition-all px-0.5 text-blue-400/90"
                  onMouseEnter={() => onHoverElement(targetId)}
                  onMouseLeave={() => onHoverElement(null)}
                >
                  {part}
                </span>
              );
            } else if (isAddress) {
              const numMatch = part.match(/\d+/);
              const num = numMatch ? numMatch[0] : "1";
              
              let heapId = "101";
              if (presetId === "linkedlist") {
                heapId = num === "1" ? "101" : "102";
              } else if (presetId === "arraylist") {
                heapId = num === "1" ? "201" : "202";
              } else if (presetId === "stack") {
                heapId = num === "1" ? "301" : num === "2" ? "302" : "303";
              } else {
                heapId = num === "1" ? "101" : num === "2" ? "102" : "303";
              }

              const targetId = `heap-${heapId}`;
              // Determine theme colors based on object number
              const colorClass = num === "1" 
                ? "decoration-blue-400 text-blue-400/90 hover:text-blue-300"
                : num === "2"
                  ? "decoration-purple-400 text-purple-400/90 hover:text-purple-300"
                  : "decoration-emerald-400 text-emerald-400/90 hover:text-emerald-300";

              return (
                <span
                  key={pi}
                  className={`underline decoration-dotted cursor-pointer font-semibold transition-all px-0.5 ${colorClass}`}
                  onMouseEnter={() => onHoverElement(targetId)}
                  onMouseLeave={() => onHoverElement(null)}
                >
                  {part}
                </span>
              );
            }

            return <span key={pi}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950" style={{ background: "var(--bg-panel)" }}>
      {/* Panel Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-400" />
          <span className="text-xs font-semibold text-slate-200">Gemini CS Tutor</span>
        </div>
        <span className="badge badge-purple text-[9px] uppercase">Online</span>
      </div>

      {/* Tutor Conversation Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5 panel-scroll">
        
        {/* Chat Bubble Interface */}
        <div className="flex gap-3 items-start animate-fade-in">
          {/* Tutor Round Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/10 border border-violet-500/30"
            style={{ background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent-3) 100%)" }}
          >
            <Sparkles size={14} className="text-white" />
          </div>

          {/* Dialogue Message */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Gemini Coach</span>
              <span className="text-[9px] text-slate-500">Just now</span>
            </div>
            
            <div
              className="px-3.5 py-3 rounded-2xl rounded-tl-none border text-xs leading-relaxed text-slate-300 relative bg-slate-900/60 border-slate-800/60 shadow-lg shadow-black/20"
            >
              {renderParsedContent(streamedExplanation)}
              {!isStreamingFinished && <span className="ai-streaming ml-0.5" />}
            </div>
          </div>
        </div>

        {/* Collapsible Nano Banana Diagram Accordion */}
        <div className="pt-2">
          <button
            onClick={() => setConceptOpen(!conceptOpen)}
            className="w-full flex items-center justify-between text-left p-3 bg-slate-900/30 border border-slate-850 hover:border-slate-800 rounded-xl hover:bg-slate-900/50 transition-all shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Info size={13} className="text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Need a deeper breakdown?
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-slate-500 transition-transform duration-200 ${
                conceptOpen ? "rotate-180 text-slate-300" : ""
              }`}
            />
          </button>

          {conceptOpen && (
            <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 animate-fade-in transition-all">
              {/* Concept Title & Breakdown */}
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-200">{diagram.title}</h5>
                <p className="text-[11px] text-slate-400 leading-normal">{diagram.description}</p>
              </div>

              {/* Visual SVG diagram */}
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-850 flex items-center justify-center min-h-[130px] select-none hover:border-slate-800 transition-colors">
                <div
                  className="w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: diagram.svgMarkup }}
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Tutor Footer */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-t flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel-2)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-slate-500 font-mono">
          {!isStreamingFinished ? "Typewriter streaming active..." : "Ready to explain next step"}
        </span>
      </div>
    </div>
  );
}
