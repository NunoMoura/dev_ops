---
activation_mode: Model Decides
description: Review phase - code review before testing.
---

# Review Phase

Code review and quality validation before testing.

## Purpose

The Review column is for tasks that have completed implementation and need
human or peer review before moving to Testing. This ensures code quality
and catches issues early.

## Artifacts

**Input**: Code changes from Implementing phase
**Output**: Review approval or feedback

## Review Checklist

Before approving, verify:

### Code Quality

- [ ] Code follows project style guidelines
- [ ] No obvious bugs or logic errors
- [ ] Error handling is appropriate

### Security

> [!IMPORTANT]
> Security review is mandatory for all changes touching authentication,
> authorization, data handling, or external inputs.

- [ ] **Secrets**: No hardcoded credentials, API keys, or tokens
- [ ] **Injection**: User inputs sanitized/parameterized (SQL, XSS, command)
- [ ] **Authentication**: Auth checks present where required
- [ ] **Authorization**: Permission checks enforce least privilege
- [ ] **Data Exposure**: No sensitive data in logs, errors, or responses
- [ ] **Dependencies**: No known vulnerabilities in new dependencies

**For any security issue found**, create a BUG artifact:

```bash
python3 dev_ops/scripts/doc_ops.py create bug \
  --title "Security: <issue description>" \
  --priority high
```

### Documentation

- [ ] Code is adequately commented
- [ ] Public APIs have docstrings
- [ ] README updated if needed

### Architecture

- [ ] Changes align with existing patterns
- [ ] No unnecessary complexity
- [ ] Dependencies are appropriate

### Tests

- [ ] Test files exist for new code
- [ ] Tests cover main scenarios
- [ ] Edge cases considered

## Review Process

1. **Self-Review First**:
   - Author reviews their own changes
   - Run linters and fix issues
   - Ensure all commits are clean

2. **Request Review**:
   - Create PR if using GitHub
   - Or request human review directly

3. **Address Feedback**:
   - If changes requested, return to Implementing
   - Fix issues and request re-review

4. **Approve**:
   - When review passes, move to Testing

## Commands

Move to Testing after approval:

```bash
python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-testing
```

Return to Implementing if changes needed:

```bash
python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-implementing
```

## Exit Criteria

- [ ] Code review completed
- [ ] All feedback addressed
- [ ] Linting passes
- [ ] Ready for testing
- [ ] Move task to Testing
