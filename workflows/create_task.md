---
description: Create and manage Kanban board tasks for work coordination.
---

# Create Task Workflow

## Purpose

Create tasks on the Kanban board to track workflow executions and coordinate
work across human developers and AI agents.

## Prerequisites

- [ ] The `.kanbn/` directory exists (run `/bootstrap` first if not).
- [ ] An idea, feature, or work item to track.

## Relations

- **Upstream**:
  - **Triage**: Source of the work request
  - **Backlog**: Item being turned into actionable work
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

   ```bash
   python3 dev_ops/scripts/task_ops.py create \
     --title "Task Title" \
     --workflow "/plan" \
     --desc "Brief description" \
     --workload Medium
   ```

   This creates a task file in `.kanbn/tasks/` and adds it to the Backlog column.

2. **Claim the Task** (when starting work):

   ```bash
   python3 dev_ops/scripts/task_ops.py claim TASK-XXX --agent "your-name"
   ```

   This marks the task as assigned and signals to others that work is in progress.

3. **Move to In Progress**:

   ```bash
   python3 dev_ops/scripts/task_ops.py progress TASK-XXX --column "In Progress"
   ```

4. **Execute Sub-tasks**:
   - Follow the specified workflow (e.g., `/plan`, `/research`, `/adr`).
   - Each workflow produces artifacts (PLN-XXX, RES-XXX, etc.).
   - Update sub-task checkboxes in the task file as you complete them.

5. **Complete the Task**:

   ```bash
   python3 dev_ops/scripts/task_ops.py complete TASK-XXX \
     --outputs "PLN-001.md, RES-002.md"
   ```

   This links outputs and moves the task to Done.

## Multi-Agent Coordination

Before starting work, always check the board for already-claimed tasks:

```bash
python3 dev_ops/scripts/task_ops.py list
```

- **Claimed tasks**: Show `assigned` field with agent name
- **Available tasks**: No `assigned` value, can be claimed
- **Prevents duplicated effort**: Only claim tasks not already in progress

## Exit Criteria

- [ ] Task created with `TASK-XXX` ID.
- [ ] Task claimed and moved to "In Progress" when work starts.
- [ ] Sub-tasks completed and artifacts produced.
- [ ] Task marked complete with outputs linked.
