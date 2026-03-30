"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useOrchestratorSSE } from "@/hooks/useOrchestratorSSE";
import clsx from "clsx";

const SUGGESTIONS = [
  "Show total revenue by region for last quarter with a bar chart",
  "Predict next quarter sales by product category",
  "Analyze customer sentiment from feedback data",
  "Compare ML model performance across all features",
];

export default function CommandBar() {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { phase } = useWorkspaceStore();
  const { submit } = useOrchestratorSSE();
  const isRunning = phase === "planning" || phase === "executing";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [query]);

  useEffect(() => {
    function handleFocusCommand() {
      textareaRef.current?.focus();
    }
    window.addEventListener("axiom:focus-command", handleFocusCommand);
    return () => window.removeEventListener("axiom:focus-command", handleFocusCommand);
  }, []);

  function handleSubmit() {
    const q = query.trim();
    if (!q || isRunning) return;
    setQuery("");
    setShowSuggestions(false);
    submit(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="relative px-4 pb-4 pt-2">
      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && query.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full left-4 right-4 mb-2 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <Sparkles className="w-3 h-3" /> Suggested queries
              </span>
            </div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); setShowSuggestions(false); textareaRef.current?.focus(); }}
                className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <motion.div
        animate={{ scale: isRunning ? 0.99 : 1 }}
        transition={{ duration: 0.2 }}
        className="relative flex items-end gap-3 px-4 py-3 rounded-2xl transition-all duration-300 backdrop-blur-xl"
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${isRunning ? "rgba(0,229,255,0.5)" : "var(--border)"}`,
          boxShadow: isRunning ? "0 0 20px rgba(0,229,255,0.1)" : "var(--shadow-md)",
        }}
      >
        {isRunning && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ boxShadow: "0 0 20px rgba(0,229,255,0.15)" }}
          />
        )}

        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={isRunning ? "Analyzing…" : "Ask anything about your data…"}
          disabled={isRunning}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed max-h-40 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: "var(--text-primary)" }}
        />

        <button
          onClick={handleSubmit}
          disabled={!query.trim() || isRunning}
          className={clsx(
            "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
            query.trim() && !isRunning
              ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/30"
              : "cursor-not-allowed"
          )}
          style={!query.trim() || isRunning ? { background: "var(--bg-elevated)", color: "var(--text-faint)" } : {}}
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </motion.div>

      <p className="text-center text-xs mt-2" style={{ color: "var(--text-faint)" }}>
        Shift+Enter for new line · Enter to submit
      </p>
    </div>
  );
}
