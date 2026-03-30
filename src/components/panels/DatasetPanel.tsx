"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, Search, ChevronLeft, ChevronRight, ChevronDown, Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { DatasetMeta, ColumnProfile } from "@/types/axiom";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Dtype badge ────────────────────────────────────────────────────────────
const DTYPE_COLORS: Record<string, { bg: string; text: string }> = {
  number:  { bg: "rgba(6,182,212,0.15)",  text: "#22d3ee" },
  text:    { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  date:    { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  boolean: { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
};

function DtypeBadge({ dtype }: { dtype: string }) {
  const c = DTYPE_COLORS[dtype] ?? DTYPE_COLORS.text;
  return (
    <span className="px-1.5 py-0.5 rounded text-xs font-mono"
      style={{ background: c.bg, color: c.text }}>
      {dtype}
    </span>
  );
}

// ── Null progress bar ──────────────────────────────────────────────────────
function NullBar({ pct }: { pct: number }) {
  const color = pct < 5 ? "#34d399" : pct < 20 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums font-semibold w-10 text-right" style={{ color: "var(--text-secondary)" }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ── Column profile card ────────────────────────────────────────────────────
function ProfileCard({ profile }: { profile: ColumnProfile }) {
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
          {profile.name}
        </span>
        <DtypeBadge dtype={profile.dtype} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          <span>Nulls</span>
          <span>{profile.null_count.toLocaleString()}</span>
        </div>
        <NullBar pct={profile.null_pct} />
      </div>

      <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{profile.unique_count.toLocaleString()}</span> unique
      </div>

      {profile.dtype === "number" && profile.min_val != null && (
        <div className="grid grid-cols-3 gap-1 pt-1">
          {[["min", profile.min_val], ["avg", profile.mean_val], ["max", profile.max_val]].map(([label, val]) => (
            <div key={label as string} className="rounded-lg p-1.5 text-center"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>{label}</div>
              <div className="text-xs font-bold font-mono truncate" style={{ color: "var(--text-primary)" }}>
                {typeof val === "number" ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      {profile.dtype === "text" && profile.top_values && profile.top_values.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {profile.top_values.map((v) => (
            <span key={v} className="px-1.5 py-0.5 rounded text-xs truncate max-w-full"
              style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Data tab ───────────────────────────────────────────────────────────────
function DataTab({ dataset }: { dataset: DatasetMeta }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>({});
  const [showColMenu, setShowColMenu] = useState(false);

  const fetchRows = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/datasets/${dataset.context_id}/rows?page=${p}&page_size=50`);
      if (!res.ok) throw new Error("Failed to fetch rows");
      const data = await res.json();
      setRows(data.rows);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(data.page);
    } catch {
      toast.error("Failed to load rows");
    } finally {
      setLoading(false);
    }
  }, [dataset.context_id]);

  useEffect(() => { fetchRows(1); }, [fetchRows]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      dataset.columns.map((col) => ({
        id: col,
        accessorKey: col,
        header: col,
        cell: ({ getValue }) => {
          const v = getValue();
          if (v == null) return <span style={{ color: "var(--text-faint)" }}>null</span>;
          return <span className="font-mono">{String(v)}</span>;
        },
      })),
    [dataset.columns]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, columnVisibility: colVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter rows…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowColMenu((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Columns <ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showColMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-xl min-w-[160px]"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                {table.getAllLeafColumns().map((col) => (
                  <button
                    key={col.id}
                    onClick={() => col.toggleVisibility()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="w-3.5 h-3.5 flex-shrink-0">
                      {col.getIsVisible() && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </span>
                    <span className="truncate">{col.id}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: "var(--bg-surface)" }}>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-3 py-2.5 text-left font-bold whitespace-nowrap select-none text-xs uppercase tracking-wider"
                      style={{
                        color: "var(--text-secondary)",
                        cursor: header.column.getCanSort() ? "pointer" : "default",
                      }}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && " ↑"}
                        {header.column.getIsSorted() === "desc" && " ↓"}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate text-xs font-medium"
                      style={{ color: "var(--text-secondary)" }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
        <span>{total.toLocaleString()} rows{search ? ` · ${filteredRows.length} filtered` : ""}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchRows(page - 1)} disabled={page <= 1}
            className="p-1 rounded disabled:opacity-30 transition-colors"
            style={{ color: "var(--text-secondary)" }}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>Page {page} / {totalPages}</span>
          <button onClick={() => fetchRows(page + 1)} disabled={page >= totalPages}
            className="p-1 rounded disabled:opacity-30 transition-colors"
            style={{ color: "var(--text-secondary)" }}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile tab ────────────────────────────────────────────────────────────
function ProfileTab({ dataset }: { dataset: DatasetMeta }) {
  const profiles = dataset.column_profiles ?? [];
  const numericCount = profiles.filter((p) => p.dtype === "number").length;
  const textCount = profiles.filter((p) => p.dtype === "text").length;
  const withNulls = profiles.filter((p) => p.null_count > 0).length;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Summary bar */}
      <div className="px-4 py-2.5 flex-shrink-0 text-xs flex items-center gap-3 flex-wrap font-medium"
        style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
        <span><span style={{ color: "var(--text-secondary)" }}>{profiles.length}</span> columns</span>
        <span>·</span>
        <span><span style={{ color: "#22d3ee" }}>{numericCount}</span> numeric</span>
        <span>·</span>
        <span><span style={{ color: "#a78bfa" }}>{textCount}</span> text</span>
        <span>·</span>
        <span><span style={{ color: "#fbbf24" }}>{withNulls}</span> with nulls</span>
      </div>

      {profiles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
          No column profiles available
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {profiles.map((p) => <ProfileCard key={p.name} profile={p} />)}
        </div>
      )}
    </div>
  );
}

type Tab = "data" | "profile";

export default function DatasetPanel({ width }: { width: number }) {
  const { datasetPanelOpen, datasetPanelContextId, closeDatasetPanel, setContextId } = useWorkspaceStore();
  const [dataset, setDataset] = useState<DatasetMeta | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("data");

  useEffect(() => {
    if (!datasetPanelContextId) return;
    setDataset(null);
    fetch(`${API_BASE}/datasets/${datasetPanelContextId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d: DatasetMeta) => setDataset(d))
      .catch(() => toast.error("Failed to load dataset"));
  }, [datasetPanelContextId]);

  function handleAnalyze() {
    if (datasetPanelContextId) {
      setContextId(datasetPanelContextId);
    }
    closeDatasetPanel();
    window.dispatchEvent(new CustomEvent("axiom:focus-command"));
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "data", label: "Data" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <AnimatePresence>
      {datasetPanelOpen && (
        <motion.div
          data-panel
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="flex-shrink-0 flex flex-col h-full overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border)",
          }}
        >
            {/* Header */}
            <div className="flex items-start justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {dataset?.filename ?? "Loading…"}
                </h2>
                {dataset && (
                  <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>
                    {dataset.row_count.toLocaleString()} rows · {dataset.columns.length} columns · {formatBytes(dataset.size_bytes)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-cyan-500 hover:bg-cyan-400 text-black"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Analyze
                </button>
                <button onClick={closeDatasetPanel}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-shrink-0 px-4" style={{ borderBottom: "1px solid var(--border)" }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative px-4 py-2.5 text-xs font-medium transition-colors"
                  style={{ color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)", fontWeight: activeTab === tab.id ? 600 : 500 }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {!dataset ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="h-full flex flex-col"
                  >
                    {activeTab === "data" && <DataTab dataset={dataset} />}
                    {activeTab === "profile" && <ProfileTab dataset={dataset} />}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
