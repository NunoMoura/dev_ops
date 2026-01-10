---
description: Plan phase - create implementation plan before building
activation_mode: Model Decides
---

# Plan Phase

| INPUTS | ARTIFACT | EXIT_TO |
|--------|----------|---------|
| RES-XXX + architecture docs | implementation_plan.md | Build |

> A plan so clear any developer could execute it.

## Actions

1. **Review research** — Internalize "why" before "how"

2. **Create implementation_plan.md**
   - Acceptance criteria (what success looks like)
   - Test strategy (behaviors + edge cases)
   - Ordered checklist (dependencies first)

3. **Anticipate problems** — What could block you?

4. **Move to Build**

   ```bash
   python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-build --commit
   ```

**If research gaps found** → move back to Understand

## Exit Criteria

- [ ] implementation_plan.md created
- [ ] Acceptance criteria testable
- [ ] Another dev could execute without clarification
- [ ] Task in Build column
