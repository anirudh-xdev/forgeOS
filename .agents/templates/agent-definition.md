# Agent Definition Specification: [Agent Name]

## 1. Metadata
- **ID**: `forgeos-[role]-agent`
- **Role**: [Official Role Title]
- **Version**: [e.g. 1.0.0]
- **Target Queue**: `agent-[planning|coding|review|testing|security|integration]`

## 2. Capabilities
- `capability_1`: [Description]
- `capability_2`: [Description]

## 3. Tool Permissions
| Tool Identifier | Permission Level | Rationale |
| :--- | :--- | :--- |
| `read_artifact` | READ | Read approved upstream artifacts |
| `write_worktree_file` | WRITE | Generate code inside assigned worktree |

## 4. Input Contract Schema (Zod)
```typescript
export const [Role]InputSchema = z.object({
  projectId: z.string().uuid(),
  // ...
});
```

## 5. Output Contract Schema (Zod)
```typescript
export const [Role]OutputSchema = z.object({
  // ...
});
```

## 6. Failure Modes & Recovery
- **Anticipated Failure 1**: [Description and recovery path]
- **Anticipated Failure 2**: [Description and recovery path]

## 7. System Prompt Template
```text
You are the [Role] in ForgeOS...
```
