---
name: implement
description: Execute the changes defined in `SPEC.md`. Strict adherence to the Spec.
---

# Implement Phase

> "I'm helping!" - Ralph Wiggum (Autonomous Mode)

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

### 4. Review (The "Checkbox")

* **Self-Correction**: If you find bugs or missing implementation details, you may fix them, but you MUST set the task status to `needs_feedback` and ask the user for clarification if the fix corresponds to a change in the Plan or Spec.hase (or request a Plan phase). Code must match Spec.

### 5. Stop (The "Sleep")

* **Action**: **STOP**.
* **Reason**: Allows the system (or user) to review or auto-loop with fresh context.

---

## Exit Criteria

* [ ] All requirements in `SPEC.md` are implemented.
* [ ] Tests pass.
* [ ] Code compiles.

---

## Next Phase

* **Success**: `/verify` (Move to Verify).
* **Failure**: `/plan` (Back to Plan if you found a Spec architectural issue).
