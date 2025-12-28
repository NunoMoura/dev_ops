---
description: Create feature spec and decompose into tasks
category: guided
---

# Add Feature

Create FEAT-XXX and decompose into backlog tasks.

## Steps

1. **Create feature**:

   ```bash
   python3 scripts/artifact_ops.py create feature --title "{{user_input}}"
   ```

2. **Fill sections**: Summary, User Stories, Acceptance Criteria, Technical Notes

3. **Decompose to tasks** (one per acceptance criterion):

   ```bash
   python3 scripts/kanban_ops.py create --title "Implement X" --trigger FEAT-XXX
   ```

## Outputs

- `dev_ops/artifacts/features/FEAT-XXX.md`
- TASK-XXX items in Backlog
