---
description: Document research on a specific topic.
---

# Create Research Workflow

## Prerequisites

- [ ] A topic requiring investigation or research.
- [ ] Optionally, a Bug or Backlog item that prompted this research.

## Template

````text
```yaml
id: {{id}}
type: research
status: active
created_at: {{date}}
related_docs: []
```

# {{title}}

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the research details.

## Context

[Why are we researching this? Link to Bug/Backlog item if applicable.]

## Findings

[What did we find? Document pros/cons of different approaches.]

## Recommendation

[Based on findings, what do we recommend? Does this lead to an ADR?]

## Related Documents

| Type | ID | Relationship |
|:-----|:---|:-------------|
| Bug | BUG-XXX | Investigates |
| Backlog | - | Investigates |

## References

[External links, documentation, etc.]
````

## Steps

1. Run `python3 scripts/workflow_utils/create_research.py --title "Research Topic"` to create a new research file.
2. The script will generate a Research ID (e.g., `RES-XXX`) and create the file in `docs/research/`.
3. **Link to the Bug or Backlog item** that prompted this research.
4. Conduct research and document findings, including pros/cons of different approaches.
5. If the research leads to a decision, **trigger the Create ADR Workflow** (`/adr`).

## Exit Criteria

- [ ] New research file created in `docs/research/`.
- [ ] Related Bug/Backlog item is linked.
- [ ] If decision needed, ADR workflow triggered.
