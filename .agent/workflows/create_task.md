---
description: Create and track a new task
category: automated
---

# Create Task

Add a new task to the board following the task template structure.

**Template:** `.dev_ops/templates/artifacts/task.md`

## Required Fields

| Field | Description | Values |
|-------|-------------|--------|
| **title** | Short descriptive title | String |
| **summary** | Clear scope of work | String |
| **priority** | Urgency level | `high` \| `medium` \| `low` |

## Step 1: Create Task

Run the VS Code command:

```xml
<vscode_command>devops.createTask</vscode_command>
```

The command will prompt for title, summary, and priority.

## Step 2: Link to Trigger (optional)

If task comes from a PRD, Story, or Bug, add the trigger reference in the task summary using format:

```markdown
Trigger: PRD-XXX (or STORY-XXX or BUG-XXX)
```

## Outputs

- TASK-XXX created in Backlog column
- Status: `ready`
- Linked to trigger doc (if specified)

## Next Steps

After task creation:
1. Review created task in board
2. Claim task with `/claim TASK-XXX`
3. Begin Backlog phase
