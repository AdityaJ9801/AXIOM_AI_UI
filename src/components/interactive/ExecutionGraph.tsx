"use client";
import { useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { TaskNode, TaskStatus } from "@/types/axiom";
import clsx from "clsx";

const AGENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  context: { bg: "rgba(0,229,255,0.1)", border: "#00e5ff", text: "#00e5ff" },
  sql:     { bg: "rgba(167,139,250,0.1)", border: "#a78bfa", text: "#a78bfa" },
  viz:     { bg: "rgba(52,211,153,0.1)", border: "#34d399", text: "#34d399" },
  ml:      { bg: "rgba(245,158,11,0.1)", border: "#f59e0b", text: "#f59e0b" },
  nlp:     { bg: "rgba(244,114,182,0.1)", border: "#f472b6", text: "#f472b6" },
  report:  { bg: "rgba(96,165,250,0.1)", border: "#60a5fa", text: "#60a5fa" },
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending:   "opacity-50",
  running:   "animate-pulse",
  completed: "opacity-100",
  failed:    "opacity-80",
  skipped:   "opacity-30",
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  pending:   "○",
  running:   "◉",
  completed: "✓",
  failed:    "✗",
  skipped:   "⊘",
};

function TaskNodeComponent({ data }: { data: { task: TaskNode; status: TaskStatus; duration?: number | null } }) {
  const { task, status, duration } = data;
  const colors = AGENT_COLORS[task.agent] ?? AGENT_COLORS.context;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx("relative px-3 py-2.5 rounded-xl border min-w-[140px]", STATUS_STYLES[status])}
      style={{ background: colors.bg, borderColor: colors.border, borderWidth: 1 }}
    >
      <Handle type="target" position={Position.Left} style={{ background: colors.border, border: "none", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: colors.border, border: "none", width: 8, height: 8 }} />

      {status === "running" && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ boxShadow: `0 0 12px ${colors.border}` }}
        />
      )}

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-mono" style={{ color: colors.text }}>
          {STATUS_ICONS[status]}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.text }}>
          {task.agent}
        </span>
        <span className="text-xs font-mono ml-auto" style={{ color: "var(--text-faint)" }}>{task.task_id}</span>
      </div>
      <p className="text-xs leading-tight line-clamp-2" style={{ color: "var(--text-secondary)" }}>{task.description}</p>
      {duration != null && (
        <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-faint)" }}>{duration.toFixed(0)}ms</p>
      )}
    </motion.div>
  );
}

const nodeTypes = { taskNode: TaskNodeComponent };

function buildLayout(tasks: TaskNode[]): { nodes: Node[]; edges: Edge[] } {
  // Topological layer assignment
  const layers: Record<string, number> = {};
  const resolved = new Set<string>();

  function getLayer(taskId: string): number {
    if (layers[taskId] !== undefined) return layers[taskId];
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task || task.depends_on.length === 0) {
      layers[taskId] = 0;
      return 0;
    }
    const maxDep = Math.max(...task.depends_on.map(getLayer));
    layers[taskId] = maxDep + 1;
    return layers[taskId];
  }

  tasks.forEach((t) => getLayer(t.task_id));

  // Group by layer
  const byLayer: Record<number, TaskNode[]> = {};
  tasks.forEach((t) => {
    const l = layers[t.task_id];
    if (!byLayer[l]) byLayer[l] = [];
    byLayer[l].push(t);
  });

  const X_GAP = 220;
  const Y_GAP = 110;

  const nodes: Node[] = tasks.map((t) => {
    const layer = layers[t.task_id];
    const layerTasks = byLayer[layer];
    const idx = layerTasks.indexOf(t);
    const totalInLayer = layerTasks.length;
    return {
      id: t.task_id,
      type: "taskNode",
      position: {
        x: layer * X_GAP,
        y: (idx - (totalInLayer - 1) / 2) * Y_GAP,
      },
      data: { task: t, status: "pending" as TaskStatus },
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
        style: { stroke: "#3f3f46", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#3f3f46" },
      });
    });
  });

  return { nodes, edges };
}

export default function ExecutionGraph() {
  const { graph, taskStatuses, taskDurations, phase } = useWorkspaceStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  // Build graph when plan arrives
  useEffect(() => {
    if (!graph) return;
    const { nodes: n, edges: e } = buildLayout(graph.tasks);
    setNodes(n);
    setEdges(e);
  }, [graph, setNodes, setEdges]);

  // Update node data when statuses change
  useEffect(() => {
    if (!graph) return;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: taskStatuses[n.id] ?? "pending",
          duration: taskDurations[n.id],
        },
      }))
    );
    // Update edge animation for running tasks
    setEdges((eds) =>
      eds.map((e) => {
        const targetStatus = taskStatuses[e.target];
        const isActive = targetStatus === "running";
        return {
          ...e,
          animated: isActive,
          style: {
            stroke: isActive ? "#00e5ff" : taskStatuses[e.target] === "completed" ? "#34d399" : "#3f3f46",
            strokeWidth: isActive ? 2 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isActive ? "#00e5ff" : "#3f3f46",
          },
        };
      })
    );
  }, [taskStatuses, taskDurations, graph, setNodes, setEdges]);

  if (!graph || (phase !== "executing" && phase !== "complete" && phase !== "planning")) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-2xl overflow-hidden"
      style={{
        height: Math.max(280, (graph?.tasks.length ?? 1) * 60 + 80),
        border: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Execution Graph</span>
        {graph && (
          <span className="text-xs ml-auto font-mono" style={{ color: "var(--text-faint)" }}>
            {graph.tasks.length} tasks
          </span>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={20} size={1} />
        <Controls className="!shadow-none" />
      </ReactFlow>
    </motion.div>
  );
}
