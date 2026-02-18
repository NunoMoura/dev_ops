# Shipping & Closure Checklist

> Final steps before moving onto the next task.

## The Handoff

- [ ] **PR Status**: Is the PR merged or approved?
- [ ] **Documentation**: Is `SPEC.md` updated?
- [ ] **Clean**: Temporary files removed?

## Git Workflow

1. **Commit**: `git commit -m "feat(task): [TASK-XXX] Title"`
2. **Push**: `git push origin feature/TASK-XXX`
3. **PR**: `gh pr create` (if not already done in Verify)

## Task Management (Board)

- **Move to Done**: `node .dev_ops/scripts/devops.js move-task --id [TASK-ID] --column col-done`
- **Note**: Usually the PR merge handles this, but manual moves are sometimes needed.

## Context Reset

- **Action**: Clear your context window (notify user).
- **Goal**: Ready for the next `claim-task`.
