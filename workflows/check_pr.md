---
description: Run local pre-flight checks before pushing a PR.
---

# Check PR Workflow

## Prerequisites

- [ ] Code is committed locally.
- [ ] Branch is up to date with `main`.

## Relations

- **Upstream**:
  - **PR**: `PR-XXX` (Pull Request being checked)
- **Downstream**:
  - **Triage**: `workflows/triage_feedback.md` (If checks result in feedback)
  - **Merge**: (If checks pass)

## Steps

1. **Validate Documentation**:
   - Run `python3 dev_ops/scripts/doc_ops.py validate`.
   - Fix any broken links or missing metadata.
2. **Lint Code**:
   - Run project-specific linters (e.g., `flake8`, `eslint`).
   - Fix style violations.
3. **Verify Tests**:
   - **New Code**: MUST have passing tests.
   - **Legacy Code**:
     - *Ideally*: Add tests for modified legacy code.
     - *Fallback*: If adding tests is too large a scope, create a **Backlog Item** `[Test]` (e.g., "Add tests for legacy module X") and link it in the PR description.
   - Run `workflows/run_tests.md`.

## Exit Criteria

- [ ] Documentation is valid.
- [ ] Linter is cleaner.
- [ ] Tests pass.
