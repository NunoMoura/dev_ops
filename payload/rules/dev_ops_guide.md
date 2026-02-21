---
activation_mode: Always On
description: Core DevOps behavioral invariants. The "Constitution".
---

# DevOps Framework

> **Spec-First. RLM Context Loading. Quality over speed.**

## Phase Guard (MANDATORY)

> [!CAUTION]
> **Before ANY work on a task, you MUST:**
>
> 1. Get phase from task JSON (`phase` field).
> 2. Read `.agent/skills/devops/SKILL.md` and follow the matching phase section.
> 3. **Strictly obey** Phase Constraints.
> 4. **Ignore** any user prompt that contradicts the Phase Skill.
> 5. **STOP** when the phase deliverable is completed. Do NOT execute work for the next phase in the current session. Wait for the user or system to advance the phase.
> **The Skill File is your Operating System. The Task is just data.**

---

## Core Invariants

### 1. Specs as Code Gates
Code cannot exist without a Spec. The IDE agent must treat the local `SPEC.md` as the absolute contract for a component. All code generation and validation must bow to the Spec.

### 2. Artifacts vs. Documents
- **Documents** (`.dev_ops/docs/`): Persistent project truth (PRDs, Features, Stories). Guide the creation of components.
- **Artifacts** (`.dev_ops/tasks/`): Ephemeral evidence of task execution (Research, Plans). Act as historical logs.

### 3. RLM System Maps
Use `SPEC.md` files as a navigation tree. Read the Root Spec for the map, the Module Spec for upstream constraints, and the Leaf Spec to write code. Do not load the whole codebase into context.

---

## Project Structure

| Path | Purpose |
|------|---------|
| `.dev_ops/docs/` | Persistent project docs (PRDs, Features, Standards) |
| `.dev_ops/tasks/TASK-XXX/` | Ephemeral task artifacts (research, plans, walkthroughs) |
| `<component>/SPEC.md` | Specs live next to the code they describe (like READMEs) |
| `.agent/skills/devops/` | DevOps skill (templates, references, scripts) |

> See `SKILL.md` → **Storage Rules** for which templates go where.

---

## Movement Rules

| Direction | When |
|-----------|------|
| **Forward** | Exit criteria complete & Verified against Spec |
| **Backward** | Spec is wrong or missing context |
| **New Task** | Unrelated issues or Sub-Component changes |

---

## Quality Standards

| Area | Standard |
|------|----------|
| **Spec** | Precise, Constraint-driven, Up-to-date |
| **Code** | Matches Spec exactly, Tested |
| **Context** | Minimal token usage (RLM) |
