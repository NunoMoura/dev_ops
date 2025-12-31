---
description: Re-run phase with identical context
category: manual
---

# Retry Phase

Spawn new agent with same prompt. Previous artifacts preserved.

## Steps

1. **Check current task and phase**:

   ```bash
   cat dev_ops/.current_task
   python3 scripts/board_ops.py list --status agent_active
   ```

2. **Spawn new agent** with identical phase rule prompt

3. **Compare outputs** — Keep best or merge artifacts

## Notes

- Task stays in current column
- Each attempt produces separate artifacts (RES-001, RES-002)
- Use `/refine_phase` for directed feedback instead
