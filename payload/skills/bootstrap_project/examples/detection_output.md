# Bootstrap Detection Output Example

Example output from running detection on a TypeScript/Python project:

```json
{
  "project_type": "brownfield",
  "stack": {
    "languages": ["typescript", "python"],
    "frameworks": ["express", "pytest"],
    "linters": ["eslint", "ruff"],
    "databases": ["postgresql"],
    "package_managers": ["npm", "pip"]
  },
  "docs": {
    "readme": "comprehensive",
    "prd": null,
    "constitution": null,
    "architecture": "partial",
    "existing_docs_folder": "docs/"
  },
  "tests": {
    "framework": ["jest", "pytest"],
    "coverage": 45,
    "ci_configured": true
  },
  "patterns": {
    "common_dirs": ["src/", "tests/", "scripts/"],
    "entry_points": ["src/index.ts", "src/main.py"],
    "config_files": ["tsconfig.json", "pyproject.toml", ".eslintrc"]
  }
}
```

## Interpretation

### What This Tells Us

1. **Brownfield project** - Existing codebase to understand
2. **Dual-stack** - Both TypeScript and Python code
3. **Missing docs** - No PRD or constitution → Create tasks for these
4. **Partial architecture** - Some docs exist in `docs/` → Migration task needed
5. **Low coverage** - 45% test coverage → Testing tasks recommended

### Tasks to Create

Based on this output:

```bash
# Required framework tasks
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Create PRD" \
  --summary "Define product vision and requirements" \
  --priority high --commit

python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Define Constitution" \
  --summary "Document non-negotiable constraints" \
  --priority high --commit

python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Migrate existing docs" \
  --summary "Move content from docs/ to .dev_ops/docs/architecture/" \
  --priority high --commit

# Project-specific tasks
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Improve test coverage" \
  --summary "Increase coverage from 45% to 80%" \
  --priority medium --commit
```

### Rules to Generate

```bash
python3 .dev_ops/scripts/project_ops.py generate-rules --target .
```

Will create:
- `.agent/rules/languages/typescript.md`
- `.agent/rules/languages/python.md`
- `.agent/rules/linters/eslint.md`
- `.agent/rules/linters/ruff.md`
