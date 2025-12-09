---
description: Create an implementation plan for a task.
---

# Plan Workflow

## Prerequisites

- [ ] An issue or backlog item exists.
- [ ] Relevant ADRs and Research are identified.

## Template

````text
```yaml
id: {{id}}
type: plan
status: active
created_at: {{date}}
related_docs: {{related_docs}}
related_code: {{related_code}}
```

# {{title}}

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the plan details. This document drives the execution.

## Goal

[High-level goal of this plan]

## Context

{{context}}

## Steps

1. [Step 1]
2. [Step 2]
````

## Verification

[How will we verify success?]

## Steps

1. Identify the IDs of relevant ADRs, Research, Bugs, and Backlog items.
2. Run `python3 scripts/workflow_utils/create_plan.py --title "Plan Title" --docs [ID1] [ID2] ...` to generate the plan file.
3. The script will create a new plan in `dev_docs/plans/` with the context populated.
4. Review the generated plan and fill in the "Steps" and "Verification" sections.
5. If there are conflicting documents, use `python3 scripts/workflow_utils/check_doc_date.py [file1] [file2]` to determine precedence.

## Exit Criteria

- [ ] Plan file created in `dev_docs/plans/`.
- [ ] Plan approved by user or team.
```
