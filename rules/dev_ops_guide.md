---
activation_mode: Always On
description: Core DevOps Framework index - links to phase-specific rules.
---

# DevOps Framework Guide

Task-centric development with Kanban workflow.

## Core Concepts

| Mode | When | Action |
|------|------|--------|
| **Fast Mode** | Small fixes, quick questions | Execute directly |
| **Planning Mode** | Complex work, coordination | Create task first |

## Workflow

```text
Backlog → Research → Planning → In Progress → Testing → Done
                                     ↓
                                  Blocked
```

## Phase Rules

Load the appropriate rule for your current phase:

| Phase | Rule | Artifact |
|-------|------|----------|
| Backlog | `@phase_backlog` | TASK-XXX |
| Research | `@phase_research` | RES-XXX |
| Planning | `@phase_planning` | PLN-XXX |
| In Progress | `@phase_inprogress` | Code |
| Testing | `@phase_testing` | TST-XXX |
| Blocked | `@phase_blocked` | - |
| Done | `@phase_done` | PR |

## Commands

User-facing commands for board management:

| Command | Purpose |
|---------|---------|
| `/create_task` | Add task to backlog |
| `/list_tasks` | View all tasks |
| `/pick_task` | Get next available task |
| `/claim_task` | Start working on task |
| `/complete_task` | Finish task with PR |
| `/report_bug` | Report a new bug |
| `/triage_feedback` | Process PR feedback |
| `/bootstrap` | Initialize project |

> [!NOTE]
> Development procedures (research, planning, implementation, testing) are
> guided by phase rules, not invoked as commands. The agent selects the
> appropriate procedure based on the task's current column.

## Directory Structure

```text
dev_ops/
├── kanban/board.json   # Task board
├── plans/              # PLN-XXX
├── research/           # RES-XXX
├── tests/              # TST-XXX
├── bugs/               # BUG-XXX
└── adrs/               # ADR-XXX
```

## Artifact Flow

```text
RES-XXX (research)
    ↓
ADR-XXX (decision) ← optional
    ↓
PLN-XXX (plan)
    ↓
TASK-XXX (implementation)
    ↓
TST-XXX (testing) → BUG-XXX (failures)
    ↓
PR (done)
```
