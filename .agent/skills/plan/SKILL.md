---
name: plan
description: Create implementation plans before building. Use when designing solutions or breaking down work into steps.
---

# Plan

> A plan so clear any developer could execute it.

## When to Use This Skill

- Task is in Plan column (if applicable)
- Designing a solution
- Breaking down work into implementable steps

## Phase Constraints

- **Allowed**: Reading `SPEC.md` files, creating `PLN-XXX`.
- **Forbidden**: Writing code (except prototypes in scratchpad), modifying existing code.

## Execution Flow

### 1. Discover (Gather Context)

- **Input**: `RES-XXX` (Research) + `SPEC.md` files.
- **Rule**: Do NOT open code files. Rely on SPECs.

### 2. Filter & Drill (Analyze)

- Identify affected components via `grep` or `find`.
- Check `## Dependencies` in `SPEC.md`.
- Ensure new plan won't break existing interfaces.

### 3. Implement (Create Plan)

Create `PLN-XXX` using `.dev_ops/templates/artifacts/plan.md`.

- **Goal**: Clear objective.
- **Checklist**: Step-by-step implementation guide (Dependencies first).
- **Acceptance Criteria**: Testable conditions.

**Constraint**: If you find new requirements, use `/create_task`.

### 4. Verify & Iterate (Ralph Wiggum Loop)

- **Check**: Is the plan actionable? Can another dev execute it?
- **Loop**:
  - **Missing steps?** Add them.
  - **Vague criteria?** Clarify.
- **Exit**: When checklist is complete and specific.

## Completion

1. Update task status: `ready-for-review`
2. Notify user: "Plan PLN-XXX created. Ready for review."
