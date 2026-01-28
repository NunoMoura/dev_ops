---
description: Triage PR comment with project context
category: manual
---

# Triage Comment

Analyze PR comment and take appropriate action.

## Step 1: Analyze

Understand `{{user_input}}`. Review Architecture docs and ADRs.

## Step 2: Categorize

| Category | Action |
|----------|--------|
| Bug/Feature | Create task |
| Quick Fix | Fix now |
| Dismiss | Reply & Close |

## Step 3: Action

### Option A: Create Task

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "PR#XXX: <summary>" \
  --summary "From PR comment: {{user_input}}" \
  --priority medium \
  --column col-backlog
```

### Option B: Respond

Reply in PR with action taken.


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
