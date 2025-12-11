# Create Backlog Item Workflow

## Prerequisites

- [ ] An idea, future task, or non-critical issue identified.
- [ ] Checked existing backlog to avoid duplicates.

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
