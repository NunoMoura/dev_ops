---
description: Analyze project and generate tailored task backlog
category: automated
---

# Bootstrap Workflow

Initialize a project with context-aware tasks and SPEC.md documentation.

## Step 1: Run Bootstrap

Execute the bootstrap command:

```bash
# As User: Run "DevOps: Bootstrap Project" from Command Palette or run /bootstrap in the chat
# As Agent:
node .dev_ops/scripts/devops.js bootstrap
```

**This command will:**

1. **Analyze** the codebase (stack, docs, tests, patterns).
2. **Create Tasks** in the backlog for you to:
   - Configure project rules (customized for your stack).
   - Document system architecture (migrating or creating SPECs).

## Step 2: Verify Backlog Generation

The bootstrap process should have populated your board with tasks:

1. **Check the Board**: Verify tasks for:
   - **Product Definition**: Define requirements
   - **User Experience**: Define personas & stories
   - **Project Constraints**: Define project standards
   - **Architecture**: Document System Architecture (using templates)
   - **Rules**: Configure Project Rules (using templates)

2. **Understand the Plan**: Confirm detected stack matches project.

## Exit Criteria

- [ ] Bootstrap command executed successfully
- [ ] Backlog contains foundation tasks
- [ ] **No code or documentation has been modified manually** (Use the Board for that)
