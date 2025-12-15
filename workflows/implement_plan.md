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

## Steps

1. Read the active plan in `docs/plans/` (e.g., `PLN-XXX-title.md`).
2. Review the "Context" section to understand the architectural decisions and research.
3. **Write Failing Tests**:
   - create a test file in `tests/` that mirrors the implementation path.
   - Write tests that define the expected behavior.
   - Run tests to confirm they fail (red state).
4. Execute the "Steps" defined in the plan to make the tests pass.
   > [!TIP]
   > **MCP Recommendation**: Use **Context7 MCP** (Upstash) to look up up-to-date documentation for libraries you are using. Use **GitHub MCP** (gitmcp) to find code examples in the repo.

4. If the plan requires changes, update the plan file first.
5. Follow the **Test Workflow** to verify changes.
6. Commit your changes using `python3 dev_ops/scripts/git_ops.py`.

## Exit Criteria

- [ ] Code changes implemented.
- [ ] Tests pass.
- [ ] Documentation updated.
