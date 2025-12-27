---
description: Pick the next task from backlog and start working on it.
---

# Spawn Agent

Pick the highest priority task from backlog and move it to Understand.

## Steps

1. **Pick next task by priority**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py pick --claim
   ```

2. **Move to Understand**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-understand
   ```

3. **Read context** from the trigger doc (PRD/FEAT/BUG linked to task)

4. **Apply Understand phase rule** — The agent is now in Understand phase

## Output

- Task claimed (`.current_task` updated)
- Task moved to Understand column
- Agent follows Understand phase rule

## Notes

- This is a **deterministic** workflow — just picks and moves
- Actual phase work is governed by phase rules
- When phase complete, user triggers `/next_phase` to continue
