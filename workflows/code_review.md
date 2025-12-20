---
description: Review code changes on current branch for quality issues
---

# Code Review

Analyze code changes and create actionable artifacts for issues found.

## Steps

1. **Get changed files**:

   ```bash
   git diff --name-only main..HEAD
   ```

2. **Analyze each changed file** for:
   - Code style violations
   - Potential bugs
   - Security issues
   - Missing tests
   - Documentation gaps

3. **For each issue found**, create a bug report:

   ```bash
   python3 dev_ops/scripts/doc_ops.py create bug \
     --title "Code review: <issue summary>" \
     --priority medium
   ```

4. **Link bugs to current task** (if applicable):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py downstream TASK-XXX BUG-XXX
   ```

5. **Report summary**:
   - Files reviewed: N
   - Issues found: N
   - Bugs created: BUG-XXX, BUG-YYY

## Review Categories

| Category | What to Check |
|----------|---------------|
| **Style** | Naming, formatting, linting rules |
| **Logic** | Edge cases, error handling, null checks |
| **Security** | Input validation, secrets, SQL injection |
| **Tests** | Coverage, assertions, mocking |
| **Docs** | Function docstrings, README updates |

## Template

Bug title format: `Code review: <category> - <brief description>`

Examples:

- `Code review: Security - SQL injection in user query`
- `Code review: Tests - Missing test for edge case`
- `Code review: Docs - No docstring for public function`
