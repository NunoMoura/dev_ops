---
description: Create and track a new task
category: automated
---

# Create Task

Create tasks for discovered bugs, features, or tech debt.

## Inputs

- `title`: Task title
- `summary`: Task summary

## Step 1: Create Task

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "<Brief description>" \
  --summary "<What you discovered and why it matters>" \
  --priority <low|medium|high> \
  --column col-backlog
```

## Step 2: Add Context

Include helpful context (file citations, related specs) in the summary.

## Step 3: Continue Work

Return to your current phase and continue. The new task will be triaged later.

## Outputs

- TASK-XXX created in Backlog column
