---
description: Create feature spec and decompose into tasks
category: guided
---

# Add Feature

Create FEAT-XXX and decompose into backlog tasks.

---

## Step 1: Create Feature Doc

```bash
cp .dev_ops/templates/docs/feature.md .dev_ops/docs/FEAT-XXX.md
```

---

## Step 2: Fill Sections

Complete all sections in the feature document.

---

## Step 3: Decompose to Tasks

Create one task per acceptance criterion:

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "<Criterion>" \
  --summary "Trigger: FEAT-XXX\nUser Story: ..." \
  --priority medium \
  --column col-backlog
```

---

## Outputs

- `.dev_ops/docs/FEAT-XXX.md`
- TASK-XXX entries in Backlog
