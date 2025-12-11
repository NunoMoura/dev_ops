---
description: Process Feedback from PRs into Bugs or Backlog items.
---

# Triage Feedback Workflow

## Prerequisites

- [ ] PR has comments or CI failures.

## Steps

1. **Triage Feedback**:
   - Run `python3 dev_ops/scripts/pr_ops.py triage --pr <PR_NUMBER>` to interactively convert comments into Bugs or Backlog items.
   - OR manually review the PR conversation tab.
2. **Evaluate Feedback**:
   - For each comment/failure:
     - **Is it a Bug?** (Defect, Error, Crash) -> Create a Bug (`workflows/report_bug.md`).
     - **Is it a Feature/Improvement?** (Suggestion, Optimization) -> Create a Backlog Item (`workflows/create_backlog_item.md`).
     - **Is it a Question?** -> Answer directly in PR.
3. **Link**:
   - Link the created Bug/Backlog Item to the PR comment (e.g., "Tracked in BUG-123").
4. **Resolve**:
   - Once tracked, resolve the conversation in the PR (if applicable).

## Exit Criteria

- [ ] All actionable feedback is tracked in `dev_ops/docs/bugs` or `dev_ops/docs/backlog.md`.
- [ ] Non-actionable feedback is resolved.
