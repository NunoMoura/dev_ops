---
phase: build
activation_mode: Model Decides
triggers: [task_in_build]
---

# Build Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | implementation_plan.md |
| ARTIFACT | Production-ready code + comprehensive tests |
| EXIT_TO | Verify |

## Goal

> **Code you'd be proud to ship.**

Every line should be intentional, tested, and maintainable.

## ACTIONS

For each checklist item:

1. **Write the test first**
   - Test the behavior, not the implementation
   - Cover the happy path AND edge cases
   - Include error conditions and invalid inputs

2. **Write clean, production-ready code**
   - Handle errors gracefully (no silent failures)
   - Validate inputs at boundaries
   - Follow existing code patterns and style
   - Use clear, descriptive names
   - Keep functions focused (single responsibility)

3. **Refactor while tests pass**
   - Simplify complex logic
   - Extract reusable components
   - Remove dead code and duplication

4. **Commit with context**

   ```bash
   git commit -m "feat(<scope>): <what changed>

   Task: TASK-XXX
   Checklist: #N"
   ```

5. **Mark complete** — Check off item in plan

### Quality Checks

Before moving on from each item:

- Would I understand this code in 6 months?
- Have I handled what happens when things go wrong?
- Are my tests testing behavior or just covering lines?

### If Plan Gaps Found

If implementation reveals the plan is missing critical details, **move backward**:

```bash
python3 dev_ops/scripts/board_ops.py move TASK-XXX col-plan
```

### If Blocked by Unrelated Issue

Spawn a new task, don't delay current work:

```bash
python3 dev_ops/scripts/board_ops.py create --title "Blocker: reason" --spawn-from TASK-XXX
```

### When All Items Complete

```bash
ruff check .
pytest tests/ -v
python3 dev_ops/scripts/board_ops.py move TASK-XXX col-verify
```

## EXIT_CRITERIA

- [ ] All checklist items complete
- [ ] Tests cover behavior AND edge cases
- [ ] All tests pass
- [ ] Lint passes
- [ ] Code handles errors gracefully
- [ ] Code follows existing patterns
- [ ] Task in Verify column
