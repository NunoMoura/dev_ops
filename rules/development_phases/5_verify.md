---
phase: verify
activation_mode: Model Decides
triggers: [task_in_verify]
---

# Verify Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | Code + Tests from Build |
| ARTIFACT | walkthrough.md, Pull Request |
| EXIT_TO | Done |

## Goal

> **Prove it works. Document the proof.**

This phase exists to catch what Build missed and create evidence of correctness.

## ACTIONS

1. **Run full validation**

   ```bash
   ruff check .
   pytest tests/ -v --cov
   ```

2. **Review your own code critically**
   - Read it as if someone else wrote it
   - Look for assumptions that aren't tested
   - Check for missing error handling

3. **Verify security basics**
   - No hardcoded secrets or credentials
   - Inputs validated before use
   - Sensitive data handled appropriately

4. **Check documentation coherence**
   - Do architecture docs match what you built?
   - Update any docs that are now stale

5. **Create walkthrough**
   - What was implemented and why
   - Key decisions made during build
   - Test results and coverage
   - Screenshots/recordings if UI changes

6. **Create PR**

   ```bash
   python3 dev_ops/scripts/pr_ops.py create TASK-XXX
   ```

7. **Address feedback** — Treat review comments as opportunities to improve

8. **Merge and complete**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-done
   ```

## EXIT_CRITERIA

- [ ] Lint passes
- [ ] All tests pass
- [ ] Code reviewed (self or peer)
- [ ] No obvious security issues
- [ ] Documentation is current
- [ ] walkthrough.md created with proof of correctness
- [ ] PR opened, reviewed, and merged
- [ ] Task in Done column
