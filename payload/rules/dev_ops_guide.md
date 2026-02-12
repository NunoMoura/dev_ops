---
activation_mode: Always On
description: Core DevOps behavioral invariants
---

# DevOps Framework

> **Document-first. Quality over speed. Understand before you build.**

## Phase Guard (MANDATORY)

> [!CAUTION]
> **Before ANY work on a task, you MUST:**
>
> 1. Get phase from task JSON (`phase` field)
> 2. Read `.agent/skills/{phase}/SKILL.md` completely
> 3. Note the **Phase Constraints** table (allowed/forbidden actions)
> 4. Note the **Required Deliverable** for this phase
> 5. Only then proceed with phase-appropriate actions
>
> **Skipping this = phase violation. STOP and read the skill first.**
>
> **Task Descriptions vs Phase Constraints:**
>
> 1. **Declarative vs Imperative**:
>    * Tasks define **WHAT** (Goal/Deliverable).
>    * Skills define **HOW** (Steps/Process).
>
> 2. **Phase Supremacy**:
>    * If a task description contains imperative steps (e.g., "Step 1: Create file X") that conflict with the Phase Skill (e.g., "Understand Phase = Research only"), the **Phase Skill WINS**.
>    * Ignore the specific steps in the task and follow the Phase Skill's process to achieve the goal.

### IDE Mode Behavior

| Mode | Behavior |
|------|----------|
| **Plan Mode** | Break down all steps to achieve phase deliverable, present plan for approval before execution |
| **Fast Mode** | Jump directly to creating phase artifacts and completing exit criteria |

### Phase Violations

If you find yourself:

* Opening code files in Understand/Plan → **STOP**, read skill constraints
* Writing code before Implement phase → **STOP**, wrong phase
* Skipping required deliverable → **STOP**, phase incomplete

---

## Phase Flow

```text
Understand → Plan → Implement → Verify → Done
```

| Phase | Works With | Code Access | Deliverable |
|-------|------------|-------------|-------------|
| Understand | SPEC.md + Research | ❌ None | RES-XXX |
| Plan | SPEC.md + RES-XXX | ❌ None | PLN-XXX |
| Implement | Code + PLN-XXX | ✅ Write | Code + Tests |
| Verify | Tests + SPEC.md | ✅ Minor fixes | walkthrough.md + PR |

| Understand | Do I fully grasp the problem? | `understand` |
| Plan | Could another dev build this from my plan? | `plan` |
| Implement | Would I be proud to ship this? | `implement` |
| Verify | Have I proven correctness? | `verify` |

---

## Project Structure

| Path | Purpose |
|------|---------|
| `.dev_ops/docs/` | Architecture, Specs |
| `.dev_ops/docs/ux/mockups/` | UI/UX Designs |
| `.dev_ops/tasks/TASK-XXX/` | Task metadata + phase artifacts (RES-XXX, PLN-XXX) |
| `.dev_ops/templates/` | Document templates |

---

## Core Philosophy

SPEC.md → Code → Verify loop:

* SPEC.md files define requirements
* Code matches specs
* Verify confirms the match

---

## Session Model

* One agent session = one phase
* Iterate autonomously until exit criteria met (Ralf Wiggum loop)
* End with `notify_user` when phase complete
* User reviews → new session for next phase

---

## Movement Rules

| Direction | When |
|-----------|------|
| **Forward** | Exit criteria complete |
| **Backward** | Missing context → return to earlier phase |
| **New Task** | Unrelated issues → `/create_task` |

---

## SPEC.md Navigation

1. **Discover**: `find . -name SPEC.md`
2. **Filter**: `grep -r "keyword" */SPEC.md`
3. **Drill**: Read specific SPEC.md for details
4. **Implement**: Only open code files in Implement phase

### SPEC Maintenance (Implement Phase Only)

* Missing SPEC.md → create from template
* Adding folder/file → add to `## Structure`
* Making decision → add ADR row
* Adding export → add to `## Key Exports`

---

## Quality Standards

| Area | Standard |
|------|----------|
| Code | Production-ready, error handling, tested |
| Docs | Accurate, actionable, current |
| Decisions | Documented in ADRs |
| Activity | Log decisions to Decision Trace |

---

## Project Standards

Before significant changes, check `.dev_ops/docs/project_standards.md`:

* Constraints, Tech Stack, Patterns, Anti-Patterns

If work violates a standard → **stop and flag to user**.
