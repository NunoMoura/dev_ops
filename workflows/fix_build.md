---
description: Diagnostic workflow for fixing build failures or CI errors.
---

# Fix Build Workflow

## Prerequisites

- [ ] Build failed (locally or remotely).

## Relations

- **Upstream**:
  - **CI**: Build failure logs
- **Downstream**:
  - **Code**: `[Repository]` (Fixed code)

## Template

None - outputs code fixes, not document artifacts.

## Steps

1. Analyze the failure logs to understand the error.
2. Reproduce the failure locally if possible.
3. Run tests locally to confirm the issue.
4. Fix the issue in the code.
5. Verify the fix by running the build again.

## Exit Criteria

- [ ] Build passes (Green Build).
