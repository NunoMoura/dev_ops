---
description: Pick next task and start working
category: automated
---

# Pick Task

Pick highest priority task from Backlog and claim it.

## Inputs
- `input`: (Optional) Specific Task ID to pick (e.g., `TASK-123`). If empty, picks next from Backlog.

## Steps

1. **Pick and claim**:

   - **If `{input}` provided**:
     ```bash
     python3 .dev_ops/scripts/board_ops.py pick {{input}} --claim
     ```
   - **If `{input}` empty**:
     ```bash
     python3 .dev_ops/scripts/board_ops.py pick --claim
     ```

2. **Move to Understand** (if new task):

   > **Note**: If picking an existing task to resume, check its current status/column first.

   ```bash
   python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-understand --commit
   ```

3. **Read trigger doc** (PRD/FEAT/BUG linked to task)

4. **Apply Understand phase rule**

## Outputs

- Task claimed (`.current_task` updated)
- Task moved to Understand column
