---
activation_mode: manual
description: Process for fixing tracked bugs. Agent uses this to resolve bugs in docs/bugs/.
globs: "**/*"
---

# Resolve Bug Workflow

## Prerequisites

- [ ] Bug is assigned to you or unassigned.
- [ ] You have reproduced the issue (if applicable).
- [ ] Tests exist that fail (demonstrating the bug).

## Steps

1. **Implement Fix**:
   - specific code changes to resolve the issue.

2. **Verify Fix**:
   - Run tests to ensure they now pass.
   - Run regression tests (`workflows/run_tests.md`).

   - Run `python3 dev_ops/scripts/doc_ops.py resolve bug [ID]`.
   - Update `dev_ops/docs/bugs/BUG-XXX.md` with resolution notes.

## Exit Criteria

- [ ] Code fixed and committed.
- [ ] Bug status set to `closed`.
- [ ] Regressions checked.
