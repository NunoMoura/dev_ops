---
description: Process for reporting a new bug.
produces: BUG-XXX
---

# Report Bug Workflow

## Prerequisites

- [ ] Bug behavior is reproducible (if applicable).
- [ ] Checked for duplicates via `python3 dev_ops/scripts/doc_ops.py list bug`.

## Relations

- **Upstream**:
  - **Triage**: (Discovery source)
- **Downstream**:
  - **Plan**: `PLAN-XXX` (Plan fixing this bug)

## Template

Use [bug.md](file:///home/nunoc/projects/dev_ops/templates/bug.md).

**Example fill-in**:

- **Priority**: "High"
- **Status**: "Open"
- **Description**: "Login fails silently when session expires"
- **Context**: "Discovered in PR-089 review; affects production"
- **Steps to Reproduce**:
  1. Login and wait 30 minutes
  2. Click any protected route
  3. Observe blank page (no error shown)
- **Expected Behavior**: "Redirect to login with message"
- **Actual Behavior**: "Blank page, no feedback"
- **Related**: "PR-089"

## Steps

1. **Create the file**:
   - Run `python3 dev_ops/scripts/doc_ops.py create bug --title "Brief failure description"`.
   - This generates `dev_ops/bugs/BUG-XXX-title.md`.

2. **Fill in the details**:
   - **Status**: Set to `open`.
   - **Symptoms**: Describe what is happening.
   - **Reproduction**: Steps to make it happen.
   - **Context**: If discovered during coding, note the file/line.

3. **Link related items**:
   - If related to a recent change/commit, mention it.

## Exit Criteria

- [ ] Bug file created.
- [ ] Status is `open`.
