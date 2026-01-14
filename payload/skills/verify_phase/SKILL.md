---
name: verify-phase
description: Validate, document proof, and ship via PR. Use when in the Verify phase, when testing, or when preparing work for review.
---

# Verify Phase

> Prove it works. Document the proof.

## When to Use This Skill

- Task is in Verify column
- Testing and validating code
- Self-reviewing changes
- Creating PRs

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| Code + tests | walkthrough.md, PR | Done |

## Step 1: Validate

Run the full test suite with coverage:

```bash
pytest tests/ -v --cov
```

Verify all acceptance criteria from PLN-XXX are met.

## Step 2: Self-Review

Read your code as if someone else wrote it:

- Is the logic clear?
- Are variable names descriptive?
- Are there unnecessary comments?
- Would a new team member understand this?

## Step 3: Security Check

- [ ] No secrets or credentials in code
- [ ] All user inputs validated
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities (for web)
- [ ] Sensitive data properly handled

## Step 4: Update Documentation

Ensure architecture docs match implementation:

- Update `.dev_ops/docs/architecture/` if components changed
- Add ADR if significant decisions were made
- Update README if user-facing behavior changed

## Step 5: Create Walkthrough

Document what you did (use `--help` for options):

```bash
python3 .dev_ops/scripts/artifact_ops.py create --help
```

```bash
python3 .dev_ops/scripts/artifact_ops.py create validation \
  --title "Walkthrough for TASK-XXX" \
  --task TASK-XXX
```

Include:

- **What was done**: Summary of changes
- **Why**: Business/technical rationale
- **Test results**: Output of test runs
- **Screenshots**: If UI changes

See `examples/walkthrough.md` for a complete example.

## Step 6: Create PR

Use the PR template at `.dev_ops/templates/artifacts/pr.md`:

```bash
git push origin feature/TASK-XXX
```

## Step 7: Complete Task

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-done --commit
```

## Decision Tree

### If Minor Issues Found

Stay in Verify, fix and re-test.

### If Significant Issues Found

Move back to Build:

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-build --commit
```

## Exit Criteria

- [ ] All tests pass with coverage report
- [ ] Self-review completed
- [ ] Security checklist passed
- [ ] Documentation updated
- [ ] Walkthrough created with proof
- [ ] PR created (or ready for review)
- [ ] Task moved to Done column
