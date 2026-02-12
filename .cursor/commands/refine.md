---
description: Iteratively improve work based on feedback
category: maintenance
---

# Refine

Iterate on work using the Ralf Wiggum Loop.

---

## Step 1: Analyze Feedback

Compare feedback against:

- `task.md`
- `implementation_plan.md`
- Current codebase

---

## Step 2: Apply Refinements

```bash
node .dev_ops/scripts/devops.js refine-phase --feedback "{{user_input}}"
```

---

## Step 3: Verify & Report

1. Verify changes match feedback
2. Notify user of refinements
3. Keep status `in_progress` until satisfied

---

## Outputs

- Refined artifacts/code
- Updated task status
