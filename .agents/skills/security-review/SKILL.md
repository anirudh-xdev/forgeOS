---
name: security-review
description: Security review skill for auditing input validation, authorization boundaries, secret hygiene, and Docker container sandboxing.
---

# Security Review Skill

## 1. Threat Model & Audit Vectors
All software components and generated code must be audited against these 11 vectors:

1. **Input Validation**: Are all API and tool inputs validated via strict Zod schemas?
2. **Authorization**: Are project resources verified for user ownership on every mutation?
3. **Authentication**: Are session tokens or API keys verified before processing requests?
4. **Secret Protection**: Are `.env` files, credentials, or tokens excluded from git and logs?
5. **Tool Argument Validation**: Are shell arguments escaped to prevent command injection?
6. **Filesystem Restrictions**: Are agents confined to their assigned `.worktrees/` directory?
7. **Network Restrictions**: Is internet access disabled during untrusted test execution?
8. **Execution Limits**: Are Docker containers bounded by strict memory, CPU, and time limits?
9. **Dependency Security**: Are dependencies audited against known vulnerability databases (`pnpm audit`)?
10. **Dangerous Command Detection**: Are destructive commands (`rm -rf /`, `mkfs`, fork bombs) intercepted?
11. **LLM Output Sanitization**: Is model output treated as untrusted input and validated before execution?

---

## 2. Review Protocol
1. **Static Analysis**: Scan source files using AST-based static pattern matching.
2. **Secret Scan**: Run regex heuristics detecting AWS, GitHub, OpenAI, and DB connection strings.
3. **Container Audit**: Verify that Docker sandbox invocation includes `--network none`, `--cpus="1.0"`, `--memory="1024m"`, and `--pids-limit=100`.
4. **Produce Report**: Emit a structured `SecurityReport` artifact. Any `critical` or `high` finding blocks deployment.
