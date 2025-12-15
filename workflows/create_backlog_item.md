# Create Backlog Item Workflow

## Prerequisites

- [ ] An idea, future task, or non-critical issue identified.
- [ ] Checked existing backlog to avoid duplicates.
  > [!TIP]
  > **MCP Recommendation**: Use **GitHub MCP** (gitmcp) to search for existing issues or related discussions in the repo before creating a new item.

## Relations

- **Upstream**:
  - **Triage**: (Source of the idea/request)
  - **ADR**: `ADR-XXX` (Architectural decision spawning this work)
- **Downstream**:
  - **Plan**: `PLN-XXX` (Plan implementing this item)

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
