"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import PostLessonPanel, { type PostLessonExample } from "@/components/visualizer/PostLessonPanel";

interface PostLessonExplorerModalProps {
  isOpen: boolean;
  examples: PostLessonExample[];
  activeExampleId: string;
  onClose: () => void;
  onLoadExample: (id: string) => void;
}

export default function PostLessonExplorerModal({
  isOpen,
  examples,
  activeExampleId,
  onClose,
  onLoadExample,
}: PostLessonExplorerModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483600, background: "rgba(23, 32, 51, 0.58)" }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="explore-examples-title"
        className="panel-scroll relative max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg border p-5"
        style={{
          width: "min(680px, 100%)",
          background: "var(--bg-panel)",
          borderColor: "var(--border)",
          boxShadow: "0 22px 52px rgba(23, 32, 51, 0.24)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="lesson-kicker">Lesson complete</div>
            <h2 id="explore-examples-title" className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              Keep exploring Java
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Load another example at its first step, or edit the program yourself.
            </p>
          </div>
          <button type="button" className="btn-ghost !p-2" onClick={onClose} aria-label="Close exploration options">
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <PostLessonPanel
          examples={examples}
          activeExampleId={activeExampleId}
          onLoadExample={onLoadExample}
          showHeading={false}
        />
      </section>
    </div>,
    document.body,
  );
}
