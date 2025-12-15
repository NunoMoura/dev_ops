# Run Tests Workflow

## Prerequisites

- [ ] Code changes are implemented or a new feature is added.
- [ ] Tests are located in `tests/` or alongside code.

## Steps

1. **Identify Scope**:
   - Determine if you are running unit tests, integration tests, or all tests.

3. **Standard**:
   - Tests MUST mirror the source directory structure.
     - `src/utils/helper.py` -> `tests/src/utils/test_helper.py`.
   - All legacy tests should be refactored to match this standard over time.

4. **Run Tests**:
   - Execute: `python3 -m pytest` (or relevant test runner for the project).
   - For specific file: `python3 -m pytest tests/src/utils/test_helper.py`.

3. **Analyze Results**:
   - **Pass**: Proceed to next step (commit/review).
   - **Fail**:
     - Read the traceback.
     - Diagnose the issue (`workflows/resolve_bug.md` if complex).
     - Fix code and re-run.

## Exit Criteria

- [ ] All relevant tests pass.
- [ ] No regressions in existing tests.
