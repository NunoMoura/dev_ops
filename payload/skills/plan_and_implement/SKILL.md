---
name: plan_and_implement
description: Seamlessly plan and implement solutions. Combines Planning and Building into a single, continuous workflow.
---

# Plan & Implement Phase

> From idea to code in one smooth motion.

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read SPEC.md & Researh | Skip TDD (tests first) |
| Create/Edit PLN-XXX | Deviate from plan silently |
| Write Implementation Code | Make undocumented changes |
| Create/Run Tests | Skip commits |
| Update SPEC.md | Make architecture changes without ADR |

**Required Deliverables**:

1. `PLN-XXX` (Plan)
2. Working code + tests (Implementation)

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Research + Specs | Code + Tests + Plan | Verify |

---

## Steps

### 1. Create Implementation Plan (PLN-XXX)

**Always start here.**

- Analyze requirements
- Create `PLN-XXX` in `.dev_ops/context/`
- Define checklist
- **Self-Review**: Ensure plan is solid.

### 2. Implement (The Build Loop)

**Seamless Transition:** Once you have a plan, **immediately** start executing it.

1. **Test**: Write a failing test (TDD).
2. **Code**: Write code to pass the test.
3. **Refactor**: Clean up.
4. **Repeat**: Until checklist is done.

### 3. The Ralph Wiggum Loop (Recursive Improvement)

> "I'm helping!" - Ralph Wiggum  
> Reference: [Recursive Language Models](https://arxiv.org/pdf/2512.24601)

1. **Verify**: Does this code actually work?
2. **Critique**: Is this the best way to do it?
3. **Refine**: Make it better before moving on.
4. **Repeat**: Until you are proud of it.

---

## Completion

1. Set task status: `ready-for-review`
2. Notify user: "Implementation complete. Ready for verify."
