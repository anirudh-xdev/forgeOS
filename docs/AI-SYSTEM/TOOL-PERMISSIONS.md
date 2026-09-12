# Agent Tool Permissions & Security Boundaries
*Tiered classification of tools, execution rights, and approval gates.*

---

## 1. The Three Permission Tiers

Every capability or tool exposed to an agent is classified into one of three security tiers:

```text
┌──────────────────────────────────────────────────────────────┐
│ TIER 1: READ (Autonomous / Auto-Approved)                   │
│ • Reading files, specs, schemas, and logs                    │
│ • Zero state mutation, zero host impact                      │
└──────────────────────────────┬───────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ TIER 2: WRITE (Constrained / Sandbox Monitored)              │
│ • Modifying files inside assigned .worktrees/                │
│ • Authoring tests, drafting artifacts                        │
│ • Running sandboxed test commands in Docker                  │
└──────────────────────────────┬───────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ TIER 3: DANGEROUS (Requires Explicit Approval Gate)          │
│ • Database migrations or deletions                          │
│ • Git push or remote modifications                           │
│ • Docker host mounts or privileged mode                      │
│ • Production deployments or secret access                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Tool Classification Table

| Tool / Action | Permission Tier | Execution Scope | Approval Required? |
| :--- | :--- | :--- | :--- |
| `read_file` | **READ** | Repository / Workspace | No |
| `list_directory` | **READ** | Repository / Workspace | No |
| `query_database_read` | **READ** | Read-only SQL replica | No |
| `inspect_test_logs` | **READ** | Sandbox stdout / stderr | No |
| `write_worktree_file` | **WRITE** | Dedicated agent worktree | No |
| `run_sandbox_test` | **WRITE** | Ephemeral Docker container | No |
| `git_commit_local` | **WRITE** | Agent feature branch | No |
| `prisma_migrate_dev` | **DANGEROUS** | Local development database | **Yes (Gate / Human)** |
| `database_drop_or_truncate` | **DANGEROUS** | Any database | **Yes (Human Required)** |
| `git_push_remote` | **DANGEROUS** | Remote Git repository | **Yes (Gate / Human)** |
| `docker_privileged_run` | **DANGEROUS** | Host Docker daemon | **STRICTLY PROHIBITED** |
| `expose_env_credentials` | **DANGEROUS** | Memory / Environment | **STRICTLY PROHIBITED** |

---

## 3. Enforcement Mechanism
The `AgentRunner` inspects the agent's tool permissions against the requested tool invocation. If an agent attempts to call a `DANGEROUS` tool without approval token or executes a prohibited action, the runtime immediately rejects the execution, terminates the task, and raises a `SECURITY_VIOLATION` event.
