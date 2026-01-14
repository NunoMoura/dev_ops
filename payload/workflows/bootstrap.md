---
description: Analyze project and generate tailored task backlog
---

# Bootstrap Workflow

Initialize a project with context-aware tasks and rules.

## Step 1: Run Detection

Analyze the codebase (use `--help` for options):

```bash
python3 .dev_ops/scripts/project_ops.py detect --help
```

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

1. Review key entry points from `patterns.entry_points`
2. Understand module structure from `patterns.common_dirs`
3. Note which documentation is missing from `docs`
4. Check test coverage from `tests`
5. Review scaffolded architecture docs in `.dev_ops/docs/architecture/`

### If Greenfield (new project)

1. Note intended technologies from `stack`
2. All docs will be missing — tasks will be created for them

## Step 3: Populate Architecture Docs

The installer creates placeholder docs in `.dev_ops/docs/architecture/`.

**For each generated `.md` file:**

1. Analyze the corresponding codebase directory
2. Fill in Purpose, Overview, Public Interface sections
3. Document key files and dependencies

**If project is large (>10 components):**

- Create tasks for documenting each major subsystem
- Focus on high-level architecture first

## Step 4: Generate Task Backlog

Check `docs` from detection. Create tasks for missing items (use `--help` for options):

```bash
python3 .dev_ops/scripts/board_ops.py create_task --help
```

### Required Framework Tasks

| Missing Doc | Task to Create |
|-------------|----------------|
| `docs.prd = null` | "Create Product Requirements Document" |
| `docs.constitution = null` | "Define Project Constitution" |
| `docs.architecture = null` | "Document System Architecture" |

Example:

```bash
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Create PRD" \
  --summary "Define product vision, personas, and requirements" \
  --priority high \
  --commit
```

### Project-Specific Tasks

Based on audit, create 3-5 additional tasks:

- "Document [undocumented module]"
- "Add unit tests for [untested component]"
- "Set up CI/CD pipeline" (if `tests.ci_configured = false`)

## Step 5: Generate Rules

Create rules for detected technologies (use `--help` for options):

```bash
python3 .dev_ops/scripts/project_ops.py generate-rules --help
```

```bash
python3 .dev_ops/scripts/project_ops.py generate-rules --target .
```

This creates rules in `.agent/rules/` for:

- Detected languages (e.g., `languages/python.md`)
- Detected linters (e.g., `linters/ruff.md`)

**Review and customize** the generated rules.

## Exit Criteria

- [ ] Detection completed
- [ ] Architecture docs populated (or tasks created)
- [ ] 5-10 context-aware tasks in backlog
- [ ] PRD task included (if missing)
- [ ] Constitution task included (if missing)
- [ ] Rules generated for detected stack
