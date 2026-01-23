---
description: Reset the current phase and start over (Ralph Wiggum Loop)
category: Maintenance
---

# Retry Phase Workflow

This workflow enables the "Ralph Wiggum Loop" - a mechanism to reset the current phase's progress and try again from a clean state.

## Step 1: Identify Failure

Determine the reason for the need to retry.

- **Input**: Error message, test failure, or user instruction.
- **Context**: Current phase (e.g., Build, Verify).

## Step 2: Clean Up

Remove artifacts or changes specific to the failed attempt.

- Revert uncommitted changes in git.
- Reset `task.md` status for the current phase items.
- Archive or clear the current `implementation_plan.md` if it was the source of failure.

## Step 3: Re-Contextualize

Re-read the `SPEC.md` and input requirements to ensure a fresh understanding.

## Step 4: Plan Again

Restart the phase workflow from the beginning.

- **Action**: Call the `devops.startAgentSession` or manually trigger the phase skill.

## Step 5: Execute

Begin the phase execution again with the corrected approach.
