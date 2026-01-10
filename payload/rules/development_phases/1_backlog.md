---
description: Backlog phase - claim task and read trigger doc before Understand
activation_mode: Model Decides
---

# Backlog Phase

| INPUTS | ARTIFACT | EXIT_TO |
|--------|----------|---------|
| Trigger doc (PRD/STORY/BUG) | Claimed TASK-XXX | Understand |

## Actions

1. **Claim task**

   ```bash
   python3 .dev_ops/scripts/board_ops.py claim TASK-XXX --commit
   ```

2. **Read trigger doc** — Understand the "why" before the "what"

3. **Note gaps** — Missing info or unclear requirements

4. **Move to Understand**

   ```bash
   python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-understand --commit
   ```

## Exit Criteria

- [ ] Task claimed
- [ ] Trigger doc understood
- [ ] Task in Understand column
