---
description: Generate refinement prompt with PM feedback
category: automated
---

# Refine Phase

Generate structured prompt with context + PM feedback for agent refinement.

## Steps

1. **Enter feedback** when prompted (or after command):

   ```bash
   python3 .dev_ops/scripts/board_ops.py refine TASK-XXX --feedback "{{user_input}}"
   ```

   Or use VS Code: Click "Refine Phase" in Agent sidebar

2. **Paste prompt** into new agent session

## Outputs

- Structured prompt (copied to clipboard)
- Task `refinementCount` incremented
- Feedback stored in `refinementHistory`
