---
name: backlog-phase
description: Claim a task from the backlog and understand its context. Use when starting work on a new task or when asked to pick up the next item.
---

# Backlog Phase

The entry point for all work. Claim ownership of a task and understand the "why" before diving into the "what".

## When to Use This Skill

- Starting work on a new task
- Asked to claim or pick up a task
- Beginning a new development session

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| Trigger doc (PRD/STORY/BUG) | Claimed TASK-XXX | Understand |

## Step 1: Claim a Task

First, check what's available (use `--help` for all options):

```bash
python3 .dev_ops/scripts/board_ops.py claim --help
```

To claim a specific task:

```bash
python3 .dev_ops/scripts/board_ops.py claim TASK-XXX --commit
```

Or let the system pick the highest priority task:

```bash
python3 .dev_ops/scripts/board_ops.py claim --commit
```

## Step 2: Read the Trigger Doc

Every task has a `trigger` field pointing to what spawned it:

- PRD-XXX (Product Requirement)
- STORY-XXX (User Story)
- BUG-XXX (Bug Report)
- FEAT-XXX (Feature Spec)

Open and read the trigger document to understand:

- The user need or problem being solved
- Business context and constraints
- Success criteria

## Step 3: Note Gaps

Before moving forward, identify:

- Missing information in the trigger doc
- Unclear requirements needing clarification
- Dependencies on other work

Add notes to the task if needed.

## Step 4: Move to Understand

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-understand --commit
```

## Exit Criteria

- [ ] Task claimed (owner set)
- [ ] Trigger doc read and understood
- [ ] Gaps documented in task notes
- [ ] Task moved to Understand column
