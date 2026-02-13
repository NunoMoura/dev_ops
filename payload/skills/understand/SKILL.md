---
name: understand
description: Research deeply before planning. Focus on "Zoom-Out" context loading via SPEC headers.
---

# Understand Phase

> Know more about the problem than the person who wrote the trigger doc.

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read `SPEC.md` Metadata (Headers) | Read full implementation files (>100 lines) |
| Web/external research | Write any code |
| Create `RES-XXX` artifact | Move to Plan without `RES-XXX` |
| `grep` / `find` | Skip scope definition |

**Required Deliverable**: `RES-XXX` in `.dev_ops/tasks/TASK-XXX/`

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Trigger + `SPEC.md` Headers | `RES-XXX` research doc | Plan |

---

## Steps

### 1. RLM Zoom-Out (Map the Territory)

* **Action**: Locate the relevant `SPEC.md` files.
* **Command**: `find . -name SPEC.md`
* **Constraint**: Do not open them yet. Just list them to understand the landscape.

### 2. Context Loading (Metadata)

* **Action**: Read the *frontmatter* and *headers* of the relevant `SPEC.md` files.
* **Focus**: `description`, `## Architecture`, `## Dependencies`.
* **Goal**: precise mental map of components without token overload.

### 3. Define Scope

Document explicitly in `RES-XXX`:

* **In Scope**: Which `SPEC.md` files will need updating?
* **Out of Scope**: Related components you will NOT touch.

### 4. External Research

* Library/framework docs
* Best practices
* Edge cases and constraints

### 5. Create Research Artifact

Use template: `.dev_ops/templates/artifacts/research.md`

---

## Exit Criteria

* [ ] `RES-XXX` artifact exists.
* [ ] Scope defined (Which Specs?).
* [ ] Dependencies mapped (Which Child Specs?).
* [ ] "What" and "Why" are clear.

---

## Next Phase

* **Success**: `/plan` (Move to Plan).
* **Review**: Set status to `ready-for-review` if user input is needed.
