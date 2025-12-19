---
activation_mode: Model Decides
description: Configuration and usage guidelines for [Linter Name].
---

# [Linter Name] Rules

Guidelines for using [Linter Name] to maintain code quality and consistency.

## Purpose

[Linter Name] is used to enforce [Language] standards and catch common bugs
before they reach production.

## Usage

Run [Linter Name] before every commit:

```bash
# Example command
[Linter Name] .
```

## Configuration

Standard configuration for this project:

- **Indentation**: 2 spaces / 4 spaces.
- **Line Length**: 80 characters (standard for DevOps framework).
- **Complexity**: Maximum cyclomatic complexity of 10.

## Corrective Actions

1. **Auto-fix**: Use `--fix` or equivalent when possible.
2. **Exclusions**: Use inline ignores sparingly and provide a reason.
3. **Global Disables**: Only allowed with project-wide ADR.

## Relationship to CI

- Broken linter fails the build.
- No PRs merged with linter errors.
