---
description: Claim a specific task or the next highest priority task.
category: automated
---

# Claim Task Workflow

Claim ownership of a task and enter its phase.

## Inputs

- `input`: (Optional) Specific Task ID to claim (e.g., `TASK-123`)
- `phase`: (Optional) Phase to claim next task from

---

## Step 1: Claim Task

```bash
node .dev_ops/scripts/devops.js claim-task --id <TASK_ID>
```

---

## Step 1.5: Check Dependencies

> [!WARNING]
> If the task has `dependsOn` entries, verify they are complete.

1. Check if task has `dependsOn` field with task IDs
2. If any dependency task is NOT `done` or `archived`:
   - List the blocking tasks
   - Consider working on blockers first
   - Use `--force` only for debugging/special cases

---

## Step 2: Read Phase from Task (MANDATORY)

> [!CAUTION]
> **DO NOT skip this step.**

1. Get task metadata (includes `phase` field)
2. Note the current phase: `understand`, `plan`, `build`, or `verify`

---

## Step 3: Read Phase Skill (MANDATORY)

> [!CAUTION]
> **DO NOT proceed without completing this step.**

Read the skill file for the task's phase:

```bash
view_file .agent/skills/{phase}/SKILL.md
```

Note from the skill:

- **Phase Constraints** table (allowed/forbidden actions)
- **Required Deliverable** for this phase
- **Exit Criteria** to complete the phase

---

## Step 4: Confirm Phase Context

Before any other action, state:

- Current phase: `{phase}`
- Required deliverable: `{artifact type from skill}`
- Key constraint: `{primary forbidden action}`

---

## Outputs

- Task claimed (owner set)
- Task status updated to `in_progress`
- Phase skill read and understood
- Ready to work within phase constraints

**NOTE**: Do NOT move the task to another column. User controls column position.
