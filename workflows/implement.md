---
description: Implement changes based on an approved plan.
---

# Implement Workflow

## Prerequisites

- [ ] `implementation_plan.md` is approved.

## Steps

1. Read the active plan in `docs/plans/` (e.g., `PLN-XXX-title.md`).
2. Review the "Context" section to understand the architectural decisions and research.
3. Execute the "Steps" defined in the plan.
4. If the plan requires changes, update the plan file first.
5. Follow the **Test Workflow** to verify changes.
6. Commit your changes using `python3 scripts/workflow_utils/git_commit.py`.

## Exit Criteria

- [ ] Code changes implemented.
- [ ] Tests pass.
- [ ] Documentation updated.
