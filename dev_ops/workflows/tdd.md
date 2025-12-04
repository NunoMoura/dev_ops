# Agentic TDD Workflow

**Goal**: Write reliable code by defining the test case *first*.

## The Cycle (Red-Green-Refactor)

### 1. Red (Write the Test)

* **Action**: Use `scaffold_test.py` to create a test file for the target module.
* **Command**: `python3 dev_ops/commands/scaffold_test.py --target path/to/module.py`
* **Task**: Implement the test logic to assert the expected behavior.
* **Check**: Run the test. It MUST fail (or error) because the code doesn't exist yet.

### 2. Green (Make it Pass)

* **Action**: Write the *minimum* amount of code in the target module to satisfy the test.
* **Constraint**: Do not over-engineer. Just make the test pass.
* **Check**: Run the test. It MUST pass.

### 3. Refactor (Clean it Up)

* **Action**: Improve the code structure, readability, or performance without changing behavior.
* **Check**: Run the test again. It MUST still pass.

## Best Practices

* **One Concept per Test**: Don't test everything in one function.
* **Mock Externalities**: Use `unittest.mock` for file I/O, API calls, etc.
* **Run Often**: Run tests after every small change.
