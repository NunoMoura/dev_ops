---
activation_mode: Always On
description: Core DevOps behavioral invariants
---

# DevOps Framework

> **Quality over speed. Understand before you build.**

## Phase Flow

```text
Backlog → Understand → Plan → Build → Verify → Done
```

| Phase | Key Question |
|-------|--------------|
| Understand | Do I fully grasp the problem? |
| Plan | Could another dev build this from my plan? |
| Build | Would I be proud to ship this? |
| Verify | Have I proven correctness? |

## Session Model

- One session = one phase
- End with `notify_user` at exit criteria
- User triggers `/next_phase` or `/retry_phase`

## Movement Rules

- **Forward**: Complete exit criteria → next phase
- **Backward**: Missing context or research → return to earlier phase
- **Create task for blockers**: Unrelated issues become new tasks

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-understand --commit
```

## Quality Standards

**Code**: Production-ready, handles errors, tested behavior
**Docs**: Accurate, actionable, current
**Decisions**: Documented in ADRs with rationale

## Task Structure

> TASK = pointer, not content

Tasks reference docs (`trigger`, `upstream`), not duplicate them.
