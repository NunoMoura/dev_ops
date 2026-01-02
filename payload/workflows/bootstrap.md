---
description: Generate project-specific rules and constitution after initialization
---

# Bootstrap DevOps Framework

Run this **ONCE** after initialization to generate project-specific rules.

## Instructions

1. **Scan** the project directory to detect:
   - Programming languages (check file extensions and config files)
   - Linters and tools (check config files and package manifests)
   - Frameworks and libraries (check dependencies)

2. **Read** the rule generation templates in `payload/templates/rules/`:
   - `languages.md` - For detected programming languages
   - `linters.md` - For detected linters/formatters
   - `libraries.md` - For detected frameworks/libraries
   - `databases.md` - For detected databases

3. **Generate** rules in `.agent/rules/` following template instructions:
   - File naming: `language_<name>.md`, `linter_<name>.md`, etc.
   - Include proper frontmatter (activation_mode, name, globs)
   - Customize based on actual project patterns, not generic defaults
   - Reference real files and conventions observed in the codebase

4. **Create** constitution in `.dev_ops/docs/constitution.md`:
   - Read template at `payload/templates/docs/constitution.md`
   - Customize based on project size, architecture, and observable patterns
   - Include actual technical decisions visible in the code

## Expected Output

```
.agent/rules/
├── language_*.md      (one per detected language)
├── linter_*.md        (one per detected linter)
└── library_*.md       (one per detected framework)

.dev_ops/docs/
└── constitution.md    (project governance)
```

## Validation

- All rules have proper frontmatter
- Globs match actual project files
- Constitution reflects real decisions (not placeholders)
- No generic/template text remains
