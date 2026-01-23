---
description: Claim a specific task or the next highest priority task.
category: automated
---

# Claim Task

Claim ownership of a task to start working on a phase. This is the entry point for each development phase in the User-as-PM workflow.

## User-as-PM Model

1. User opens a **new chat** for each phase
2. User runs `/claim TASK-XXX` to start the phase
3. Agent works autonomously (Ralf Wiggum loop) until exit criteria met
4. Agent notifies user: "Phase complete. Ready for review."
5. User reviews, approves, then opens new chat for next phase

## Inputs

- `input`: (Optional) Specific Task ID to claim (e.g., `TASK-123`). If empty, picks highest priority from Backlog.

## Step 1: Claim Task

Run the command:

```bash
node .dev_ops/scripts/devops.js claim-task --id <TASK_ID>
```

Or use VS Code command:

```xml
<vscode_command>devops.claimTask</vscode_command>
```

## Step 2: Read Skill

The agent should read the appropriate phase skill:

- Understand → `.agent/skills/understand_phase/SKILL.md`
- Plan → `.agent/skills/plan_phase/SKILL.md`
- Build → `.agent/skills/build_phase/SKILL.md`
- Verify → `.agent/skills/verify_phase/SKILL.md`

## Outputs

- Task claimed (owner set)
- Task status updated to `agent_active`
