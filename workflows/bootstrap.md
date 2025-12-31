---
description: Initialize project with DevOps framework
category: automated
---

# Bootstrap

Initialize a project with the DevOps framework.

## Steps

1. **Run setup**:

   ```bash
   python3 scripts/setup_ops.py --target {{user_input}}
   ```

   Or use VS Code command: `DevOps: Initialize`

2. **Configure constitution**: Open `dev_ops/constitution.md` and fill in Non-negotiables, Constraints, Values

## Outputs

- `dev_ops/board.json` — Board board
- `dev_ops/constitution.md` — Project principles
- `.agent/rules/` — Phase rules and dynamic rules
