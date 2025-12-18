---
activation_mode: Model Decides
description: Kanban board policies - load when managing tasks, picking work, or coordinating with other agents.
---

# Kanban Policy

## Column = Status Model

Tasks are assigned to columns which determine their status. Moving a task
between columns changes its status.

| Column | Purpose |
|--------|---------|
| Backlog | Work not yet started |
| Research | Producing RES-XXX artifact |
| Planning | Producing PLN-XXX artifact |
| In Progress | Active work |
| Review | Verification phase |
| Blocked | Waiting on dependencies |
| Done | Completed |

## When to Create Tasks

Only create tasks when in **planning mode** for work that needs:

- Multi-step coordination
- Progress tracking
- Artifact generation

> [!IMPORTANT]
> Fast mode = direct execution. Small fixes don't need task overhead.

## Before Starting Work

1. Use `/list_tasks` to see available work
2. Filter for agent-ready tasks: `--agent-ready` flag
3. Use `/pick_task` if no specific request
4. Use `/claim_task TASK-XXX` to claim the work

## During Execution

1. Follow the workflow steps (if task has a workflow)
2. Update checklist items as subtasks complete
3. Use `/upstream` or `/downstream` to link artifacts
4. If blocked, move task to Blocked column

## On Completion

1. Use `/complete_task` to move to Done and link outputs
2. Verify task appears in "Done" column

## Available Commands

| Command | Script | Purpose |
|---------|--------|---------|
| `/list_tasks` | `kanban_ops.py list` | View/filter tasks |
| `/pick_task` | `kanban_ops.py pick` | Suggest next task |
| `/claim_task` | `kanban_ops.py claim` | Claim a task |
| `/complete_task` | `kanban_ops.py done` | Complete with outputs |
| `/upstream` | `kanban_ops.py upstream` | Add upstream dependency |
| `/downstream` | `kanban_ops.py downstream` | Add downstream output |
| `/move_task` | `kanban_ops.py move` | Move to specific column |

## Multi-Agent Coordination

Before claiming work, verify no other agent has claimed the task:

- **Claimed tasks**: In `In Progress` column
- **Available tasks**: In `Backlog` column and `agentReady: true`

> [!IMPORTANT]
> Always run `/list_tasks` before starting new work to avoid conflicts.

## Task Schema

```yaml
id: TASK-001
columnId: col-backlog               # Determines status
title: Implement JWT Authentication
summary: Add JWT auth to the API
workflow: /create_plan              # Pre-decomposed workflow (optional)

# Artifact dependencies
upstream: [RES-001, PLN-001]        # Input artifacts
downstream: [IMPL-001]              # Output artifacts

# Prerequisites
prerequisites:
  tasks: [TASK-000]                 # Tasks that must be complete
  approvals: []                     # Human approvals needed

# Completion criteria
completionCriteria:
  artifacts: [PLN-001]              # Must produce these artifacts
  tests: true                       # Tests must pass
  review: false                     # Needs human review?

# Flags
priority: high                      # high | medium | low
agentReady: true
```

## Prerequisite Checking

Before claiming a task, verify prerequisite tasks are in Done column.

> [!IMPORTANT]
> Do not start a task if prerequisites are not met.
