---

activation_mode: Always On
description: Agent-Kanban coordination policies for task management.

---

# Kanban Integration Policy

This rule defines how the agent coordinates with the Titan Kanban board
using DevOps workflows.

## Before Starting Work

1. Use `/list_tasks` to see available work
2. Filter for agent-ready tasks: `--agent-ready` flag
3. Use `/pick_task` if no specific request
4. Use `/claim_task TASK-XXX` to claim the work

## During Execution

1. Update checklist items as subtasks complete
2. Use `/link_artifact` to connect created docs to the task
3. If blocked, mark the task via Kanban UI or script

## On Completion

1. Use `/complete_task` to mark done and link outputs
2. Verify task appears in "Ready" or "Complete" column

## Available Workflows

| Workflow | Command | Purpose |
|----------|---------|---------|
| `/list_tasks` | `kanban_ops.py list` | View/filter tasks |
| `/pick_task` | `kanban_ops.py pick` | Suggest next task |
| `/claim_task` | `kanban_ops.py claim` | Claim a task |
| `/complete_task` | `kanban_ops.py done` | Complete with outputs |
| `/link_artifact` | `kanban_ops.py link` | Link file to task |
| `/create_task` | VS Code UI | Create new task |

## Multi-Agent Coordination

Before claiming work, verify no other agent has claimed the task:

- **Claimed tasks**: Have `status: in_progress`
- **Available tasks**: Have `status: todo` and `agentReady: true`

> [!IMPORTANT]
> Always run `/list_tasks` before starting new work to avoid conflicts.
