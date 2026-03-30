"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Minus } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { LogEntry, LogLevel } from "@/types/axiom";

const LEVEL: Record<LogLevel, { color: string; bg: string; label: string }> = {
  system:  { color: "#71717a",  bg: "rgba(113,113,122,0.15)", label: "SYS"  },
  info:    { color: "#60a5fa",  bg: "rgba(96,165,250,0.15)",  label: "INFO" },
  success: { color: "#34d399",  bg: "rgba(52,211,153,0.15)",  label: "OK"   },
  warn:    { color: "#f59e0b",  bg: "rgba(245,158,11,0.15)",  label: "WARN" },
  error:   { color: "#f87171",  bg: "rgba(248,113,113,0.15)", label: "ERR"  },
};

const AGENT_COLORS: Record<string, string> = {
  context: "#00e5ff", sql: "#a78bfa", viz: "#34d399",
  ml: "#f59e0b", nlp: "#f472b6", report: "#60a5fa",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
    "." + String(d.getMilliseconds()).padStart(3, "0")
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const lvl = LEVEL[entry.level];
  const agentColor = entry.agent ? (AGENT_COLORS[entry.agent] ?? "#71717a") : null;

  return (
    <div className="flex items-baseline gap-2 px-3 py-[3px] font-mono text-[11px] hover:bg-white/[0.03] transition-colors leading-5">
      <span className="shrink-0 tabular-nums" style={{ color: "#4b5563", minWidth: 92 }}>
        {formatTime(entry.timestamp)}
      </span>
      <span
        className="shrink-0 px-1 rounded-sm text-[9px] font-bold leading-4 select-none"
        style={{ color: lvl.color, background: lvl.bg, minWidth: 30, textAlign: "center" }}
      >
        {lvl.label}
      </span>
      {agentColor ? (
        <span
          className="shrink-0 px-1 rounded-sm text-[9px] font-bold leading-4 select-none"
          style={{ color: agentColor, background: `${agentColor}20`, minWidth: 46, textAlign: "center" }}
        >
          {entry.agent!.toUpperCase()}
        </span>
      ) : (
        <span className="shrink-0" style={{ minWidth: 46 }} />
      )}
      <span className="flex-1 break-all" style={{ color: lvl.color === "#71717a" ? "#6b7280" : "#d1d5db" }}>
        {entry.message}
      </span>
      {entry.duration_ms != null && (
        <span className="shrink-0 tabular-nums" style={{ color: "#4b5563" }}>
          {entry.duration_ms.toFixed(0)}ms
        </span>
      )}
    </div>
  );
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 220;

export default function LiveLogsPanel() {
  const { logs, clearLogs, logsOpen, toggleLogs, phase } = useWorkspaceStore();
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const dragStartY = useRef<number>(0);
  const dragStartH = useRef<number>(DEFAULT_HEIGHT);

  const isLive = phase === "executing" || phase === "planning";

  // Auto-open when logs start coming in
  useEffect(() => {
    if (logs.length > 0 && !logsOpen) toggleLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs.length]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  }

  // Drag-to-resize handle
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartH.current = height;

    function onMove(ev: MouseEvent) {
      const delta = dragStartY.current - ev.clientY;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta)));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [height]);

  return (
    <AnimatePresence>
      {logsOpen && (
        <motion.div
          key="logs-terminal"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="flex flex-col w-full overflow-hidden flex-shrink-0"
          style={{
            borderTop: "1px solid #27272a",
            background: "#0d0d0f",
            minHeight: MIN_HEIGHT,
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="w-full flex items-center justify-center cursor-row-resize select-none"
            style={{ height: 4, background: "transparent" }}
          >
            <div className="w-8 h-0.5 rounded-full" style={{ background: "#3f3f46" }} />
          </div>

          {/* Tab bar — VS Code style */}
          <div
            className="flex items-center gap-0 flex-shrink-0 px-2"
            style={{ borderBottom: "1px solid #1f1f23", height: 32 }}
          >
            {/* Active tab */}
            <div
              className="flex items-center gap-1.5 px-3 h-full text-[11px] font-medium select-none"
              style={{
                color: "#e4e4e7",
                borderBottom: "1px solid #06b6d4",
                background: "#0d0d0f",
              }}
            >
              <span style={{ color: "#06b6d4", fontSize: 10 }}>▶</span>
              LOGS
              {isLive && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full ml-1"
                  style={{ background: "#06b6d4" }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}
            </div>

            {/* Event count */}
            <span className="ml-2 text-[10px] font-mono" style={{ color: "#52525b" }}>
              {logs.length} events
            </span>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={clearLogs}
                className="p-1 rounded transition-colors hover:bg-white/10"
                title="Clear"
              >
                <Trash2 className="w-3 h-3" style={{ color: "#52525b" }} />
              </button>
              <button
                onClick={toggleLogs}
                className="p-1 rounded transition-colors hover:bg-white/10"
                title="Minimize"
              >
                <Minus className="w-3 h-3" style={{ color: "#52525b" }} />
              </button>
              <button
                onClick={toggleLogs}
                className="p-1 rounded transition-colors hover:bg-white/10"
                title="Close"
              >
                <X className="w-3 h-3" style={{ color: "#52525b" }} />
              </button>
            </div>
          </div>

          {/* Log output */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden py-1"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
          >
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[11px] font-mono" style={{ color: "#3f3f46" }}>
                  No events yet
                </span>
              </div>
            ) : (
              logs.map((entry) => <LogRow key={entry.id} entry={entry} />)
            )}

            {/* Blinking cursor */}
            {isLive && (
              <div className="px-3 py-0.5 flex items-center">
                <motion.span
                  className="inline-block w-[7px] h-[13px] rounded-[1px]"
                  style={{ background: "#06b6d4" }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Scroll-to-bottom hint */}
          {!autoScroll && (
            <div
              className="flex items-center justify-center py-1 text-[10px] font-mono cursor-pointer hover:bg-white/5 transition-colors flex-shrink-0"
              style={{ color: "#52525b", borderTop: "1px solid #1f1f23" }}
              onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }}
            >
              ↓ jump to latest
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
