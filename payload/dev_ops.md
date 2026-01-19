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

| Phase | Key Question | Skill |
|-------|--------------|-------|
| Backlog | Have I claimed and read the trigger? | `backlog_phase` |
| Understand | Do I fully grasp the problem? | `understand_phase` |
| Plan | Could another dev build this from my plan? | `plan_phase` |
| Build | Would I be proud to ship this? | `build_phase` |
| Verify | Have I proven correctness? | `verify_phase` |

## Phase Entry

When entering a phase, **read the corresponding skill**:

```bash
# Skills are in .agent/skills/
view_file .agent/skills/<phase>_phase/SKILL.md
```

Each skill contains:

- Detailed instructions for the phase
- Commands to run
- Examples in the `examples/` subdirectory
- Exit criteria checklist

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

## Available Skills

| Skill | Purpose |
|-------|---------|
| `backlog_phase` | Claim task and read trigger |
| `understand_phase` | Deep research and scope definition |
| `plan_phase` | Create implementation plan |
| `build_phase` | TDD implementation |
| `verify_phase` | Validation and PR creation |
| `bootstrap_project` | Initialize project and generate tasks |
| `explain_codebase` | Explain code structure |

## Non-Negotiables

Before significant changes, check `.dev_ops/docs/nonnegotiables.md` for:

- **Constraints**: Rules that cannot be violated
- **Tech Stack**: Locked technology decisions
- **Patterns**: Required architectural patterns
- **Anti-Patterns**: Explicitly forbidden practices

If work would violate a non-negotiable, **stop and flag to user**.
