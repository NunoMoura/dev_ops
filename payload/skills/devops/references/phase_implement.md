# Phase: Implement

> "I'm helping!" — Ralph Wiggum (Autonomous Mode)

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Write Code & Tests | Deviate from `SPEC.md` |
| Read `SPEC.md` | Plan new features (Go back to Plan) |
| Read `RES-[TASK-ID].md` | Ignore broken tests |
| Run Tests | Leave broken build |
| Refactor Implementation | Ignore `SPEC.md` constraints |

**Required Deliverable**: Working code matching `SPEC.md`.

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| `SPEC.md` | Code + Tests | Verify |

---

## Steps

### 1. Read (The "Wake Up")

* **Context**: Read the local `SPEC.md`.
* **Trace**: If this is a rework or bugfix, read the previous `walkthrough.md` (if it exists) to understand what was verified last time.
* **Focus**: Identify what parts of the `SPEC` are not yet implemented or need changing.
* **Safety**: Do NOT read unrelated parts of the codebase.

### 2. Build (The "Work")

* **Action**: Implement the requirements defined in `SPEC.md`.
* **Mode**: TDD (Test Driven Development) wherever possible.
* **Tools**: `write_to_file`, `replace_file_content`.
* **Constraint**: If potential conflicts arise, stop and check `RES-[TASK-ID].md` or `SPEC.md` ADRs.

### 3. Verify (The "Evidence")

* **Action**: Run the test or verification script for the implemented feature.
* **Loop**: If it fails, fix it immediately. Do not move on.
* **Reference**: [Testing Guide](./testing_guide.md)

### 4. Review (The "Checkbox")

* **Self-Correction**: If you find bugs or missing implementation details, you may fix them, but you MUST set the task status to `needs_feedback` and ask the user for clarification if the fix corresponds to a change in the Plan or Spec phase (or request a Plan phase). Code must match Spec.

### 5. Stop (The "Sleep")

* **Action**: **STOP**.
* **Reason**: Allows the system (or user) to review or auto-loop with fresh context.

---

## Examples

### Example 1: Implementing a Feature

User says: "Implement input validation for the API"

Actions:

1. Read `src/api/SPEC.md` to understand requirements.
2. Create test `tests/api/test_validation.ts` (Red).
3. Implement `src/api/validation.ts` (Green).
4. Run tests to confirm passing.

Result: New validation module with passing tests. Code matches SPEC exactly.

### Example 2: Refactoring

User says: "Refactor the auth service to use async/await"

Actions:

1. Read `src/auth/SPEC.md`.
2. Update `src/auth/service.ts`.
3. Verify tests still pass.

Result: Refactored code, all existing tests green, no behavioral change.

---

## Troubleshooting

### Error: "Tests match code but functionality is wrong"

**Cause**: Spec might be incorrect or interpreted wrong.
**Solution**: Check `SPEC.md` again. If ambiguous, go back to **Plan** or **Understand**.

### Error: "Build failed after changes"

**Cause**: TypeScript errors or missing dependencies.
**Solution**: Fix compilation errors before running tests. Use `npm install` if new deps added.

---

## Exit Criteria

* [ ] All requirements in `SPEC.md` are implemented.
* [ ] Tests pass.
* [ ] Code compiles.

---

## Next Phase

* **Success**: Move to **Verify**.
* **Failure**: Return to **Plan** (Back to Plan if you found a Spec architectural issue).
