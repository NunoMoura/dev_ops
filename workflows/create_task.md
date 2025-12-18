---
description: Create and manage Kanban board tasks for work coordination.
---

# Create Task Workflow

## Purpose

Create tasks on the Kanban board to track workflow executions and coordinate
work across human developers and AI agents.

## Prerequisites

- [ ] Titan Kanban extension installed in VS Code.
- [ ] An idea, feature, or work item to track.

## Relations

- **Upstream**:
  - **Triage**: Source of the work request
- **Downstream**:
  - **Plan**: `PLN-XXX` (created as output of this task)
  - **Research**: `RES-XXX` (created as output of this task)
  - **ADR**: `ADR-XXX` (created as output of this task)

## Template

Use [task.md](file:///home/nunoc/projects/dev_ops/templates/task.md).

**Example fill-in**:

- **tags**: `[feature, auth, backend]`
- **workflow**: `/plan`
- **assigned**: `agent-claude` (when claimed)
- **outputs**: `PLN-023, RES-015` (when complete)
- **Description**: "Implement JWT authentication for API"
- **Sub-tasks**:

  ```markdown
  - [x] Claim task
  - [ ] Research auth libraries (RES-015)
  - [ ] Create implementation plan (PLN-023)
  - [ ] Link outputs
  ```

## Steps

1. **Create the Task**:
   - Run command: `Kanban: Create Task` (Ctrl+Shift+P)
   - Or use the `+` button in the Titan Board view
   - Fill in title, summary, and set `agentReady: true` if ready for agent work

2. **Claim the Task** (when starting work):
   - Open the task in Card Details view
   - Move task to "In Progress" column
   - Add your name/agent ID to indicate ownership

3. **Execute Sub-tasks**:
   - Follow the specified workflow (e.g., `/plan`, `/research`, `/adr`)
   - Each workflow produces artifacts (PLN-XXX, RES-XXX, etc.)
   - Update checklist items in the Card Details view

4. **Complete the Task**:
   - Run command: `Kanban: Mark Task Done`
   - Add artifact IDs to the task's `downstream` field
   - Task moves to Done column automatically

## Multi-Agent Coordination

Before starting work, check for already-claimed tasks:

- Run `Kanban: Get Tasks` to see structured JSON
- Or run `Kanban: Pick Next Task` for the extension to suggest work
- Look for `agentReady: true` tasks without an assigned owner

**Claimed tasks**: In `In Progress` column with an owner name
**Available tasks**: In `Backlog` column with `agentReady: true`

## Exit Criteria

- [ ] Task created in Kanban board.
- [ ] Task claimed and moved to "In Progress" when work starts.
- [ ] Sub-tasks completed and artifacts produced.
- [ ] Task marked done with outputs linked.
