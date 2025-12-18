---
description: Claim a specific task by moving it to In Progress.
---

# Claim Task Workflow

## Purpose

Claim a specific task to indicate you're working on it. This prevents
other agents or developers from starting the same work.

## Prerequisites

- [ ] Task ID known (e.g., from `/list_tasks` or Kanban board)
- [ ] Task is in Backlog column

## Steps

1. **Claim by Task ID**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py claim TASK-001
   ```

   Output: `✅ Moved TASK-001 to In Progress`

2. **Via VS Code** (alternative):
   - Right-click task in Kanban view
   - Select: `Mark In Progress`

## Multi-Agent Coordination

Before claiming, verify the task is available:

```bash
python3 dev_ops/scripts/kanban_ops.py list --column col-backlog
```

> [!WARNING]
> Do not claim tasks that are already in `In Progress` column.

## Exit Criteria

- [ ] Task moved to "In Progress" column
