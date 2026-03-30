"use client";
import { useState, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MainWorkspace from "@/components/layout/MainWorkspace";
import DatasetPanel from "@/components/panels/DatasetPanel";
import ResizeHandle from "@/components/layout/ResizeHandle";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 256;

const PANEL_MIN = 360;
const PANEL_MAX = 760;
const PANEL_DEFAULT = 520;

export default function Home() {
  const { datasetPanelOpen } = useWorkspaceStore();
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);

  const resizeSidebar = useCallback((delta: number) => {
    setSidebarWidth((w) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w + delta)));
  }, []);

  const resizePanel = useCallback((delta: number) => {
    setPanelWidth((w) => Math.min(PANEL_MAX, Math.max(PANEL_MIN, w + delta)));
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0 h-full overflow-hidden" style={{ width: sidebarWidth }}>
        <Sidebar width={sidebarWidth} />
      </div>

      {/* Sidebar resize handle */}
      <ResizeHandle onResize={resizeSidebar} side="right" />

      {/* Main workspace — fills remaining space */}
      <main className="flex flex-col flex-1 min-w-0 min-h-0">
        <MainWorkspace />
      </main>

      {/* Dataset panel resize handle — only when panel is open */}
      {datasetPanelOpen && (
        <ResizeHandle onResize={resizePanel} side="left" />
      )}

      {/* Dataset panel — flex child, not fixed */}
      <DatasetPanel width={panelWidth} />
    </div>
  );
}
