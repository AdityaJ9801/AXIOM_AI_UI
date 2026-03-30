"use client";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { SSEEvent } from "@/types/axiom";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOAST_DURATION = 3000;

export function useOrchestratorSSE() {
  const { contextId, sessionId, startAnalysis, setPlan, updateTaskStatus, setResult, setError, resetWorkspace, addLog } =
    useWorkspaceStore();
  const abortRef = useRef<AbortController | null>(null);
  // Track the active "executing" toast id so we can dismiss it explicitly
  const execToastRef = useRef<string | number | null>(null);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Kill any lingering toasts immediately
    toast.dismiss();
    if (execToastRef.current) {
      toast.dismiss(execToastRef.current);
      execToastRef.current = null;
    }
    resetWorkspace();
    toast.info("Analysis cancelled", { duration: TOAST_DURATION });
  }, [resetWorkspace]);

  const submit = useCallback(
    async (query: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startAnalysis(query);
      addLog({ timestamp: new Date().toISOString(), level: "system", event: "init", message: `Query submitted: ${query}` });

      // Use toast() not toast.loading() — loading ignores duration
      const toastId = toast("Planning analysis…", {
        description: query.slice(0, 80),
        duration: TOAST_DURATION,
        icon: "⏳",
      });

      try {
        const res = await fetch(`${API_BASE}/analyze/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            context_id: contextId,
            session_id: sessionId ?? undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "Unknown error");
          const msg = `Server error ${res.status}: ${text}`;
          setError(msg);
          toast.dismiss(toastId);
          toast.error("Analysis failed", { description: msg, duration: TOAST_DURATION });
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
                handleEvent(evt, { setPlan, updateTaskStatus, setResult, setError, toastId, execToastRef, addLog });
              } catch {
                // malformed JSON — skip
              }
              currentEvent = "";
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          toast.dismiss(toastId);
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Connection failed: ${msg}`);
        addLog({ timestamp: new Date().toISOString(), level: "error", event: "error", message: `Connection failed: ${msg}` });
        toast.dismiss(toastId);
        toast.error("Connection failed", { description: msg, duration: TOAST_DURATION });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [contextId, sessionId, startAnalysis, setPlan, updateTaskStatus, setResult, setError]
  );

  return { submit, cancel };
}

function handleEvent(
  evt: SSEEvent,
  actions: {
    setPlan: ReturnType<typeof useWorkspaceStore.getState>["setPlan"];
    updateTaskStatus: ReturnType<typeof useWorkspaceStore.getState>["updateTaskStatus"];
    setResult: ReturnType<typeof useWorkspaceStore.getState>["setResult"];
    setError: ReturnType<typeof useWorkspaceStore.getState>["setError"];
    addLog: ReturnType<typeof useWorkspaceStore.getState>["addLog"];
    toastId: string | number;
    execToastRef: React.MutableRefObject<string | number | null>;
  }
) {
  const ts = new Date().toISOString();
  switch (evt.event) {
    case "plan": {
      actions.setPlan(evt.data.intent, evt.data.graph);
      actions.addLog({ timestamp: ts, level: "system", event: "plan", message: `Plan received · ${evt.data.graph.tasks.length} tasks · ${evt.data.intent}` });
      toast.dismiss(actions.toastId);
      const execId = toast("Executing tasks…", {
        description: evt.data.intent,
        duration: TOAST_DURATION,
        icon: "⚙️",
      });
      actions.execToastRef.current = execId;
      break;
    }
    case "task_start":
      actions.updateTaskStatus(evt.data.node_id, "running");
      actions.addLog({ timestamp: ts, level: "info", event: "task_start", agent: evt.data.agent, message: `Starting · ${evt.data.agent.toUpperCase()} · ${evt.data.node_id}` });
      break;
    case "task_complete":
      actions.updateTaskStatus(evt.data.node_id, evt.data.status, evt.data.duration_ms);
      actions.addLog({
        timestamp: ts,
        level: evt.data.status === "failed" ? "error" : evt.data.status === "skipped" ? "warn" : "success",
        event: "task_complete",
        agent: evt.data.agent,
        message: evt.data.error
          ? `Failed · ${evt.data.agent.toUpperCase()} · ${evt.data.error}`
          : `Done · ${evt.data.agent.toUpperCase()} · ${evt.data.node_id}`,
        duration_ms: evt.data.duration_ms,
      });
      break;
    case "result": {
      actions.setResult(evt.data);
      const failed = evt.data.results.filter((r) => r.status === "failed").length;
      actions.addLog({
        timestamp: ts,
        level: evt.data.partial ? "warn" : "success",
        event: "result",
        message: evt.data.partial
          ? `Analysis complete with ${failed} failed task(s)`
          : `Analysis complete · all tasks succeeded`,
      });
      if (actions.execToastRef.current) { toast.dismiss(actions.execToastRef.current); actions.execToastRef.current = null; }
      toast.dismiss(actions.toastId);
      if (evt.data.partial) {
        toast.warning("Analysis complete with errors", { description: "Some tasks failed — results may be incomplete.", duration: TOAST_DURATION });
      } else {
        toast.success("Analysis complete", { description: evt.data.intent, duration: TOAST_DURATION });
      }
      break;
    }
    case "error":
      actions.setError(evt.data.detail);
      actions.addLog({ timestamp: ts, level: "error", event: "error", message: `Error · ${evt.data.detail}` });
      if (actions.execToastRef.current) { toast.dismiss(actions.execToastRef.current); actions.execToastRef.current = null; }
      toast.dismiss(actions.toastId);
      toast.error("Analysis failed", { description: evt.data.detail, duration: TOAST_DURATION });
      break;
  }
}
