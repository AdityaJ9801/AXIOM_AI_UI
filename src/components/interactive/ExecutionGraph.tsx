"use client";
import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
  Handle,
  Position,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { TaskNode, TaskResult, TaskStatus } from "@/types/axiom";

// ── Agent color palette ────────────────────────────────────────────────────
const AGENT_COLORS: Record<string, { bg: string; glow: string; border: string; text: string }> = {
  context: { bg: "rgba(0,229,255,0.08)",    glow: "rgba(0,229,255,0.5)",    border: "#00e5ff", text: "#00e5ff" },
  sql:     { bg: "rgba(167,139,250,0.08)",  glow: "rgba(167,139,250,0.5)",  border: "#a78bfa", text: "#a78bfa" },
  viz:     { bg: "rgba(52,211,153,0.08)",   glow: "rgba(52,211,153,0.5)",   border: "#34d399", text: "#34d399" },
  ml:      { bg: "rgba(245,158,11,0.08)",   glow: "rgba(245,158,11,0.5)",   border: "#f59e0b", text: "#f59e0b" },
  nlp:     { bg: "rgba(244,114,182,0.08)",  glow: "rgba(244,114,182,0.5)",  border: "#f472b6", text: "#f472b6" },
  report:  { bg: "rgba(96,165,250,0.08)",   glow: "rgba(96,165,250,0.5)",   border: "#60a5fa", text: "#60a5fa" },
};

// ── Agent icons ────────────────────────────────────────────────────────────
const AGENT_ICONS: Record<string, string> = {
  context: "🔍", sql: "🗄️", viz: "📊", ml: "🤖", nlp: "💬", report: "📋",
};

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, { icon: string; label: string; color: string }> = {
  pending:   { icon: "○", label: "Pending",   color: "#71717a" },
  running:   { icon: "◉", label: "Running",   color: "#00e5ff" },
  completed: { icon: "✓", label: "Completed", color: "#34d399" },
  failed:    { icon: "✗", label: "Failed",    color: "#f87171" },
  skipped:   { icon: "⊘", label: "Skipped",  color: "#52525b" },
};

// ── Node detail side panel ─────────────────────────────────────────────────
interface NodeDetail {
  task: TaskNode;
  status: TaskStatus;
  duration?: number | null;
  result?: TaskResult | null;
}

