---
description: Add an item to the backlog for future work.
---

# Add Task Workflow

## Prerequisites

- [ ] An idea, future task, or non-critical issue identified.
- [ ] Checked existing backlog to avoid duplicates
      (search for existing issues using GitHub MCP if available)

## Relations

- **Upstream**:
  - **Triage**: (Source of the idea/request)
  - **ADR**: `ADR-XXX` (Architectural decision spawning this work)
- **Downstream**:
  - **Plan**: `PLN-XXX` (Plan implementing this item)

## Template

Backlog items are added to `dev_ops/docs/backlog.md` in this format:

```markdown
## BLK-XXX: Title

**Priority**: High | Medium | Low
**Source**: ADR-XXX, RES-XXX, or description
**Goal**: What is the desired outcome?
```

**Example**:

```markdown
## BLK-045: Add rate limiting to public API

**Priority**: Medium
**Source**: RES-012 (API performance research)
**Goal**: Prevent abuse and ensure fair usage across clients
```

## Steps

1. **Create Item**:
   - Run `python3 dev_ops/scripts/doc_ops.py create backlog --title "Title"`.
   - (Alternatively, append to `dev_ops/docs/backlog.md` if no script support).

2. **Add Details**:
   - **Priority**: High / Medium / Low.
   - **Context**: Where did this come from? (ADR, Research, Code comment).
   - **Goal**: What is the desired outcome?

3. **Refinement**:
   - If complex, link to a Research doc (`RES-XXX`).
   - If ready for work, move to a Plan.

## Exit Criteria

- [ ] Item added to Backlog.
- [ ] Priority assigned.
