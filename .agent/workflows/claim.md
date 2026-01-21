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

```xml
<vscode_command>devops.claimTask</vscode_command>
```

The command will prompt for a task ID, or automatically pick the highest priority task if none specified.

## Step 2: Move to Understand

If a new backlog task was picked, move it to the Understand phase to begin work.

```xml
<vscode_command>devops.moveTask</vscode_command>
```

## Outputs

- Task claimed (owner set)
- Task status updated to `agent_active`
