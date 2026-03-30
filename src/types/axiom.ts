// TypeScript types mirroring app/models.py

export type AgentName = "context" | "sql" | "viz" | "ml" | "nlp" | "report";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface TaskNode {
  task_id: string;
  agent: AgentName;
  description: string;
  payload: Record<string, unknown>;
  depends_on: string[];
}

export interface TaskGraph {
  intent: string;
  tasks: TaskNode[];
  created_at: string;
}

export interface TaskResult {
  task_id: string;
  agent: AgentName;
  status: TaskStatus;
  result: unknown;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_ms?: number | null;
}

export interface AnalyzeResponse {
  task_id: string;
  session_id: string;
  intent: string;
  graph: TaskGraph;
  results: TaskResult[];
  partial: boolean;
  created_at: string;
}

export interface AgentHealthInfo {
  agent: string;
  url: string;
  healthy: boolean;
  latency_ms: number | null;
  error: string | null;
}

export interface AgentsStatusResponse {
  agents: AgentHealthInfo[];
  checked_at: string;
}

// SSE event types
export interface SSEPlanEvent {
  event: "plan";
  data: { task_id: string; intent: string; graph: TaskGraph };
}

export interface SSETaskStartEvent {
  event: "task_start";
  data: { task_id: string; node_id: string; agent: AgentName; started_at: string };
}

export interface SSETaskCompleteEvent {
  event: "task_complete";
  data: {
    task_id: string;
    node_id: string;
    agent: AgentName;
    status: TaskStatus;
    duration_ms: number | null;
    error: string | null;
  };
}

export interface SSEResultEvent {
  event: "result";
  data: AnalyzeResponse;
}

export interface SSEErrorEvent {
  event: "error";
  data: { task_id: string; detail: string };
}

export type SSEEvent =
  | SSEPlanEvent
  | SSETaskStartEvent
  | SSETaskCompleteEvent
  | SSEResultEvent
  | SSEErrorEvent;

// Dataset upload
export interface ColumnProfile {
  name: string;
  dtype: "number" | "text" | "date" | "boolean";
  null_count: number;
  null_pct: number;
  unique_count: number;
  min_val: number | null;
  max_val: number | null;
  mean_val: number | null;
  top_values: string[] | null;
}

export interface DatasetMeta {
  context_id: string;
  filename: string;
  file_type: string;
  row_count: number;
  columns: string[];
  preview: Record<string, unknown>[];
  size_bytes: number;
  uploaded_at: string;
  column_profiles: ColumnProfile[];
}

// Session history entry stored locally
export interface SessionEntry {
  session_id: string;
  query: string;
  intent: string;
  created_at: string;
  context_id: string;
}
