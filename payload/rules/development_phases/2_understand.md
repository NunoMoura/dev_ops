---
description: Understand phase - research deeply before planning
activation_mode: Model Decides
---

# Understand Phase

| INPUTS | ARTIFACT | EXIT_TO |
|--------|----------|---------|
| TASK + trigger + architecture docs | RES-XXX | Plan |

> Know more about the problem than the person who wrote the trigger doc.

## Actions

1. **Define scope** — What's in/out, which components affected

2. **Research**
   - Internal: existing patterns, similar code
   - External: docs, best practices
   - Edge cases: what could go wrong?

3. **Challenge assumptions** — Question incomplete requirements

4. **Update docs** — Architecture, ADRs for decisions

5. **Decompose if needed** — If the task scope is too large during understanding, break it into smaller atomic tasks and add them to the backlog

6. **Move to Plan**

   ```bash
   python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-plan --commit
   ```

## Exit Criteria

- [ ] Scope defined (explicit in/out)
- [ ] Risks documented
- [ ] Can explain "what" and "why" to another dev
- [ ] Task in Plan column
