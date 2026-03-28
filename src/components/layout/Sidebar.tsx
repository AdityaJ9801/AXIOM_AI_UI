"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, Activity, Plus } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { AgentHealthInfo } from "@/types/axiom";
import DatasetUploader from "@/components/interactive/DatasetUploader";
import clsx from "clsx";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const AGENT_COLORS: Record<string, string> = {
  context: "#00e5ff",
  sql: "#a78bfa",
  viz: "#34d399",
  ml: "#f59e0b",
  nlp: "#f472b6",
  report: "#60a5fa",
};

function AgentDot({ info }: { info: AgentHealthInfo }) {
  return (
    <div className="flex items-center gap-2 group" title={`${info.agent} — ${info.latency_ms?.toFixed(0) ?? "?"}ms`}>
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: info.healthy ? AGENT_COLORS[info.agent] ?? "#00e5ff" : "#ef4444" }}
        animate={info.healthy ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors capitalize">
        {info.agent}
      </span>
      {info.latency_ms != null && (
        <span className="text-xs text-zinc-600 ml-auto">{info.latency_ms.toFixed(0)}ms</span>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

export default function Sidebar() {
  const { contextId, sessionHistory, loadSession, resetWorkspace, agentsStatus, setAgentsStatus } =
    useWorkspaceStore();

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${API_BASE}/agents/status`);
        if (res.ok) setAgentsStatus(await res.json());
      } catch { /* non-fatal */ }
    }
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [setAgentsStatus]);

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-zinc-900/60 border-r border-zinc-800 backdrop-blur-sm">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight">AXIOM AI</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Multi-Agent Orchestrator</p>
      </div>

      {/* Dataset uploader */}
      <DatasetUploader />

      {/* Session history */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">History</span>
          </div>
          <button
            onClick={resetWorkspace}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 transition-colors"
            title="New analysis"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <AnimatePresence>
          {sessionHistory.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-4">No sessions yet</p>
          ) : (
            <div className="space-y-1">
              {sessionHistory.map((entry) => (
                <motion.button
                  key={entry.session_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => loadSession(entry)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-zinc-800 transition-colors group"
                >
                  <p className="text-xs text-zinc-300 truncate group-hover:text-white transition-colors">
                    {entry.query}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">{formatDate(entry.created_at)}</p>
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Agent health */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Agent Health</span>
        </div>
        {agentsStatus ? (
          <div className="space-y-1.5">
            {agentsStatus.agents.map((a) => (
              <AgentDot key={a.agent} info={a} />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {["context", "sql", "viz", "ml", "nlp", "report"].map((name) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" />
                <span className="text-xs text-zinc-600 capitalize">{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
