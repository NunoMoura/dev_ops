---
description: Analyze project and generate tailored task backlog
category: automated
---

# Bootstrap Workflow

Initialize a project-specific task backlog using the context detected during installation.

## Step 1: Run Bootstrap

The bootstrap process reads the project context (stack, docs, tests) detected by the installer.

```bash
node .dev_ops/scripts/devops.js bootstrap
```

## Step 2: Verify Backlog

1. **Check the Board**: Verify tasks for Product, UX, Constraints, Architecture, and Rules.
2. **Understand the Plan**: Confirm detected stack matches project.

## Exit Criteria

- [ ] Bootstrap command executed successfully
- [ ] Backlog contains foundation tasks
- [ ] **No code or documentation has been modified manually** (Use the Board for that)
