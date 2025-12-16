---
description: Run tests to verify code changes.
---

# Verify Workflow

## Prerequisites

- [ ] Code changes are implemented or a new feature is added.
- [ ] Tests are located in `tests/` or alongside code.

## Relations

- **Upstream**:
  - **Code**: `[Repository]` (Code to be verified)
  - **Plan**: `PLN-XXX` (Plan defining tests)
- **Downstream**:
  - **PR**: `PR-XXX` (Pull Request)
  - **Bug**: `BUG-XXX` (If verification fails)

## Template

None - outputs test results, not document artifacts.

## Steps

1. **Identify Scope**:
   - Determine if you are running unit tests, integration tests, or all tests.

2. **Standard**:
   - Tests MUST mirror the source directory structure.
     - `src/utils/helper.py` -> `tests/src/utils/test_helper.py`.
   - All legacy tests should be refactored to match this standard over time.

3. **Run Tests**:
   - Execute: `python3 -m pytest` (or relevant test runner for the project).
   - For specific file: `python3 -m pytest tests/src/utils/test_helper.py`.

4. **Analyze Results**:
   - **Pass**: Proceed to next step (commit/review).
   - **Fail**:
     - Read the traceback.
     - Diagnose the issue (`workflows/resolve_bug.md` if complex).
     - Fix code and re-run.

## Exit Criteria

- [ ] All relevant tests pass.
- [ ] No regressions in existing tests.
