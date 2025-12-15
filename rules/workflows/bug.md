---

activation_mode: Model Decides
description: Standards and policy for Bug Project Artifacts.

---

# Bug Policy

Rules for managing the lifecycle of Bug **Project Artifacts** in the project.

## When to use

* Code defects causing unexpected behavior.
* Errors, crashes, or regressions.
* Documentation inaccuracies.

## Workflows

* **Report**: Use `workflows/report_bug.md` to log a new issue.
* **Test**: Use `workflows/verify.md` whenever code is changed.
* **Plan Fix**: Use `workflows/create_plan.md` for complex issues.
* **Quick Fix**: Use `workflows/fix_bug.md` for simple defects.
* **Verify**: Use `workflows/verify.md` to ensure no regressions.

## Lifecycle

1. **Open**: New bug, unverified.
2. **In Progress**: Actively being worked on.
3. **Resolved**: Fix merged, waiting for verification.
4. **Closed**: Verified fixed.
5. **Wont Fix**: Decision made not to address.

> [!IMPORTANT]
> **Priority**: Fix build-breaking bugs immediately (See `workflows/fix_build.md`).
> Agent: If you modify code, you MUST run tests (`workflows/verify.md`).
