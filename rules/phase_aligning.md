---
activation_mode: Model Decides
description: Aligning phase - ensure docs and code are synchronized.
---

# Aligning Phase

Verify documentation aligns with existing code before implementing.

## Purpose

Before implementing new features, ensure:
- Existing code matches current documentation
- No drift between specs and implementation
- Foundation is stable for new work

## Actions

1. **Review Related Docs**:
   - Check architecture docs for the affected area
   - Review UX specs if UI is involved
   - Verify test docs are current

2. **Check Code**:
   - Compare actual implementation to documented behavior
   - Identify gaps or discrepancies

3. **Resolve Misalignment**:

   **If Code is Wrong** (doesn't match spec):
   - Create refactoring task → Backlog
   - Or fix directly if small

   **If Docs are Outdated** (don't match reality):
   - Update docs to reflect actual behavior
   - Cascade updates to dependent docs

4. **Document Alignment**:
   Add note in task checklist that alignment was verified.

## Exit Criteria

- [ ] Related docs reviewed
- [ ] Code checked against specs
- [ ] Misalignments resolved or tracked
- [ ] Move task to Researching
