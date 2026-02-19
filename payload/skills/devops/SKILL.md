---
name: devops
description: Orchestrates full-lifecycle software development (Understand -> Plan -> Implement -> Verify -> Done). Use when the user asks to "start a task", "fix a bug", "implement a feature", or manages the project board. Handles task creation, state management, and code delivery.
license: MIT
metadata:
  author: Nuno Moura
  version: 1.0.0
  category: productivity
  tags: [devops, workflow, automation, agent-driven]
  documentation: https://github.com/NunoMoura/dev_ops
---

# DevOps Workflow

> Full lifecycle management: Understand → Plan → Implement → Verify → Done

## Phase Overview

| Phase | Triggers | Deliverable | Full Guide |
|-------|----------|-------------|------------|
| Understand | "analyze", "research", "investigate" | `RES-XXX` artifact | [Details](./references/phase_understand.md) |
| Plan | "create plan", "design", "break down" | Updated `SPEC.md` + Tasks | [Details](./references/phase_plan.md) |
| Implement | "implement", "write code", "fix bug" | Working code + tests | [Details](./references/phase_implement.md) |
| Verify | "verify", "run tests", "check quality" | `walkthrough.md` + PR | [Details](./references/phase_verify.md) |
| Done | "ship", "finish", "complete" | Merged PR | [Details](./references/phase_done.md) |

---

## Storage Rules

> **Artifacts** are task-scoped and ephemeral. **Docs** are project-scoped and persistent.

### Decision Trace (`decision_trace.md`)

Each task has a `decision_trace.md` in `.dev_ops/tasks/TASK-XXX/` that accumulates across phases:

| When | Action |
|------|--------|
| Starting any phase | **Read** `decision_trace.md` for prior decisions |
| Completing a phase | **Append** key decisions, rationale, and blockers |
| Rework/bugfix | Read both `decision_trace.md` and previous artifacts |

This is NOT context (provided by phase artifacts, docs, and specs).
This IS the agent's cross-session memory of *why* decisions were made.

### Artifacts

| Type | Prefix | Storage | Lifecycle |
|---|---|---|---|
| **Research** | RES-XXX | `.dev_ops/tasks/TASK-XXX/` | Ephemeral (One-time) |
| **Plan** | PLN-XXX | `.dev_ops/tasks/TASK-XXX/` | Ephemeral (One-time) |
| **Spec** | SPEC.md | `src/component/SPEC.md` | **Persistent** (Source of Truth) |

> **Note**: `decision_trace.md` is the persistent memory of the task journey.

| Type | Storage Path | Lifecycle | Templates |
|------|-------------|-----------|-----------|
| **Docs** | `.dev_ops/docs/` | Persistent — survives task lifecycle | `prd.md`, `feature.md`, `persona.md`, `story.md`, `mockup.md`, `project_standards.md` |
| **Bugs** | `.dev_ops/docs/` | Persistent — tracked independently | `bug.md` |
| **Specs** | Next to the component they describe | Persistent — updated as component evolves | `spec.md` |
| **Tasks** | `.dev_ops/tasks/TASK-XXX/` | Ephemeral — created by CLI | `task.md` |

> **Important**: Look at the `storage` field in each template's frontmatter.
>
> * **Docs** (`.dev_ops/docs/`): PRD, Feature, Persona, Story, Mockup, Standards, Bug
> * **Specs** (next to component): `SPEC.md` lives alongside the code it describes — like a README
> * **Artifacts** (`.dev_ops/tasks/TASK-XXX/`): Research, Plan
>
> **ALWAYS** create the file at the path specified in the template's `storage` field.

---

## Phase: Understand

> Know more about the problem than the person who wrote the trigger doc.

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read `SPEC.md` Metadata (Headers) | Read full implementation files (>100 lines) |
| Web/external research | Write any code |
| Create `RES-XXX` artifact | Move to Plan without `RES-XXX` |

**Steps**: Locate specs → Read headers → Define scope → External research → Create `RES-XXX`

**Deliverable**: `RES-XXX` in `.dev_ops/tasks/TASK-XXX/`
**Template**: [research.md](./assets/research.md) · **Full guide**: [phase_understand.md](./references/phase_understand.md)

---

## Phase: Plan

> "The Spec is the Truth."

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Update `SPEC.md` | Write Implementation Code |
| Create Child Tasks | Update sub-component `SPEC.md` (Delegate!) |
| Define Verification Strategy | Skip creating/updating `SPEC.md` |

**Steps**: Read spec headers → Analyze hierarchy → Update local `SPEC.md` → Decompose (delegate) → Review leaf vs node

**Deliverable**: Updated `SPEC.md` + Child Tasks
**Create sub-tasks**: `node .dev_ops/scripts/devops.js create-task --title "..." --parent-id TASK-XXX`
**Full guide**: [phase_plan.md](./references/phase_plan.md) · **Rules**: [decomposition_rules.md](./references/decomposition_rules.md)

### Task Composition

> **Checklist items** = steps within one agent session. **Sub-tasks** = independent work items with their own pipeline.

| Concept | When | CLI |
|---------|------|-----|
| Checklist item | Step done in one phase by one agent | Edit task card directly |
| Sub-task | Step needs its own Understand→Verify cycle | `create-task --parent-id TASK-XXX` |

