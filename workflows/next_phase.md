---
description: Validate current phase and transition to next
---

# Next Phase Workflow

Validate that the current phase exit criteria are met and transition to the next phase.

## Steps

1. **Read current task**

   ```bash
   cat dev_ops/.current_task
   python3 dev_ops/scripts/kanban_ops.py list --status in_progress
   ```

2. **Verify phase exit criteria** from the current phase rule

3. **If all criteria met**:

   - Record the session ID for this phase:

     ```bash
     python3 dev_ops/scripts/kanban_ops.py record-phase TASK-XXX <phase_name> <session_id>
     ```

   - Move task to next column:

     ```bash
     python3 dev_ops/scripts/kanban_ops.py move TASK-XXX <next_column>
     ```

4. **If criteria NOT met**:

   - List unmet criteria
   - Stay in current phase
   - Resume work on missing items

## Phase Transitions

| Current | Next Column |
|---------|-------------|
| Researching | col-documenting |
| Documenting | col-planning |
| Planning | col-implementing |
| Implementing | col-validating |
| Validating | col-pr |
| PR | col-done |

## Notes

- This workflow is triggered by the PM after reviewing the agent's `notify_user` summary
- Each phase = one AG session
- Session IDs are recorded in the task's `phases` object for traceability
