---
description: Create an implementation plan for a task.
---

# Create Plan Workflow

## Prerequisites

- [ ] An issue or backlog item exists (`BLK-XXX` or `BUG-XXX`).
- [ ] Relevant ADRs (`ADR-XXX`) and Research (`RES-XXX`) are identified.

## Relations

- **Upstream**:
  - **Backlog**: `BLK-XXX` (Item being addressed)
  - **Bug**: `BUG-XXX` (Issue being fixed)
  - **Research**: `RES-XXX` (Relevant research)
  - **ADR**: `ADR-XXX` (Relevant architectural decisions)
- **Downstream**:
  - **Code**: `[file/path]` (Code changes)
  - **PR**: `PR-XXX` (Pull Request)

## Steps

1. **Identify Context**:
   > [!TIP]
   > **MCP Recommendation**: Use **Context7 MCP** (Upstash) to research library capabilities to ensure your plan is feasible. Use **GitHub MCP** (gitmcp) to check specific code references.

   - Collect IDs of relevant ADRs, Research, Bugs, and Backlog items.

2. **Create the Plan**:
   - Run `python3 dev_ops/scripts/doc_ops.py create plan --title "Plan Title"`.
   - This generates `dev_ops/docs/plans/PLN-XXX-plan-title.md`.

3. **Fill in the Details**:
   - **Goal**: High-level objective.
   - **Context**: Summary of *why* we are doing this.
   - **Steps**: Detailed execution steps.
   - **Verification**: How to verify success.
   - **Related**: Ensure all IDs collected in Step 1 are in `related_docs`.

## Exit Criteria

- [ ] Plan file created in `dev_ops/docs/plans/`.
- [ ] Context and Steps are filled out.
- [ ] Plan is ready for review.
