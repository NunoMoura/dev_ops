---
description: Document research on a specific topic.
---

# Create Research Workflow

## Prerequisites

- [ ] A topic requiring investigation or research.
- [ ] Optionally, a Bug (`BUG-XXX`) or Backlog item (`BLK-XXX`) prompting this.

## Relations

- **Upstream**:
  - **Bug**: `BUG-XXX` (Issue requiring investigation)
  - **Backlog**: `BLK-XXX` (Feature requiring investigation)
- **Downstream**:
  - **ADR**: `ADR-XXX` (Decision informed by this research)
  - **Plan**: `PLN-XXX` (Plan informed by this research)

## Steps

1. **Conduct Research**:
   > [!TIP]
   > **MCP Recommendation**: Use **Paper Search MCP** (OpenAGS) for academic sources (arXiv, etc.) and deeply technical topics. Use **Web Search** for general information.

   - Run `python3 dev_ops/scripts/doc_ops.py create research --title "Title"`.
   - This generates `dev_ops/docs/research/RES-XXX-title.md`.

2. **Document Findings**:
   - **Context**: Why are we researching this? Link to Bug/Backlog.
   - **Findings**: Pros/cons, data, analysis.
   - **Recommendation**: Suggestions based on findings.

3. **Outcome**:
   - If a decision is needed, follow **Create ADR Workflow** (`/adr`) and link it.
   - If it resolves a Bug, update the Bug ticket.

## Exit Criteria

- [ ] Research file created in `dev_ops/docs/research/`.
- [ ] Findings and Recommendation filled out.
- [ ] Linked to prompting documents (Bug/Backlog).
