---
description: Report a new bug
category: guided
---

# Report Bug

Create BUG-XXX artifact to track a bug.

## Step 1: Check Duplicates

```bash
node .dev_ops/scripts/devops.js detect
```

Check `board.json` output for similar issues.

## Step 2: Create Report

```bash
cp .dev_ops/templates/artifacts/bug.md .dev_ops/docs/BUG-XXX.md
```

Fill sections: Status, Symptoms, Steps, Expected vs Actual.

## Step 3: Create Task

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "Fix: <Bug Title>" \
  --summary "Trigger: BUG-XXX" \
  --priority medium \
  --column col-backlog
```

## Outputs

- `.dev_ops/docs/BUG-XXX.md`
- TASK-XXX in Backlog


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
