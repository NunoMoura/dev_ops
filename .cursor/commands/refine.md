---
description: Iteratively improve work based on feedback (Ralph Wiggum Loop)
category: Maintenance
---

# Refine Phase Workflow

Iteratively improve work based on feedback (Ralph Wiggum Loop).

## Step 1: Analyze Feedback

Analyze provided feedback against `task.md`, `implementation_plan.md`, or codebase.

## Step 2: Refine

```bash
node .dev_ops/scripts/devops.js refine-phase --feedback "{{user_input}}"
```

## Step 3: Verify & Report

1. Verify changes matching feedback.
2. Notify user of refinements.
3. Keep task status as `in_progress` until fully satisfied.


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
