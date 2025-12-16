---
description: Create a new Architectural Decision Record (ADR).
---

# Create ADR Workflow

## Prerequisites

- [ ] A decision needs to be made that affects architecture.
- [ ] Existing ADRs checked for conflicts via
  `python3 dev_ops/scripts/doc_ops.py list adr`.

## Relations

- **Upstream**:
  - **Research**: `RES-XXX` (Research informing this decision)
- **Downstream**:
  - **Plan**: `PLN-XXX` (Plans guided by this decision)

## Template

Use [adr.md](file:///home/nunoc/projects/dev_ops/templates/adr.md).

**Example fill-in**:

- **Status**: "Proposed" (then "Accepted" after review)
- **Context**: "Need to choose between REST and GraphQL for new API;
  see RES-012"
- **Decision**: "Use GraphQL for client-facing API due to flexible
  querying needs"
- **Consequences**:
  - Pros: Reduces over-fetching, single endpoint
  - Cons: Learning curve, requires schema management
- **Related**: "RES-012, BLK-045"

## Steps

1. **Create the file**:
   - Run `python3 dev_ops/scripts/doc_ops.py create adr --title "Your Title Here"`.
   - This generates `dev_ops/docs/adrs/ADR-XXX-your-title-here.md`.
   - Research to compare libraries/technologies or algorithmic/theoretical
     options (use Context7 MCP or Paper Search MCP if available)

2. **Fill in the details**:
   - **Status**: Set to `proposed`.
   - **Context**: Explain the problem and why a decision is needed. Link to
     Research (`RES-XXX`).
   - **Decision**: State the decision clearly.
   - **Consequences**: List pros, cons, and risks.

3. **Link related items**:
   - If this addresses a bug, link it (e.g., "Fixes `BUG-XXX`").
   - If this implements a backlog item, link it.

## Exit Criteria

- [ ] ADR file created and content filled.
- [ ] Status is `proposed`.
