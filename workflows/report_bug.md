---
description: Process for reporting a new bug.
---

# Report Bug Workflow

## Prerequisites

- [ ] Bug behavior is reproducible (if applicable).
- [ ] Checked for duplicates via `python3 dev_ops/scripts/doc_ops.py list bug`.

## Steps

1. **Create the file**:
   - Run `python3 dev_ops/scripts/doc_ops.py create bug --title "Brief failure description"`.
   - This generates `dev_ops/docs/bugs/BUG-XXX-title.md`.

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
