# Project Memory & Context Persistence Rules
*Guidelines for structured project memory, auditability, and preventing context degradation.*

---

## 1. Project Memory Model (Specification Section 16)

Agents must never rely on chat conversation history as the persistent memory of the project. LLM context windows are ephemeral and lossy.

### Stored Memory Categories
ForgeOS persists all project knowledge into PostgreSQL across these concrete entities:

```text
┌────────────────────────────────────────────────────────┐
│                   PROJECT MEMORY STORE                 │
├──────────────────────┬─────────────────────────────────┤
│ Requirements         │ ProductSpecification artifacts  │
│ Decisions            │ ProjectDecision / ADR records   │
│ Artifacts            │ Versioned Artifact entities     │
│ Agent Outputs        │ AgentRun execution records      │
│ Failures & Errors    │ Structured error logs & traces  │
│ Fixes & Resolutions  │ Recovery tasks & applied diffs  │
│ Reviews & Audits     │ ReviewRecord audits & scores    │
│ Architecture         │ ArchitectureSpecification docs  │
│ Test Results         │ TestReport artifacts            │
└──────────────────────┴─────────────────────────────────┘
```

---

## 2. Memory Retrieval Principles

1. **Relational Lookup Over Vector Guessing**: In early phases (Phase 0–8), retrieve context deterministically via foreign keys (`projectId`, `taskId`, `artifactId`).
2. **Context Compression**: When passing memory to an agent, load only the structured summary and required contract schemas. Never dump the entire project history into a prompt.
3. **Immutable Decision History**: Once an ADR or decision record is marked `ACCEPTED`, it cannot be altered without creating a new superseding decision record.
