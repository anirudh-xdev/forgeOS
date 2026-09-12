# Architecture Change Workflow
*Protocol for proposing, debating, and recording architectural modifications.*

---

## The Architectural RFC & ADR Sequence

Any proposal that alters component boundaries, introduces new databases or message brokers, changes the orchestration model, or modifies core contracts must adhere to this workflow:

1. **Problem Statement**: Explicitly document what constraint, performance limitation, or capability gap necessitates the architectural change.
2. **Current Architecture**: Document the baseline architecture currently implemented in the repository.
3. **Proposed Architecture**: Present the target design, including component diagrams, interfaces, and data flows.
4. **Alternatives Evaluated**: Detail at least two alternative designs and explain why they were rejected.
5. **Trade-off Analysis**: Systematically evaluate the proposal across five vectors:
   - **Cost**: Inference spend, hosting fees, resource utilization.
   - **Complexity**: Cognitive overhead, maintenance burden, dependency footprint.
   - **Scalability**: Throughput limits, concurrency handling, database read/write volume.
   - **Security**: Attack surface, sandboxing implications, secret handling.
   - **Migration Strategy**: Step-by-step zero-downtime plan for migrating existing data, queues, and contracts.
6. **Author ADR**: Document the decision in `docs/adr/YYYY-MM-DD-<title>.md` following `.agents/templates/adr.md`.
7. **Review & Approval**: Submit the ADR for human/reviewer sign-off before writing any production code.
