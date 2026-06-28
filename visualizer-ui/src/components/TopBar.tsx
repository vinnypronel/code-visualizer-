"use client";

import { useState } from "react";
import {
  Zap,
  Settings,
  Bell,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  Moon,
  Sparkles,
} from "lucide-react";

interface TopBarProps {
  onStartTour?: () => void;
}

export default function TopBar({ onStartTour }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header
      className="flex items-center justify-between px-5 py-0 flex-shrink-0 z-30 relative"
      style={{
        height: 52,
        background: "var(--bg-header)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "0 0 14px var(--accent-glow)",
          }}
        >
          <Zap size={15} fill="white" color="white" />
        </div>

        <div className="flex flex-col leading-none">
          <span className="gradient-text text-sm font-bold tracking-tight">
            CodeViz
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            UR²PhD · Research Tool
          </span>
        </div>

        <div className="w-px h-5 ml-1" style={{ background: "var(--border)" }} />

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>Workspace</span>
          <ChevronRight size={12} />
          <span style={{ color: "var(--text-secondary)" }}>Sample.java</span>
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <span className="badge badge-green text-[10px]">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1"
            style={{ background: "var(--success)", animation: "pulse-glow 2s ease infinite" }}
          />
          Connected
        </span>

        <div className="w-px h-5" style={{ background: "var(--border)" }} />

        <button
          onClick={onStartTour}
          className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-violet-400 hover:text-violet-300 hover:border-violet-550/30 transition-all font-semibold"
          title="Start Onboarding Tour"
        >
          <Sparkles size={13} className="text-violet-400 animate-pulse" />
          <span>Quick Tour</span>
        </button>

        <div className="w-px h-5" style={{ background: "var(--border)" }} />

        <button className="btn-ghost text-xs px-2 py-1.5" title="Experimental features">
          <FlaskConical size={13} style={{ color: "var(--accent-2)" }} />
        </button>

        <button className="btn-ghost text-xs px-2 py-1.5" title="Repository">
          <ExternalLink size={13} />
        </button>

        <button className="btn-ghost text-xs px-2 py-1.5" title="Dark mode">
          <Moon size={13} />
        </button>

        <button className="btn-ghost text-xs px-2 py-1.5" title="Notifications">
          <Bell size={13} />
        </button>

        <button
          className="btn-ghost text-xs px-2 py-1.5"
          onClick={() => setSettingsOpen(o => !o)}
          title="Settings"
        >
          <Settings size={13} className={settingsOpen ? "animate-spin" : ""} />
        </button>

        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
            color: "white",
            cursor: "pointer",
          }}
          title="Profile"
        >
          U
        </div>
      </div>
    </header>
  );
}
