# AXIOM AI — Frontend

> Production-ready UI for the **AXIOM AI Orchestrator** — a multi-agent data analysis platform.
> Upload a dataset, ask a question in plain English, and watch AI agents plan, execute, and visualize results in real time.

---

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)

---

## Features

### Real-time Execution
- **SSE Streaming** — connects to `/analyze/stream`, handles `plan`, `task_start`, `task_complete`, `result`, and `error` events live
- **Animated Execution Graph** — React Flow DAG with per-node state: pending (faded), running (glowing pulse + progress bar), completed (green flash), failed (red glow). Edges animate when data flows between nodes
- **Parallel DAG layout** — topological layer algorithm spaces parallel branches correctly, auto-fits to any graph size
- **Clickable Nodes** — click any node to open a side panel showing agent name, task description, payload, result preview, error, and timing

### Live Logs Terminal
- **VS Code-style bottom panel** — slides up from the bottom of the workspace, just like VS Code's terminal
- **Sidebar toggle** — "Logs" button in the left sidebar opens/closes the panel, shows live event count badge
- **Terminal output** — monospace font, color-coded rows by level (`SYS`, `INFO`, `OK`, `WARN`, `ERR`), agent badges, timestamps to millisecond precision, duration column
- **Drag to resize** — drag the top edge to set panel height (120px – 600px)
- **Auto-scroll** — follows latest log; detects manual scroll-up and shows "↓ jump to latest" hint
- **Stop analysis** — red Stop button replaces Send while a query is running; aborts the SSE stream instantly via `AbortController`

### Dataset Management
- **Drag & Drop Upload** — CSV, JSON, XLSX up to 50 MB
- **Dataset Panel** — resizable right-side panel with two tabs:
  - **Data** — paginated table, column visibility toggles, client-side search, sortable columns
  - **Profile** — per-column stats: dtype badge, null % bar, unique count, min/avg/max for numbers, top-3 values for text

### UI / UX
- **Resizable panels** — drag handles between sidebar ↔ workspace and workspace ↔ dataset panel
- **Light / Dark mode** — toggle in sidebar header, persists across sessions
- **Toast notifications** — auto-dismiss after 3 s; no persistent loading toasts
- **Agent Health Monitor** — pulsing dots for all 6 downstream agents with latency, polled every 30 s

---

## Tech Stack

| Library | Purpose |
|---|---|
| Next.js 16 (App Router) | Framework |
| React 19 + TypeScript | UI |
| Tailwind CSS 4 | Styling |
| Framer Motion | Animations |
| React Flow | Execution DAG graph |
| Recharts | Data visualizations |
| TanStack Table | SQL result tables + dataset explorer |
| Zustand | Global state (persisted to localStorage) |
| react-markdown + rehype-highlight | Markdown rendering |
| sonner | Toast notifications |
| next-themes | Light/dark mode |
| Lucide React | Icons |

---

## Prerequisites

- Node.js 18+
- [AXIOM AI Orchestrator backend](https://github.com/VinitHudiya19/AXIOM_AI_UI) running on port `8000`

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/VinitHudiya19/AXIOM_AI_UI.git
cd AXIOM_AI_UI

# 2. Install
npm install

# 3. Configure
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Backend (quick reference)

Run the orchestrator locally with mock agents — no LLM or Docker needed:

```bash
# In the orchestrator repo root
pip install -r requirements.txt && pip install -e .

# Terminal 1 — 6 mock agents on ports 8001–8006
python stubs/run_stubs.py

# Terminal 2 — orchestrator
# Windows:
set ENV_FILE=.env.stub && python -m uvicorn app.main:app --port 8000 --reload
# Linux/macOS:
ENV_FILE=.env.stub uvicorn app.main:app --port 8000 --reload
```

Once running, the sidebar agent health dots turn green.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Orchestrator backend URL |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, fonts, ThemeProvider, Toaster
│   ├── page.tsx                # Entry — resizable 3-panel layout + logs terminal
│   └── globals.css             # CSS variables (dark + light themes)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Datasets, history, agent health, logs toggle
│   │   ├── MainWorkspace.tsx   # Canvas + sticky command bar
│   │   └── ResizeHandle.tsx    # Drag-to-resize handle
│   ├── interactive/
│   │   ├── CommandBar.tsx      # Query input with Stop button + suggestions
│   │   ├── DatasetUploader.tsx # Drag-and-drop upload + dataset card list
│   │   ├── ExecutionGraph.tsx  # Animated React Flow DAG with node detail panel
│   │   ├── LiveLogsPanel.tsx   # VS Code-style bottom terminal panel
│   │   ├── PlanningState.tsx   # Loading indicator during planning phase
│   │   └── ThemeToggle.tsx     # Sun/moon toggle
│   ├── panels/
│   │   └── DatasetPanel.tsx    # Right-side resizable panel (Data + Profile tabs)
│   ├── providers/
│   │   └── ThemeProvider.tsx   # next-themes wrapper
│   └── widgets/
│       ├── ResultsPanel.tsx    # Routes results to the correct widget
│       ├── DataTableWidget.tsx # TanStack Table for SQL results
│       ├── ChartWidget.tsx     # Recharts for viz results
│       └── MarkdownReport.tsx  # GFM markdown for report/NLP results
├── hooks/
│   └── useOrchestratorSSE.ts  # SSE hook — submit, cancel, AbortController
├── store/
│   └── useWorkspaceStore.ts   # Zustand store — phase, graph, logs, panel state
└── types/
    └── axiom.ts               # TypeScript types mirroring backend Pydantic models
```

---

## How it works

```
User uploads CSV / JSON / XLSX
        ↓
Backend computes column profiles
        ↓
User types a query → POST /analyze/stream
        ↓
SSE events:
  plan          → execution graph animates in, logs panel opens
  task_start    → node glows cyan, log row: INFO
  task_complete → node turns green (or red), log row: OK / ERR
  result        → widgets render (table / chart / markdown)
        ↓
User can click any graph node → side panel shows payload + result + timing
User can open Logs panel → full terminal history of every event
```

---

## Available Scripts

```bash
npm run dev      # Development server → http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

---

## License

Internal project — AXIOM AI / GEMRSLIZE platform.
