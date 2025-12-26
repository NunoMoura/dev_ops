---
phase: implementing
activation_mode: Model Decides
triggers: [task_in_implementing]
---

# Implementing Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | PLN-XXX only |
| ARTIFACT | Code + Tests |
| EXIT_TO | Validating |

> [!IMPORTANT]
> PLN-XXX is the ONLY context needed. It contains goal, checklist, files, criteria.

## ACTIONS

For each checklist item:

1. **Red** — Write failing test first

2. **Green** — Minimum code to pass

3. **Refactor** — Clean up while green

4. **Commit**

   ```bash
   git commit -m "feat(<scope>): <message>

   Task: TASK-XXX
   PLN: PLN-XXX
   Checklist: #N"
   ```

5. **Mark complete** — Check off item in PLN-XXX

### If Blocked

Spawn new task, never move backward:

```bash
python3 dev_ops/scripts/kanban_ops.py create --title "Blocker: reason" --spawn-from TASK-XXX
```

### When All Items Complete

```bash
ruff check .
pytest tests/ -v
python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-validating
```

## SESSION BOUNDARY

When all exit criteria are met, call `notify_user` with:

- Checklist items completed
- Tests added/modified
- Ready for Validating phase

This ends the current AG session. User triggers `/next_phase` to continue.

## EXIT_CRITERIA

- [ ] All PLN checklist items complete
- [ ] Tests pass
- [ ] Lint passes
- [ ] Task in Validating column
