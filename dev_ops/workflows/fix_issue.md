# Fix Issue Workflow

## Context

Pick up and resolve a tracked issue from `dev_ops/issues/`.

## Prerequisites

- [ ] Open issues exist (`dev_ops/commands/list_issues.py` returns items).

## Steps

### 1. Get Next Issue

- **Action**: Identify the highest priority task.
- **Command**:

    ```bash
    python3 dev_ops/commands/next_issue.py
    ```

### 2. Understand Context

- **Action**: Read the issue description and context.
- **Command**: `read_file` (if file context provided in issue)

### 3. Implement Fix

- **Action**: Modify code to resolve the issue.
- **Command**: `write_to_file` / `replace_file_content`

### 4. Verify

- **Action**: Run tests to ensure fix works and no regressions.
- **Command**: `python3 dev_ops/commands/run_tests.py`

### 5. Resolve

- **Action**: Mark the issue as closed.
- **Command**:

    ```bash
    python3 dev_ops/commands/resolve_issue.py [ID]
    ```

## Exit Criteria

- [ ] Issue status is "closed".
- [ ] Tests pass.
