# Documentation & ADR Standards
*Guidelines for living architectural documentation, decision records, and knowledge preservation.*

---

## 1. Documentation-First Philosophy

In ForgeOS, documentation is not an afterthought; it is the contract and audit trail governing all agent activities.

### Core Documentation Rules
1. **Never Silently Change Architecture**: If a requirement demands changing an architectural pattern, create an Architecture Decision Record (ADR) first.
2. **Synchronize Code & Docs**: Every feature pull request must update relevant documentation in `docs/` and interface contracts in `packages/contracts`.
3. **Structured Formats**: Use standard GitHub-Flavored Markdown. Use Mermaid diagrams for sequence flows and component relationships.

---

## 2. Architecture Decision Records (ADRs)

All significant structural, database, or provider decisions must be documented in `docs/adr/` using the standard format:

- **Format**: `docs/adr/YYYY-MM-DD-<title>.md`
- **Required Sections**:
  - `Title`: Short descriptive name
  - `Status`: `Proposed` | `Accepted` | `Rejected` | `Superseded`
  - `Context`: Background problem statement and environmental factors
  - `Decision`: The architectural path selected
  - `Alternatives Considered`: Other options evaluated and reasons for rejection
  - `Consequences`: Positive outcomes, negative trade-offs, and risks
