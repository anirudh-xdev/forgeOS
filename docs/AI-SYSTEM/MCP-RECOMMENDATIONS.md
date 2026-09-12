# Model Context Protocol (MCP) Evaluation & Recommendations
*Pragmatic assessment of MCP servers for agent-driven engineering in ForgeOS.*

---

## 1. Guiding Policy
**Do NOT blindly install every available MCP server.** MCP servers expand the system's attack surface and introduce operational overhead. External MCPs must never be mandatory if local development can proceed cleanly without them.

---

## 2. Evaluated MCP Categories & Recommendations

### 2.1 Filesystem MCP (Local Workspace Access)
- **Recommendation**: **ADOPT (Standard Built-in)**
- **Purpose**: Provides structured reading and writing of workspace files with strict directory sandboxing.
- **Why ForgeOS Needs It**: Agents require fine-grained file modification in isolated `.worktrees/`.
- **Agents Using It**: PM, Architect, Backend, Frontend, QA, Database.
- **Required Permissions**: Read/Write strictly scoped to workspace directory.
- **Security Risks**: Directory traversal attacks. Mitigated by path sanitization and rejecting absolute paths outside the workspace.
- **Timeline**: **Required Now** (Phase 0+).

### 2.2 PostgreSQL / Database MCP
- **Recommendation**: **ADOPT IN PHASE 5+ (Selective)**
- **Purpose**: Allows Database Agent to inspect schema tables, verify indexes, and run non-destructive query plans (`EXPLAIN ANALYZE`).
- **Why ForgeOS Needs It**: Allows automated schema validation against real test databases.
- **Agents Using It**: Database Agent, QA Agent.
- **Required Permissions**: Read-only connection to local PostgreSQL test database.
- **Security Risks**: Data leakage or accidental data mutation. Must be restricted to a non-production test instance with no write/drop permissions.
- **Timeline**: **Deferred to Phase 5**.

### 2.3 Docker Engine MCP
- **Recommendation**: **ADOPT IN PHASE 7 (Controlled)**
- **Purpose**: Programmatic control over ephemeral container creation for code execution and testing.
- **Why ForgeOS Needs It**: Coding and testing agents must run tests in isolated containers without direct host access.
- **Agents Using It**: QA Agent, Integration Worker.
- **Required Permissions**: Create/Run/Stop unprivileged containers with pre-set resource quotas.
- **Security Risks**: Container breakout if run in privileged mode. Mitigated by hardcoded sandbox constraints (no root, no host mounts, memory/cpu limits).
- **Timeline**: **Deferred to Phase 7**.

### 2.4 GitHub MCP
- **Recommendation**: **OPTIONAL (Phase 8+)**
- **Purpose**: Automated creation of pull requests, commits, and review comments on remote repositories.
- **Why ForgeOS Needs It**: Enables automated git synchronization for remote collaborative development.
- **Agents Using It**: Reviewer Agent, Release Worker.
- **Required Permissions**: Scoped Personal Access Token (PAT) with `repo:read`, `repo:write` for target repo only.
- **Security Risks**: Secret exfiltration or unauthorized branch overwrites. Mitigated by approval gates for remote git push.
- **Timeline**: **Deferred to Phase 8+**. Not needed for local development.

### 2.5 Browser / Puppeteer MCP
- **Recommendation**: **DEFERRED TO PHASE 10+**
- **Purpose**: Headless browser automation for visual regression testing and UI interaction.
- **Why ForgeOS Needs It**: Verifying Next.js dashboard and generated frontend applications.
- **Agents Using It**: QA Agent.
- **Security Risks**: SSRF and unconstrained external browsing.
- **Timeline**: **Deferred to Phase 10**.
