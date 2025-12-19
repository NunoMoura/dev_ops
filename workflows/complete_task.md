---
description: Mark a task as complete and link output artifacts.
---

# Complete Task Workflow

## Purpose

Mark a task as done, record the artifacts produced, and optionally create a PR.

## Prerequisites

- [ ] Task is in `In Progress` column
- [ ] Work is complete
- [ ] Output artifacts exist (plans, research, code, etc.)
- [ ] Changes committed to a feature branch (if creating PR)

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

3. **Complete With PR Creation**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py done TASK-001 \
     --outputs "PLN-001.md" \
     --create-pr
   ```

   This uses `gh pr create` to open a pull request automatically.

4. **Via VS Code** (alternative):
   - Right-click task in Kanban view
   - Select: `Mark Done`
   - When prompted, choose whether to create a PR

## Output Linking

Outputs are added to the task's `downstream` field, making them
discoverable from the board.

## Exit Criteria

- [ ] Task moved to "Done" column
- [ ] Output artifacts linked to task's downstream
- [ ] (Optional) Pull Request created and linked

