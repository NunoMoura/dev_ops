---
name: implement
description: Execute the implementation plan (PLN-XXX) one step at a time. Strict adherence to the plan.
---

# Implement Phase

> "I'm helping!" - Ralph Wiggum (Autonomous Mode)

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Write Code & Tests | Deviate from `PLN-XXX` |
| Read `PLN-XXX` | Plan new features |
| Mark items `[x]` | Ignore broken tests |
| Run Tests | Leave broken build |

**Required Deliverable**: Working code matching `PLN-XXX`.

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| `PLN-XXX` + Codebase | Code + Tests + Updated Plan | Verify |

---

## The Ralph Wiggum Loop (Fresh Context Protocol)

**Constraint**: Assume your memory is **WIPED** after every "Stop". You are a fresh instance every time.

### 1. Read (The "Wake Up")

- **Action**: Read `PLN-XXX.md`.
- **Focus**: Find the **first unchecked** `[ ]` item.
- **Context**: Read *only* the files mentioned in that item.

### 2. Build (The "Work")

- **Action**: Implement **only** that single item.
- **Mode**: TDD (Test Driven Development) wherever possible.
- **Tools**: `write_to_file`, `replace_file_content`.

### 3. Verify (The "Evidence")

- **Action**: Run the test or verification script for that item.
- **Loop**: If it fails, fix it immediately. Do not move on.

### 4. Update (The "Checkbox")

- **Action**: detailedly mark the item as `[x]` in `PLN-XXX.md`.
- **Note**: Add a small note if you discovered something new.

### 5. Stop (The "Sleep")

- **Action**: **STOP**. Do not try to do 5 items in one go.
- **Reason**: Allows the system (or user) to review or auto-loop with fresh context.

---

## Exit Criteria

- [ ] All items in `PLN-XXX` are `[x]`.
- [ ] Tests pass.
- [ ] Code compiles.
