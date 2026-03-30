"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Table, Trash2, ChevronDown, CheckCircle, Loader2, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { DatasetMeta } from "@/types/axiom";
import clsx from "clsx";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ACCEPTED = ".csv,.json,.jsonl,.xlsx,.xls";
const FILE_ICONS: Record<string, string> = { csv: "📊", json: "📋", jsonl: "📋", xlsx: "📗", xls: "📗" };

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DatasetCard({ dataset, isActive, onSelect, onDelete, onView }: {
  dataset: DatasetMeta; isActive: boolean;
  onSelect: () => void; onDelete: () => void; onView: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-2 py-2 rounded-lg transition-all cursor-pointer"
      style={{
        border: `1px solid ${isActive ? "rgba(0,229,255,0.6)" : "var(--border)"}`,
        background: isActive ? "rgba(0,229,255,0.08)" : "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
      }}
      onClick={onSelect}
    >
      <span className="text-base flex-shrink-0">{FILE_ICONS[dataset.file_type] ?? "📄"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate font-semibold" style={{ color: "var(--text-primary)" }}>{dataset.filename}</p>
        <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>
          {dataset.row_count.toLocaleString()} rows · {formatBytes(dataset.size_bytes)}
        </p>
      </div>

      {/* Always-visible action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isActive && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="p-1.5 rounded-md transition-all"
          style={{
            background: "rgba(0,229,255,0.1)",
            color: "#22d3ee",
            border: "1px solid rgba(0,229,255,0.2)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,229,255,0.1)"; }}
          title="View dataset"
        >
          <LayoutDashboard className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-md transition-all"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

export default function DatasetUploader() {
  const { contextId, setContextId, openDatasetPanel } = useWorkspaceStore();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/datasets`)
      .then((r) => r.json())
      .then((d) => setDatasets(d.datasets ?? []))
      .catch(() => toast.error("Could not load datasets", { description: "Backend may be offline" }));
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}…`);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail ?? "Upload failed");
      }
      const meta: DatasetMeta = await res.json();
      setDatasets((prev) => [meta, ...prev]);
      setContextId(meta.context_id);
      setExpanded(true);
      toast.success("Dataset uploaded", { id: toastId, description: `${meta.row_count.toLocaleString()} rows · ${meta.columns.length} columns` });
    } catch (e: unknown) {
      toast.error("Upload failed", { id: toastId, description: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }, [setContextId]);

  function handleFiles(files: FileList | null) { if (files?.length) uploadFile(files[0]); }
  function handleDrop(e: React.DragEvent) { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }

  async function handleDelete(ctxId: string) {
    const ds = datasets.find((d) => d.context_id === ctxId);
    await fetch(`${API_BASE}/datasets/${ctxId}`, { method: "DELETE" }).catch(() => {});
    setDatasets((prev) => prev.filter((d) => d.context_id !== ctxId));
    toast.info("Dataset removed", { description: ds?.filename });
  }

  function handleSelect(ctxId: string) {
    const ds = datasets.find((d) => d.context_id === ctxId);
    setContextId(ctxId);
    toast.info("Active dataset changed", { description: ds?.filename });
  }

  return (
    <>
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <Table className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-widest flex-1 text-left" style={{ color: "var(--text-muted)" }}>Datasets</span>
          {datasets.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--bg-elevated)", color: "var(--text-faint)" }}>{datasets.length}</span>
          )}
          <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")}
            style={{ color: "var(--text-faint)" }} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-3">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed transition-all cursor-pointer"
                  style={{
                    borderColor: dragOver ? "#00e5ff" : "var(--border)",
                    background: dragOver ? "rgba(0,229,255,0.05)" : "var(--bg-elevated)",
                    opacity: uploading ? 0.6 : 1,
                    pointerEvents: uploading ? "none" : "auto",
                  }}
                >
                  <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  {uploading ? <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    : <Upload className="w-5 h-5" style={{ color: "var(--text-muted)" }} />}
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{uploading ? "Uploading…" : "Drop file or click to browse"}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>CSV · JSON · XLSX · max 50MB</p>
                  </div>
                </div>

                {datasets.length > 0 && (
                  <div className="space-y-1">
                    {datasets.map((d) => (
                      <DatasetCard key={d.context_id} dataset={d} isActive={contextId === d.context_id}
                        onSelect={() => handleSelect(d.context_id)}
                        onDelete={() => handleDelete(d.context_id)}
                        onView={() => openDatasetPanel(d.context_id)} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
