---
description: Verify phase - validate, document proof, ship via PR
activation_mode: Model Decides
---

# Verify Phase

| INPUTS | ARTIFACT | EXIT_TO |
|--------|----------|---------|
| Code + tests | walkthrough.md, PR (see `.dev_ops/templates/artifacts/pr.md`) | Done |

> Prove it works. Document the proof.

## Actions

1. **Validate**

   ```bash
   pytest tests/ -v --cov
   ```

2. **Self-review** — Read as if someone else wrote it

3. **Security check** — No secrets, inputs validated

4. **Update docs** — Architecture matches implementation

5. **Create walkthrough.md** — What, why, test results

6. **Create PR and complete**

   ```bash
   python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-done --commit
   ```

## Exit Criteria

- [ ] Tests pass
- [ ] Docs current
- [ ] walkthrough.md with proof
- [ ] Task in Done column


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