function NodeDetailPanel({ detail, onClose }: { detail: NodeDetail; onClose: () => void }) {
  const { task, status, duration, result } = detail;
  const colors = AGENT_COLORS[task.agent] ?? AGENT_COLORS.context;
  const statusCfg = STATUS_CONFIG[status];

  return (
    <motion.div
      key="node-panel"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 h-full w-72 z-50 flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-elevated)",
        borderLeft: `1px solid ${colors.border}`,
        boxShadow: `-8px 0 32px ${colors.glow}22`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid var(--border)` }}>
        <span className="text-lg">{AGENT_ICONS[task.agent] ?? "⚙️"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: colors.text }}>
            {task.agent}
          </p>
          <p className="text-xs font-mono truncate" style={{ color: "var(--text-faint)" }}>{task.task_id}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs px-2 py-1 rounded-md transition-colors hover:bg-white/10"
          style={{ color: "var(--text-muted)" }}
        >
          ✕
        </button>
      </div>

      {/* Status badge */}
      <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="text-sm" style={{ color: statusCfg.color }}>{statusCfg.icon}</span>
        <span className="text-xs font-medium" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
        {duration != null && (
          <span className="ml-auto text-xs font-mono" style={{ color: "var(--text-faint)" }}>
            {duration.toFixed(0)}ms
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
        {/* Description */}
        <section>
          <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
            Task
          </p>
          <p style={{ color: "var(--text-secondary)" }}>{task.description}</p>
        </section>

        {/* Dependencies */}
        {task.depends_on.length > 0 && (
          <section>
            <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
              Depends On
            </p>
            <div className="flex flex-wrap gap-1">
              {task.depends_on.map((dep) => (
                <span
                  key={dep}
                  className="px-1.5 py-0.5 rounded font-mono"
                  style={{ background: "var(--bg-surface)", color: "var(--text-faint)", border: "1px solid var(--border)" }}
                >
                  {dep}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Payload */}
        {Object.keys(task.payload).length > 0 && (
          <section>
            <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
              Payload
            </p>
            <pre
              className="rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed font-mono"
              style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              {JSON.stringify(task.payload, null, 2)}
            </pre>
          </section>
        )}

        {/* Result */}
        {result?.result != null && (
          <section>
            <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
              Result
            </p>
            <pre
              className="rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed font-mono"
              style={{ background: "var(--bg-surface)", color: "#34d399", border: "1px solid var(--border)" }}
            >
              {typeof result.result === "string"
                ? result.result.slice(0, 600)
                : JSON.stringify(result.result, null, 2).slice(0, 600)}
            </pre>
          </section>
        )}

        {/* Error */}
        {result?.error && (
          <section>
            <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]" style={{ color: "#f87171" }}>
              Error
            </p>
            <pre
              className="rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed font-mono"
              style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}
            >
              {result.error}
            </pre>
          </section>
        )}

        {/* Timing */}
        {(result?.started_at || result?.ended_at) && (
          <section>
            <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]" style={{ color: "var(--text-muted)" }}>
              Timing
            </p>
            <div className="space-y-1" style={{ color: "var(--text-faint)" }}>
              {result?.started_at && <p>Started: {new Date(result.started_at).toLocaleTimeString()}</p>}
              {result?.ended_at && <p>Ended: {new Date(result.ended_at).toLocaleTimeString()}</p>}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}

// ── Custom node component ──────────────────────────────────────────────────
type TaskNodeData = {
  task: TaskNode;
  status: TaskStatus;
  duration?: number | null;
  onSelect: (task: TaskNode) => void;
};

function TaskNodeComponent({ data }: NodeProps<TaskNodeData>) {
  const { task, status, duration, onSelect } = data;
  const colors = AGENT_COLORS[task.agent] ?? AGENT_COLORS.context;
  const statusCfg = STATUS_CONFIG[status];

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isPending = status === "pending";

  return (
    <div
      onClick={() => onSelect(task)}
      className="relative cursor-pointer select-none"
      style={{ minWidth: 160 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: colors.border, border: "none", width: 8, height: 8, left: -4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: colors.border, border: "none", width: 8, height: 8, right: -4 }}
      />

      {/* Glow ring for running */}
      {isRunning && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.04, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: `0 0 20px 4px ${colors.glow}`, borderRadius: 12 }}
        />
      )}

      {/* Completed pulse flash (one-shot) */}
      {isCompleted && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 1.12 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ boxShadow: `0 0 16px 4px ${colors.glow}`, borderRadius: 12 }}
        />
      )}

      {/* Card */}
      <motion.div
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: isPending ? 0.45 : 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="rounded-xl px-3 py-2.5"
        style={{
          background: colors.bg,
          border: `1.5px solid ${isFailed ? "#f87171" : isCompleted ? "#34d399" : isRunning ? colors.border : "var(--border)"}`,
          boxShadow: isRunning ? `0 0 8px ${colors.glow}` : isFailed ? "0 0 8px rgba(248,113,113,0.4)" : "none",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
      >
        {/* Top row: icon + agent + status icon */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm leading-none">{AGENT_ICONS[task.agent] ?? "⚙️"}</span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text }}>
            {task.agent}
          </span>
          <span
            className="ml-auto text-xs font-mono"
            style={{ color: isFailed ? "#f87171" : isCompleted ? "#34d399" : statusCfg.color }}
          >
            {statusCfg.icon}
          </span>
        </div>

        {/* Description */}
        <p
          className="text-xs leading-snug"
          style={{
            color: "var(--text-secondary)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.description}
        </p>

        {/* Duration */}
        {duration != null && (
          <p className="text-[10px] mt-1.5 font-mono" style={{ color: "var(--text-faint)" }}>
            {duration.toFixed(0)}ms
          </p>
        )}

        {/* Running progress bar */}
        {isRunning && (
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 rounded-b-xl"
            style={{ background: colors.border }}
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>
    </div>
  );
}

const nodeTypes = { taskNode: TaskNodeComponent };

// ── Layout builder ─────────────────────────────────────────────────────────
function buildLayout(tasks: TaskNode[]): { nodes: Node[]; edges: Edge[] } {
  const layers: Record<string, number> = {};

  function getLayer(taskId: string): number {
    if (layers[taskId] !== undefined) return layers[taskId];
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task || task.depends_on.length === 0) { layers[taskId] = 0; return 0; }
    const maxDep = Math.max(...task.depends_on.map(getLayer));
    layers[taskId] = maxDep + 1;
    return layers[taskId];
  }
  tasks.forEach((t) => getLayer(t.task_id));

  const byLayer: Record<number, TaskNode[]> = {};
  tasks.forEach((t) => {
    const l = layers[t.task_id];
    if (!byLayer[l]) byLayer[l] = [];
    byLayer[l].push(t);
  });

  const X_GAP = 230;
  const Y_GAP = 120;

  const nodes: Node[] = tasks.map((t) => {
    const layer = layers[t.task_id];
    const layerTasks = byLayer[layer];
    const idx = layerTasks.indexOf(t);
    const total = layerTasks.length;
    return {
      id: t.task_id,
      type: "taskNode",
      position: {
        x: layer * X_GAP,
        y: (idx - (total - 1) / 2) * Y_GAP,
      },
      data: { task: t, status: "pending" as TaskStatus, onSelect: () => {} },
    };
  });

  const edges: Edge[] = [];
  tasks.forEach((t) => {
    t.depends_on.forEach((dep) => {
      edges.push({
        id: `${dep}->${t.task_id}`,
        source: dep,
        target: t.task_id,
        animated: false,
        type: "smoothstep",
        style: { stroke: "var(--border)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--border)" },
      });
    });
  });

  return { nodes, edges };
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ExecutionGraph() {
  const { graph, taskStatuses, taskDurations, results, phase } = useWorkspaceStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  const handleSelectTask = useCallback((task: TaskNode) => {
    setSelectedTask((prev) => (prev?.task_id === task.task_id ? null : task));
  }, []);

  // Build graph when plan arrives
  useEffect(() => {
    if (!graph) return;
    const { nodes: n, edges: e } = buildLayout(graph.tasks);
    // Inject onSelect callback into each node
    setNodes(n.map((nd) => ({ ...nd, data: { ...nd.data, onSelect: handleSelectTask } })));
    setEdges(e);
  }, [graph, setNodes, setEdges, handleSelectTask]);

  // Update node data + edge styles when statuses change
  useEffect(() => {
    if (!graph) return;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: taskStatuses[n.id] ?? "pending",
          duration: taskDurations[n.id],
          onSelect: handleSelectTask,
        },
      }))
    );
    setEdges((eds) =>
      eds.map((e) => {
        const srcStatus = taskStatuses[e.source];
        const tgtStatus = taskStatuses[e.target];
        const isFlowing = tgtStatus === "running";
        const isDone = srcStatus === "completed" && tgtStatus === "completed";
        const isFailed = tgtStatus === "failed";
        const color = isFailed ? "#f87171" : isDone ? "#34d399" : isFlowing ? "#00e5ff" : "var(--border)";
        return {
          ...e,
          animated: isFlowing,
          style: { stroke: color, strokeWidth: isFlowing ? 2.5 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      })
    );
  }, [taskStatuses, taskDurations, graph, setNodes, setEdges, handleSelectTask]);

  if (!graph || (phase !== "executing" && phase !== "complete" && phase !== "planning")) return null;

  const completedCount = Object.values(taskStatuses).filter((s) => s === "completed").length;
  const totalCount = graph.tasks.length;
  const selectedResult = selectedTask
    ? results.find((r) => r.task_id === selectedTask.task_id) ?? null
    : null;

  const graphHeight = Math.max(300, totalCount * 65 + 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl overflow-hidden relative"
      style={{
        height: graphHeight,
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: phase === "executing" ? "#00e5ff" : phase === "complete" ? "#34d399" : "#f59e0b" }}
          animate={phase === "executing" ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Execution Graph
        </span>
        {phase === "executing" && (
          <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>
            {completedCount}/{totalCount} done
          </span>
        )}
        <span className="text-xs font-mono ml-auto" style={{ color: "var(--text-faint)" }}>
          {totalCount} tasks · click node for details
        </span>
      </div>

      {/* React Flow canvas */}
      <div style={{ height: graphHeight - 44 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.35 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="var(--border)" gap={24} size={1} />
          <Controls
            showInteractive={false}
            className="!shadow-none !border !border-[var(--border)] !bg-[var(--bg-elevated)] !rounded-lg overflow-hidden"
          />
        </ReactFlow>
      </div>

      {/* Node detail side panel */}
      <AnimatePresence>
        {selectedTask && (
          <NodeDetailPanel
            detail={{
              task: selectedTask,
              status: taskStatuses[selectedTask.task_id] ?? "pending",
              duration: taskDurations[selectedTask.task_id],
              result: selectedResult,
            }}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
