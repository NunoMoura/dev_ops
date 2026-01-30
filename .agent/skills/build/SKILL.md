---
name: build
description: Implement production-ready code with tests. Use when writing code or following TDD practices.
---

# Build

> Code you'd be proud to ship. Code matches what SPEC.md defines.

## When to Use This Skill

- Task is in Build column (if applicable)
- Implementing features or fixes
- Writing tests (TDD workflow)

## Phase Constraints

- **Allowed**: Reading code, changing code, running tests.
- **Forbidden**: Changing requirements, fixing unrelated bugs (use `/create_task`).

## Execution Flow

### 1. Discover (Understand Context)

- **Input**: Read `PLN-XXX` and linked `SPEC.md` files.
- **Goal**: Understand exactly what needs to be built.

### 2. Filter & Drill (Focus)

- Identify specific files and functions to modify.
- **Rule**: Open *only* the files related to the current implementation step.

### 3. Implement (TDD Cycle)

For each checklist item in `PLN-XXX`:

1. **Test**: Write a failing test for the specific requirement.
2. **Code**: Write just enough code to pass the test.
3. **Refactor**: Clean up while keeping tests passing.

**Constraint**: If you find unrelated bugs, use `/create_task` then continue.

### 4. Verify & Iterate (Ralph Wiggum Loop)

- **Check**: Run `npm test` or equivalent.
- **Loop**:
  - **Failing?** Fix code, re-run.
  - **Lint error?** Fix style.
  - **Done?** Update `SPEC.md` (exports, structure).
- **Exit**: When checks pass and checklist is done.

## Completion

1. Commit changes: `feat: <description> \n\n Task: TASK-XXX`
2. Update task status: `ready-for-review`
3. Notify user: "Build complete. Tests passed."
