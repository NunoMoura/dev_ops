---
activation_mode: Model Decides
description: Backlog phase - task creation and prioritization.
---

# Backlog Phase

Work queued but not started.

## Artifact

**ID Format**: `TASK-XXX`
**Location**: `dev_ops/kanban/board.json`

## Task Schema

```yaml
id: TASK-001
columnId: col-backlog
title: Brief description
summary: Detailed explanation
priority: high | medium | low
agentReady: true        # AI can claim
upstream: []            # Input artifacts
downstream: []          # Output artifacts
```

## Standards

- Use TASK-XXX format
- Set `agentReady: true` for AI-claimable work
- Set priority based on urgency

## When to Brainstorm

If the task is unclear or requires exploration before planning:

1. Define the topic or problem to explore
2. Research using Paper Search MCP for academic papers or Web Search for
   broader understanding (if available)
3. Document findings in a Research artifact (`RES-XXX`)
4. If an architectural decision emerges → create ADR (`ADR-XXX`)
5. Once direction is clear → move task to Research or Planning column

## Claiming Work

```bash
# List available tasks
python3 dev_ops/scripts/kanban_ops.py list --agent-ready

# Claim a task
python3 dev_ops/scripts/kanban_ops.py claim TASK-XXX
```

## Multi-Agent Coordination

Before claiming work:

- **Claimed tasks**: In `In Progress` column
- **Available tasks**: In `Backlog` + `agentReady: true`

> [!IMPORTANT]
> Always check `/list_tasks` before starting to avoid conflicts.

## Prerequisite Checking

Before claiming, verify prerequisite tasks are Done:

```yaml
prerequisites:
  tasks: [TASK-000]    # Must be in Done column
  approvals: []        # Human approvals needed
```

> [!IMPORTANT]
> Do not start a task if prerequisites are not met.

## Exit Criteria

- [ ] Task claimed
- [ ] Moved to appropriate column (Research/Planning/In Progress)
