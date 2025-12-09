---
description: Create a new Architectural Decision Record (ADR).
---

# Create ADR Workflow

## Prerequisites

- [ ] A significant architectural decision needs to be made or documented.

## Template

````text
```yaml
id: {{id}}
type: adr
status: active
created_at: {{date}}
superseded_by: null
related_docs: []
```

# {{title}}

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the ADR details and metadata.

## Context

[Why is this decision needed? What is the problem?]

## Decision

[What is the decision? Be specific and actionable.]

## Consequences

[What are the positive and negative consequences of this decision?]

## Related Documents

| Type | ID | Relationship |
|:-----|:---|:-------------|
| Research | RES-XXX | Informed by |
| Bug | BUG-XXX | Addresses |

## Implementation Work

> [!NOTE]
> ADRs often create new work items. List Backlog items to be created:

- [ ] [Backlog item 1 to implement this decision]
- [ ] [Backlog item 2...]
````

## Steps

1. Check for existing ADRs in `docs/adrs/` to ensure no conflicts exist.
2. If a conflict exists, use `python3 scripts/workflow_utils/check_doc_date.py [file1] [file2]` to determine precedence.
3. Run `python3 scripts/workflow_utils/create_adr.py --title "ADR Title"` to create a new ADR file.
4. The script will generate an ADR ID (e.g., `ADR-XXX`) and create the file in `docs/adrs/`.
5. Fill in the Context, Decision, and Consequences sections.
6. **Link the ADR** to any Research docs or Bugs that originated this decision.
7. **Create Backlog items** for any implementation work this ADR requires.

---

## Exit Criteria

- [ ] New ADR file created in `docs/adrs/`.
- [ ] ADR does not conflict with existing active ADRs.
- [ ] Related documents are linked.
- [ ] Implementation Backlog items created if applicable.
