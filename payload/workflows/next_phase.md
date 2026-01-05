---
description: Move task to next phase
category: automated
---

# Next Phase

Validate exit criteria and move task to next column.

## Steps

1. **Check current task**:

   ```bash
   cat .dev_ops/.current_task
   python3 .dev_ops/scripts/board_ops.py list --status agent_active
   ```

2. **Verify exit criteria** from current phase rule

3. **If met**, record session and move (with auto-commit for team sync):

   ```bash
   python3 .dev_ops/scripts/board_ops.py record-phase TASK-XXX <phase> <session_id>
   python3 .dev_ops/scripts/board_ops.py move TASK-XXX <next_column> --commit
   ```

4. **If not met**, list unmet criteria and resume work

## Phase Transitions

| From | To |
|------|-----|
| Backlog | col-understand |
| Understand | col-plan |
| Plan | col-build |
| Build | col-verify |
| Verify | col-done |
