---
activation_mode: Glob
description: Standards for Backlog management.
globs: "docs/backlog.md"
---

# Backlog Standards

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, follow these standards when managing the Backlog.
>
> **Agent Action**:
>
> - To Create: Use `/feature` (triggers `workflows/feature.md`).

## 1. Relationships

| From Backlog | To | Relationship | When |
|:-------------|:---|:-------------|:-----|
| Backlog | Plan | "prioritized into" | Item moves to current sprint |
| Backlog | ADR | "created by" | ADR requires implementation work |
| Backlog | Research | "investigated by" | Item needs analysis |
| Backlog | Code | "discovered during" | Future need found while coding |

## 2. CRUD Propagation

### CREATE

1. Add new items with priority section (High/Medium/Low).
2. **If from ADR**: Link to originating ADR ID.
3. **If discovered during coding**: Note the context.
4. Include enough detail for future sprint planning.

### UPDATE

1. Reprioritize items as needed.
2. Add details as they become available.
3. **If complex**: Create Research to investigate (`/research`).

### MOVE TO PLAN

1. Remove item from Backlog (or mark `in-sprint`).
2. Add item to active Plan.
3. **Update Backlog** to reflect item is in progress.

### DELETE
>
> [!CAUTION]
> Do NOT delete Backlog items. Strike through with reason if no longer needed.
