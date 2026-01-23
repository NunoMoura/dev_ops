---
name: verify-phase
description: Validate, document proof, and ship via PR. Use when in the Verify phase, when testing, or when preparing work for review.
---

# Verify Phase

> Prove it works. Code matches what SPEC.md defines.

## When to Use This Skill

- Task is in Verify column
- Testing and validating code
- Self-reviewing changes
- Creating PRs

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| Code + tests + SPEC.md | walkthrough.md, PR | Done |

---

## Step 1: Validate

Run the full test suite with coverage:

```bash
pytest tests/ -v --cov  # Python
npm test                # JavaScript/TypeScript
```

Verify all acceptance criteria from PLN-XXX are met.

## Step 2: Self-Review

Read your code as if someone else wrote it:

- Is the logic clear?
- Are variable names descriptive?
- Would a new team member understand this?

## Step 3: SPEC.md Verification

Check that SPEC.md accurately reflects what was built:

- `## Structure` table lists all new folders/files
- `## Key Exports` lists important exports
- `## Dependencies` links are valid

## Step 4: Security Check

- No secrets or credentials in code
- All user inputs validated
- No injection vulnerabilities
- Sensitive data properly handled

## Step 5: Create Walkthrough

Document what you did using: `.dev_ops/templates/artifacts/walkthrough.md`

Include:

- **What was done**: Summary of changes
- **Why**: Business/technical rationale
- **Test results**: Output of test runs
- **Screenshots**: If UI changes

## Step 6: Create PR

```bash
git push origin feature/TASK-XXX
```

---

## Ralf Wiggum Loop

Iterate autonomously until exit criteria are met:

1. **Check**: Are all exit criteria satisfied?
2. **If No**: Identify what's failing, fix it, repeat
3. **If Yes**: Proceed to Phase Completion

### When to Iterate

- Tests fail → return to fix (stay in Verify for minor, return to Build for major)
- Security issue found → fix and re-check
- Walkthrough incomplete → add missing sections
- PR not ready → complete remaining steps

**Minor issues are iteration triggers. Major issues return to Build.**

---

## Exit Criteria (Self-Check)

Before notifying user, verify:

- [ ] All tests pass with coverage report generated
- [ ] Self-review completed
- [ ] SPEC.md matches implementation
- [ ] Security checklist passed
- [ ] walkthrough.md created with proof
- [ ] PR created or code ready to push

---

## Out-of-Scope Discoveries

If you find bugs, features, or tech debt unrelated to current task:
→ Use `/create_task` workflow, then continue verification

---

## Phase Completion

When exit criteria are met:

1. Set task status to `ready-for-review`:

   ```bash
   node .dev_ops/scripts/devops.js update-task --id <TASK_ID> --status ready-for-review
   ```

2. Notify user: "Verification complete. walkthrough.md and PR ready. Ready for your final review."

3. **Stop.** User will review. If approved, task moves to Done.
