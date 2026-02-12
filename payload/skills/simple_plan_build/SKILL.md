---
name: simple_plan_build
description: Create implementation plans and immediately build the solution. Combines Planning and Building into a continuous flow.
---

# Plan-Build Phase

> A seamless flow from design to code.

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read SPEC.md files | Skip TDD (tests first) |
| Read RES-XXX research | Deviate from plan silently |
| Create PLN-XXX artifact | Make undocumented changes |
| Write production code | Skip commits |
| Create tests | Make architecture changes without ADR |

**Required Deliverables**:
1. `PLN-XXX` (Plan)
2. Working code + tests + updated SPEC.md (Build)

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| RES-XXX + SPEC.md | PLN-XXX + Code + Tests | Verify |

---

## Steps

### 1. Create Implementation Plan (PLN-XXX)

**Do this FIRST.**

- Analyze specific requirements from SPEC.md
- Create `PLN-XXX` in `.dev_ops/context/`
- Define checklist of work
- **Wait for user confirmation** (Use your "Proceed" button or ask for "Go ahead")

### 2. Execute Plan (Build)

**Once Plan is acknowledged/approved:**

1. **Review Plan**: Read your own PLN-XXX.
2. **Write Tests**: TDD approach.
3. **Implement**: Write code to pass tests.
4. **Refactor**: Clean up.
5. **Update Specs**: Keep SPEC.md in sync.

---

## Iterate (Ralf Wiggum Loop)

1. Plan matches Spec?
2. Code matches Plan?
3. Tests pass?

---

## Completion

1. Set task status: `ready-for-review`
2. Notify user: "Work complete. Plan and Code ready for review."
