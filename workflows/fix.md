---
description: Pick up and resolve a tracked bug from docs/bugs/.
---

# Fix Bug Workflow

## Prerequisites

- [ ] Open bugs exist (`scripts/workflow_utils/list_bugs.py` returns items).

## Steps

1. Identify the highest priority bug to work on. You can use `python3 scripts/workflow_utils/next_bug.py` to help with this.
2. Read the bug details and understand the context.
3. Implement the fix in the codebase.
4. Verify the fix with tests.
5. Resolve the bug by running `python3 scripts/workflow_utils/resolve_bug.py [ID]`.

## Exit Criteria

- [ ] Bug status is "closed".
- [ ] Tests pass.
