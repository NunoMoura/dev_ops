---
activation_mode: Model Decides
description: Done phase - completion and PR creation.
---

# Done Phase

Completed work ready for merge.

## Artifacts

**Output**: PR, COMP-XXX (completion report)
**Links**: All upstream artifacts (RES, PLN, TST, REV)

## Task Completion Procedure

Follow these steps to complete a task:

### 1. Final Verification

- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Documentation updated

### 2. Create Completion Report

```bash
python3 dev_ops/scripts/doc_ops.py create report \
  --type completion \
  --task TASK-XXX
```

This creates `COMP-XXX` documenting:

- Commit SHA
- PR link
- All linked artifacts
- Summary of work done

### 3. Push Branch

```bash
git push origin <branch-name>
```

### 4. Create Pull Request

```bash
gh pr create
```

Or use GitHub UI.

### 5. Mark Task Done

```bash
python3 dev_ops/scripts/kanban_ops.py done TASK-XXX \
  --outputs "PLN-001.md" "COMP-001.md" \
  --create-pr
```

## Commit Linking

When you complete a task, the commit SHA is automatically captured:

- Stored in task metadata as `commitSha` (first 7 characters)
- Visible in task details on the Kanban board
- Enables traceability from task to code

**Optional: Attach git note for rich context:**

```bash
git notes add -m "TASK-XXX: Summary of changes" HEAD
```

## PR Standards

### Title Format

```text
TASK-XXX: Brief description
```

### Body Template

```markdown
## Summary
Brief description of changes

## Task
TASK-XXX

## Artifacts
- Research: RES-XXX
- Plan: PLN-XXX
- Tests: TST-XXX
- Review: REV-XXX
- Completion: COMP-XXX

## Changes
- File 1: what changed
- File 2: what changed

## Verification
- [x] Tests pass
- [x] Linting passes
- [x] Build succeeds
```

### Linking Requirements

- PR description references TASK-XXX
- All artifacts linked to task's downstream
- GitHub Issue linked if applicable

## Context Handoff

The completion report (COMP-XXX) serves as:

- Summary for PR reviewers
- Context for future agents/humans
- Audit trail of what was done

> [!IMPORTANT]
> Always create COMP-XXX before marking done. This ensures
> perfect context handoff for future work.

## Exit Criteria

- [ ] COMP-XXX created
- [ ] PR created and linked
- [ ] Task in Done column
- [ ] All artifacts linked
- [ ] CI/CD checks pass
