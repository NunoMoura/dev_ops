---
description: List and filter Kanban board tasks.
---

# List Tasks Workflow

## Purpose

View tasks on the Kanban board with optional filtering by column or readiness.

## Prerequisites

- [ ] Kanban board initialized (`dev_ops/kanban/board.json` exists)

## Steps

1. **List All Tasks**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py list
   ```

2. **Filter by Column**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py list --column col-backlog
   python3 dev_ops/scripts/kanban_ops.py list --column col-inprogress
   ```

3. **Show Agent-Ready Tasks Only**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py list --agent-ready
   ```

4. **Via VS Code** (alternative):
   - Open Command Palette: `Ctrl+Shift+P`
   - Run: `Kanban: Get Tasks`

## Output Format

```markdown
TASK-001: Implement auth module [Backlog]
TASK-002: Fix login bug [In Progress]
```

## Exit Criteria

- [ ] Tasks displayed with ID, title, and column
