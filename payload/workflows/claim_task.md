---
description: Claim a specific task or the next highest priority task.
category: automated
---

# Claim Task Workflow

Claim ownership of a task to start working on a phase.

## Inputs

- `input`: (Optional) Specific Task ID to claim (e.g., `TASK-123`).
- `phase`: (Optional) Phase to claim next task from.

## Step 1: Claim Task

```bash
# Claim specific task
node .dev_ops/scripts/devops.js claim-task --id <TASK_ID>
```

## Step 2: Read Skill

Read the appropriate phase skill:

- Understand → `.agent/skills/understand_phase/SKILL.md`
- Plan → `.agent/skills/plan_phase/SKILL.md`
- Build → `.agent/skills/build_phase/SKILL.md`
- Verify → `.agent/skills/verify_phase/SKILL.md`

## Outputs

- Task claimed (owner set)
- Task status updated to `in_progress`
- **NOTE**: Do NOT move the task to another column. The user will move it when ready.
