---
description: Supersede an existing ADR with a new one.
---

# Supersede ADR Workflow

## Prerequisites

- [ ] An existing ADR (`ADR-XXX`) is outdated or wrong.
- [ ] A new decision has been made.

## Relations

- **Upstream**:
  - **ADR**: `ADR-XXX` (The outdated decision)
- **Downstream**:
  - **ADR**: `ADR-YYY` (The new superseding decision)

## Steps

1. **Create the new ADR**:
   - Follow the **Create ADR** workflow (`workflows/create_adr.md`).
   - In the new ADR's context, mention it supersedes `ADR-XXX`.

2. **Deprecate the old ADR**:
   - File: `dev_ops/docs/adrs/ADR-XXX-old.md`
   - Update Header:

     ```yaml
     status: superseded
     superseded_by: ADR-YYY (The new one)
     ```

   - Add a note at the top of the context: "Superseded by [ADR-YYY](./ADR-YYY-new.md)".

3. **Update References**:
   - Find Plans or other docs referencing the old ADR.
   - Update them to point to the new ADR if applicable, or note the change.

## Exit Criteria

- [ ] New ADR created (`proposed` or `accepted`).
- [ ] Old ADR status is `superseded`.
- [ ] Old ADR links to new ADR.
