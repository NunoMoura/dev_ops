---
phase: documenting
activation_mode: Model Decides
triggers: [task_in_documenting]
---

# Documenting Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | RES-XXX + architecture docs |
| ARTIFACT | Updated/new docs in `dev_ops/docs/architecture/` |
| EXIT_TO | Planning |

## ACTIONS

1. **Review RES-XXX** — Note affected components list

2. **Create new docs** (if needed)

   ```bash
   python3 dev_ops/scripts/doc_ops.py create --title "Component Name"
   ```

   Or scaffold from folder:

   ```bash
   python3 dev_ops/scripts/doc_ops.py scaffold --root .
   ```

3. **Update existing docs** — Edit `dev_ops/docs/architecture/*.md` directly

4. **Add inline ADRs** — Document non-trivial decisions:

   ```markdown
   ### ADR-001: [Title]
   **Context**: Why needed
   **Decision**: What decided
   **Consequences**: Trade-offs
   ```

5. **Move to Planning**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-planning
   ```

## SESSION BOUNDARY

When all exit criteria are met, call `notify_user` with a summary of:

- Documents created/updated
- ADRs added
- Ready for Planning phase

This ends the current AG session. User triggers `/next_phase` to continue.

## EXIT_CRITERIA

- [ ] New component docs created (if needed)
- [ ] Existing docs updated
- [ ] No contradictions between docs
- [ ] Task in Planning column
