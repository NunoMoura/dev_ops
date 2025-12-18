---
description: Mark a task as complete and link output artifacts.
---

# Complete Task Workflow

## Purpose

Mark a task as done and record the artifacts produced during the work.

## Prerequisites

- [ ] Task is in `In Progress` column
- [ ] Work is complete
- [ ] Output artifacts exist (plans, research, code, etc.)

## Steps

1. **Complete Without Outputs**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py done TASK-001
   ```

2. **Complete With Outputs** (recommended):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py done TASK-001 \
     --outputs "PLN-001.md" "src/feature.py"
   ```

3. **Via VS Code** (alternative):
   - Right-click task in Kanban view
   - Select: `Mark Done`

## Output Linking

Outputs are added to the task's `downstream` field, making them
discoverable from the board.

## Exit Criteria

- [ ] Task moved to "Done" column
- [ ] Output artifacts linked to task's downstream
