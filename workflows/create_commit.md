---
description: Generate a conventional commit message and commit changes.
---

# Create Commit Workflow

## Prerequisites

- [ ] Changes are staged (`git add`).
- [ ] Changes are atomic (one feature/fix per commit).

## Template

````text
<type>(<scope>): <subject>

<body>

<footer>
````

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## Steps

1. **Review Staged Changes**: Run `git diff --staged` to verify what you are committing.
2. **Draft Message**:
   - **Header**: `type(scope): subject` (e.g., `feat(auth): implement login`).
   - **Body**: Explain *what* and *why* (not *how*).
   - **Footer**: Link to related issues/docs (e.g., `Closes #123`, `Relates to ADR-001`).
3. **Commit**: Run `git commit -m "..."` or `git commit` to open editor.

## Exit Criteria

- [ ] Commit created with conventional message.
- [ ] History is clean and understandable.
