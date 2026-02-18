# Testing & Implementation Guide

> "If it's not tested, it's broken."

## TDD (Test Driven Development) Principle

1. **Red**: Write a failing test that defines the expected behavior (based on `SPEC.md`).
2. **Green**: Write the minimum code to make the test pass.
3. **Refactor**: Clean up the code while keeping the test green.

## Implementation Rules

### 1. Minimal Implementation

- Do not implement "future" features.
- Implement *exactly* what the `SPEC.md` asks for.
- If the `SPEC.md` is ambiguous, Stop and ask (or go back to Plan).

### 2. File Operations

- Use `write_to_file` for new files.
- Use `replace_file_content` for existing files.
- Always verify the file path is correct.

### 3. Test Coverage

- Unit tests for logic.
- Integration tests for component interaction.
- Ensure you run `npm test` or equivalent *after every change*.

## Troubleshooting Tests

- **Test Timeout**: Check for unclosed handles or infinite loops.
- **Test Failure**: Read the error message carefully. It usually tells you exactly what went wrong.
- **Environment Issues**: Ensure all dependencies are installed (`npm install`).

## Validation Gate

Before moving to Verify phase, ask yourself:

- [ ] Does the code compile?
- [ ] Do the tests pass?
- [ ] Did I strictly follow the Spec?
