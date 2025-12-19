---
activation_mode: Model Decides
description: Done phase - completion and PR creation.
---

# Done Phase

Completed work ready for merge.

## Artifact

**Output**: Pull Request
**Links**: All upstream artifacts (RES, PLN, TST)

## How to Complete

1. **Final Verification**:
   - All tests pass
   - Linting passes
   - Build succeeds
   - Documentation updated

2. **Push Branch**:

   ```bash
   git push origin <branch-name>
   ```

3. **Create Pull Request**:

   ```bash
   gh pr create
   ```

   Or use GitHub UI.

4. **Complete Task**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py done TASK-XXX \
     --outputs "PLN-001.md" "src/feature.py" \
     --create-pr
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

## Standards

- All tests must pass before PR
- Request review if `completionCriteria.review: true`
- Address all review feedback before merge

## Exit Criteria

- [ ] PR created and linked
- [ ] Task in Done column
- [ ] All artifacts linked
- [ ] CI/CD checks pass
