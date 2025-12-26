---
phase: researching
activation_mode: Model Decides
triggers: [task_in_researching]
---

# Researching Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | TASK + architecture docs + constitution.md |
| ARTIFACT | RES-XXX in `dev_ops/docs/research/` |
| EXIT_TO | Documenting |

## ACTIONS

1. **Create research doc**

   ```bash
   python3 dev_ops/scripts/doc_ops.py create --title "Topic" --category research
   ```

2. **Define scope** — In-scope, out-of-scope, affected components

3. **Check technical alignment** — Verify docs ↔ code match

4. **Check project alignment** — Verify constitution principles respected

5. **Research** — Internal (codebase) + External (libs, web)

6. **Document recommendation** — What to do next

7. **Link artifact and move**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py upstream TASK-XXX RES-XXX
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-documenting
   ```

## SESSION BOUNDARY

When all exit criteria are met, call `notify_user` with:

- Research summary
- Recommendation
- Ready for Documenting phase

This ends the current AG session. User triggers `/next_phase` to continue.

## EXIT_CRITERIA

- [ ] Research document created
- [ ] Scope defined (in/out)
- [ ] Alignment verified (technical + project)
- [ ] Recommendation documented
- [ ] Task in Documenting column
