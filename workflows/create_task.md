---
description: Create and track a new task
category: automated
---

# Create Task

Add a new task to the Kanban board.

## Steps

1. **Create task**:

   ```bash
   python3 scripts/board_ops.py create --title "{{user_input}}" --priority medium
   ```

   Or use VS Code: `Kanban: Create Task` or `+` button in board

2. **Set priority**: `high` | `medium` | `low`

## Outputs

- TASK-XXX in Backlog column
