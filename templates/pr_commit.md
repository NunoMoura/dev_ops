# PR Commit Message Template

Use this template for all PR commit messages. Structured for both human review
and automated bot analysis (bug detection, feature extraction, triage).

---

## Template

```markdown
<type>(<scope>): <subject>

## Summary
<Brief description of what this PR accomplishes>

## Task Reference
- Task: TASK-XXX
- PRD/Feature: <link or ID>
- Related: <any related issues/PRs>

## Changes
### Added
- <new feature or file>

### Changed  
- <modified behavior or file>

### Fixed
- <bug fix description>

### Removed
- <deleted feature or file>

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual verification completed
- Verification: <link to walkthrough.md or summary>

## Breaking Changes
<!-- If none, write "None" -->
<description of breaking changes and migration path>

## Bot Triage Hints
<!-- Help automated reviewers categorize their findings -->
Known limitations: <areas where bot findings can be dismissed>
Focus areas: <areas where bot findings are valuable>
Out of scope: <intentional decisions that may trigger warnings>

---
Signed-off-by: <author>
Session: <AG session ID>
```

---

## Type Values

| Type | Description | Bot Priority |
|------|-------------|--------------|
| `feat` | New feature | High - check for edge cases |
| `fix` | Bug fix | High - verify fix completeness |
| `docs` | Documentation only | Low |
| `refactor` | Code restructure, no behavior change | Medium - check regressions |
| `test` | Adding/updating tests | Low |
| `chore` | Build, CI, dependencies | Medium - security scan |
| `perf` | Performance improvement | Medium |

---

## Bot Triage Categories

When bots analyze PRs and leave comments, triage into:

| Category | Action | Example |
|----------|--------|---------|
| `bug` | Create BUG-XXX, add to backlog | Security issue, logic error |
| `feature` | Create FEAT-XXX for future | "Could also handle X case" |
| `quickfix` | Fix in same PR if trivial | Typo, missing null check |
| `dismiss` | Acknowledge, no action | Style preference, known limitation |

### Triage Comment Format

```markdown
<!-- TRIAGE: bug -->
Bot found: <description>
Action: Created BUG-XXX

<!-- TRIAGE: dismiss -->
Bot found: <description>  
Reason: Intentional - see "Out of scope" in commit message
```

---

## Example

```markdown
feat(auth): add JWT refresh token rotation

## Summary
Implements automatic refresh token rotation for improved security.
Old refresh tokens are invalidated after single use.

## Task Reference
- Task: TASK-042
- PRD/Feature: FEAT-auth-refresh
- Related: #123, #125

## Changes
### Added
- `src/auth/refresh.py` - Token rotation logic
- `tests/test_refresh.py` - Rotation tests

### Changed
- `src/auth/middleware.py` - Check token validity

### Fixed
- None

### Removed
- None

## Testing
- [x] Unit tests added/updated
- [x] Integration tests pass
- [x] Manual verification completed
- Verification: See walkthrough.md in session abc123

## Breaking Changes
None

## Bot Triage Hints
Known limitations: Rate limiting not implemented (separate task)
Focus areas: Token validation logic, timing attacks
Out of scope: OAuth provider integration (future work)

---
Signed-off-by: agent@antigravity
Session: abc123-def456
```
