---
description: Reset the current phase and start over
category: maintenance
---

# Retry

Reset and restart the current phase.

---

## Step 1: Identify Failure

Determine reason for retry:

- Error encountered
- Test failure
- User instruction

---

## Step 2: Clean Up

- Revert git changes
- Reset `task.md` items
- Archive failed `implementation_plan.md`

---

## Step 3: Reset Phase

```bash
node .dev_ops/scripts/devops.js retry-phase
```

---

## Step 4: Execute

Restart phase with corrected approach.

---

## Outputs

- Clean state for retry
- Previous attempt archived
