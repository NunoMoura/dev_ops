---
description: Audit and review code for security, quality, and standards.
---

# Agentic Code Review Workflow

## Prerequisites

- [ ] Code is ready for review.

## Relations

- **Upstream**:
  - **Code**: `[Repository]` (Code to review)
  - **PR**: `PR-XXX` (Pull RequestContext)
- **Downstream**:
  - **Feedback**: Comments on Code/PR
  - **Bug**: `BUG-XXX` (If critical issues found)

## Template

None - outputs PR comments/feedback, not document artifacts.

## Steps

1. Check for security vulnerabilities, secrets, and injection risks.
2. **Verify Correctness**:
   - Verify correctness of logic, edge cases, and ensure tests cover the changes.
   - **Gap Analysis**: Check if `tests/` mirrors `src/` for the modified files.
     - If `src/` is populated but `tests/` is empty, recommend creating a
      "Test Bootstrapping" Backlog Item.
3. Check for "Agent-Readability" including docstrings, type hints, and naming conventions.
4. Ensure the changes comply with existing ADRs in `docs/adrs/`.
5. Run linting tools and ensure style consistency.

## Exit Criteria

- [ ] All checks pass.
