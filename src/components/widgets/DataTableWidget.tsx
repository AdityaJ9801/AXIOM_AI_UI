"use client";
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

interface DataTableWidgetProps {
  data: unknown;
}

export default function DataTableWidget({ data }: DataTableWidgetProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const rows: Record<string, unknown>[] = useMemo(() => {
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (Array.isArray(d.rows)) return d.rows as Record<string, unknown>[];
      if (Array.isArray(d.data)) return d.data as Record<string, unknown>[];
      if (Array.isArray(d.results)) return d.results as Record<string, unknown>[];
    }
    return [];
  }, [data]);

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]).map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ getValue }) => {
        const v = getValue();
        if (v === null || v === undefined) return <span className="text-zinc-600">—</span>;
        if (typeof v === "number") return <span className="font-mono">{v.toLocaleString()}</span>;
        return String(v);
      },
    }));
  }, [rows]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500 py-4 text-center">No tabular data returned.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-800 bg-zinc-900/60">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={clsx(
                      "px-4 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap",
                      header.column.getCanSort() && "cursor-pointer hover:text-zinc-200 select-none"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-zinc-600">
                          {header.column.getIsSorted() === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={clsx(
                  "border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30",
                  i % 2 === 0 ? "bg-transparent" : "bg-zinc-900/20"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 text-zinc-300 font-mono text-xs whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/40">
          <span className="text-xs text-zinc-500">
            {rows.length} rows · page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30 text-zinc-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30 text-zinc-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
