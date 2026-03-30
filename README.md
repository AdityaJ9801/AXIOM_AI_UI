# AXIOM AI — Frontend

> Production-ready UI for the **AXIOM AI Orchestrator** — a multi-agent data analysis platform.
> Upload your dataset, ask a question in plain English, and watch AI agents plan, execute, and visualize results in real time.

---

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)

---

## Features

### Core Workspace
- **Real-time SSE Streaming** — connects to `/analyze/stream`, parses `plan`, `task_start`, `task_complete`, `result`, and `error` events live
- **Live Execution Graph** — animated React Flow DAG that lights up as each agent task starts and completes
- **Smart Result Widgets** — SQL → sortable/paginated table, viz → bar/line/scatter chart, NLP/report → formatted Markdown
- **Session History** — previous queries saved locally, resumable with one click

### Dataset Management
- **Drag & Drop Upload** — CSV, JSON, XLSX up to 50MB
- **Dataset Panel** — full-page right-side explorer with two tabs:
  - **Data tab** — paginated table with column visibility toggles, client-side search, sort on any column
  - **Profile tab** — per-column stats: dtype badge, null % progress bar, unique count, min/avg/max for numbers, top-3 values for text
- **Column Profiling** — auto-computed on upload (dtype detection, null %, unique count, numeric stats)

### UI/UX
- **Resizable Panels** — drag the handle between sidebar ↔ workspace, and workspace ↔ dataset panel to any width you want
- **Light / Dark Mode** — toggle in the sidebar header, persists across sessions
- **Toast Notifications** — success, error, info, warning toasts replace all inline error states
- **Agent Health Monitor** — live pulsing dots showing all 6 downstream agents' status + latency

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
- The [AXIOM AI Orchestrator backend](https://github.com/VinitHudiya19/AXIOM_AI_UI) running on port `8000`

---

## Quick Start

**1. Clone**
```bash
git clone https://github.com/VinitHudiya19/AXIOM_AI_UI.git
cd AXIOM_AI_UI
```

**2. Install**
```bash
npm install
```

**3. Configure backend URL**

Create `.env.local` in the root:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Replace `localhost` with your backend's IP or domain if it's on a different machine.

**4. Run**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Backend (quick reference)

Run the orchestrator locally with mock agents — no LLM or Docker needed:

```bash
# In the orchestrator repo root
pip install -r requirements.txt
pip install -e .

# Terminal 1 — 6 mock agents on ports 8001–8006
python stubs/run_stubs.py

# Terminal 2 — orchestrator (Windows)
set ENV_FILE=.env.stub
python -m uvicorn app.main:app --port 8000 --reload

# Terminal 2 — orchestrator (Linux/macOS)
ENV_FILE=.env.stub uvicorn app.main:app --port 8000 --reload
```

Once running, the sidebar agent health dots will turn green.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | AXIOM AI Orchestrator backend URL |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, fonts, ThemeProvider, Toaster
│   ├── page.tsx                # Entry — resizable 3-panel layout
│   └── globals.css             # CSS variables (dark + light themes), scrollbar
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Datasets, session history, agent health, theme toggle
│   │   ├── MainWorkspace.tsx   # Canvas + sticky command bar
│   │   └── ResizeHandle.tsx    # Drag-to-resize handle between panels
│   ├── interactive/
│   │   ├── CommandBar.tsx      # Natural language input with suggestions
│   │   ├── DatasetUploader.tsx # Drag-and-drop upload + dataset card list
│   │   ├── ExecutionGraph.tsx  # Animated React Flow DAG
│   │   ├── PlanningState.tsx   # Loading dots during planning phase
│   │   └── ThemeToggle.tsx     # Sun/moon toggle button
│   ├── panels/
│   │   └── DatasetPanel.tsx    # Right-side resizable panel (Data + Profile tabs)
│   ├── providers/
│   │   └── ThemeProvider.tsx   # next-themes wrapper
│   └── widgets/
│       ├── ResultsPanel.tsx    # Orchestrates which widget to render per agent
│       ├── DataTableWidget.tsx # TanStack Table for SQL results
│       ├── ChartWidget.tsx     # Recharts for viz results
│       └── MarkdownReport.tsx  # GFM markdown for report/NLP results
├── hooks/
│   └── useOrchestratorSSE.ts  # SSE streaming hook for /analyze/stream
├── store/
│   └── useWorkspaceStore.ts   # Zustand store (session, context, panel state)
└── types/
    └── axiom.ts               # TypeScript types mirroring backend Pydantic models
```

---

## How it works

```
User uploads CSV/JSON/XLSX
        ↓
Backend computes column profiles (dtype, nulls, unique, min/max/mean)
        ↓
User opens Dataset Panel → explores Data tab (paginated table) or Profile tab (column stats)
        ↓
User types a query → POST /analyze/stream
        ↓
SSE events arrive:
  plan         → execution graph animates into view
  task_start   → graph node pulses cyan
  task_complete → node turns green, shows duration
  result       → widgets render (table / chart / markdown)
        ↓
Toast notification: "Analysis complete"
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
