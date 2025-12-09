---
activation_mode: Glob
description: Standards for Research and Trade-off Analysis.
globs: "docs/research/*.md"
---

# Research Standards

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, follow these standards when Creating, Updating, or Completing Research.
>
> **Agent Action**:
>
> - To Create: Use `/research` (triggers `workflows/research.md`).

## 1. Relationships

| From Research | To | Relationship | When |
|:--------------|:---|:-------------|:-----|
| Research | Bug | "investigates" | Bug needs analysis before fixing |
| Research | Backlog | "investigates" | Future item needs analysis |
| Research | ADR | "informs" | Research leads to a decision |

## 2. CRUD Propagation

### CREATE

1. Use `/research` workflow to create.
2. **Link to Bug/Backlog**: Add ID of item being investigated.
3. Clearly state the research question/goal.

### UPDATE

1. Append findings, don't overwrite history.
2. Update `status`: `active` → `completed` | `abandoned`.
3. Document pros/cons of each option explored.

### COMPLETE

1. Summarize recommendation in the Recommendation section.
2. **If decision needed**: Trigger ADR creation (`/adr`).
3. Update linked Bug/Backlog item with research link.

### DELETE
>
> [!CAUTION]
> Do NOT delete Research. Use `status: abandoned` with reason.
