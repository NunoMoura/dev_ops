---
description: Document research on a specific topic.
---

# Research Workflow

## Prerequisites

- [ ] A topic requiring investigation or research.
- [ ] Optionally, a Bug (`BUG-XXX`) or Backlog item (`BLK-XXX`) prompting this.
- [ ] **If tracked on board**: Parent task (`TASK-XXX`) exists and is claimed.

## Relations

- **Upstream**:
  - **Task**: `TASK-XXX` (Parent work item on Kanban board)
  - **Bug**: `BUG-XXX` (Issue requiring investigation)
  - **Backlog**: `BLK-XXX` (Feature requiring investigation)
- **Downstream**:
  - **ADR**: `ADR-XXX` (Decision informed by this research)
  - **Plan**: `PLN-XXX` (Plan informed by this research)

## Template

Use [research.md](file:///home/nunoc/projects/dev_ops/templates/research.md).

**Example fill-in**:

- **Question**: "Which caching strategy best suits our high-read API?"
- **Context**: "Prompted by BLK-023; current response times exceed SLA"
- **Findings**:

  ```markdown
  ### Redis
  - Pros: Fast, widely supported
  - Cons: Additional infrastructure

  ### In-memory LRU
  - Pros: No external deps
  - Cons: Not shared across instances
  ```

- **Conclusion**: "Recommend Redis for shared cache; see ADR-018"
- **Related**: "BLK-023, ADR-018"

## Steps

1. **Conduct Research**:
   - Run `python3 dev_ops/scripts/doc_ops.py create research --title "Title"`.
   - This generates `dev_ops/docs/research/RES-XXX-title.md`.
   - Research your topic using Paper Search MCP for academic sources or Web
     Search for general information (if available)

2. **Document Findings**:
   - **Context**: Why are we researching this? Link to Bug/Backlog.
   - **Findings**: Pros/cons, data, analysis.
   - **Recommendation**: Suggestions based on findings.

3. **Outcome**:
   - If a decision is needed, follow **Create ADR Workflow** (`/adr`) and link it.
   - If it resolves a Bug, update the Bug ticket.

4. **Link to Parent Task** (if using Kanban):

   ```bash
   python3 dev_ops/scripts/task_ops.py complete TASK-XXX --outputs "RES-XXX.md"
   ```

## Exit Criteria

- [ ] Research file created in `dev_ops/docs/research/`.
- [ ] Findings and Recommendation filled out.
- [ ] Linked to prompting documents (Bug/Backlog).
- [ ] **If tracked**: Artifact linked to parent task.
