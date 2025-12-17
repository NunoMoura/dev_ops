---
description: Claim a specific task by marking it as in progress.
---

# Claim Task Workflow

## Purpose

Claim a specific task to indicate you're working on it. This prevents
other agents or developers from starting the same work.

## Prerequisites

- [ ] Task ID known (e.g., from `/list_tasks` or Kanban board)
- [ ] Task is in `todo` status

## Steps

1. **Claim by Task ID**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py claim task-001
   ```

   Output: `✅ Marked task-001 as in_progress`

2. **Via VS Code** (alternative):
   - Right-click task in Kanban view
   - Select: `Mark In Progress`

## Multi-Agent Coordination

Before claiming, verify the task is available:

```bash
python3 dev_ops/scripts/kanban_ops.py list --status todo
```

> [!WARNING]
> Do not claim tasks that are already `in_progress`.

## Exit Criteria

- [ ] Task status changed to `in_progress`
- [ ] Task appears in "In Progress" or equivalent column
