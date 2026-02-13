---
name: verify
description: Validate, document proof, and ship via PR. Use when testing or preparing work for review.
---

# Verify Phase

> Prove it works. Code matches what `SPEC.md` defines.

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Run tests | Make code changes (except minor fixes) |
| Read `SPEC.md` | Add new features |
| Create `walkthrough.md` | Skip security check |
| Create PR | Submit without proof |

**Required Deliverable**: `walkthrough.md` with test evidence + PR

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Code + Tests + `SPEC.md` | `walkthrough.md` + PR | Done |

---

## Steps

### 1. Validate against Spec

* **Action**: Run full test suite.
* **Command**: `npm test` or `pytest`.
* **Check**: Does the implementation meet **every** Requirement in `SPEC.md`?

### 2. SPEC.md Integrity Check

* **Action**: Ensure `SPEC.md` accurately reflects the codebase.
* **Check**:
  * `## File Structure`: Are all new files listed?
  * `## API / Key Exports`: Are all exports documented?
  * `## Dependencies`: Are links valid?

### 3. Self-Review

* Is logic clear?
* Are names descriptive?
* Would a new team member understand?

### 4. Security Check

* No secrets in code.
* Inputs validated.
* No injection vulnerabilities.

### 5. Create Walkthrough

Use artifact template. Include:

* **What was done**: Summary of changes.
* **Spec Compliance**: Explicit statement that code matches Spec.
* **Test results**: Output of test runs.
* **Screenshots**: If UI changes.

### 6. Create PR

```bash
git push origin feature/TASK-XXX
```

---

## Exit Criteria

* [ ] All tests pass with coverage.
* [ ] `SPEC.md` matches implementation exactly.
* [ ] `walkthrough.md` created with proof.
* [ ] PR created.

---

## Next Phase

* **Success**: `/done` (Task Complete).
* **Failure**: `/implement` (Fix bugs) or `/plan` (Fix Spec).
