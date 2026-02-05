---
name: build
description: Implement production-ready code with tests. Use when writing code or following TDD practices.
---

# Build Phase

> Code you'd be proud to ship. Code matches what SPEC.md defines.

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read PLN-XXX plan | Skip TDD (tests first) |
| Write code to match spec | Deviate from plan silently |
| Update SPEC.md | Skip commits |
| Create tests | Make undocumented changes |

**Required Input**: `PLN-XXX` must exist  
**Required Output**: Working code + tests + updated SPEC.md

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| PLN-XXX + SPEC.md | Code + tests + SPEC.md updates | Verify |

---

## Steps

### 1. Review Plan and SPEC.md

SPEC.md defines requirements. Code matches specs.

Read SPEC.md for:

- What files should exist
- What functions to implement
- What constraints to follow

### 2. Write Tests First (TDD)

For each checklist item in PLN-XXX:

- Unit tests for behavior
- Edge case tests
- Error condition tests

### 3. Implement Code

Just enough to make tests pass:

- Handle errors gracefully
- Validate inputs
- Follow existing patterns

### 4. Refactor

While tests pass:

- Simplify complex logic
- Extract reusable components
- Improve naming

### 5. Update SPEC.md

Keep specs in sync:

- Adding folder/file → `## Structure`
- Adding export → `## Key Exports`
- Making decision → `## ADRs`

### 6. Commit

Conventional commits:

```bash
git commit -m "feat(<scope>): <what>

Task: TASK-XXX"
```

---

## Iterate (Ralf Wiggum Loop)

1. Check exit criteria below
2. If incomplete → fix failing tests, continue
3. If complete → proceed to Completion

**Test failures = iteration triggers, not phase failures.**

---

## Exit Criteria

- [ ] All PLN-XXX checklist items done
- [ ] All tests pass
- [ ] Lint passes
- [ ] SPEC.md updated if structure changed
- [ ] Changes committed

---

## Out-of-Scope Discoveries

Found unrelated bugs/features? → `/create_task`, then continue

---

## Completion

1. Set task status: `ready-for-review`
2. Notify user: "Build complete. All tests pass. Ready for review."
3. **Stop.** Wait for user review.
