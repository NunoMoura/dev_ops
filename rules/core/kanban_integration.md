---

activation_mode: Always On
description: Agent-Kanban coordination policies for task management.

---

# Kanban Integration Policy

This rule defines how the agent coordinates with the Titan Kanban board.

## Before Starting Work

1. Run `kanban.getTasks` to see available work.
2. Filter for `agentReady: true` tasks.
3. Use `kanban.pickNextTask` if no specific request.
4. Claim task with `kanban.markTaskInProgress`.

## During Execution

1. Update checklist items as subtasks complete.
2. Link created artifacts to task's `entryPoints` field.
3. Use `kanban.markTaskBlocked` if blocked on external factors.

## On Completion

1. Run `kanban.markTaskDone`.
2. Ensure all outputs are added to `entryPoints`.
3. Verify task appears in "Ready" or "Complete" column.

## Multi-Agent Coordination

Before claiming work, verify no other agent has claimed the task:

- **Claimed tasks**: Have `status: in_progress` and an owner
- **Available tasks**: Have `status: todo` and `agentReady: true`

> [!IMPORTANT]
> Always check the board before starting new work to avoid conflicts.
