# ForgeOS — Multi-Agent Software Factory

> **"An event-driven multi-agent engineering runtime that coordinates specialized AI agents through contracts, isolated execution, evaluation gates, failure recovery, and observable workflows."**

ForgeOS is an engineering platform that creates temporary engineering teams of specialized AI agents to convert natural-language product requirements into verified software projects.

---

## 1. System Architecture

Rather than relying on monolithic prompts or unstructured conversational chaining, ForgeOS coordinates work through deterministic, directed acyclic graph (DAG) scheduling:

```text
User Requirement
       ↓
  Orchestrator
       ↓
Task Graph (DAG)
       ↓
Specialized Agents (PM → Architect → DB / API → Backend / Frontend → QA → Reviewer)
       ↓
Contracts & Artifacts (Typed JSON Schemas / Source Diffs)
       ↓
Validation Gates (Typecheck, Lint, Vitest, Docker Sandboxes)
       ↓
Integration & Audit
       ↓
Final Engineering Report
```

---

## 2. Core Pillars

- **Deterministic Orchestration**: Work is decomposed into dependency-aware tasks executing concurrently where independent.
- **Artifact-Driven Communication**: Agents exchange immutable, schema-validated artifacts (`ProductSpecification`, `ArchitectureSpecification`, `DatabaseSchema`, `APIContract`, `SourceCode`, `TestReport`, `ReviewReport`, `ADR`) rather than free-form text.
- **Decoupled AI Providers**: Agents consume the `AIProvider` interface. Development targets **$0 spend** using `MockProvider` and local `OllamaProvider`, with optional cloud adapters.
- **Isolated Execution**: Untrusted generated code is built and tested inside isolated Docker containers with enforced resource and network limits.
- **Adversarial Review Loops**: The Reviewer Agent actively audits implementations against architectural and quality standards before artifacts are approved.

---

## 3. Technology Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js (App Router), React, Tailwind CSS, Framer Motion, Socket.IO Client
- **API**: Node.js, Fastify, Socket.IO Server, Zod
- **Database & Cache**: PostgreSQL 16 (Prisma ORM), Redis 7 (BullMQ & Event Bus)
- **Execution Sandbox**: Docker
- **Testing**: Vitest, Playwright

---

## 4. AI Engineering Environment

This repository is governed by an AI agent infrastructure designed for safe, reproducible, autonomous paired development:

- [`.agents/rules/`](file:///c:/Users/aniru/Desktop/AI/forgeOS/.agents/rules): 17 operational rules including the 20 Core Engineering Principles, TypeScript strictness, and security redlines.
- [`.agents/skills/`](file:///c:/Users/aniru/Desktop/AI/forgeOS/.agents/skills): 18 specialized skills defining agent roles (`pm-agent`, `architect-agent`, etc.) and platform capabilities (`orchestrator-development`, `loop-detection`, etc.).
- [`.agents/workflows/`](file:///c:/Users/aniru/Desktop/AI/forgeOS/.agents/workflows): Standard operating workflows for features, bug fixes, and architecture RFCs.
- [`.agents/templates/`](file:///c:/Users/aniru/Desktop/AI/forgeOS/.agents/templates): Templates for ADRs, implementation plans, review reports, and tasks.

---

## 5. Documentation & Getting Started

- **Primary Source of Truth**: [`docs/forgeos-spec.md`](file:///c:/Users/aniru/Desktop/AI/forgeOS/docs/forgeos-spec.md)
- **Master Mental Model**: [`docs/AI-SYSTEM/AI-CONTEXT.md`](file:///c:/Users/aniru/Desktop/AI/forgeOS/docs/AI-SYSTEM/AI-CONTEXT.md)
- **Development Roadmap**: [`docs/AI-SYSTEM/DEVELOPMENT-PHASES.md`](file:///c:/Users/aniru/Desktop/AI/forgeOS/docs/AI-SYSTEM/DEVELOPMENT-PHASES.md)
- **Current Project Status**: [`docs/AI-SYSTEM/PROJECT-STATUS.md`](file:///c:/Users/aniru/Desktop/AI/forgeOS/docs/AI-SYSTEM/PROJECT-STATUS.md)

### Current Status
- **Active Phase**: **Phase 0 — Repository Setup**
- **Next Milestone**: Monorepo workspace configuration, Docker Compose (Postgres + Redis), and base TypeScript settings.
