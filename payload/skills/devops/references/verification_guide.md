# Verification Guide

> "Trust, but Verify."

## Automated Verification

1. **Unit Tests**: Verify individual functions.
2. **Integration Tests**: Verify component interactions.
3. **End-to-End Tests**: Verify user flows (if applicable).
4. **Linting**: Verify code style and potential errors.

## Manual Verification Checklist

- [ ] Does the feature match the `SPEC.md` requirements?
- [ ] Are there any UI glitches? (If UI involved)
- [ ] Is the performance acceptable?
- [ ] Is the user experience smooth?

## Security Checklist

- [ ] **No Secrets**: Check for hardcoded API keys or passwords.
- [ ] **Input Validation**: Ensure all user inputs are validated.
- [ ] **Dependencies**: Ensure no vulnerable dependencies were added.
- [ ] **Permissions**: Ensure least privilege principle is followed.

## Walkthrough Guidelines

When creating `walkthrough.md`:

- **Context**: What was the goal?
- **Changes**: What files were modified?
- **Evidence**: Output of tests, screenshots, or logs.
- **Status**: Is it ready to ship?
