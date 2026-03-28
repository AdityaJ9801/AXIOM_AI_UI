"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Table, Trash2, ChevronDown,
  CheckCircle, AlertCircle, Loader2, Eye, X,
} from "lucide-react";
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

function PreviewModal({ dataset, onClose }: { dataset: DatasetMeta; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{dataset.filename}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {dataset.row_count.toLocaleString()} rows · {dataset.columns.length} columns · {formatBytes(dataset.size_bytes)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Columns */}
        <div className="px-5 py-3 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Columns</p>
          <div className="flex flex-wrap gap-1.5">
            {dataset.columns.map((col) => (
              <span key={col} className="px-2 py-0.5 rounded-md bg-zinc-800 text-xs text-zinc-300 font-mono">
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Preview table */}
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900/95">
              <tr className="border-b border-zinc-800">
                {dataset.columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left text-zinc-400 font-medium whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.preview.map((row, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  {dataset.columns.map((col) => (
                    <td key={col} className="px-3 py-2 text-zinc-400 font-mono whitespace-nowrap">
                      {row[col] == null ? <span className="text-zinc-700">null</span> : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 bg-zinc-950/50 text-xs text-zinc-600">
          Showing first {dataset.preview.length} of {dataset.row_count.toLocaleString()} rows
        </div>
      </motion.div>
    </motion.div>
  );
}

function DatasetCard({
  dataset,
  isActive,
  onSelect,
  onDelete,
  onPreview,
}: {
  dataset: DatasetMeta;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const ext = dataset.file_type;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        "group flex items-center gap-2 px-2 py-2 rounded-lg border transition-all cursor-pointer",
        isActive
          ? "border-cyan-500/50 bg-cyan-500/5"
          : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40"
      )}
      onClick={onSelect}
    >
      <span className="text-base flex-shrink-0">{FILE_ICONS[ext] ?? "📄"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-300 truncate font-medium">{dataset.filename}</p>
        <p className="text-xs text-zinc-600">
          {dataset.row_count.toLocaleString()} rows · {formatBytes(dataset.size_bytes)}
        </p>
      </div>
      {isActive && <CheckCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(); }}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
          title="Preview"
        >
          <Eye className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

export default function DatasetUploader() {
  const { contextId, setContextId } = useWorkspaceStore();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewDataset, setPreviewDataset] = useState<DatasetMeta | null>(null);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing datasets on mount
  useEffect(() => {
    fetch(`${API_BASE}/datasets`)
      .then((r) => r.json())
      .then((d) => setDatasets(d.datasets ?? []))
      .catch(() => {});
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
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
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [setContextId]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleDelete(contextId: string) {
    await fetch(`${API_BASE}/datasets/${contextId}`, { method: "DELETE" }).catch(() => {});
    setDatasets((prev) => prev.filter((d) => d.context_id !== contextId));
  }

  return (
    <>
      {/* Preview modal */}
      <AnimatePresence>
        {previewDataset && (
          <PreviewModal dataset={previewDataset} onClose={() => setPreviewDataset(null)} />
        )}
      </AnimatePresence>

      <div className="border-b border-zinc-800">
        {/* Header toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-800/30 transition-colors"
        >
          <Table className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex-1 text-left">
            Datasets
          </span>
          {datasets.length > 0 && (
            <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">
              {datasets.length}
            </span>
          )}
          <ChevronDown
            className={clsx("w-3.5 h-3.5 text-zinc-600 transition-transform", expanded && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={clsx(
                    "relative flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed transition-all cursor-pointer",
                    dragOver
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30",
                    uploading && "pointer-events-none opacity-60"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-zinc-500" />
                  )}
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">
                      {uploading ? "Uploading…" : "Drop file or click to browse"}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">CSV · JSON · XLSX · max 50MB</p>
                  </div>
                </div>

                {/* Error */}
                {uploadError && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{uploadError}</p>
                  </div>
                )}

                {/* Dataset list */}
                {datasets.length > 0 && (
                  <div className="space-y-1">
                    {datasets.map((d) => (
                      <DatasetCard
                        key={d.context_id}
                        dataset={d}
                        isActive={contextId === d.context_id}
                        onSelect={() => setContextId(d.context_id)}
                        onDelete={() => handleDelete(d.context_id)}
                        onPreview={() => setPreviewDataset(d)}
                      />
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
