---
name: understand
description: Research deeply before planning. Use when starting a new task, analyzing requirements, or scoping work.
---

# Understand

> Know more about the problem than the person who wrote the trigger doc.

## When to Use This Skill

- Task is in Understand column (if applicable)
- Need to research before planning
- Scoping work or analyzing requirements

## Phase Constraints

- **Allowed**: Reading `SPEC.md` files, external research, creating `RES-XXX`.
- **Forbidden**: Writing code, creating plans.

## Execution Flow

### 1. Discover (Define Scope)

- **Input**: Trigger doc (User request).
- **Rule**: Do NOT open code files yet.
- **Action**: Find relevant `SPEC.md` files: `find . -name SPEC.md | xargs grep "term"`.

### 2. Filter & Drill (Research)

- Read `## Structure`, `## Constraints`, and `## Dependencies` in SPECs.
- **External**: Check docs for libraries/frameworks.
- Identify what is **In Scope** vs **Out of Scope**.

### 3. Implement (Create Research)

Create `RES-XXX` using `.dev_ops/templates/artifacts/research.md`.

- Document: Scope, Dependencies, Risks, Recommended Approach.

**Constraint**: If you find unrelated issues, use `/create_task`.

### 4. Verify & Iterate (Ralph Wiggum Loop)

- **Check**: Do I know enough to Plan?
- **Loop**:
  - **Unclear?** Research more.
  - **Assumptions?** Challenge them.
- **Exit**: When "How" and "Why" are clear.

## Completion

1. Update task status: `ready-for-review`
2. Notify user: "Research RES-XXX complete. Ready for review."
