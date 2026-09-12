---
name: artifact-driven-development
description: Guide for creating, versioning, validating, and approving structured artifacts within ForgeOS.
---

# Artifact-Driven Development Skill

## 1. Core Principle
Agents never communicate through free-form, unconstrained chat. All engineering deliverables are versioned, immutable, schema-validated **Artifacts**.

---

## 2. Artifact Schema & State Machine

```typescript
export type ArtifactType =
  | "ProductSpecification"
  | "ArchitectureSpecification"
  | "DatabaseSchema"
  | "APIContract"
  | "UISpecification"
  | "SourceCode"
  | "TestReport"
  | "SecurityReport"
  | "ReviewReport"
  | "ADR";

export type ArtifactStatus = "draft" | "approved" | "rejected";

export interface Artifact<T = unknown> {
  id: string;
  projectId: string;
  taskId?: string;
  type: ArtifactType;
  version: number;
  createdBy: string;
  content: T;
  status: ArtifactStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Artifact Lifecycle
1. **Creation**: Agent produces output; output is validated against Zod schema and saved as `status: "draft"` (version 1).
2. **Review**: The Reviewer Agent audits the artifact.
   - If acceptable: marked as `approved`.
   - If unacceptable: marked as `rejected`, with a `ReviewReport` containing actionable feedback.
3. **Iteration**: If rejected, a new version (version 2) is drafted by the producing agent.
4. **Consumption**: Downstream tasks only load artifacts that have reached `approved` status.
