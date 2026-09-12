# Security & Execution Sandbox Rules
*Enforcing isolated Docker execution, secret protection, and least-privilege tool permissions.*

---

## 1. Sandbox Isolation Policy (Specification Section 12 & 28)

**Never execute generated or untrusted code on the host operating system.**

### Docker Sandbox Architecture
```text
Agent Generates Code
         ↓
Writes to Isolated Git Worktree / Workspace
         ↓
Mounts into Ephemeral Docker Sandbox Container
         │
         ├── CPU Limit: 1.0 core
         ├── Memory Limit: 1024 MB
         ├── Execution Timeout: 60 seconds
         ├── Process Limit: max 100 pids
         ├── Network Policy: Disabled during test execution (`--network none`)
         └── Non-root User: Executes as unprivileged user (`nobody` or `sandbox`)
         ↓
Runs: npm install (with cached tarballs) → npm run build → npm test
         ↓
Captures: stdout, stderr, exitCode, generated artifacts
         ↓
Destroys Ephemeral Container
```

---

## 2. Secret Protection & Environment Hygiene

1. **Zero Secret Exposure to LLMs**: System environment variables (`DATABASE_URL`, `REDIS_URL`, cloud API keys) must never be injected into prompts or made accessible to LLM tools.
2. **No Committed Secrets**: `.env` files, certificates, and API tokens must be included in `.gitignore`. Automated pre-commit checks will reject commits containing potential secrets.
3. **Redaction in Logs**: All structured loggers and `AgentRun` records must pass through a redaction filter masking high-entropy strings and known credential patterns.

---

## 3. Tool Permission Classification

Every tool exposed to an AI agent must be strictly categorized according to its risk profile:

- **READ (Auto-approved)**: Inspecting repository files, reading schemas, querying test results.
- **WRITE (Constrained)**: Creating or modifying files within the agent's assigned worktree.
- **DANGEROUS (Requires Human / Gate Approval)**: Running database migrations, dropping tables, executing external network requests, committing to main branches.
