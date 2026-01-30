---
name: verify
description: Validate, document proof, and ship via PR. Use when testing or preparing work for review.
---

# Verify

> Prove it works. Code matches what SPEC.md defines.

## When to Use This Skill

- Task is in Verify column (if applicable)
- Testing and validating code
- Self-reviewing changes
- Creating PRs

## Phase Constraints

- **Allowed**: Running tests, minor fixes (typos), docs updates, PR creation.
- **Forbidden**: Major refactoring, new features. Return to Build for these.

## Execution Flow

### 1. Discover (Validation)

- **Input**: Tests, Code, SPEC.md.
- **Rule**: Run full test suite (`npm test`).

### 2. Filter & Drill (Coverage)

- Check `PLN-XXX` acceptance criteria.
- Ensure tests cover all criteria.
- **Self-Review**: Read code as a stranger (Naming, comments).

### 3. Implement (Proof)

Create `walkthrough.md`.

- **Content**: Summary, Test Results, Screenshots (if UI).
- **Check**: `SPEC.md` must match reality (exports, files).

### 4. Verify & Iterate (Ralph Wiggum Loop)

- **Check**: Did tests pass? Is walkthrough complete?
- **Loop**:
  - **Tests fail?** Fix code (small) or return to Build (large).
  - **Security issue?** Fix it.
- **Exit**: When ready for PR.

## Completion

1. Create PR: `git push origin feature/TASK-XXX`
2. Update task status: `ready-for-review`
3. Notify user: "Verification complete. PR ready."
