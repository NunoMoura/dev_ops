---
description: Build phase - implement production-ready code with tests
activation_mode: Model Decides
---

# Build Phase

| INPUTS | ARTIFACT | EXIT_TO |
|--------|----------|---------|
| implementation_plan.md | Code + tests | Verify |

> Code you'd be proud to ship.

## Actions

For each checklist item:

1. **Test first** — Behavior, edge cases, error conditions
2. **Code** — Handle errors, validate inputs, follow patterns
3. **Refactor** — Simplify while tests pass
4. **Commit**

   ```bash
   git commit -m "feat(<scope>): <what>

   Task: TASK-XXX"
   ```

**If plan gaps found** → move back to Plan
**If blocked by unrelated issue** → create new task

### When Complete

```bash
pytest tests/ -v
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-verify --commit
```

## Exit Criteria

- [ ] All checklist items complete
- [ ] Tests pass, lint passes
- [ ] Code handles errors gracefully
- [ ] Task in Verify column
