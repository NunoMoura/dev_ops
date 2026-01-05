---
description: Generate project-specific rules and constitution
---

# Bootstrap

Run ONCE after initialization to generate customized rules.

## Step 1: Detect Stack

```bash
python3 .dev_ops/scripts/project_ops.py detect --target .
```

This shows detected languages, linters, libraries, and databases.

## Step 2: Generate Rules

For each detected item, read the corresponding template in `.dev_ops/templates/rules/`:

- **Languages** → `languages.md`
- **Linters** → `linters.md`
- **Libraries** → `libraries.md`
- **Databases** → `databases.md`

Create customized rules in `.agent/rules/` (or `.cursor/rules/` for Cursor).

### Rule Naming

- `language_<name>.md` (e.g., `language_python.md`)
- `linter_<name>.md` (e.g., `linter_ruff.md`)
- `library_<name>.md` (e.g., `library_fastapi.md`)
- `database_<name>.md` (e.g., `database_postgresql.md`)

## Step 3: Create Constitution

Read template: `.dev_ops/templates/docs/constitution.md`

Create `.dev_ops/docs/constitution.md` customized for this project:

- Project architecture
- Technical decisions
- Development workflow
- Testing approach

## Expected Output

```text
.agent/rules/
├── language_*.md
├── linter_*.md
├── library_*.md
└── database_*.md

.dev_ops/docs/
└── constitution.md
```
