---
description: Implement approved execution plans.
---

# Implement Plan Workflow

## Relations

- **Upstream**:
  - **Plan**: `PLN-XXX` (Plan being executed)
- **Downstream**:
  - **Code**: `[Repository]` (Codebase being modified)
  - **PR**: `PR-XXX` (Pull Request created from this implementation)

## Prerequisites

- [ ] `implementation_plan.md` is approved.

## Template

None - outputs code changes, not document artifacts.

## Steps

1. Read the active plan in `docs/plans/` (e.g., `PLN-XXX-title.md`).
2. Review the "Context" section to understand the architectural decisions and research.
3. **Write Failing Tests**:
   - create a test file in `tests/` that mirrors the implementation path.
   - Write tests that define the expected behavior.
   - Run tests to confirm they fail (red state).
4. Execute the "Steps" defined in the plan to make the tests pass.
   - Look up up-to-date documentation for libraries you are using
     (use Context7 MCP if available)
   - Find code examples in the repo (use GitHub MCP if available)
5. If the plan requires changes, update the plan file first.
6. Follow the **Verify Workflow** (`workflows/verify.md`) to verify changes.
7. Commit your changes using `python3 dev_ops/scripts/git_ops.py`.

## Exit Criteria

- [ ] Code changes implemented.
- [ ] Tests pass.
- [ ] Documentation updated.
