---
activation_mode: Always On
description: Core DevOps behavioral invariants
---

# DevOps Framework

> **Document-first. Quality over speed. Understand before you build.**

## Project Structure & Artifacts

- **Docs**: `.dev_ops/docs/` (Architecture, Specs)
- **Mockups**: `.dev_ops/docs/ux/mockups/` (UI/UX Designs)
- **Tasks**: `.dev_ops/tasks/` (JSON Metadata)
- **Context**: `.dev_ops/context/` (Markdown Notes per Task)
- **Templates**: `.dev_ops/templates/`

## Core Philosophy

SPEC.md files define requirements. Code matches specs. Verify confirms the match.

| Phase | Works With | Code Access |
|-------|------------|-------------|
| Understand | SPEC.md + Research | ❌ None |
| Plan | SPEC.md only | ❌ None |
| Build | Code + SPEC.md | ✅ Write to match spec |
| Verify | Tests + SPEC.md | ✅ Confirm match |

## Phase Flow

```text
Understand → Plan → Build → Verify → Done
```

| Phase | Key Question | Skill |
|-------|--------------|-------|
| Understand | Do I fully grasp the problem? | `understand` |
| Plan | Could another dev build this from my plan? | `plan` |
| Build | Would I be proud to ship this? | `build` |
| Verify | Have I proven correctness? | `verify` |

### Utility Workflow

| Workflow | Purpose | When to Use |
|----------|---------|-------------|
| `/create_task` | Create tasks for future work | When you discover bugs, features, or issues during any phase |

## SPEC.md Navigation (RLM Pattern)

Use RLM-style decomposition when exploring code:

1. **Discover**: `find . -name SPEC.md`
2. **Filter**: `grep -r "keyword" */SPEC.md`
3. **Drill**: Read specific SPEC.md for component details
4. **Implement**: Only open code files when details are needed (Build phase)

### Cross-SPEC Validation (Understand Phase)

- Check that `### Dependencies` links point to existing SPECs
- Verify interface compatibility (expected functions exist in dependent SPEC)

### SPEC Maintenance (Build Phase)

- If folder lacks SPEC.md, create from template
- If adding folder/file, add row to `## Structure` table
- If making decision, add ADR row
- If adding key export, add to `## Key Exports`

## Phase Entry

When entering a phase, **read the corresponding skill**:

```bash
# Skills are in .agent/skills/
view_file .agent/skills/<name>/SKILL.md
```

## Session Model (User-as-PM)

- One agent session = one phase
- Agent iterates autonomously (Ralf Wiggum loop) until exit criteria met
- End with `notify_user` when phase complete
- User reviews, then opens new chat + `/claim TASK-XXX` for next phase

## Movement Rules

- **Forward**: Complete exit criteria → next phase
- **Backward**: Missing context or research → return to earlier phase
- **Create task for blockers**: Unrelated issues become new tasks

## Quality Standards

**Code**: Production-ready, handles errors, tested behavior
**Docs**: Accurate, actionable, current
**Decisions**: Documented in ADRs with rationale
**Activity**: Agents MUST log key decisions in real-time to the Decision Trace


## Task Structure

> TASK = pointer, not content

Tasks reference docs (`trigger`, `upstream`), not duplicate them.

## Available Skills

| Skill | Purpose |
|-------|---------|
| `understand` | Deep research and scope definition |
| `plan` | Create implementation plan |
| `build` | TDD implementation |
| `verify` | Validation and PR creation |

## Project Standards

Before significant changes, check `.dev_ops/docs/project_standards.md` for:

- **Constraints**: Rules that cannot be violated
- **Tech Stack**: Locked technology decisions
- **Patterns**: Required architectural patterns
- **Anti-Patterns**: Explicitly forbidden practices

If work would violate a project standard, **stop and flag to user**.
