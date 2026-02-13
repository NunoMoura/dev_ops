---
name: plan
description: Create a robust implementation plan (PLN-XXX). Focus on research and architecture, NOT code writing.
---

# Plan Phase

> "I have a plan!" - Ralph Wiggum

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read SPEC.md & Codebase | Write Implementation Code |
| Create/Edit `PLN-XXX` | Modify Source Code (`.ts`, `.py`, etc.) |
| Write *Verification Scripts* | Skip "Verify Plan" step |
| Search/Grep | Assume you know the code |

**Required Deliverable**: `PLN-XXX` (Implementation Plan) in `.dev_ops/context/`

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Task + Codebase | `PLN-XXX.md` | Implement |

---

## The Ralph Wiggum Loop (Plan Mode)

**Constraint**: Assume you have **NO memory** of the previous session. Your truth is the explicit state of the repo.

### 1. Research (The "Look")

- **Action**: Don't guess. Look at the code.
- **Tools**: `grep_search`, `list_dir`, `view_file`.
- **Goal**: Find *exactly* where changes are needed.

### 2. Draft Plan (The "Think")

- **Action**: Create or Update `PLN-XXX.md`.
- **Content**:
  - **Files to Modify**: Absolute paths.
  - **Step-by-Step**: Atomic instructions.
  - **Verification**: How will we know it works?

### 3. Verify Plan (The "Check")

- **Action**: **CRITICAL**. Reread your plan against the code.
- **Loop**:
  - Does the file exist?
  - Is the line number roughy correct?
  - Did I miss a dependency?
- **Correction**: If wrong, go back to Step 1.

### 4. Stop (The "Sleep")

- **Action**: Once the plan is solid, **STOP**.
- **Output**: "Plan PLN-XXX is ready for review."

---

## Exit Criteria

- [ ] `PLN-XXX.md` exists and is detailed.
- [ ] No implementation code was written.
- [ ] You are confident an autonomous agent could execute this plan blindly.
