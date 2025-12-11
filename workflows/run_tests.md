# Run Tests Workflow

## Prerequisites

- [ ] Code changes are implemented or a new feature is added.
- [ ] Tests are located in `tests/` or alongside code.

## Steps

1. **Identify Scope**:
   - Determine if you are running unit tests, integration tests, or all tests.

2. **Run Tests**:
   - Execute: `python3 -m pytest` (or relevant test runner for the project).
   - For specific file: `python3 -m pytest path/to/test_file.py`.

3. **Analyze Results**:
   - **Pass**: Proceed to next step (commit/review).
   - **Fail**:
     - Read the traceback.
     - Diagnose the issue (`workflows/resolve_bug.md` if complex).
     - Fix code and re-run.

## Exit Criteria

- [ ] All relevant tests pass.
- [ ] No regressions in existing tests.
