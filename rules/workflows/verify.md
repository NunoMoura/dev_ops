---
activation_mode: Model Decides
description: Standards and policy for Verification and Testing.
---

# Verify Policy

Rules for verifying code changes and preventing regressions.

## When to use

* After implementing code changes.
* Before creating a Pull Request.
* When regressions are suspected.

## Workflows

* **Verify**: Use `workflows/verify.md` to run the active verification suite.

## Best Practices

* **TDD**: Write tests before implementation when possible.
* **Mirroring**: Tests must mirror the source directory structure.
* **Coverage**: All new code must be covered.
