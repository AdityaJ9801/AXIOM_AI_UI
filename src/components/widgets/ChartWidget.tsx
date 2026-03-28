"use client";
import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#00e5ff", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#60a5fa", "#fb923c"];

interface ChartWidgetProps {
  data: unknown;
}

interface ChartPayload {
  type?: string;
  chart_type?: string;
  data?: unknown[];
  labels?: string[];
  values?: number[];
  x?: string;
  y?: string;
  series?: Array<{ name: string; data: number[] }>;
}

export default function ChartWidget({ data }: ChartWidgetProps) {
  const parsed = useMemo((): { type: string; rows: Record<string, unknown>[]; xKey: string; yKeys: string[] } | null => {
    if (!data || typeof data !== "object") return null;
    const d = data as ChartPayload;

    // Normalize chart type
    const chartType = (d.type ?? d.chart_type ?? "bar").toLowerCase();

    // Try to extract rows
    let rows: Record<string, unknown>[] = [];
    let xKey = "name";
    let yKeys: string[] = ["value"];

    if (Array.isArray(d.data)) {
      rows = d.data as Record<string, unknown>[];
      if (rows.length > 0) {
        const keys = Object.keys(rows[0]);
        xKey = keys[0];
        yKeys = keys.slice(1);
      }
    } else if (Array.isArray(d.labels) && Array.isArray(d.values)) {
      rows = d.labels.map((label, i) => ({ name: label, value: d.values![i] }));
      xKey = "name";
      yKeys = ["value"];
    } else if (Array.isArray(d.series) && Array.isArray(d.labels)) {
      rows = d.labels.map((label, i) => {
        const row: Record<string, unknown> = { name: label };
        d.series!.forEach((s) => { row[s.name] = s.data[i]; });
        return row;
      });
      xKey = "name";
      yKeys = d.series.map((s) => s.name);
    }

    if (rows.length === 0) return null;
    return { type: chartType, rows, xKey, yKeys };
  }, [data]);

  if (!parsed) {
    return <p className="text-sm text-zinc-500 py-4 text-center">No chart data available.</p>;
  }

  const { type, rows, xKey, yKeys } = parsed;

  const commonProps = {
    data: rows,
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  const axisStyle = { fill: "#71717a", fontSize: 11, fontFamily: "var(--font-geist-mono)" };
  const gridStyle = { stroke: "#27272a", strokeDasharray: "3 3" };
  const tooltipStyle = {
    contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 },
    labelStyle: { color: "#a1a1aa" },
    itemStyle: { color: "#e4e4e7" },
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      {type === "line" ? (
        <LineChart {...commonProps}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {yKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      ) : type === "scatter" ? (
        <ScatterChart {...commonProps}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis dataKey={yKeys[0]} tick={axisStyle} />
          <Tooltip {...tooltipStyle} />
          <Scatter data={rows} fill={COLORS[0]} />
        </ScatterChart>
      ) : (
        <BarChart {...commonProps}>
          <CartesianGrid {...gridStyle} />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]}>
              {yKeys.length === 1 && rows.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
