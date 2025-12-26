---
phase: planning
activation_mode: Model Decides
triggers: [task_in_planning]
---

# Planning Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | Updated architecture docs + RES-XXX |
| ARTIFACT | PLN-XXX in `dev_ops/artifacts/plans/` |
| EXIT_TO | Implementing |

## ACTIONS

1. **Review docs** — Understand target state from architecture docs

2. **Review research** — Follow RES-XXX recommendation

3. **Create plan** — Use Antigravity native `implementation_plan.md`

   The agent creates its plan artifact within the current AG session.
   No separate command needed.

4. **Fill checklist** — Each item tagged `[code]` or `[test]`

5. **Define acceptance criteria** — Measurable conditions

6. **Link artifact and move**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py upstream TASK-XXX PLN-XXX
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-implementing
   ```

> [!IMPORTANT]
> Doc updates done in Documenting. Planning = code + test items only.

## SESSION BOUNDARY

When all exit criteria are met, call `notify_user` with:

- Plan summary
- Number of checklist items
- Ready for Implementing phase

This ends the current AG session. User triggers `/next_phase` to continue.

## EXIT_CRITERIA

- [ ] implementation_plan.md created
- [ ] All items typed (`[code]` or `[test]`)
- [ ] Acceptance criteria defined
- [ ] Task in Implementing column
