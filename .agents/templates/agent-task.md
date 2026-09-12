# Task: [Task Title]

## Objective
[Clear statement of what the agent is tasked to achieve.]

## Context
[Relevant background, project state, and architectural prerequisites.]

## Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Relevant Artifacts
- **Upstream Artifacts**:
  - `[ArtifactType]` (ID: `[UUID]`, Version: `[N]`)
- **Target Deliverable**: `[ArtifactType]`

## Constraints
- Token budget: [N] tokens
- Max execution time: [N] seconds
- Technology stack: [Target package / framework]

## Allowed Tools
- `[tool_1]`
- `[tool_2]`

## Forbidden Actions
- Do not execute code on host system
- Do not import direct vendor LLM SDKs
- Do not modify files outside assigned workspace

## Expected Output
[Exact structure or schema of the expected result.]

## Validation
- Schema validation via `[SchemaName]`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test`

## Definition of Done
- [ ] Deliverable conforms 100% to output schema
- [ ] No regression introduced
- [ ] Validation suite passes without warning

## Handoff
- Target Next Agent: `[e.g. forgeos-reviewer-agent]`
- Target Event: `[e.g. TASK_COMPLETED]`
