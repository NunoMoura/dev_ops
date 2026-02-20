# Example: Verify Phase

**Goal:** Prove the implementation works and prepare for shipping.

**Inputs:**

1. Written code and tests.
2. `SPEC.md` for validation.

**Actions:**

1. Agent runs the full test suite one last time.
2. Agent appends testing evidence and what was changed to `.dev_ops/tasks/TASK-XXX/decision_trace.md`.
3. Agent creates a Pull Request via GitHub CLI or standard git commands.

**Output:**

1. Updates appended to `decision_trace.md` showing proof of work:

```markdown
### Verification (2026-02-21)
- **Tests**: `npm test` passed for `AuthService.spec.ts`.
- **Changes**: Added Google OAuth provider. No regressions.
```

1. A ready-to-review Pull Request.

**Next Action:**
The agent STOPS. The human reviews the PR. If approved, the card moves to Done.
