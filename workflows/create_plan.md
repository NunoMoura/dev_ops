---
description: Create an implementation plan for a task.
---

# Create Plan Workflow

## Prerequisites

- [ ] An issue or backlog item exists (`BLK-XXX` or `BUG-XXX`).
- [ ] Relevant ADRs (`ADR-XXX`) and Research (`RES-XXX`) are identified.

## Steps

1. **Identify Context**:
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
