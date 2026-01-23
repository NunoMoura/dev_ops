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
2. **Create** SPEC.md files in component folders (co-located documentation).
3. **Generate** rules for the detected stack.

## Step 2: Verify SPEC.md Files

Check that SPEC.md files exist in code folders:

```bash
find . -name SPEC.md
```

## Step 3: Review Generated Rules

Rules are generated from templates based on detected stack. Templates are in:

```markdown
.dev_ops/templates/rules/
├── languages.md   # Language-specific rules (Python, TypeScript, etc.)
├── libraries.md   # Framework rules (React, FastAPI, etc.)
├── databases.md   # Database rules (PostgreSQL, MongoDB, etc.)
├── linters.md     # Linter configuration (ESLint, Ruff, etc.)
```

Generated rules are installed to:

- Antigravity: `.agent/rules/`
- Cursor: `.cursor/rules/`

## Step 4: Verify Backlog Generation

The bootstrap process should have populated your board with tasks:

1. **Check the Board**: Verify tasks for:
   - **Product Definition**: Define requirements
   - **User Experience**: Define personas & stories
   - **Project Constraints**: Define project standards
   - **Architecture**: Review and fill SPEC.md files
   - **Rules**: Review generated rules

2. **Understand the Plan**: Confirm detected stack matches project.

## Exit Criteria

- [ ] Bootstrap command executed successfully
- [ ] SPEC.md files created in component folders
- [ ] Rules generated for detected stack (check `.agent/rules/` or `.cursor/rules/`)
- [ ] Backlog contains foundation tasks
- [ ] **No code or documentation has been modified manually** (Use the Board for that)
