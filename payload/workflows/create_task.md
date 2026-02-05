---
description: Create and track a new task
category: automated
---

# Create Task

Create tasks for discovered bugs, features, or tech debt during any phase.

---

## Inputs

- `title`: Brief description
- `summary`: What you discovered and why it matters

---

## Step 1: Create Task

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "<Brief description>" \
  --summary "<What you discovered and why it matters>" \
  --priority <low|medium|high> \
  --column col-backlog
```

---

## Step 2: Add Context

Include helpful context in the summary:

- File citations
- Related specs
- Reproduction steps (for bugs)

---

## Step 3: Continue Work

Return to your current phase. The new task will be triaged later.

---

## Outputs

- TASK-XXX created in Backlog column
