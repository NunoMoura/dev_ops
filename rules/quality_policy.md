---
activation_mode: Model Decides
description: Code quality policies - load before merging, during code review, or when checking test requirements.
---

# Quality Policy

## Requirements

1. **Tests**: All new features and bug fixes must have tests
2. **Linting**: Code must pass all linter checks
3. **Security**: No secrets in code, no obvious vulnerabilities

## Workflows

| Workflow | When to Use |
|----------|-------------|
| `/verify` | After any code change |
| `/audit_code` | Before finishing a feature |
| `/debug` | When build is broken |

## Implementation Guidelines

1. **Stick to the Plan**: Do not deviate from approved plans without updating
2. **Atomic Commits**: Use `git_ops.py` for clear, atomic commits
3. **Green Build**: Never leave the build in a broken state

> [!IMPORTANT]
> If you modify code, you MUST run tests (`/verify`).
> [!IMPORTANT]
> If the build fails, STOP and fix it immediately using `/debug`.
