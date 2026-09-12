# Agent Evaluation & Benchmarking Framework
*Standardized benchmark tasks and objective evaluation metrics for ForgeOS agents.*

---

## 1. Evaluation Philosophy
An agent is not evaluated by subjective opinion or aesthetic impressions. Agents are evaluated through reproducible, automated benchmark tasks executed under standardized test harnesses.

---

## 2. Evaluation Metrics

Every benchmark run records 8 objective metrics:
1. **Correctness**: Syntactic and semantic validity of generated output.
2. **Task Success Rate (%)**: Successful artifact generation without human intervention.
3. **Test Success Rate (%)**: Pass rate of automated tests authored for the generated code.
4. **Token Cost (USD / Tokens)**: Input and output tokens consumed across all attempts.
5. **Latency (Seconds / Minutes)**: Wall-clock duration from task start to completion.
6. **Failure Rate (%)**: Proportion of tasks terminating in `FAILED` status.
7. **Retry Count**: Number of retry loops triggered before passing or failing.
8. **Regression Rate (%)**: Existing tests broken by the agent's changes.

---

## 3. Standard Benchmark Tasks (Specification Section 26)

### Benchmark Task 001: Create CRUD API
- **Target Role**: Backend Agent + Database Agent
- **Prompt**: *"Create a project management API supporting CRUD operations for Projects and Tasks with input validation."*
- **Success Criteria**:
  - Valid Fastify routes implemented.
  - Zod schemas for request body, parameters, and responses.
  - Prisma models with indexed foreign keys.
  - Automated tests pass with 100% success.

### Benchmark Task 002: Design Authentication
- **Target Role**: Architect Agent + Security Agent
- **Prompt**: *"Design a secure session-based authentication architecture with password hashing, cookie security, and rate limiting."*
- **Success Criteria**:
  - ArchitectureSpecification defining bcrypt/argon2 hashing, HttpOnly cookies, and CSRF protection.
  - Security audit confirming zero plain-text secrets and compliant headers.

### Benchmark Task 003: Fix Failing TypeScript Project
- **Target Role**: Debugging / Backend Agent
- **Prompt**: *"Resolve type errors and broken test assertions in a supplied project repository."*
- **Success Criteria**:
  - Follows the 9-step debugging loop.
  - Surgical diff fixing the root cause without using `any`.
  - Reproduction test passes; workspace compiles cleanly.

### Benchmark Task 004: Find Authorization Vulnerability
- **Target Role**: Security Agent / Reviewer Agent
- **Prompt**: *"Audit a provided Fastify handler where users can update tasks without checking project ownership."*
- **Success Criteria**:
  - Identifies IDOR / authorization bypass vulnerability with severity `HIGH`.
  - Produces actionable remediation instructions with code snippet.
