# Test Workflow

## Context

Create and run tests for a specific component.
Enforces the rule: **Test Structure must mirror Code Structure.**

## Prerequisites

- [ ] Component code exists.

## Steps

### 1. Identify Target

- **Action**: Determine which component to test.
- **Command**: Consult Code Wiki

### 2. Code Quality Check (Optional)

1. **Run Linters**
    - For comprehensive code quality, run static analysis tools (e.g., `ruff`, `mypy`).

### 3. Create & Run Test

1. **Run Create/Run Test Script**

    ```bash
    python3 dev_ops/commands/create_test.py "[Component Name]"
    ```

    - This script will:
        - Create a test file `tests/[layer]/test_[component].py` if it doesn't exist.
        - Run `pytest` on that file.

2. **Iterate**
    - If tests fail, fix the code and run the script again (or run `pytest` directly).

## Exit Criteria

- [ ] Test file exists in correct location.
- [ ] Tests pass (or fail as expected for TDD).
