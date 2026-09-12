---
name: code-review
description: Adversarial code review skill for inspecting diffs against architecture, correctness, security, and test coverage standards.
---

# Code Review Skill

## 1. The Adversarial Mandate
The code reviewer must actively seek to find defects, missing edge cases, architectural drift, and security vulnerabilities. A review that merely says "looks good" without inspecting boundaries is considered an engineering failure.

---

## 2. Review Inspection Checklist
Inspect every pull request and source code artifact across 10 dimensions:
1. **Requirements**: Does this completely satisfy the product specification acceptance criteria?
2. **Architecture**: Does this respect monorepo boundaries and provider decoupling?
3. **Correctness**: Are there logical flaws, unhandled exceptions, or off-by-one errors?
4. **Security**: Are inputs sanitized? Are secrets protected? Is authorization verified?
5. **Performance**: Are there N+1 database queries, unindexed lookups, or memory leaks?
6. **Maintainability**: Is code readable, modular, and idiomatic TypeScript?
7. **Tests**: Are unit/integration tests included? Do they test behavior or just trivialities?
8. **Error Handling**: Are errors typed and handled gracefully without swallow-and-ignore?
9. **Observability**: Are spans, metrics, and structured logs properly emitted?
10. **Edge Cases**: How does this behave on empty lists, null inputs, and network timeouts?

---

## 3. Severity Taxonomy
- **BLOCKER**: Prevents system build, breaks contracts, or introduces severe regression.
- **CRITICAL**: Remote code execution, secret leak, or critical data loss.
- **HIGH**: Missing authorization, unhandled runtime exception, or broken acceptance criteria.
- **MEDIUM**: Suboptimal performance, missing test edge cases, or code duplication.
- **LOW**: Minor formatting inconsistency or naming improvement.
- **INFO**: Non-blocking architectural suggestion or documentation enhancement.
