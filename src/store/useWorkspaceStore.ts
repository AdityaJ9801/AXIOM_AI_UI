import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AgentsStatusResponse,
  AnalyzeResponse,
  SessionEntry,
  TaskGraph,
  TaskResult,
  TaskStatus,
} from "@/types/axiom";

export type WorkspacePhase = "idle" | "planning" | "executing" | "complete" | "error";

interface WorkspaceState {
  // Session & context
  contextId: string;
  sessionId: string | null;
  sessionHistory: SessionEntry[];

  // Current analysis state
  phase: WorkspacePhase;
  currentQuery: string;
  intent: string;
  graph: TaskGraph | null;
  taskStatuses: Record<string, TaskStatus>;
  taskDurations: Record<string, number | null>;
  results: TaskResult[];
  finalResponse: AnalyzeResponse | null;
  errorMessage: string | null;

  // Agent health
  agentsStatus: AgentsStatusResponse | null;

  // Actions
  setContextId: (id: string) => void;
  setSessionId: (id: string | null) => void;
  startAnalysis: (query: string) => void;
  setPlan: (intent: string, graph: TaskGraph) => void;
  updateTaskStatus: (nodeId: string, status: TaskStatus, duration?: number | null) => void;
  setResult: (response: AnalyzeResponse) => void;
  setError: (msg: string) => void;
  setAgentsStatus: (status: AgentsStatusResponse) => void;
  resetWorkspace: () => void;
  loadSession: (entry: SessionEntry) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      contextId: "ctx-demo-001",
      sessionId: null,
      sessionHistory: [],

      phase: "idle",
      currentQuery: "",
      intent: "",
      graph: null,
      taskStatuses: {},
      taskDurations: {},
      results: [],
      finalResponse: null,
      errorMessage: null,

      agentsStatus: null,

      setContextId: (id) => set({ contextId: id, sessionId: null }),
      setSessionId: (id) => set({ sessionId: id }),

      startAnalysis: (query) =>
        set({
          phase: "planning",
          currentQuery: query,
          intent: "",
          graph: null,
          taskStatuses: {},
          taskDurations: {},
          results: [],
          finalResponse: null,
          errorMessage: null,
        }),

      setPlan: (intent, graph) => {
        const statuses: Record<string, TaskStatus> = {};
        graph.tasks.forEach((t) => (statuses[t.task_id] = "pending"));
        set({ phase: "executing", intent, graph, taskStatuses: statuses });
      },

      updateTaskStatus: (nodeId, status, duration) =>
        set((s) => ({
          taskStatuses: { ...s.taskStatuses, [nodeId]: status },
          taskDurations: { ...s.taskDurations, [nodeId]: duration ?? null },
        })),

      setResult: (response) => {
        const { sessionHistory, currentQuery } = get();
        const entry: SessionEntry = {
          session_id: response.session_id,
          query: currentQuery,
          intent: response.intent,
          created_at: response.created_at,
          context_id: response.graph.tasks[0]?.payload?.context_id as string ?? get().contextId,
        };
        const updated = [entry, ...sessionHistory].slice(0, 50);
        set({
          phase: "complete",
          finalResponse: response,
          results: response.results,
          sessionId: response.session_id,
          sessionHistory: updated,
        });
      },

      setError: (msg) => set({ phase: "error", errorMessage: msg }),

      setAgentsStatus: (status) => set({ agentsStatus: status }),

      resetWorkspace: () =>
        set({
          phase: "idle",
          currentQuery: "",
          intent: "",
          graph: null,
          taskStatuses: {},
          taskDurations: {},
          results: [],
          finalResponse: null,
          errorMessage: null,
        }),

      loadSession: (entry) =>
        set({
          sessionId: entry.session_id,
          contextId: entry.context_id,
          phase: "idle",
        }),
    }),
    {
      name: "axiom-workspace",
      partialize: (s) => ({
        contextId: s.contextId,
        sessionId: s.sessionId,
        sessionHistory: s.sessionHistory,
      }),
    }
  )
);
