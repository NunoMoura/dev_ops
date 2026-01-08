---
description: Claim a specific task or the next highest priority task.
category: automated
---

# Claim Task

Claim ownership of a specific task, or automatically pick and claim the next highest priority task from the Backlog.

## Inputs

- `input`: (Optional) Specific Task ID to claim (e.g., `TASK-123`). If left empty, the next highest priority task from the Backlog will be claimed.

## Steps

1. **Claim Task**:

   - **If `{input}` provided**:
     Claims the specific task.

     ```bash
     python3 .dev_ops/scripts/board_ops.py claim {{input}} --commit
     ```

   - **If `{input}` empty**:
     Automatically picks the next available task from the Backlog and claims it.

     ```bash
     python3 .dev_ops/scripts/board_ops.py claim --commit
     ```

2. **Move to Understand** (if auto-picked):

   If a new backlog task was picked, you may want to move it to the *Understand* phase to begin work.

   > **Note**: Check the task status after claiming.

## Outputs

- Task claimed (`.current_task` updated)
- Task owner set to current Developer
