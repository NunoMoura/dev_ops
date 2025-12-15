---
description: Create a Pull Request linked to an Implementation Plan.
---

# Create PR Workflow

## Prerequisites

- [ ] `check_pr` workflow passed.
- [ ] Active Implementation Plan exists (e.g., `PLN-001`).

## Relations

- **Upstream**:
  - **Plan**: `PLN-XXX` (Plan implemented by this PR)
- **Downstream**:
  - **Code**: `[Repository/Branch]` (Code being merged)
  - **Deployment**: `[Environment]` (Where this code will go)

## Steps

1. **Push Branch**: `git push origin <branch-name>`.
2. **Create PR**:
   - Run `gh pr create` OR use GitHub UI.
3. **Fill Description**:
   - **Title**: Use the PR title from the Plan or Branch.
   - **Description**:
     ```markdown
     ## Goal
     [Summary of changes]

     ## Implementation Plan
     - Implements [PLN-XXX]
     - Fixes [BUG-XXX] (if applicable)

     ## Verification
     - [ ] Automated tests passed
     - [ ] Manual verification completed
     ```
4. **Link Items**: Ensure the PR is linked to the GitHub Issue or Project Item if applicable.

## Exit Criteria

- [ ] PR created on GitHub.
- [ ] PR description links to Plan/Backlog/Bug.
- [ ] CI/CD checks have started.
