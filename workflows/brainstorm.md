---
description: Explore new ideas, solve complex problems, or plan a major feature.
---

# Brainstorming Workflow

## Prerequisites

- [ ] A problem or idea to explore.

## Relations

- **Upstream**:
  - **Problem**: Description of the issue or opportunity
- **Downstream**:
  - **Research**: `RES-XXX` (Formal investigation)
  - **ADR**: `ADR-XXX` (Formal decision)

## Template

Brainstorming may produce one of:

- [research.md](file:///home/nunoc/projects/dev_ops/templates/research.md) -
  for formal investigation with findings
- [adr.md](file:///home/nunoc/projects/dev_ops/templates/adr.md) -
  for architectural decisions

See the respective workflows (`/research`, `/adr`) for fill-in examples.

## Steps

1. Define the topic or problem you want to explore.
   - Research using Paper Search MCP for academic papers or Web Search for
     broader understanding (if available)
2. Follow the **Create Research Workflow** to document your findings.
3. If the brainstorming leads to an architectural decision, follow the  
   **Create ADR Workflow**.
4. Discuss with the team or user to refine ideas.

## Exit Criteria

- [ ] A clear direction is chosen.
- [ ] Documented in PRD, Task, or Research doc.
- [ ] Relevant ADRs are created or linked.
