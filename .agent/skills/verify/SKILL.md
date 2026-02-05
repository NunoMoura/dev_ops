---
name: verify
description: Validate, document proof, and ship via PR. Use when testing or preparing work for review.
---

# Verify Phase

> Prove it works. Code matches what SPEC.md defines.

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Run tests | Make code changes (except minor fixes) |
| Self-review code | Add new features |
| Create walkthrough | Skip security check |
| Create PR | Submit without proof |

**Required Deliverable**: `walkthrough.md` with test evidence + PR

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Code + tests + SPEC.md | walkthrough.md + PR | Done |

---

## Steps

### 1. Validate

Run full test suite with coverage:

```bash
pytest tests/ -v --cov  # Python
npm test                # JavaScript/TypeScript
```

Verify all PLN-XXX acceptance criteria met.

### 2. Self-Review

Read code as if someone else wrote it:

- Is logic clear?
- Are names descriptive?
- Would a new team member understand?

### 3. SPEC.md Verification

Check SPEC.md matches what was built:

- `## Structure` lists all new files
- `## Key Exports` lists exports
- `## Dependencies` links valid

### 4. Security Check

- No secrets in code
- Inputs validated
- No injection vulnerabilities
- Sensitive data handled properly

### 5. Create Walkthrough

Use artifact template. Include:

- **What was done**: Summary of changes
- **Why**: Business/technical rationale
- **Test results**: Output of test runs
- **Screenshots**: If UI changes

### 6. Create PR

```bash
git push origin feature/TASK-XXX
```

---

## Iterate (Ralf Wiggum Loop)

1. Check exit criteria below
2. If minor issue → fix and re-check
3. If major issue → return to Build
4. If complete → proceed to Completion

**Minor issues = iteration. Major issues = back to Build.**

---

## Exit Criteria

- [ ] All tests pass with coverage
- [ ] Self-review completed
- [ ] SPEC.md matches implementation
- [ ] Security checklist passed
- [ ] walkthrough.md created with proof
- [ ] PR created or ready to push

---

## Out-of-Scope Discoveries

Found unrelated bugs/features? → `/create_task`, then continue

---

## Completion

1. Set task status: `ready-for-review`
2. Notify user: "Verification complete. walkthrough.md and PR ready."
3. **Stop.** Wait for final user review.
