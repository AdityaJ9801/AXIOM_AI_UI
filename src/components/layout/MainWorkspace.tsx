"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import CommandBar from "@/components/interactive/CommandBar";
import ExecutionGraph from "@/components/interactive/ExecutionGraph";
import PlanningState from "@/components/interactive/PlanningState";
import ResultsPanel from "@/components/widgets/ResultsPanel";
import { Sparkles } from "lucide-react";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-cyan-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          AXIOM AI Workspace
        </h2>
        <p className="text-sm max-w-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Ask a natural language question about your data. The orchestrator will plan, execute, and visualize the results in real time.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {[
          "Show revenue by region with a chart",
          "Predict next quarter sales",
          "Analyze customer sentiment",
          "Compare ML model features",
        ].map((hint) => (
          <div
            key={hint}
            className="px-3 py-2 rounded-lg text-xs text-left cursor-default"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {hint}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MainWorkspace() {
  const { phase } = useWorkspaceStore();
  const showEmpty = phase === "idle";
  const showGraph = phase === "executing" || phase === "complete" || phase === "planning";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {showEmpty ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl mx-auto">
              <PlanningState />
              {showGraph && <ExecutionGraph />}
              <ResultsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky command bar */}
      <div
        className="backdrop-blur-sm"
        style={{ borderTop: "1px solid var(--border)", background: "color-mix(in srgb, var(--bg-base) 80%, transparent)" }}
      >
        <div className="max-w-4xl mx-auto">
          <CommandBar />
        </div>
      </div>
    </div>
  );
}
