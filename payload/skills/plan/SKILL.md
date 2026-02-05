---
name: plan
description: Create implementation plans before building. Use when designing solutions or breaking down work into steps.
---

# Plan Phase

> A plan so clear any developer could execute it.

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read SPEC.md files | Open code files |
| Read RES-XXX research | Write any code |
| Create PLN-XXX artifact | Make architecture changes |
| Define acceptance criteria | Skip dependency analysis |

**Required Deliverable**: `PLN-XXX` in `.dev_ops/context/`

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| RES-XXX + SPEC.md files | PLN-XXX implementation plan | Build |

---

## Steps

### 1. Review Research

Internalize RES-XXX:

- Scope boundaries
- Affected components
- Risks and edge cases
- Recommended approach

### 2. Analyze Impact via SPEC.md

**Do NOT open code files.**

1. Read affected SPEC.md `## Dependencies`
2. Check dependents: `grep -r "your-component" */SPEC.md`
3. Validate interfaces won't break

### 3. Create Implementation Plan

Use template: `.dev_ops/templates/artifacts/plan.md`

Required sections:

- **Goal**: High-level objective
- **Checklist**: Ordered items, `[test]` or `[code]` tagged
- **Acceptance Criteria**: Testable conditions
- **Verification**: Commands and manual checks

### 4. Add ADR if Needed

Architectural decision? Prepare ADR row for SPEC.md.

### 5. Anticipate Problems

Document:

- External dependencies
- Uncertainty areas
- Performance concerns

---

## Iterate (Ralf Wiggum Loop)

1. Check exit criteria below
2. If incomplete → refine plan
3. If complete → proceed to Completion

---

## Exit Criteria

- [ ] PLN-XXX artifact exists
- [ ] `## Goal` is clear and specific
- [ ] `## Checklist` has ordered, tagged items
- [ ] `## Acceptance Criteria` are testable
- [ ] `## Verification` steps defined
- [ ] Another dev could execute without clarification

---

## Out-of-Scope Discoveries

Found unrelated bugs/features? → `/create_task`, then continue

---

## Completion

1. Set task status: `ready-for-review`
2. Notify user: "Plan complete. PLN-XXX ready for review."
3. **Stop.** Wait for user review.
