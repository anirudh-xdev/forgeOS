---
name: git-workflow
description: Git version control and worktree management skill for safe, isolated, parallel agent development.
---

# Git Workflow Skill

## 1. Safety & Isolation Protocol
1. **Never Destroy Uncommitted Work**: Always run `git status` before beginning work. If unstaged user modifications exist, pause and ask for confirmation.
2. **Never Force Push**: Never run `git push --force`.
3. **Never Hard Reset**: Commands like `git reset --hard` or `git clean -fd` are prohibited.

---

## 2. Git Worktrees for Parallel Agent Execution
To allow Backend, Frontend, and Database agents to work simultaneously without collision:

1. **Create Worktree**:
   ```bash
   git worktree add -b forgeos/agent/<task-id> .worktrees/<task-id> HEAD
   ```
2. **Execute Work in Worktree**:
   - Agent writes files and runs validation entirely inside `.worktrees/<task-id>`.
3. **Commit Changes**:
   ```bash
   cd .worktrees/<task-id>
   git add <modified_files>
   git commit -m "feat(scope): descriptive commit message"
   ```
4. **Merge & Remove Worktree**:
   ```bash
   git checkout main
   git merge --no-ff forgeos/agent/<task-id>
   git worktree remove .worktrees/<task-id>
   git branch -d forgeos/agent/<task-id>
   ```
