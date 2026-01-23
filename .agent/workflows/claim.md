---
description: Claim a specific task or the next highest priority task.
category: automated
---

# Claim Task

Claim ownership of a specific task, or automatically pick and claim the next highest priority task from the Backlog.

## Inputs

- `input`: (Optional) Specific Task ID to claim (e.g., `TASK-123`). If left empty, the next highest priority task from the Backlog will be claimed.

## Step 1: Claim Task

Run the VS Code command to claim the task:

```bash
# As User: Run "DevOps: Claim Task" from Command Palette or run /claim in chat
# As Agent: Execute the bundled CLI script
# NOTE: If no ID is provided, this command will claim the highest priority task? (Actually script errors currently if no ID)
# TODO: Update script to support auto-pick or agent must find task first.
# For now, let's assume agent finds task ID first or we update script later.
# Correct usage:
node .dev_ops/scripts/devops.js claim-task --id <TASK_ID> --column col-understand
```

The command will move the task to the "Understand" column.

## Outputs

- Task claimed (owner set)
- Task status updated to `agent_active`
