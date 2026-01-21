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

Use the `/claim` workflow or VS Code command to claim ownership:

```xml
<vscode_command>devops.claimTask</vscode_command>
```

Or use the workflow:

```markdown
/claim TASK-XXX
```

The system will pick the highest priority task if no ID is specified.

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

Use the VS Code command to move the task:

```xml
<vscode_command>devops.moveTask</vscode_command>
```

## Exit Criteria

- [ ] Task claimed (owner set)
- [ ] Trigger doc read and understood
- [ ] Gaps documented in task notes
- [ ] Task moved to Understand column
