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
upstream: []            # Input artifacts (PRD, FEAT, RES)
downstream: []          # Output artifacts
```

## Standards

- Use TASK-XXX format
- Set priority based on urgency
- Any unclaimed task is available for work

## Context Loading

When starting work on a task:

1. **Load upstream docs**: Read all artifacts in task's `upstream` field
2. **Check architecture**: Load `dev_ops/architecture/<component>/` if applicable
3. **Review ADRs**: Check for relevant architectural decisions
4. **Read related work**: Review linked completed tasks

## Task Selection

To pick the highest-priority available task:

```bash
python3 dev_ops/scripts/kanban_ops.py pick --claim
```

**Selection criteria:**

1. In Backlog column
2. Status is `todo` (not claimed)
3. Highest priority first (high > medium > low)
4. Oldest wins ties

## Task Listing

View tasks by column or status:

```bash
# All tasks
python3 dev_ops/scripts/kanban_ops.py list

# Filter by column
python3 dev_ops/scripts/kanban_ops.py list --column col-backlog

# Filter by status
python3 dev_ops/scripts/kanban_ops.py list --status todo
```

## Claiming Work

```bash
# Claim a specific task
python3 dev_ops/scripts/kanban_ops.py claim TASK-XXX
```

## When to Brainstorm

If the task is unclear or requires exploration:

1. Define the topic or problem to explore
2. Research using available tools
3. Document findings in `RES-XXX`
4. If an architectural decision emerges → update architecture docs
5. Once direction is clear → move task to Research or Planning column

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
- [ ] Upstream context loaded
- [ ] Moved to appropriate column (Research/Planning/Implementing)
