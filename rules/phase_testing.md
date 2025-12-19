---
activation_mode: Model Decides
description: Testing phase - validation before completion.
---

# Testing Phase

Validate implementation with tests before PR.

## Artifacts

**Test Report**: `TST-XXX` in `dev_ops/tests/`
**Bug Reports**: `BUG-XXX` in `dev_ops/bugs/`
**Templates**: `templates/test_report.md`, `templates/bug.md`

## Test Structure

```text
tests/
├── <module>/           # Mirrors src/<module>/
│   └── test_<file>.py  # Mirrors src/<module>/<file>.py
└── e2e/                # Integration tests
    └── test_*.py
```

**Rule**: For every `src/module/file.py` there must be `tests/module/test_file.py`

## How to Test

1. **Verify Test Coverage**:
   - For each modified file, ensure corresponding test exists
   - Check what files changed: `git diff --name-only HEAD~1`
   - Create missing test files if needed

2. **Run Test Suite**:

   ```bash
   # All tests
   python3 -m pytest tests/ -v

   # With coverage
   python3 -m pytest tests/ --cov=src --cov-report=term

   # Specific file
   python3 -m pytest tests/module/test_file.py
   ```

3. **Generate Test Report**:
   - Create `dev_ops/tests/TST-XXX.md` from template
   - Record: total/passed/failed counts, coverage %, failed test details

4. **Handle Failures**:
   - For each failed test, create BUG-XXX:

     ```bash
     python3 dev_ops/scripts/doc_ops.py create bug --title "Test failure"
     ```

   - Analyze failure: read traceback, diagnose root cause
   - Fix code and re-run tests
   - BUG stays open until test passes

5. **Link Artifacts**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py downstream TASK-XXX TST-XXX
   ```

## Quality Gates

Before moving to Done, all must pass:

- [ ] All tests pass
- [ ] Linting passes
- [ ] No security issues
- [ ] Build succeeds
- [ ] Coverage maintained or improved

> [!IMPORTANT]
> Do NOT move to Done until all tests pass.

## Exit Criteria

- [ ] TST-XXX report created
- [ ] All tests passing
- [ ] BUG-XXX created for any failures (and fixed)
- [ ] Move task to Done
