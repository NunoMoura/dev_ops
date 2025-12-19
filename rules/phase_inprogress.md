---
activation_mode: Model Decides
description: In Progress phase - active implementation.
---

# In Progress Phase

Active implementation following approved plan.

## Artifact

**Output**: Code changes
**Reference**: `PLN-XXX` from Planning phase

## How to Implement

1. **Read the Plan**:
   - Open `dev_ops/plans/PLN-XXX.md`
   - Review context section to understand architectural decisions
   - Identify entry points and acceptance criteria

2. **Write Failing Tests First** (TDD):
   - Create test file mirroring the implementation path:
     - `src/module/file.py` → `tests/module/test_file.py`
   - Write tests that define expected behavior
   - Run tests to confirm they fail (red state)

3. **Implement the Code**:
   - Follow the plan's proposed changes
   - Look up documentation (use Context7 MCP if available)
   - Find code examples (use GitHub MCP if available)
   - If plan requires changes, update the plan first

4. **Run Pre-Commit Checks**:
   - Run project linters (`flake8`, `eslint`, etc.)
   - Validate documentation: `python3 dev_ops/scripts/doc_ops.py validate`
   - Run tests: `python3 -m pytest tests/ -v`

5. **Commit Changes**:

   ```bash
   git add .
   git commit -m "type(scope): description

   Task: TASK-XXX
   Plan: PLN-XXX"
   ```

   **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Debugging Issues

When bugs or failures occur during implementation:

1. **Analyze the Issue**:
   - Review error logs and tracebacks
   - Reproduce the issue locally
   - Check file history (use GitHub MCP if available)

2. **Implement Fix**:
   - Make atomic, focused changes
   - Verify library APIs (use Context7 MCP if available)

3. **Verify Fix**:
   - Run tests to ensure they pass
   - Run regression tests
   - Verify build is green

4. **Document** (if tracked bug):
   - Update `BUG-XXX.md` with resolution notes
   - Run `python3 dev_ops/scripts/doc_ops.py resolve bug BUG-XXX`

## Code Quality Standards

- Run linters before every commit
- No broken builds
- No secrets in code
- Tests must pass
- Atomic commits (one feature/fix per commit)

## Progress Updates

Update task with produced artifacts:

```bash
python3 dev_ops/scripts/kanban_ops.py downstream TASK-XXX file.py
```

## If Blocked

Move to Blocked column immediately:

```bash
python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-blocked
```

Document blocker in task notes.

## Exit Criteria

- [ ] Implementation complete per plan
- [ ] All acceptance criteria met
- [ ] All commits reference TASK-XXX
- [ ] Linting passes
- [ ] Build passes
- [ ] Move task to Testing
