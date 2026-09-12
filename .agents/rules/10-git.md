# Git & Workspace Isolation Rules
*Standards for Git hygiene, worktrees, non-destructive branching, and conventional commits.*

---

## 1. Git Worktree Workspace Strategy (Specification Section 13)

To prevent file collision and race conditions during parallel agent execution, every coding task must operate within its own dedicated Git worktree:

```text
main (clean baseline)
  ├── forgeos/agent/backend-task-101   (Worktree A)
  ├── forgeos/agent/frontend-task-102  (Worktree B)
  └── forgeos/agent/db-task-103        (Worktree C)
```

### Worktree Lifecycle Flow
1. **Create Task**: Orchestrator creates task in DB.
2. **Spawn Worktree**: `git worktree add -b forgeos/agent/<task-id> .worktrees/<task-id> HEAD`.
3. **Agent Modification**: Agent reads and modifies files strictly within `.worktrees/<task-id>`.
4. **Validation**: Test runner executes sandbox validation inside the worktree directory.
5. **Generate Patch / Commit**: Agent commits changes with conventional commit syntax.
6. **Reviewer Evaluation**: Reviewer agent audits the git diff.
7. **Merge & Prune**: Worktree is merged to the target integration branch and removed: `git worktree remove .worktrees/<task-id>`.

---

## 2. Safe Git Operations Checklist

1. **Pre-flight Status Check**: Always inspect `git status` and current branch before modifying files.
2. **Never Overwrite User Changes**: Never run `git checkout -- .`, `git reset --hard`, or `git clean -fd` without explicit user confirmation.
3. **Never Force Push**: `git push --force` is strictly forbidden.
4. **Focused Diffs**: Commits must contain only files directly relevant to the task. Never commit temporary files, debug logs, or unrelated whitespace changes.
5. **Conventional Commit Syntax**: Format commit messages strictly as:
   - `feat(scope): add feature description`
   - `fix(scope): resolve issue description`
   - `test(scope): add test suite for module`
   - `docs(scope): update architectural documentation`
   - `refactor(scope): restructure component without behavior change`
