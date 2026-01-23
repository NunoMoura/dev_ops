---
description: Re-run phase with identical context
category: manual
---

# Retry Phase

Start new agent with same prompt. Previous artifacts preserved.

## Step 1: Identify Task

Identify the current in-progress task from the board.

## Step 2: Reset State (Optional)

If you need to restart the phase from scratch, move the task back to the previous column using the CLI:

```bash
node .dev_ops/scripts/devops.js move-task --id <TASK_ID> --column col-plan
```

Then move it back to `col-build` (or current phase) to restart the timer/state if needed.

## Step 2: Start New Agent

Launch new agent session with identical phase rule prompt.

## Step 3: Compare Outputs

Keep best artifacts or merge results from both attempts.

## Outputs

- New agent session with identical context
- Separate artifacts from each attempt (RES-001, RES-002)
- Best output selected or merged

**Note:** Use `/refine_phase` for directed feedback instead.
