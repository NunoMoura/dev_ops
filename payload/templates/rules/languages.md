---
type: rule_generator
category: languages
description: Template for generating project-specific language rules during /bootstrap
---

# Language Rule Generator

> [!IMPORTANT]
> This is a **generation template**, not a static rule.
> During `/bootstrap`, this template is used to create project-specific rules
> in `.agent/rules/languages/` based on detected languages.

## Auto-Detection

The bootstrap workflow detects languages via:

- Config files: `pyproject.toml`, `tsconfig.json`, `go.mod`, `Cargo.toml`
- File extensions: `*.py`, `*.ts`, `*.go`, `*.rs`

## Placeholder Substitution

| Placeholder | Replaced With |
|-------------|---------------|
| `[Language Name]` | Detected language (Python, TypeScript, etc.) |
| `[extension]` | File extension (py, ts, go, rs) |

---

## Generated Rule Structure

### General Principles (Always Included)

- **Assumes**: State what this rule builds upon
- **Related Rules**: Link to other relevant rules
- **Clarity over Cleverness**: Readable by humans and AI
- **Consistent Formatting**: Use standard tooling
- **Error Handling**: Use idiomatic patterns
- **Documentation**: Document public APIs

### Customization Slots (Project-Specific)

```yaml
# Typing
strict: true | false
type_checker: mypy | pyright | tsc

# Naming
files: snake_case | kebab-case
variables: snake_case | camelCase
classes: PascalCase

# Error Handling
style: exceptions | result_types

# Tooling
linter: ruff | eslint | clippy
formatter: black | prettier | rustfmt
```

---

## Example: Generated Python Rule

After bootstrap detects Python, `.agent/rules/languages/python.md` contains:

```yaml
---
globs: ["**/*.py"]
name: Python
---

# Python Rules

## Assumes
This rule serves as the base layer for Python development.
Library and framework rules will layer on top of this.

## Related Rules
- Linter rules (e.g. `linter_*.md`)
- Library rules (e.g. `library_*.md`)

## Coding Standards

strict: true
type_checker: mypy
files: snake_case
style: exceptions
linter: ruff
formatter: black
```