When `--parent-id` is used: child gets `parentId` set, parent gets a tracking checklist entry, parent is auto-blocked. Parent unblocks when all children reach Done.

### Task Management (Agent Capabilities)

The agent can manage tasks using the following CLI commands:

| Action | Command | Description |
|--------|---------|-------------|
| **Update** | `update-task --id <id> ...` | Update title, summary, status, or checklist. |
| **Read** | `read-task --id <id>` | Get full task details as JSON. |
| **List** | `list-tasks --status <status>` | List tasks, optionally filtered by status/column. |

**Full Examples**:

* [Task Management](./examples/task_management.md) — Creating, updating, and managing tasks.
* [Product Documentation](./examples/product_docs.md) — PRD, Feature, Persona, User Stories, Mockups.
* [Technical Artifacts](./examples/technical_artifacts.md) — Implementation Plans, Specs, Bug Reports, Tasks.
* [Process Documentation](./examples/process_docs.md) — Project Standards, PR Templates.

---

## Phase: Implement

> "I'm helping!" — Ralph Wiggum (Autonomous Mode)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Write Code & Tests | Deviate from `SPEC.md` |
| Read `SPEC.md` + `RES-XXX` | Plan new features |
| Run Tests | Ignore broken tests |

**Steps**: Read spec → TDD build → Run tests → Self-review → Stop (allow review)

**Deliverable**: Working code matching `SPEC.md`
**Full guide**: [phase_implement.md](./references/phase_implement.md) · **Testing**: [testing_guide.md](./references/testing_guide.md)

---

## Phase: Verify

> "Trust, but Verify."

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Run tests | Make code changes (except minor fixes) |
| Create `walkthrough.md` | Add new features |
| Create PR | Submit without proof |

**Steps**: Run tests → SPEC integrity check → Create walkthrough → Create PR

**Deliverable**: `walkthrough.md` + PR
**Detect tests**: `node .dev_ops/scripts/devops.js detect --scope tests`
**Template**: [walkthrough_template.md](./assets/walkthrough_template.md) · **Full guide**: [phase_verify.md](./references/phase_verify.md)

---

## Phase: Done

> "Real artists ship."

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| `git commit`, `git push` | Code Changes (except cleanup) |
| `gh pr create` | Start new task without cleaning up |

**Steps**: Check walkthrough exists → Commit & push → Create PR → Handle feedback → Move task to Done → Clean up

**Deliverable**: Merged PR
**Move task**: `node .dev_ops/scripts/devops.js move-task --id TASK-XXX --column col-done`
**Full guide**: [phase_done.md](./references/phase_done.md) · **Checklist**: [shipping_checklist.md](./references/shipping_checklist.md)

---

## Spec Lifecycle

> `SPEC.md` files are the **source of truth** for a component. They live next to the code they describe, like a README.

| Trigger | Action | Phase |
|---------|--------|-------|
| New component or module introduced | Create `SPEC.md` from template next to the component | Plan |
| Requirements change for existing component | Update the existing `SPEC.md` | Plan |
| Code written to match spec | No spec change — spec is already the truth | Implement |
| Code diverges from spec | Fix the code, not the spec (unless Plan approved a change) | Implement |
| Verify that code matches spec | Review spec sections; bump `lastUpdated` | Verify |

**Discover all specs**: `node .dev_ops/scripts/devops.js detect --scope architecture`

**Find nearest spec for a path**: `node .dev_ops/scripts/devops.js scope <path>`

**Create a new spec**: Use the `/create-spec` workflow or copy from [spec.md](./assets/spec.md)

---

## Rules & References

* [Decomposition Rules](./references/decomposition_rules.md) — Node vs Leaf task splitting
* [Research Patterns](./references/research_patterns.md) — Scoping and structuring research
* [Testing Guide](./references/testing_guide.md) — TDD and common test issues
* [Verification Guide](./references/verification_guide.md) — Manual & security checklists
* [Shipping Checklist](./references/shipping_checklist.md) — Final checks before closure

## Examples

### Research (Understand)

User says: "Research how to add input validation to our API"
→ Locate specs, check existing patterns, research libraries, create `RES-042`.
[Full example](./examples/research_doc.md)

### Verification (Verify)

User says: "Verify the login bug is fixed"
→ Run tests, check SPEC compliance, create walkthrough, create PR.
[Full example](./examples/walkthrough.md)

## Troubleshooting

### "Which phase am I in?"

Check the task's column on the DevOps Board. Each column maps to a phase.

### "Spec too vague to implement"

Return to **Plan** or **Understand** phase. Mark task as `needs_feedback`.

### "Tests pass but behavior is wrong"

Check `SPEC.md` for ambiguity. If unclear, go back to **Plan** or **Understand**.

### "PR checks failed"

Return to **Implement** or **Verify** to fix CI issues before shipping.

### Skill Not Triggering

* **Symptom**: Agent doesn't use `devops` tool when asked to "start a task".
* **Solution**: Ensure you are using keywords like "task", "project", "plan", or "implement". explicit requests like "use devops skill" also work.

### Task Update Failed

* **Symptom**: `update-task` fails with "Task not found".
* **Solution**: Verify the `TASK-XXX` ID exists using `./scripts/list-tasks.sh`.

### Context Limit Reached

* **Symptom**: Agent complains about too much output from `read-task`.
* **Solution**: Use specific fields if possible, or break down the task if the checklist is too long.
