---
description: Report a new bug
category: guided
---

# Report Bug

Create BUG-XXX artifact to track a bug.

> [!TIP]
> Template: `.dev_ops/templates/artifacts/bug.md`

## Steps

1. **Check for duplicates**:

   ```bash
   python3 scripts/artifact_ops.py list bug
   ```

2. **Create bug**:

   ```bash
   python3 scripts/artifact_ops.py create bug --title "{{user_input}}"
   ```

3. **Fill sections**: Status (open), Symptoms, Steps to Reproduce, Expected vs Actual

## Outputs

- `dev_ops/artifacts/bugs/BUG-XXX.md`
