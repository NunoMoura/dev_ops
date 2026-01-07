---
type: rule_generator
category: linters
description: Template for generating project-specific linter rules during /bootstrap
---

# Linter Rule Generator

> [!IMPORTANT]
> This is a **generation template**, not a static rule.
> During `/bootstrap`, this template is used to create project-specific rules
> in `.agent/rules/linters/` based on detected linter configuration.

## Auto-Detection

The bootstrap workflow detects linters via:

- Config files: `.eslintrc*`, `ruff.toml`, `.pylintrc`, `.golangci.yml`
- `pyproject.toml` tool sections
- `package.json` devDependencies

## Placeholder Substitution

| Placeholder | Replaced With |
|-------------|---------------|
| `[Linter Name]` | Detected linter (ruff, eslint, etc.) |

---

## Generated Rule Structure

### General Principles (Always Included)

- **Assumes**: State dependency on detected configuration
- **Related Rules**: Link to language rules
- **Fail CI on Error**: No PRs merged with lint errors
- **Auto-fix First**: Use `--fix` when available
- **Document Ignores**: Inline ignores require reason
- **Consistent Config**: Shared across team

### Customization Slots (Project-Specific)

```yaml
# Configuration
config_file: pyproject.toml | .eslintrc
line_length: 80 | 88 | 120

# Severity
error: [rule_codes]
warn: [rule_codes]
ignore: [rule_codes]

# Commands
check: ruff check . | eslint src/
fix: ruff check --fix . | eslint --fix src/

# CI
fail_on: error | warn
```

---

## Example: Generated Ruff Rule

After bootstrap detects Ruff, `.agent/rules/linters/ruff.md` contains:

```yaml
---
name: Ruff
globs: ["**/*.py"]
config_file: pyproject.toml
---

# Ruff Standards

## Assumes
This rule applies when the configured linter is detected.

## Related Rules
- Language rules

## Standards

line_length: 88
error: [E, F, I]
warn: [C90]
check: ruff check .
fix: ruff check --fix .
fail_on: error
```
