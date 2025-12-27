---
phase: understand
activation_mode: Model Decides
triggers: [task_in_understand]
---

# Understand Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | TASK + trigger doc + architecture docs + constitution.md |
| ARTIFACT | RES-XXX, updated architecture docs |
| EXIT_TO | Plan |

## Goal

> **Deep comprehension before action.**

You should exit this phase knowing more about the problem than the person who wrote the trigger doc.

## ACTIONS

1. **Create research artifact**

   ```bash
   python3 dev_ops/scripts/doc_ops.py create --title "Topic" --category research
   ```

2. **Define scope precisely**
   - What's in scope vs out of scope
   - Which components are affected
   - What will NOT change

3. **Verify alignment**
   - Do architecture docs match current code?
   - Does this align with constitution principles?
   - Flag any contradictions you find

4. **Research thoroughly**
   - Internal: existing code patterns, similar implementations
   - External: library docs, best practices, alternatives
   - Edge cases: what could go wrong?

5. **Challenge assumptions**
   - Question requirements that seem incomplete
   - Propose alternatives if you see better approaches
   - Identify risks and unknowns

6. **Update documentation**
   - Create/update architecture docs for affected components
   - Add ADRs for any non-trivial decisions
   - Document your recommendation

7. **Link and move**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py upstream TASK-XXX RES-XXX
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-plan
   ```

## EXIT_CRITERIA

- [ ] Research artifact created with clear recommendation
- [ ] Scope defined (explicit in/out)
- [ ] Risks and unknowns documented
- [ ] Architecture docs updated if needed
- [ ] Ready to explain the "what" and "why" to another developer
- [ ] Task in Plan column
