---
description: Unified workflow for debugging and fixing defects (bugs, build failures, test failures).
---

# Debug Workflow

## Prerequisites

- [ ] Defect identified (Bug document, CI failure, or test failure).
- [ ] Issue is reproducible (if applicable).

## Relations

- **Upstream**:
  - **Bug**: `BUG-XXX` (Tracked bug being fixed)
  - **CI**: Build/test failure logs
- **Downstream**:
  - **Code**: `[Repository]` (Codebase being modified)
  - **PR**: `PR-XXX` (Pull Request for the fix)

## Steps

1. **Analyze the Issue**:
   - Review bug report, error logs, or CI failure output.
   - Reproduce the issue locally if possible.

   > [!TIP]
   > **MCP Recommendation**: Use **GitHub MCP** (gitmcp) to check file history
   > and blame. Use **Context7 MCP** (Upstash) to verify library APIs.

2. **Implement Fix**:
   - Make specific code changes to resolve the issue.
   - Keep changes atomic and focused on the defect.

3. **Verify Fix**:
   - Run tests to ensure they now pass.
   - Run regression tests (`workflows/verify.md`).
   - Verify the build is green.

4. **Close the Bug** (if tracked):
   - Run `python3 dev_ops/scripts/doc_ops.py resolve bug [ID]`.
   - Update `dev_ops/docs/bugs/BUG-XXX.md` with resolution notes.

## Exit Criteria

- [ ] Defect is fixed and code is committed.
- [ ] Tests pass (green build).
- [ ] Bug status set to `closed` (if tracked).
- [ ] No regressions introduced.
