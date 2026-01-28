---
description: Reset the current phase and start over (Ralph Wiggum Loop)
category: Maintenance
---

# Retry Phase Workflow

Reset the current phase and start over (Ralph Wiggum Loop).

## Step 1: Identify Failure

Determine reason for retry (Error, Test Failure, Instruction).

## Step 2: Clean Up

- Revert git changes.
- Reset `task.md` items.
- Archive failed `implementation_plan.md`.

## Step 3: Retry

```bash
node .dev_ops/scripts/devops.js retry-phase
```

## Step 4: Execute

Restart phase execution with corrected approach.


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
