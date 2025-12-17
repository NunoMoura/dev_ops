---
description: Pick the next available task from the Kanban board.
---

# Pick Task Workflow

## Purpose

Automatically select the highest-priority, agent-ready task from the board.
Optionally claim it immediately.

## Prerequisites

- [ ] Kanban board has tasks with `agentReady: true`

## Selection Criteria

Tasks are ranked by:
1. **Status**: Only `todo` tasks (unclaimed)
2. **Agent Ready**: Must have `agentReady: true`
3. **Priority**: `high` > `medium` > `low`
4. **Age**: Oldest `updatedAt` wins ties

## Steps

1. **Pick Next Task** (view only):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py pick
   ```

   Output: `📋 Suggested task: task-001 - Implement auth module`

2. **Pick and Claim** (recommended):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py pick --claim
   ```

   Output:
   ```
   📋 Suggested task: task-001 - Implement auth module
   ✅ Marked task-001 as in_progress
   ```

3. **Via VS Code** (alternative):
   - Run: `Kanban: Pick Next Task`

## Exit Criteria

- [ ] Task suggested based on priority
- [ ] Task claimed if `--claim` flag used
