---
description: Create an implementation plan for a task.
produces: PLAN-XXX
---

# Create Plan Workflow

## Prerequisites

- [ ] An issue or backlog item exists.
- [ ] Relevant ADRs (`ADR-XXX`) and Research (`RESEARCH-XXX`) are identified.
- [ ] **If tracked on board**: Parent task (`TASK-XXX`) exists and is claimed.

## Relations

- **Upstream**:
  - **Task**: `TASK-XXX` (Parent work item on Kanban board)
  - **Backlog**: `BLK-XXX` (Item being addressed)
  - **Bug**: `BUG-XXX` (Issue being fixed)
  - **Research**: `RES-XXX` (Relevant research)
  - **ADR**: `ADR-XXX` (Relevant architectural decisions)
- **Downstream**:
  - **Code**: `[file/path]` (Code changes)
  - **PR**: `PR-XXX` (Pull Request)

## Template

Use [plan.md](file:///home/nunoc/projects/dev_ops/templates/plan.md).

**Example fill-in**:

- **Goal**: "Implement user authentication for API endpoints"
- **Context**: "Addresses BUG-042, informed by ADR-015 (JWT strategy)"
- **Proposed Changes**:

  ```markdown
  ### Auth Module
  - [ ] Create `auth/jwt_handler.py`
  - [ ] Add middleware to `api/routes.py`

  ### Tests
  - [ ] Add unit tests for token validation
  ```

- **Verification**: "Run `pytest tests/auth/` and manual login test"
- **Related**: "ADR-015, BUG-042, RES-008"

## Steps

1. **Identify Context**:
   - Research library capabilities and best practices to ensure your plan is
     feasible (use Context7 MCP if available)
   - Check specific code references (use GitHub MCP if available)
   - Collect IDs of relevant ADRs, Research, Bugs, and Backlog items

2. **Create the Plan**:
   - Run `python3 dev_ops/scripts/doc_ops.py create plan --title "Plan Title"`.
   - This generates `dev_ops/plans/PLAN-XXX-plan-title.md`.

3. **Fill in the Details**:
   - **Goal**: High-level objective.
   - **Context**: Summary of *why* we are doing this.
   - **Steps**: Detailed execution steps.
   - **Verification**: How to verify success.
   - **Related**: Ensure all IDs collected in Step 1 are in `related_docs`.

4. **Link to Parent Task** (if using Kanban):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py link TASK-XXX PLAN-XXX --relation output
   ```

## Exit Criteria

- [ ] Plan file created in `dev_ops/plans/`.
- [ ] Context and Steps are filled out.
- [ ] Plan is ready for review.
- [ ] **If tracked**: Artifact linked to parent task.
