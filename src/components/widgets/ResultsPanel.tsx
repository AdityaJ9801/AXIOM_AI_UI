"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, SkipForward, Clock, AlertTriangle } from "lucide-react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { TaskResult } from "@/types/axiom";
import DataTableWidget from "./DataTableWidget";
import ChartWidget from "./ChartWidget";
import MarkdownReport from "./MarkdownReport";
import clsx from "clsx";

const AGENT_LABELS: Record<string, string> = {
  context: "Context",
  sql: "SQL Query",
  viz: "Visualization",
  ml: "ML Insights",
  nlp: "NLP Analysis",
  report: "Final Report",
};

const AGENT_COLORS: Record<string, string> = {
  context: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
  sql:     "text-violet-400 border-violet-500/30 bg-violet-500/5",
  viz:     "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  ml:      "text-amber-400 border-amber-500/30 bg-amber-500/5",
  nlp:     "text-pink-400 border-pink-500/30 bg-pink-500/5",
  report:  "text-blue-400 border-blue-500/30 bg-blue-500/5",
};

function StatusIcon({ status }: { status: TaskResult["status"] }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "skipped") return <SkipForward className="w-4 h-4 text-zinc-500" />;
  return <Clock className="w-4 h-4 text-zinc-500" />;
}

function extractText(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if (typeof r.report === "string") return r.report;
  if (typeof r.summary === "string") return r.summary;
  if (typeof r.text === "string") return r.text;
  if (typeof r.narrative === "string") return r.narrative;
  if (typeof r.content === "string") return r.content;
  if (typeof r.analysis === "string") return r.analysis;
  return null;
}

function hasChartData(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  return !!(r.type || r.chart_type || r.data || r.labels || r.series);
}

function hasTableData(result: unknown): boolean {
  if (!result) return false;
  if (Array.isArray(result)) return result.length > 0 && typeof result[0] === "object";
  if (typeof result === "object") {
    const r = result as Record<string, unknown>;
    return Array.isArray(r.rows) || Array.isArray(r.data) || Array.isArray(r.results);
  }
  return false;
}

function TaskResultCard({ taskResult }: { taskResult: TaskResult }) {
  const colorClass = AGENT_COLORS[taskResult.agent] ?? AGENT_COLORS.context;
  const text = extractText(taskResult.result);
  const showChart = taskResult.agent === "viz" && hasChartData(taskResult.result);
  const showTable = taskResult.agent === "sql" && hasTableData(taskResult.result);

  if (taskResult.status === "skipped") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("rounded-2xl border p-4", colorClass)}
    >
      <div className="flex items-center gap-2 mb-3">
        <StatusIcon status={taskResult.status} />
        <span className="text-sm font-semibold">{AGENT_LABELS[taskResult.agent] ?? taskResult.agent}</span>
        <span className="text-xs text-zinc-600 font-mono ml-auto">{taskResult.task_id}</span>
        {taskResult.duration_ms != null && (
          <span className="text-xs text-zinc-600 font-mono">{taskResult.duration_ms.toFixed(0)}ms</span>
        )}
      </div>

      {taskResult.status === "failed" && taskResult.error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300 font-mono">{taskResult.error}</p>
        </div>
      )}

      {taskResult.status === "completed" && (
        <>
          {showChart && <ChartWidget data={taskResult.result} />}
          {showTable && <DataTableWidget data={taskResult.result} />}
          {text && !showChart && !showTable && <MarkdownReport content={text} />}
          {!showChart && !showTable && !text && taskResult.result && (
            <pre className="text-xs text-zinc-400 font-mono bg-zinc-900 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(taskResult.result, null, 2)}
            </pre>
          )}
        </>
      )}
    </motion.div>
  );
}

export default function ResultsPanel() {
  const { phase, finalResponse, intent, errorMessage } = useWorkspaceStore();

  if (phase === "idle") return null;

  return (
    <div className="space-y-4">
      {/* Intent banner */}
      {intent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800"
        >
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Analysis Intent</p>
          <p className="text-sm text-zinc-200">{intent}</p>
        </motion.div>
      )}

      {/* Error state */}
      {phase === "error" && errorMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
        >
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Analysis Failed</p>
            <p className="text-xs text-red-400/80 mt-1 font-mono">{errorMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Partial warning */}
      {finalResponse?.partial && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <p className="text-xs text-amber-300">Some tasks failed — results may be incomplete.</p>
        </div>
      )}

      {/* Task results */}
      <AnimatePresence>
        {finalResponse?.results.map((r) => (
          <TaskResultCard key={r.task_id} taskResult={r} />
        ))}
      </AnimatePresence>
    </div>
  );
}
