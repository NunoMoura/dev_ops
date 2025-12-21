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

## TDD Workflow

### 1. Red Phase (Write Failing Tests)

Before implementing, write tests that define expected behavior:

```bash
# Create test file mirroring source structure
touch tests/module/test_feature.py

# Write test cases that define acceptance criteria
# Run tests - they should FAIL (no implementation yet)
python3 -m pytest tests/module/test_feature.py -v
```

> [!IMPORTANT]
> Do NOT proceed until you have failing tests. This ensures tests
> actually validate behavior, not just pass by accident.

### 2. Green Phase (Make Tests Pass)

Implement the minimum code to make tests pass:

```bash
# Implement the feature
# Run tests after implementation
python3 -m pytest tests/module/test_feature.py -v
# Expected: PASSED
```

### 3. Refactor Phase (Improve Code)

With passing tests as safety net, improve code quality:

- Remove duplication
- Improve naming
- Extract functions
- Optimize performance

```bash
# Re-run tests to ensure they still pass
python3 -m pytest tests/module/test_feature.py -v
```

### 4. Verify Coverage

```bash
# Run with coverage
python3 -m pytest tests/ --cov=src --cov-report=term

# Target: >80% coverage for new code
```

### 5. Generate Test Report

- Create `dev_ops/tests/TST-XXX.md` from template
- Record: total/passed/failed counts, coverage %, TDD compliance

### 6. Handle Failures

For each failed test, create BUG-XXX:

```bash
python3 dev_ops/scripts/doc_ops.py create bug --title "Test failure"
```

Fix code and re-run tests. BUG stays open until test passes.

### 7. Link Artifacts

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

- [ ] TST-XXX report created with `component:` field set
- [ ] All tests passing
- [ ] Component doc's Verification section updated with TST-XXX reference
- [ ] BUG-XXX created for any failures (and fixed)
- [ ] Move task to Done
