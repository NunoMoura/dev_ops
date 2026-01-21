---
description: Re-run phase with identical context
category: manual
---

# Retry Phase

Start new agent with same prompt. Previous artifacts preserved.

## Step 1: Check Current Task

Use the board to see in-progress tasks:

```xml
<vscode_command>devops.filterTasks</vscode_command>
```

Or use:

```xml
<vscode_command>devops.retryPhase</vscode_command>
```

## Step 2: Start New Agent

Launch new agent session with identical phase rule prompt.

## Step 3: Compare Outputs

Keep best artifacts or merge results from both attempts.

## Outputs

- New agent session with identical context
- Separate artifacts from each attempt (RES-001, RES-002)
- Best output selected or merged

**Note:** Use `/refine_phase` for directed feedback instead.
