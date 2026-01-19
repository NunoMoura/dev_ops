---
name: build-phase
description: Implement production-ready code with tests. Use when in the Build phase, when writing code, or when following TDD practices.
---

# Build Phase

> Code you'd be proud to ship.

## When to Use This Skill

- Task is in Build column
- Implementing features or fixes
- Writing tests
- Following TDD workflow

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| PLN-XXX implementation plan | Code + tests | Verify |

## TDD Workflow

For each checklist item in PLN-XXX:

### 1. Test First

Write tests before code:

- Unit tests for behavior
- Edge case tests
- Error condition tests

```python
def test_validates_input():
    """Test that invalid input raises ValidationError."""
    with pytest.raises(ValidationError):
        validate_input(None)
```

### 2. Code

Implement just enough to make tests pass:

- Handle errors gracefully
- Validate all inputs
- Follow existing patterns in the codebase

### 3. Refactor

While tests still pass:

- Simplify complex logic
- Extract reusable components
- Improve naming

### 4. Commit

Use conventional commits:

```bash
git commit -m "feat(<scope>): <what>

Task: TASK-XXX"
```

Commit types:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change (no new feature or fix)
- `test`: Adding tests
- `docs`: Documentation only

See `examples/tdd_workflow.md` for a complete TDD example.

## Decision Tree

### If Plan Gaps Found

Move back to Plan:

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-plan --commit
```

### If Blocked by Unrelated Issue

Create a new task (use `--help` for options):

```bash
python3 .dev_ops/scripts/board_ops.py create_task --help
```

```bash
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Fix blocking issue" \
  --summary "Description of the blocker" \
  --priority high \
  --commit
```

## When Complete

Run all tests:

```bash
pytest tests/ -v
```

Move to Verify:

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-verify --commit
```

## Exit Criteria

- [ ] All checklist items in PLN-XXX complete
- [ ] All tests pass
- [ ] Lint passes
- [ ] Code handles errors gracefully
- [ ] Each change committed with proper message
- [ ] Task moved to Verify column
