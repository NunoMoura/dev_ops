---
description: Create and track a new task
category: automated
---

# Create Task

Create tasks for discovered bugs, features, or tech debt. Use this workflow from **any phase** when you find work that shouldn't derail your current task.

> **Key principle**: Stay focused. Capture the discovery and continue your current work.

## When to Use

- You discover a bug while working on something else
- You notice a feature that should be implemented later
- You find technical debt that needs addressing
- You encounter an issue unrelated to your current task

## Step 1: Create the Task

Run the CLI command:

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "<Brief description>" \
  --type <BUG|FEATURE|TECH_DEBT|SPIKE> \
  --priority <LOW|MEDIUM|HIGH> \
  --summary "<What you discovered and why it matters>"
```

Or use the VS Code command:

```xml
<vscode_command>devops.createTask</vscode_command>
```

## Step 2: Add Context

Include helpful context so future work is easier:

- Reference the file/component where you found the issue
- Note any relevant SPEC.md files
- Link to current task if related: `upstream: TASK-XXX`

## Step 3: Continue Current Work

**Do not start working on the new task.**

Return to your current phase and continue. The new task will be triaged and prioritized by the user (PM).

---

## Task Types

| Type | When to Use |
|------|-------------|
| `BUG` | Something is broken or behaving incorrectly |
| `FEATURE` | New capability that should be added later |
| `TECH_DEBT` | Code quality issue, refactoring needed |
| `SPIKE` | Research needed before implementation |

## Priority Guidelines

| Priority | Criteria |
|----------|----------|
| `HIGH` | Blocking other work or critical bug |
| `MEDIUM` | Should be done soon, impacts quality |
| `LOW` | Nice to have, can wait |

---

## Outputs

- TASK-XXX created in Backlog column
- Status: `ready`
- Context preserved for future work

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Start working on the new task | Create it and return to current work |
| Create vague tasks ("fix stuff") | Be specific about what and where |
| Skip priority | Always set priority for triage |
| Forget context | Link to files, SPECs, and current task |
