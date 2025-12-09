---
activation_mode: Glob
description: Standards for Architectural Decision Records.
globs: "dev_docs/adrs/*.md"
---

# ADR Standards

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, follow these standards when Creating, Updating, or Superseding ADRs.
>
> **Agent Action**:
>
> - To Create: Use `/adr` (triggers `workflows/adr.md`).

## 1. Relationships

| From ADR | To | Relationship | When |
|:---------|:---|:-------------|:-----|
| ADR | Research | "informed by" | Research led to this decision |
| ADR | Bug | "addresses" | Decision fixes or addresses bug |
| ADR | Backlog | "creates" | Decision requires implementation work |
| ADR | Plan | "guides" | Plan implements this decision |

## 2. CRUD Propagation

### CREATE

1. Check for conflicting ADRs in `dev_docs/adrs/`.
2. Use `/adr` workflow to create.
3. **Link to Research**: Add Research IDs that informed this decision.
4. **Link to Bugs**: Add Bug IDs this decision addresses.
5. **Create Backlog items**: For any implementation work required.

### UPDATE

1. Append to Consequences, don't overwrite.
2. Update `status`: `active` → `deprecated` | `superseded`.
3. **If superseding**: Create new ADR, update `superseded_by` in old ADR.
4. **Update Plans**: Notify any Plans referencing this ADR.

### SUPERSEDE

1. Create new ADR with `/adr`.
2. Update old ADR: `status: superseded`, `superseded_by: ADR-XXX`.
3. **Update all referencing Plans** to point to new ADR.
4. **Create Backlog items** for migration work if needed.

### DELETE
>
> [!CAUTION]
> Do NOT delete ADRs. Use `status: superseded` with link to replacement.
