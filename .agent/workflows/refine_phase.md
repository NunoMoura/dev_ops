---
description: Generate refinement prompt with PM feedback
category: automated
---

# Refine Phase

Generate structured prompt with context + PM feedback for agent refinement.

## Step 1: Enter Feedback

Use the VS Code command:

```xml
<vscode_command>devops.refinePhase</vscode_command>
```

Or click "Refine Phase" in the DevOps sidebar.

## Step 2: Paste Prompt

Copy the generated prompt into a new agent session.

## Outputs

- Structured prompt (copied to clipboard)
- Task `refinementCount` incremented
- Feedback stored in `refinementHistory`
