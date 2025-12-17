---
activation_mode: Model Decides
description: Kanban board policies - load when managing tasks, picking work, or coordinating with other agents.
---

# Kanban Policy

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
3. Use `/link_artifact` to connect created docs to the task
4. If blocked, update task status via Kanban

## On Completion

1. Use `/complete_task` to mark done and link outputs
2. Verify task appears in "Done" column

## Available Commands

| Command | Script | Purpose |
|---------|--------|---------|
| `/list_tasks` | `kanban_ops.py list` | View/filter tasks |
| `/pick_task` | `kanban_ops.py pick` | Suggest next task |
| `/claim_task` | `kanban_ops.py claim` | Claim a task |
| `/complete_task` | `kanban_ops.py done` | Complete with outputs |
| `/link_artifact` | `kanban_ops.py link` | Link file to task |

## Multi-Agent Coordination

Before claiming work, verify no other agent has claimed the task:

- **Claimed tasks**: Have `status: in_progress`
- **Available tasks**: Have `status: todo` and `agentReady: true`

> [!IMPORTANT]
> Always run `/list_tasks` before starting new work to avoid conflicts.

## Task Schema

```yaml
id: TASK-001
title: Implement JWT Authentication
description: Add JWT auth to the API
workflow: /create_plan           # Pre-decomposed workflow (optional)

# Prerequisites - must be met before starting
prerequisites:
  tasks: [TASK-000]              # Tasks that must be complete
  artifacts: [RESEARCH-001]      # Artifacts that must exist
  approvals: []                  # Human approvals needed

# Completion criteria - definition of done
completion_criteria:
  artifacts: [PLAN-001]          # Must produce these artifacts
  tests: true                    # Tests must pass
  review: false                  # Needs human review?

# Linked artifacts
artifacts:
  - id: RESEARCH-001
    relation: input
  - id: PLAN-001
    relation: output

# Status
status: todo                     # todo | in_progress | blocked | done
priority: high                   # high | medium | low
agentReady: true
```

## Prerequisite Checking

Before claiming a task, verify:

1. All `prerequisites.tasks` are status: done
2. All `prerequisites.artifacts` exist
3. All `prerequisites.approvals` are granted

> [!IMPORTANT]
> Do not start a task if prerequisites are not met.
