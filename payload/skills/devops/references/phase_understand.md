# Phase: Understand

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

Use template: [research.md](../assets/research.md)

---

## Examples

### Example 1: Researching a new feature

User says: "Research how to add input validation to our API"

Actions:

1. Locate relevant `SPEC.md` files (e.g., API architecture).
2. Check existing patterns in codebase (`src/api/validation.ts`).
3. Research external libraries (if needed).
4. Create `RES-XXX` with scope and recommendations.

Result: `RES-042` created with scope, dependency map, and a recommendation to use `zod` for validation.

### Example 2: Understanding legacy code

User says: "Understand how the authentication flow works"

Actions:

1. Find auth-related specs (`find . -name "*auth*"`).
2. Read `SPEC.md` headers for context.
3. Targeted `grep` searches for usage patterns.
4. Document findings in `RES-XXX`.

Result: `RES-043` created documenting the auth flow across 3 components, with a dependency diagram.

---

## Troubleshooting

### Error: "Scope too large"

**Cause**: Trying to research the entire repository at once.
**Solution**: Focus on one component or feature vertical. Use `find` to locate specific specs.

### Error: "Missing SPEC.md"

**Cause**: Component might be undocumented or new.
**Solution**: Create a placeholder `SPEC.md` or research the nearest parent component.

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
