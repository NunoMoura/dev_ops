---

activation_mode: Always On
description: Policies for Code Quality, Testing, and Auditing.

---

# Code Quality Policy

Ensure code meets standards before merging.

## Workflows

* **Audit**: Use `workflows/audit_code.md` for specific code review requests or before finishing a feature.
* **Test**: Use `workflows/run_tests.md` whenever code is changed.

## Requirements

1. **Tests**: All new features and bug fixes must have tests.
2. **Linting**: Code must pass all linter checks.
3. **Security**: No secrets in code, no obvious injection vulnerabilities.

> [!IMPORTANT]
> Agent: If you modify code, you MUST run tests (`workflows/run_tests.md`).
