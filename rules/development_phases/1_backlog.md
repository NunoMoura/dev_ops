---
phase: backlog
activation_mode: Model Decides
triggers: [task_created, agent_spawned]
---

# Backlog Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | Trigger doc (PRD/STORY/BUG) |
| ARTIFACT | Claimed TASK-XXX |
| EXIT_TO | Understand |

## ACTIONS

1. **Claim task**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py pick --claim
   ```

2. **Read trigger doc thoroughly** — Understand the "why" before the "what"

3. **Identify gaps** — Note any missing information or unclear requirements

4. **Move to Understand**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-understand
   ```

## EXIT_CRITERIA

- [ ] Task claimed
- [ ] Trigger doc read and understood
- [ ] Gaps or questions noted (if any)
- [ ] Task in Understand column
