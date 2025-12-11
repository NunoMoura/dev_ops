---
description: Create a new Architectural Decision Record (ADR).
---

# Create ADR Workflow

## Prerequisites

- [ ] A decision needs to be made that affects architecture.
- [ ] Existing ADRs checked for conflicts via `python3 dev_ops/scripts/doc_ops.py list adr`.

## Steps

1. **Create the file**:
   - Run `python3 dev_ops/scripts/doc_ops.py create adr --title "Your Title Here"`.
   - This generates `dev_ops/docs/adrs/ADR-XXX-your-title-here.md`.

2. **Fill in the details**:
   - **Status**: Set to `proposed`.
   - **Context**: Explain the problem and why a decision is needed. Link to Research (`RES-XXX`).
   - **Decision**: State the decision clearly.
   - **Consequences**: List pros, cons, and risks.

3. **Link related items**:
   - If this addresses a bug, link it (e.g., "Fixes `BUG-XXX`").
   - If this implements a backlog item, link it.

## Exit Criteria

- [ ] ADR file created and content filled.
- [ ] Status is `proposed`.
