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

## Step 2: Understand the Project

Based on the bootstrap output and generated docs:

### If Brownfield (existing code)

1. Review key entry points.
2. Understand module structure.
3. Note which documentation is missing.
4. Check test coverage.
5. Review scaffolded architecture docs in `.dev_ops/docs/architecture/` -> **Start filling them in.**

### If Greenfield (new project)

1. Note intended technologies.
2. All docs will be missing — tasks will be created for them.

## Step 3: Architecture Docs (Post-Bootstrap)

The bootstrap command has already created the directory structure and placeholder files.

**For each generated `.md` file in `.dev_ops/docs/architecture/`:**

1. Analyze the corresponding codebase directory
2. Fill in Purpose, Overview, Public Interface sections
3. Document key files and dependencies

## Step 4: Verify Rules

The bootstrap command has already generated rules for your stack.

**Review and customize** the generated rules in `.agent/rules/` (or `.cursor/rules/`) if needed.

## Exit Criteria

- [ ] Detection completed
- [ ] Architecture docs populated (or tasks created)
- [ ] 5-10 context-aware tasks in backlog
- [ ] PRD task included (if missing)
- [ ] Non-Negotiables task included (if missing)
- [ ] Rules generated for detected stack
