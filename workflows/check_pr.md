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
3. **Run Tests**:
   - Run `workflows/run_tests.md`.
   - Ensure all tests pass.

## Exit Criteria

- [ ] Documentation is valid.
- [ ] Linter is cleaner.
- [ ] Tests pass.
