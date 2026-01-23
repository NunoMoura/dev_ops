---
description: Iteratively improve work based on feedback (Ralph Wiggum Loop)
category: Maintenance
---

# Refine Phase Workflow

This workflow enables the "Ralph Wiggum Loop" - an iterative process where the agent refines its work based on feedback or self-reflection without changing the overall phase.

## Step 1: Analyze Feedback

If provided with user feedback or a specific instruction, analyze it against the current state of the task.

- **Input**: Feedback string or file path.
- **Context**: Current `task.md`, `implementation_plan.md`, or codebase state.

## Step 2: Update Artifacts

Refine the relevant artifacts to reflect the feedback.

- If the plan is flawed, update `implementation_plan.md`.
- If the code is incorrect, update the source files.
- If the task list is incomplete, update `task.md`.

## Step 3: Verify Refinements

Run necessary verifications (tests, linters) to ensure the refinements didn't break existing functionality.

## Step 4: Report Status

Notify the user of the refinements made.

- **Summary**: Concise list of changes.
- **Status**: Updated status of the task.

## Step 5: Loop or Exit

- If more refinement is needed, stay in the current phase.
- If satisfied, wait for user confirmation or proceed to the next phase.
