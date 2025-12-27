---
phase: plan
activation_mode: Model Decides
triggers: [task_in_plan]
---

# Plan Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | RES-XXX + architecture docs |
| ARTIFACT | implementation_plan.md |
| EXIT_TO | Build |

## Goal

> **A plan so clear that any developer could execute it.**

The plan is not a todo list — it's a blueprint that anticipates problems and defines success.

## ACTIONS

1. **Review research** — Internalize the "why" before planning the "how"

2. **Create implementation plan** — Use AG-native `implementation_plan.md`

3. **Define acceptance criteria**
   - Specific, measurable conditions
   - Include negative cases: what should NOT happen
   - Consider performance, security, accessibility where relevant

4. **Design test strategy**
   - Which behaviors need tests?
   - What edge cases must be covered?
   - What would a failure look like?

5. **Create actionable checklist**
   - Each item is independently completable
   - Order by dependencies (what must come first)
   - Include both code and test items

6. **Anticipate problems**
   - What could go wrong during implementation?
   - What dependencies might block you?
   - What's the riskiest part?

### If Research Gaps Found

If you discover you don't understand the problem well enough, **move backward**:

```bash
python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-understand
```

### When Ready

1. **Link and move**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py upstream TASK-XXX PLN-XXX
   python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-build
   ```

## EXIT_CRITERIA

- [ ] implementation_plan.md created
- [ ] Acceptance criteria are specific and testable
- [ ] Test strategy covers happy path AND edge cases
- [ ] Checklist is ordered by dependencies
- [ ] Another developer could execute this plan without clarification
- [ ] Task in Build column
