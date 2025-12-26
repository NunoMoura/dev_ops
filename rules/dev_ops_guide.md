---
activation_mode: Always On
description: Core DevOps behavioral invariants (always-on context)
---

# DevOps Framework Guide

AI Agent development with document-first approach.

## Core Principle

> **Documents define goals. Code is the manifestation.**

## Session Model

> **One Antigravity session = One phase**

Each phase of work runs in a bounded AG session:

- Session creates AG-native artifacts (plan, walkthrough)
- Session ends with `notify_user` at exit criteria
- User triggers `/next_phase` to continue

## Phase Navigation

See `rules/<N>_<phase>.md` for specific phase instructions.

```text
Backlog → Researching → Documenting → Planning → Implementing → Validating → PR → Done
```

## Invariants

These rules apply across **all phases**:

### Documents vs Artifacts

| Type | Examples | Lifecycle | Owner |
|------|----------|-----------|-------|
| Persistent Docs | Architecture, PRDs | Long-lived | DevOps |
| Ephemeral Artifacts | plan.md, walkthrough.md | Session-scoped | Antigravity |

### Navigation Rules

- **Never move backward** — spawn new tasks for blockers
- **TASK is pointer** — content lives in session artifacts/docs
- **Forward-only flow** — each phase has one exit direction
- **Session boundaries** — call `notify_user` at exit criteria

### Quality Rules

- **Test first** — TDD embedded in Implementing
- **ADRs inline** — decisions in docs under `## Decisions`

## Directory Structure

```text
dev_ops/
├── board.json           # Task board
├── .current_task        # Currently active task ID
├── docs/                # Persistent documentation
│   ├── architecture/
│   ├── ux/
│   │   ├── users/
│   │   ├── stories/
│   │   └── mockups/
│   ├── prds/
│   └── tests/
├── archive/             # Archived TASK-XXX.tar.gz
└── scripts/

.gemini/antigravity/brain/{session}/  # AG-native artifacts
├── task.md
├── implementation_plan.md
└── walkthrough.md
```
