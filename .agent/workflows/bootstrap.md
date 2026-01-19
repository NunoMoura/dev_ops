---
description: Analyze project and generate tailored task backlog
---

# Bootstrap Workflow

Initialize a project with context-aware tasks and rules.

## Step 1: Run Bootstrap

Execute the bootstrap command to automatically detect stack, scaffold docs, and generate rules:

```bash
# As User: Run "DevOps: Bootstrap Project" from Command Palette
# As Agent:
<vscode_command>devops.bootstrap</vscode_command>
```

**This command will:**

1. **Analyze** the codebase (stack, docs, tests, patterns).
2. **Scaffold** architecture documentation in `.dev_ops/docs/architecture`.
3. **Generate** rules in `.agent/rules` (or `.cursor/rules`) for the detected stack.

## Step 2: Verify Backlog Generation

The bootstrap process should have populated your board with tasks. **Do not execute these tasks now.**

1. **Check the Board**: Verify that tasks have been created for:
   - **Architecture Documentation**: A task to fill in the scaffolded `.dev_ops/docs/architecture/*.md` files.
   - **Project Rules**: A task to review and customize the generated rules in `.agent/rules`.
   - **Product Definition**: Tasks for "Create PRD" and "Create Non-Negotiables" (if missing).

2. **Understand the Plan**:
   - Review the generated backlog.
   - Confirm that the detected technology stack matches the project (check generated rules).

## Exit Criteria

- [ ] Bootstrap command executed successfully
- [ ] Architecture documentation scaffolded (empty placeholders created)
- [ ] Rules generated for the detected stack
- [ ] Backlog contains tasks for filling documentation and customizing rules
- [ ] **No code or documentation has been modified manually in this step** (Use the Board for that)
