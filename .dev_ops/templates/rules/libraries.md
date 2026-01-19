---
type: rule_generator
category: libraries
description: Template for generating project-specific library rules during /bootstrap
---

# Library Rule Generator

> [!IMPORTANT]
> This is a **generation template**, not a static rule.
> During `/bootstrap`, this template is used to create project-specific rules
> in `.agent/rules/libraries/` based on detected libraries/frameworks.

## Auto-Detection

The bootstrap workflow detects libraries via:

- `package.json` dependencies (React, Vue, Express, Next)
- `requirements.txt` / `pyproject.toml` (FastAPI, Django, Flask)
- Config files: `next.config.js`, `svelte.config.js`

## Placeholder Substitution

| Placeholder | Replaced With |
|-------------|---------------|
| `[Library Name]` | Detected library (FastAPI, React, etc.) |

---

## Generated Rule Structure

### General Principles (Always Included)

- **Assumes**: State dependency on language/base rules
- **Related Rules**: Link to related libraries or frameworks
- **Single Initialization**: Initialize once, reuse globally
- **Idiomatic Usage**: Follow library's recommended patterns
- **Version Pinning**: Pin major versions
- **Isolation**: Wrap library to ease migrations

### Customization Slots (Project-Specific)

```yaml
# Initialization
location: app/core/<library>.py
singleton: true | false

# Usage Area
layer: data_access | api | ui | infrastructure

# Patterns
allowed: [pattern_1, pattern_2]
forbidden: [anti_pattern_1]

# Testing
mock_strategy: dependency_injection | monkey_patch
```

---

## Example: Generated FastAPI Rule

After bootstrap detects FastAPI, `.agent/rules/libraries/fastapi.md` contains:

```yaml
---
name: FastAPI
globs: ["**/routers/**", "**/api/**"]
---

# FastAPI Standards

## Assumes
This rule assumes the base `python` language rule is active.

## Related Rules
- `pydantic` - for schema validation
- `sqlalchemy` - for database models

## Standards

location: app/main.py
singleton: true
layer: api
allowed: [dependency_injection, pydantic_models]
forbidden: [global_state]
mock_strategy: dependency_injection
```
