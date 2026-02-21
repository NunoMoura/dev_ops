# Phase: Understand

> Know more about the problem than the person who wrote the trigger doc.

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read `SPEC.md` Metadata (Headers) | Read full implementation files (>100 lines) |
| Web/external research | Write any code |
| Create `RES-XXX` artifact | Move to Plan without `RES-XXX` |
| `grep` / `find` | Skip scope definition |
| Jump to Parent Spec (Zoom-Out) | |

**Required Deliverable**: `RES-XXX` in `.dev_ops/tasks/TASK-XXX/`

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Trigger + `SPEC.md` Headers | `RES-XXX` research doc | Plan |

---

## Steps

### 1. The Non-Code Bypass

* **Check**: Does this task produce persistent project docs (a PRD, Persona, Story, Standard) or configuration files?
* **Action**: If YES, skip the Strict Spec search (`find . -name SPEC.md`). Proceed directly to research and scoping. Specs are Code Gates; they do not apply to documentation tasks.

### 2. RLM Zoom-Out (Map the Territory)

* **Action**: Locate the relevant `SPEC.md` files.
* **Command**: `find . -name SPEC.md`
* **Constraint**: Do not open them yet. Just list them to understand the landscape.

### 2. Context Loading (Metadata)

* **Action**: Read the *frontmatter* and *headers* of the relevant `SPEC.md` files.
* **Focus**: `description`, `## Architecture`, `## Dependencies`.
* **Zoom-Out**: If the local `SPEC.md` doesn't provide enough context on upstream constraints, locate and read the **Parent Directory's** `SPEC.md`. Iterate upwards until the context is clear.
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

Use template: [research.md](../assets/research.md)

## Troubleshooting

### Error: "Scope too large"

**Cause**: Trying to research the entire repository at once.
**Solution**: Focus on one component or feature vertical. Use `find` to locate specific specs.

### Error: "Missing SPEC.md"

**Cause**: Component might be undocumented, new, or missing context.
**Solution**: Perform an RLM Zoom-Out. Research the nearest parent folder's `SPEC.md` to understand upstream expectations, or fallback to the Root Spec.

---

## Exit Criteria

* [ ] `RES-XXX` artifact exists.
* [ ] Scope defined (Which Specs?).
* [ ] Dependencies mapped (Which Child Specs?).
* [ ] "What" and "Why" are clear.

---

## Next Phase

* **Success**: Move to **Plan**.
* **Review**: Set status to `needs_feedback` if user input is needed.
