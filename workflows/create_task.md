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
   - Fill in title, summary, and set `agentReady: true` if ready for agent work

2. **Set Priority and Metadata**:
   - `priority`: high | medium | low
   - `agentReady`: true if AI agent can work on it

3. **Via CLI** (alternative):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py create \
     --title "Task title" \
     --priority medium \
     --agent-ready
   ```

## Multi-Agent Coordination

Before starting work, check for already-claimed tasks:

- Run `Kanban: Get Tasks` to see structured JSON
- Or run `Kanban: Pick Next Task` for the extension to suggest work
- Look for `agentReady: true` tasks without an assigned owner

**Claimed tasks**: In `In Progress` column with an owner name
**Available tasks**: In `Backlog` column with `agentReady: true`

## Exit Criteria

- [ ] Task created in Kanban board
- [ ] Priority and agentReady set appropriately
