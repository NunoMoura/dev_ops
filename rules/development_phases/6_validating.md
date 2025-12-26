---
phase: validating
activation_mode: Model Decides
triggers: [task_in_validating]
---

# Validating Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | Code + Tests |
| ARTIFACT | VAL-XXX in `dev_ops/artifacts/validation_reports/` |
| EXIT_TO | PR |

## ACTIONS

1. **Lint** — Run configured linters

   ```bash
   ruff check .
   ```

2. **Test** — Run full test suite

   ```bash
   pytest tests/ -v
   ```

3. **Security review** — Check for secrets, validate inputs

4. **Doc coherence** — Verify docs match implementation

5. **Create walkthrough** — Use Antigravity native `walkthrough.md`

   The agent creates its walkthrough artifact within the current AG session.
   Include: verification results, test summary, screenshots if applicable.

6. **Move to PR**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-pr
   ```

## SESSION BOUNDARY

When all exit criteria are met, call `notify_user` with:

- Verification results summary
- Test coverage
- Ready for PR phase

This ends the current AG session. User triggers `/next_phase` to continue.

## EXIT_CRITERIA

- [ ] walkthrough.md created
- [ ] Lint passes
- [ ] Tests pass
- [ ] Security reviewed
- [ ] Docs coherent
- [ ] Task in PR column
