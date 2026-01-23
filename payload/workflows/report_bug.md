---
description: Report a new bug
category: guided
---

# Report Bug

Create BUG-XXX artifact to track a bug.

**Template:** `.dev_ops/templates/artifacts/bug.md`

## Step 1: Check for Duplicates

Use the DevOps board "Search Tasks" to check for existing bug reports:

Check tasks using the CLI or reviewing `board.json`:

```bash
node .dev_ops/scripts/devops.js detect
```

## Step 2: Create Bug Report

1. Copy the bug template:

   ```bash
   cp .dev_ops/templates/artifacts/bug.md .dev_ops/docs/BUG-XXX.md
   ```

2. Fill in the bug report sections: Status (open), Symptoms, Steps to Reproduce, Expected vs Actual

## Step 3: Create Task for Bug Fix

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "Fix: <Bug Title>" \
  --summary "Trigger: BUG-XXX" \
  --priority medium \
  --column col-backlog
```

Reference the bug in the task summary: `Trigger: BUG-XXX`

## Outputs

- `.dev_ops/docs/BUG-XXX.md` (bug report)
- TASK-XXX in Backlog (for fix)
