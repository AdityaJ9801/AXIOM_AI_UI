# AXIOM AI — Frontend

> Production-ready UI for the [AXIOM AI Orchestrator](https://github.com/VinitHudiya19/AXIOM_AI_UI) — a multi-agent data analysis platform.
> Upload your dataset, ask a question in plain English, and watch the AI agents plan, execute, and visualize results in real time.

---

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)

---

## What it looks like

```
┌─────────────────┬──────────────────────────────────────────────┐
│   Sidebar       │   Main Workspace                             │
│                 │                                              │
│  📂 Datasets    │   [ Execution Graph — live DAG animation ]   │
│  ─────────────  │                                              │
│  🕐 History     │   [ SQL Table / Chart / Markdown Report ]    │
│  ─────────────  │                                              │
│  ● Agent Health │   ___________________________________        │
│    context ●    │  │  Ask anything about your data...  │ ▶    │
│    sql     ●    │  └───────────────────────────────────┘      │
│    viz     ●    │                                              │
└─────────────────┴──────────────────────────────────────────────┘
```

---

## Features

- **Dataset Upload** — drag & drop CSV, JSON, or XLSX (up to 50MB). Preview columns and rows before querying.
- **Live Execution Graph** — React Flow DAG that animates as each agent task starts and completes.
- **Real-time Streaming** — connects to the backend via SSE (`/analyze/stream`). No polling.
- **Smart Result Widgets** — SQL results render as a sortable/paginated table, viz results as bar/line/scatter charts, NLP/report results as formatted Markdown.
- **Session History** — previous queries are saved locally and resumable.
- **Agent Health Monitor** — live pulsing dots in the sidebar showing all 6 downstream agents' status.
- **Dark Mission-Control UI** — deep dark theme with glassmorphism panels and neon accents.

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
| TanStack Table | SQL result tables |
| Zustand | Global state (persisted) |
| react-markdown + rehype-highlight | Markdown rendering |
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

**2. Install dependencies**
```bash
npm install
```

**3. Configure backend URL**

Create a `.env.local` file in the root:
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If your backend is on a different machine, replace `localhost` with its IP or domain.

**4. Run**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Backend Setup (quick reference)

This frontend talks to the AXIOM AI Orchestrator. To run it locally with mock agents (no LLM needed):

```bash
# In the orchestrator repo
pip install -r requirements.txt
pip install -e .

# Terminal 1 — start 6 mock agents
python stubs/run_stubs.py

# Terminal 2 — start orchestrator
ENV_FILE=.env.stub uvicorn app.main:app --port 8000 --reload
```

The frontend will automatically connect and the agent health dots in the sidebar will turn green.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL of the AXIOM AI Orchestrator backend |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   ├── page.tsx            # Entry point — Sidebar + MainWorkspace
│   └── globals.css         # Global styles, scrollbar, dark theme
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Dataset list, session history, agent health
│   │   └── MainWorkspace.tsx   # Canvas + sticky command bar
│   ├── interactive/
│   │   ├── CommandBar.tsx      # Natural language input with suggestions
│   │   ├── DatasetUploader.tsx # Drag-and-drop file upload + preview modal
│   │   ├── ExecutionGraph.tsx  # Animated React Flow DAG
│   │   └── PlanningState.tsx   # Loading animation during planning phase
│   └── widgets/
│       ├── ResultsPanel.tsx    # Orchestrates which widget to render per agent
│       ├── DataTableWidget.tsx # TanStack Table for SQL results
│       ├── ChartWidget.tsx     # Recharts for viz results
│       └── MarkdownReport.tsx  # GFM markdown for report/NLP results
├── hooks/
│   └── useOrchestratorSSE.ts  # SSE streaming hook for /analyze/stream
├── store/
│   └── useWorkspaceStore.ts   # Zustand store (session, context, task state)
└── types/
    └── axiom.ts               # TypeScript types mirroring backend Pydantic models
```

---

## Available Scripts

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

---

## How it works

1. User uploads a dataset → backend returns a `context_id`
2. User types a query in the command bar → frontend POSTs to `/analyze/stream`
3. Backend streams SSE events:
   - `plan` → execution graph animates into view
   - `task_start` / `task_complete` → graph nodes light up in real time
   - `result` → widgets render (table, chart, or markdown depending on agent)
4. Session is saved locally for follow-up queries

---

## License

Internal project — AXIOM AI / GEMRSLIZE platform.
