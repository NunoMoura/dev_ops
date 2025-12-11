---
activation_mode: agent-decides
description: Policies for Implementing plans and fixing builds.
globs: "**/*"
---

# Implementation Policy

Guidelines for executing work.

## Workflows

* **Implement**: Use `workflows/implement_feature.md` when executing an approved Plan.
* **Fix Build**: Use `workflows/fix_build.md` if the build is broken.

## Guidelines

1. **Stick to the Plan**: Do not deviate from `implementation_plan.md` or the active doc plan without updating it.
2. **Atomic Commits**: Use `dev_ops/scripts/git_ops.py` to make clear, atomic commits.
3. **Green Build**: Do not leave the build in a broken state.

> [!IMPORTANT]
> If the build fails, STOP and fix it immediately using `workflows/fix_build.md`.
