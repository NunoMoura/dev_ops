---
description: Triage PR comment with project context
category: manual
---

# Triage Comment

Analyze PR comment and take appropriate action.

## Step 1: Analyze Comment

Understand what's being reported in `{{user_input}}`.

## Step 2: Check Relevant Docs

Review Architecture docs, ADRs, and existing patterns.

## Step 3: Categorize

| Category | Action |
|----------|--------|
| Bug | Create task in backlog |
| Feature | Create task in backlog |
| Quick Fix | Fix in current session |
| Dismiss | Explain in PR comment |

## Step 4: Create Task (if needed)

```bash
node .dev_ops/scripts/devops.js create-task --title "<Pull Request Title>" --summary "Address PR feedback: <Comment Link>" --priority medium --column col-plan
```

Include "PR#XXX: <summary>" as the title.

## Step 5: Respond in PR

Comment with action taken.

## Outputs

- PR comment with action taken
- TASK-XXX in backlog (if bug/feature)
