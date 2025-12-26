---
description: Initialize the project with DevOps framework.
---

# Bootstrap Workflow

Initialize a project with the DevOps framework.

## Steps

1. **Run setup**:

   ```bash
   python3 dev_ops/scripts/setup_ops.py
   ```

   Or use the **DevOps: Initialize** VS Code command.

2. **Setup creates**:
   - `dev_ops/board.json` — Task board
   - `dev_ops/constitution.md` — Project non-negotiables
   - `dev_ops/docs/` — Persistent documentation
   - `dev_ops/artifacts/` — Ephemeral artifacts
   - `.agent/rules/` — Dynamic rules

3. **Configure constitution**:
   - Open `dev_ops/constitution.md`
   - Fill in: Non-negotiables, Constraints, Values
   - These are checked during Researching phase alignment

4. **Dynamic rule generation**:
   - Detected languages → `.agent/rules/languages/`
   - Detected linters → `.agent/rules/linters/`
   - Detected libraries → `.agent/rules/libraries/`

## Output

- Kanban board initialized
- Constitution created
- Agent rules installed

## Exit Criteria

- [ ] `dev_ops/board.json` exists
- [ ] `dev_ops/constitution.md` populated
- [ ] `.agent/rules/` contains project-specific rules
