# Frontend Engineering Rules
*Standards for Next.js dashboard, realtime state management, and component architecture.*

---

## 1. Technology Stack & Directory Structure

The frontend application resides in `apps/web`:
- **Framework**: Next.js (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Animations & Transitions**: Framer Motion
- **Realtime Transport**: Socket.IO Client
- **State Management**: React Context / Zustand for lightweight global realtime feeds

### Page & Component Hierarchy
```text
apps/web/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing / Project selection
│   ├── projects/
│   │   ├── new/page.tsx            # Requirement intake form
│   │   └── [id]/
│   │       ├── layout.tsx          # Project navigation shell
│   │       ├── page.tsx            # Project Overview Dashboard
│   │       ├── timeline/page.tsx   # Agent Timeline & Run Explorer
│   │       ├── artifacts/page.tsx  # Artifact Explorer & Approval Gate
│   │       ├── architecture/page.tsx # Interactive Architecture Visualizer
│   │       └── failures/page.tsx   # Failure & Recovery Explorer
├── components/
│   ├── ui/                         # Atomic design tokens (Buttons, Badges, Modals)
│   ├── timeline/                   # Execution milestone components
│   ├── artifacts/                  # Markdown / Diff / JSON renderers
│   └── architecture/               # DAG flow visualization components
└── hooks/
    ├── useSocketEvent.ts           # Realtime domain event subscriber
    └── useProjectStatus.ts         # Live project state hook
```

---

## 2. Core Dashboard Views (Specification Section 23)

1. **Project Dashboard**: Displays high-level project status, progress percentage, active running agents, aggregated token usage, incurred cost, and failure counts.
2. **Agent Timeline**: Sequential and parallel milestone waterfall displaying agent name, task ID, start time, duration, status badges, and retry counters.
3. **Artifact Explorer**: Comprehensive inspection panel for all generated deliverables (`ProductSpecification`, `ArchitectureSpecification`, `DatabaseSchema`, `APIContract`, `TestReport`, `SecurityReport`, `ADR`) with diff views and approval/rejection action triggers.
4. **Agent Detail View**: Deep inspection of an individual agent run: system prompt, tool invocations, actions, raw output, input/output tokens, execution duration, error logs, and reviewer feedback.
5. **Architecture View**: Visual representation of the target software architecture (Frontend → API → Backend → Database) and data contracts.
6. **Failure Explorer**: Diagnostic view categorizing errors, root cause explanations, failing agents, retry attempts, recovery strategies, and final resolutions.

---

## 3. Realtime Event Handling Rules

- **Zero Polling**: Never implement interval polling (`setInterval(fetch, 1000)`) for agent task updates.
- **WebSocket Synchronization**: Connect via Socket.IO to `apps/api`. Listen for domain events (`TASK_STARTED`, `TASK_COMPLETED`, `TASK_FAILED`, `ARTIFACT_UPDATED`, `PROJECT_COMPLETED`).
- **Idempotent State Reducers**: Update local UI state idempotently based on incoming event IDs and timestamps. Handle out-of-order event delivery gracefully.
- **Graceful Reconnection**: Implement exponential backoff reconnection with an initial snapshot fetch on reconnect.
