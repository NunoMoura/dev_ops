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

## Core Principle

**Verify that code matches what SPEC.md defines.**

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
- Are there unnecessary comments?
- Would a new team member understand this?

## Step 3: SPEC.md Verification

Check that SPEC.md accurately reflects what was built:

- [ ] `## Structure` table lists all new folders/files
- [ ] `## Key Exports` lists important exports
- [ ] `## ADRs` table has any decisions made
- [ ] `## Dependencies` links are valid

## Step 4: Security Check

- [ ] No secrets or credentials in code
- [ ] All user inputs validated
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities (for web)
- [ ] Sensitive data properly handled

## Step 5: Create Walkthrough

Document what you did:

- **What was done**: Summary of changes
- **Why**: Business/technical rationale
- **Test results**: Output of test runs
- **Screenshots**: If UI changes

See `.agent/skills/verify_phase/examples/walkthrough.md` for a complete example.

## Step 6: Create PR

**Template:** `.dev_ops/templates/artifacts/pr.md`

```bash
git push origin feature/TASK-XXX
```

## Decision Tree

### If Minor Issues Found

Stay in Verify, fix and re-test.

### If Significant Issues Found

Return to Build phase.

## Exit Criteria

- [ ] All tests pass with coverage report
- [ ] Self-review completed
- [ ] SPEC.md matches implementation
- [ ] Security checklist passed
- [ ] Walkthrough created with proof
- [ ] PR created (or ready for review)
