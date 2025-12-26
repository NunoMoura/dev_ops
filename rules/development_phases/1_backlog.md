---
phase: backlog
activation_mode: Model Decides
triggers: [task_created, agent_spawned]
---

# Backlog Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | Trigger doc (PRD/FEAT/BUG) |
| ARTIFACT | TASK-XXX in `dev_ops/board.json` |
| EXIT_TO | Researching |

## ACTIONS

1. **Claim task**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py pick --claim
   ```

2. **Load trigger doc** — Read linked PRD/FEAT/BUG for context

3. **Move to Researching**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-researching
   ```

## EXIT_CRITERIA

- [ ] Task claimed (status != `todo`)
- [ ] Trigger doc reviewed
- [ ] Task in Researching column
