---
activation_mode: Glob
description: Standards for Bug and Issue reports.
globs: "docs/bugs/*.md"
---

# Bug & Issue Standards

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, follow these standards when Creating, Updating, or Deleting Issues.
>
> **Agent Action**:
>
> - To Create: Use `/bug` (triggers `workflows/bug.md`).
> - To Resolve: Use `/fix` (triggers `workflows/fix.md`).

## 1. Relationships

| From Bug | To | Relationship | When |
|:---------|:---|:-------------|:-----|
| Bug | Research | "investigated by" | When bug needs analysis |
| Bug | ADR | "addressed by" | When bug leads to decision |
| Bug | Plan | "fixed in" | When bug is scheduled |
| Bug | Backlog | "deferred to" | When bug is not fixed now |

## 2. CRUD Propagation

### CREATE

1. Search existing bugs in `docs/bugs/` to avoid duplicates.
2. Use `/bug` workflow to create.
3. **If discovered during coding**: Note the context in the bug.
4. **If from ADR/Research**: Add link in `related_docs`.

### UPDATE

1. Append progress notes, don't overwrite history.
2. Update `status` field: `open` → `in-progress` → `blocked` → `closed`.
3. **If blocked**: Create Research doc to investigate (`/research`).
4. **If needs architecture change**: Create ADR (`/adr`).

### CLOSE (via `/fix`)

1. Run `python3 scripts/workflow_utils/resolve_bug.py [ID]`.
2. **If bug is in a Plan**: Mark checklist item as complete.
3. Add resolution notes in the bug file.

### DELETE
>
> [!CAUTION]
> Do NOT delete bugs. Use status:
>
> - `wont-fix` - Issue won't be addressed.
> - `duplicate` - Link to original bug.
> - `invalid` - Not actually a bug.
