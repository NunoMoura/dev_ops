---
description: Generate project-specific rules and constitution after initialization
---

# Bootstrap DevOps Framework

Run this **ONCE** after initialization to generate project-specific rules.

## Step 1: Detect Project Stack

Run the detection script to analyze your project:

```bash
python3 installer/project_ops.py detect --target .
```

This will show detected languages, linters, and frameworks.

## Step 2: Generate Rules (Manual Agent Task)

Using the detection output above, generate rules in `.agent/rules/`:

1. For each detected **language**, read `payload/templates/rules/languages.md`
2. For each detected **linter**, read `payload/templates/rules/linters.md`
3. For each detected **library**, read `payload/templates/rules/libraries.md`

Create files following the template instructions:
- Naming: `language_<name>.md`, `linter_<name>.md`, `library_<name>.md`
- Include proper frontmatter (activation_mode, name, globs)
- Customize based on actual project patterns
- Reference real files and conventions

## Step 3: Create Constitution

Read the constitution template:

```bash
cat payload/templates/docs/constitution.md
```

Create `.dev_ops/docs/constitution.md` customized for this project:
- Project size and architecture
- Observable technical decisions
- Development workflow patterns
- Testing and deployment approach

## Expected Output

```markdown
.agent/rules/
├── language_*.md      (per detected language)
├── linter_*.md        (per detected linter)
└── library_*.md       (per detected framework)

.dev_ops/docs/
└── constitution.md    (project governance)
```

## Validation

- All rules have proper frontmatter
- Globs match actual project files
- Constitution reflects real decisions
- No placeholder text remains
