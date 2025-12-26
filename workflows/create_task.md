---
description: Create and manage Kanban board tasks for work coordination.
---

# Create Task Workflow

## Purpose

Create tasks on the Kanban board to track workflow executions and coordinate
work across human developers and AI agents.

## Prerequisites

- [ ] DevOps extension installed in VS Code
- [ ] An idea, feature, or work item to track

## Steps

1. **Create the Task**:
   - Run command: `Kanban: Create Task` (Ctrl+Shift+P)
   - Or use the `+` button in the Kanban Board view
   - Fill in title, summary, and priority

2. **Set Priority**:
   - `priority`: high | medium | low
   - Higher priority tasks are picked first by agents

3. **Via CLI** (alternative):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py create \
     --title "Task title" \
     --priority medium
   ```

## Multi-Agent Coordination

Agents are spawned per phase and pick tasks based on priority:

- **Backlog** tasks are picked by priority order (high → medium → low)
- When claimed, a task moves through phases with fresh agent context per phase
- Context is provided exclusively through artifacts, task data, and phase rules

## Exit Criteria

- [ ] Task created in Kanban board
- [ ] Priority set appropriately
