"use client";
import { useCallback } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { SSEEvent } from "@/types/axiom";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useOrchestratorSSE() {
  const { contextId, sessionId, startAnalysis, setPlan, updateTaskStatus, setResult, setError } =
    useWorkspaceStore();

  const submit = useCallback(
    async (query: string) => {
      startAnalysis(query);

      try {
        const res = await fetch(`${API_BASE}/analyze/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            context_id: contextId,
            session_id: sessionId ?? undefined,
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "Unknown error");
          setError(`Server error ${res.status}: ${text}`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const raw = line.slice(5).trim();
              try {
                const payload = JSON.parse(raw);
                const evt = { event: currentEvent, data: payload } as SSEEvent;
                handleEvent(evt, { setPlan, updateTaskStatus, setResult, setError });
              } catch {
                // malformed JSON — skip
              }
              currentEvent = "";
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Connection failed: ${msg}`);
      }
    },
    [contextId, sessionId, startAnalysis, setPlan, updateTaskStatus, setResult, setError]
  );

  return { submit };
}

function handleEvent(
  evt: SSEEvent,
  actions: {
    setPlan: ReturnType<typeof useWorkspaceStore.getState>["setPlan"];
    updateTaskStatus: ReturnType<typeof useWorkspaceStore.getState>["updateTaskStatus"];
    setResult: ReturnType<typeof useWorkspaceStore.getState>["setResult"];
    setError: ReturnType<typeof useWorkspaceStore.getState>["setError"];
  }
) {
  switch (evt.event) {
    case "plan":
      actions.setPlan(evt.data.intent, evt.data.graph);
      break;
    case "task_start":
      actions.updateTaskStatus(evt.data.node_id, "running");
      break;
    case "task_complete":
      actions.updateTaskStatus(evt.data.node_id, evt.data.status, evt.data.duration_ms);
      break;
    case "result":
      actions.setResult(evt.data);
      break;
    case "error":
      actions.setError(evt.data.detail);
      break;
  }
}
