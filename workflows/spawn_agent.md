---
description: Pick next task and start working
category: automated
---

# Spawn Agent

Pick highest priority task from Backlog and claim it.

## Steps

1. **Pick and claim**:

   ```bash
   python3 scripts/kanban_ops.py pick --claim
   ```

   Or use VS Code: Click "Spawn Agent" in Agent sidebar

2. **Move to Understand**:

   ```bash
   python3 scripts/kanban_ops.py move TASK-XXX col-understand
   ```

3. **Read trigger doc** (PRD/FEAT/BUG linked to task)

4. **Apply Understand phase rule**

## Outputs

- Task claimed (`.current_task` updated)
- Task moved to Understand column
