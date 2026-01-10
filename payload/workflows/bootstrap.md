---
description: Analyze project and generate tailored task backlog
category: guided
---

# Bootstrap - Project Setup & Task Generation

Run this workflow once to analyze your project and generate a tailored task backlog.

## Step 1: Run Detection

Execute the detection script to analyze the codebase:

```bash
python3 .dev_ops/scripts/project_ops.py detect --target . --format json
```

**Read the output carefully.** It contains:

- **stack**: Languages, frameworks, linters, databases
- **docs**: Which DevOps docs exist (PRD, architecture, constitution)
- **tests**: Test framework, CI status
- **patterns**: Common files and directories

## Step 2: Understand the Project

Based on detection results:

### If Brownfield (existing code)

1. Review key entry points (main.py, src/index.ts, etc.)
2. Understand the module structure from `patterns.common_dirs`
3. Note which documentation is missing from `docs`
4. Check test coverage from `tests`
5. **Review scaffolded architecture docs** in `.dev_ops/docs/architecture/`
   - The installer has auto-generated a `.md` file for each directory
   - Your job is to populate these files with actual documentation

### If Greenfield (new project)

1. Note the intended technologies from `stack`
2. All docs will be missing - tasks will be created for them

## Step 3: Populate Architecture Documentation

The installer has created placeholder architecture docs in `.dev_ops/docs/architecture/`.

**For each generated `.md` file:**

1. Analyze the corresponding codebase directory
2. Fill in the Purpose, Overview, Public Interface sections
3. Document key files and dependencies
4. Add implementation notes

**If the project is large (>10 components):**

- Create tasks in the backlog for documenting each major subsystem
- Focus on high-level architecture first, details can be tasked later

## Step 4: Generate Task Backlog

Create tasks using the **task template** format. Reference: `.dev_ops/templates/artifacts/task.md`

### Required Framework Tasks

Check `docs` from detection. Create tasks for any missing:

| Missing Doc | Task to Create |
|-------------|----------------|
| `docs.prd = null` | "Create Product Requirements Document (PRD)" |
| `docs.constitution = null` | "Define Project Constitution (non-negotiables)" |
| `docs.architecture = null` | "Document System Architecture" |

### Create Tasks

Use the board_ops script with proper task fields:

```bash
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Create PRD" \
  --summary "Define product vision, personas, and requirements" \
  --priority high \
  --commit
```

> [!IMPORTANT]
> Each task must have:
>
> - **title**: Short, actionable description
> - **summary**: Clear scope of what needs to be done
> - **priority**: high | medium | low

### Project-Specific Tasks

Based on your audit, create 3-5 additional tasks such as:

- "Document [undocumented module]"
- "Add unit tests for [untested component]"
- "Set up CI/CD pipeline" (if `tests.ci_configured = false`)
- "Improve README" (if `docs.readme = minimal`)

## Step 4: Customize Rules

Using the `stack` from detection:

1. **Read templates**: `.dev_ops/templates/rules/*.md`
2. **For each detected stack item**, create a rule in `.agent/rules/`:
   - Languages: `language_python.md`, `language_typescript.md`
   - Linters: `linter_eslint.md`, `linter_ruff.md`
3. **Use globs** from detection for activation patterns

## Output Checklist

At the end of bootstrap, verify:

- [ ] 5-10 context-aware tasks created in board
- [ ] PRD task included (if PRD missing)
- [ ] Constitution task included (if missing)
- [ ] Architecture task included (if missing)
- [ ] Rules customized for detected stack

**Next step:** User reviews generated tasks, then claims first task with `/claim`
