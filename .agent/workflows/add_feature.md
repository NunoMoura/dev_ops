---
description: Create feature spec and decompose into tasks
category: guided
---

# Add Feature

Create FEAT-XXX and decompose into backlog tasks.

**Templates available:**

- `.dev_ops/templates/docs/feature.md` - Feature specification
- `.dev_ops/templates/docs/story.md` - User story format
- `.dev_ops/templates/docs/persona.md` - User persona format
- `.dev_ops/templates/docs/mockup.md` - UI mockup documentation

## Step 1: Create Feature Doc

```bash
cp .dev_ops/templates/docs/feature.md .dev_ops/docs/FEAT-XXX.md
```

## Step 2: Fill Sections

Complete the feature document: Summary, User Stories, Acceptance Criteria, Technical Notes

## Step 3: Decompose to Tasks

Create one task per acceptance criterion using the VS Code command:

```xml
<vscode_command>devops.createTask</vscode_command>
```

Reference the feature in the task summary:

```markdown
Trigger: FEAT-XXX
```

## Outputs

- `.dev_ops/docs/FEAT-XXX.md`
- TASK-XXX items in Backlog
