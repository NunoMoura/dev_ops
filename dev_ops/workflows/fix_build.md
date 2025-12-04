# Fix Build Workflow

## Context

Diagnose and resolve CI/CD failures or local `ci_check` errors.

## Prerequisites

- [ ] Build failed (locally or remotely).

## Steps

### 1. Analyze Logs

- **Action**: Read the failure logs.
- **Command**: `read_file` (if local log) or `read_terminal`

### 2. Reproduce Locally

- **Action**: Run the specific check that failed.
- **Command**:

    ```bash
    python3 dev_ops/commands/ci_check.py
    ```

    OR specific sub-command:

    ```bash
    python3 dev_ops/commands/run_tests.py
    ```

### 3. Fix Issue

- **Action**: Modify code to fix the error.
- **Command**: `write_to_file` / `replace_file_content`

### 4. Verify Fix

- **Action**: Run the check again.
- **Command**: `python3 dev_ops/commands/ci_check.py`

## Exit Criteria

- [ ] `ci_check.py` passes (Green Build).
