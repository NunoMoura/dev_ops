---
description: Re-run phase with identical context (self-consistency)
---

# Retry Phase

Spawn new agent with exact same prompt. Previous artifacts preserved.

## When to Use

- PM wants to see alternative output
- First attempt was close but not quite right
- Exploring different reasoning paths

## Steps

1. **Read current task and phase**

   ```bash
   cat dev_ops/.current_task
   python3 dev_ops/scripts/kanban_ops.py list --status in_progress
   ```

2. **Get phase workflow** — Determine which workflow to re-run

3. **Spawn NEW agent** with identical prompt (same phase rule)

4. **Agent works independently** — May produce different output

5. **PM compares outputs** — Keep best or merge artifacts

## Why This Works

- **Self-consistency**: Diverse reasoning paths find different solutions
- **No lost work**: Previous artifacts preserved (RES-001, RES-002, etc.)
- **Incremental improvement**: Each attempt may catch what others missed

## Notes

- Task stays in current column
- Session versioned (e.g., understand-v1, understand-v2)
- PM decides which output to keep
