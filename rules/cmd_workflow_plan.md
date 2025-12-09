---
activation_mode: Glob
description: Standards for Implementation Plans.
globs: "dev_ops/plans/*.md"
---

# Plan Standards

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, follow these standards when Creating, Updating, or Completing Plans.
>
> **Agent Action**:
>
> - To Create: Use `/plan` (triggers `workflows/plan.md`).
> - To Implement: Use `/implement` (triggers `workflows/implement.md`).

## 1. Relationships

| From Plan | To | Relationship | When |
|:----------|:---|:-------------|:-----|
| Plan | ADR | "implements" | Plan follows ADR guidance |
| Plan | Research | "references" | Plan uses Research findings |
| Plan | Bug | "fixes" | Plan resolves bugs |
| Plan | Backlog | "executes" | Items moved from Backlog |

## 2. CRUD Propagation

### CREATE

1. Use `/plan` workflow to create.
2. **Reference all context docs**: ADRs, Research, Bugs being addressed.
3. Move items from Backlog to Plan, mark as `in-sprint`.
4. Populate the `related_docs` field with all referenced IDs.

### UPDATE

1. Check `dev_ops/backlog.md` for prioritized items.
2. Strike through dropped items with reason.
3. **If blocked**: Create Research (`/research`) or Bug (`/bug`).
4. Update `status`: `active` → `in-progress` → `completed`.

### COMPLETE

1. Mark all resolved Bugs as `closed`.
2. Archive completed Backlog items.
3. Set Plan `status: completed`.
4. **Document outcomes**: What was delivered, any follow-up items.

### DELETE
>
> [!CAUTION]
> Do NOT delete Plans. Use `status: abandoned` with reason.
