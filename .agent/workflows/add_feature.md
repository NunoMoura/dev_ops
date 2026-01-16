---
description: Create feature spec and decompose into tasks
category: guided
---

# Add Feature

Create FEAT-XXX and decompose into backlog tasks.

> [!TIP]
> Templates available:
>
> - `.dev_ops/templates/docs/story.md` - User story format
> - `.dev_ops/templates/docs/user.md` - User persona format
> - `.dev_ops/templates/docs/mockup.md` - UI mockup documentation

## Steps

1. **Create feature**:

   ```bash
   python3 scripts/artifact_ops.py create feature --title "{{user_input}}"
   ```

2. **Fill sections**: Summary, User Stories, Acceptance Criteria, Technical Notes

3. **Decompose to tasks** (one per acceptance criterion):

   ```bash
   python3 scripts/board_ops.py create --title "Implement X" --trigger FEAT-XXX
   ```

## Outputs

- `dev_ops/artifacts/features/FEAT-XXX.md`
- TASK-XXX items in Backlog
