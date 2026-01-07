---
description: Create and track a new task
category: automated
---

# Create Task

Add a new task to the Board board.

## Steps

### Option 1: Standard Task

1. **Create task**:

   ```bash
   python3 .dev_ops/scripts/board_ops.py create --title "{{user_input}}" --priority medium
   ```

2. **Set priority**: `high` | `medium` | `low`

### Option 2: From Story

1. **Select Story**: Identify the `STORY-XXX` ID from `docs/ux/stories/`.

2. **Create Linked Task**:

   ```bash
   python3 .dev_ops/scripts/board_ops.py create --title "Implement {{story_title}}" --upstream STORY-XXX --priority medium
   ```

## Outputs

- TASK-XXX in Backlog column
- Linked to upstream Story (if Option 2 selected)
