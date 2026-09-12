# New Agent Creation Workflow
*Step-by-step protocol for designing and registering specialized agents.*

---

## Agent Proliferation Warning
Do **NOT** create a new agent simply because "another agent would be nice." ForgeOS is built around a small team of highly specialized, accountable agents. Avoid overlapping roles or excessive agent fragmentation.

---

## The 11-Step Agent Definition Sequence

Before creating an agent in `packages/agent-runtime/src/agents/`:

1. **Identify Responsibility**: Articulate the exact, unique domain this agent governs.
2. **Audit Existing Agents**: Verify that none of the existing agents (PM, Architect, Database, Backend, Frontend, QA, Security, Reviewer) can naturally fulfill this responsibility.
3. **Define Capabilities**: List concrete capability strings (e.g. `["generate_migration", "lint_schema"]`).
4. **Define Input Schema**: Author a strict Zod schema in `packages/contracts` validating all required input fields.
5. **Define Output Schema**: Author a strict Zod schema in `packages/contracts` validating the exact structure of the produced artifact.
6. **Define Tools**: Declare the minimal set of tools the agent may invoke.
7. **Define Permissions**: Classify each tool permission as `READ`, `WRITE`, or `DANGEROUS`.
8. **Define Failure Modes**: Document anticipated errors (syntax errors, invalid schema, timeout, ambiguous prompt).
9. **Define Validation**: Implement the 4-stage pipeline: Generate → Validate → Normalize → Persist.
10. **Define Artifacts**: Map the agent's output to a concrete `ArtifactType`.
11. **Define Evaluation Benchmark**: Create at least two deterministic benchmark tasks to test the agent's reliability and output accuracy.
