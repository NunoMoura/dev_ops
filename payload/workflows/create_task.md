---
description: Create and track a new task
category: automated
---

# Create Task

Add a new task to the board following the task template structure.

> [!IMPORTANT]
> Task template: `.dev_ops/templates/artifacts/task.md`
> Tasks must have proper fields for tracking and phase transitions.

## Required Fields

| Field | Description | Values |
|-------|-------------|--------|
| **title** | Short descriptive title | String |
| **summary** | Clear scope of work | String |
| **priority** | Urgency level | `high` \| `medium` \| `low` |

## Create Task

```bash
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "{{title}}" \
  --summary "{{summary}}" \
  --priority {{priority}} \
  --commit
```

## Optional: Link to Trigger

If task comes from a PRD, Story, or Bug:

```bash
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Implement {{feature}}" \
  --summary "{{description}}" \
  --priority high \
  --trigger "{{PRD-XXX or STORY-XXX or BUG-XXX}}" \
  --commit
```

## Outputs

- TASK-XXX created in Backlog column
- Status: `ready`
- Linked to trigger doc (if specified)

## Next Steps

1. Review created task in board
2. Claim task with `/claim TASK-XXX`
3. Begin Backlog phase
