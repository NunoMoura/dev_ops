---
description: Log a new issue, bug, or feature request.
---

# Create Issue Workflow

## Prerequisites

- [ ] An issue, bug, or feature has been identified.

## Template

````text
```yaml
id: {{id}}
type: bug
status: open
priority: medium
created_at: {{date}}
related_docs: []
```

# {{title}}

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the bug details.

## Description

{{description}}

## Reproduction Steps

1. [Step 1]
2. [Step 2]

## Expected Behavior

[Expected...]

## Actual Behavior

[Actual...]

## Related Documents

| Type | ID | Relationship |
|:-----|:---|:-------------|
| - | - | - |

## Context

{{context}}
````

## Steps

1. Search existing bugs in `docs/bugs/` to avoid duplicates.
2. Run `python3 scripts/workflow_utils/log_bug.py --title "Bug Title" --desc "Description"` to create a new bug file.
3. The script will generate a bug ID (e.g., `BUG-XXX`) and create the file in `dev_ops/bugs/`.
4. **Link to related Research or ADRs** if this bug is derived from them.
5. Assign a priority and labels if applicable.

## Exit Criteria

- [ ] New bug file created in `dev_ops/bugs/`.
- [ ] Related documents are linked if applicable.
