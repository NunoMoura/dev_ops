---
description: List and filter Kanban board tasks.
---

# List Tasks Workflow

## Purpose

View tasks on the Kanban board with optional filtering by status, readiness,
or column.

## Prerequisites

- [ ] Kanban board initialized (`local/kanban.json` exists)

## Steps

1. **List All Tasks**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py list
   ```

2. **Filter by Status**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py list --status todo
   python3 dev_ops/scripts/kanban_ops.py list --status in_progress
   ```

3. **Show Agent-Ready Tasks Only**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py list --agent-ready
   ```

4. **Via VS Code** (alternative):
   - Open Command Palette: `Ctrl+Shift+P`
   - Run: `Kanban: Get Tasks`

## Output Format

```
  task-001: Implement auth module [todo]
  task-002: Fix login bug [in_progress]
```

## Exit Criteria

- [ ] Tasks displayed with ID, title, and status
