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

## One Task Per Agent

Each agent session handles one task. This ensures:

- Clean context window
- Complete documentation produced
- Perfect handoff to next agent/human

## Workflow

```text
Backlog → Research → Planning → Implementing → Review → Testing → Done
```

## Phase Rules

Load the appropriate rule for your current phase:

| Phase | Rule | Artifact |
|-------|------|----------|
| Backlog | `@phase_backlog` | TASK-XXX |
| Research | `@phase_research` | RES-XXX |
| Planning | `@phase_planning` | PLN-XXX |
| Implementing | `@phase_implementing` | Code |
| Review | `@phase_review` | REV-XXX |
| Testing | `@phase_testing` | TST-XXX |
| Done | `@phase_done` | COMP-XXX, PR |

## Task Statuses

| Status | Meaning |
|--------|---------|
| `todo` | Not started |
| `in_progress` | Being worked on |
| `blocked` | Waiting on dependency/approval |
| `pending` | Awaiting review/approval |
| `done` | Complete |

## User Commands

Slash commands available in IDE chat:

| Command | Purpose |
|---------|---------|
| `/bootstrap` | Initialize project |
| `/create_task` | Add task to backlog |
| `/claim_task` | Start working on task |
| `/report_bug` | Report a new bug |
| `/review_code` | Review code changes |
| `/create_prd` | Create product requirements |
| `/create_feature` | Create feature specification |

> [!NOTE]
> Development procedures (research, planning, implementation, testing) are
> guided by phase rules, not invoked as commands. The agent selects the
> appropriate procedure based on the task's current column.

## Directory Structure

```text
dev_ops/
├── kanban/board.json       # Task board
├── architecture/           # Component docs + ADRs
├── prds/                   # PRD-XXX
├── features/               # FEAT-XXX
├── research/               # RES-XXX
├── plans/                  # PLN-XXX
├── reviews/                # REV-XXX
├── tests/                  # TST-XXX
├── bugs/                   # BUG-XXX
└── completions/            # COMP-XXX
```

## Context Engineering

**Upstream docs** = What the agent needs to accomplish (input)
**Downstream docs** = What the phase produces (output)

| Phase | Reads (Upstream) | Produces (Downstream) |
|-------|------------------|----------------------|
| Backlog | PRD, FEAT | TASK |
| Research | TASK, Architecture | RES |
| Planning | TASK, RES | PLN |
| Implementing | TASK, PLN, Architecture | Code |
| Review | TASK, Code | REV |
| Testing | TASK, Code | TST, BUG |
| Done | TASK, REV, TST | COMP, PR |

## Three Mirrored Structures

```text
src/               # What it does
tests/             # How it behaves
dev_ops/architecture/  # Why it exists
```

### Architecture Mapping Rule

> [!IMPORTANT]
> **Strict rule:** 1 folder = 1 architecture doc
>
> - Every folder in `src/` gets a corresponding `.md` in `dev_ops/architecture/`
> - Do NOT document individual files
> - Do NOT skip folder levels

**Example:**

```text
src/                              dev_ops/architecture/
├── domain/                       ├── domain.md
│   ├── users/                    ├── domain/
│   │   ├── authentication/       │   ├── users.md
│   │   └── profiles/             │   └── users/
│   └── trips/                    │       ├── authentication.md
└── infrastructure/               │       └── profiles.md
                                  │   └── trips.md
                                  └── infrastructure.md
```
