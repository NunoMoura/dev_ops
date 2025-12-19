---
activation_mode: Model Decides
description: Research phase - investigation before planning.
---

# Research Phase

Background investigation before implementation planning.

## Artifact

**ID Format**: `RES-XXX`
**Location**: `dev_ops/research/`
**Template**: `templates/research.md`

## Frontmatter

```yaml
---
id: RES-001
title: Research Title
type: research
upstream: [TASK-001]
downstream: [PLN-001, ADR-001]
---
```

## How to Conduct Research

1. **Create Research Artifact**:

   ```bash
   python3 dev_ops/scripts/doc_ops.py create research --title "Topic"
   ```

   This generates `dev_ops/research/RES-XXX-topic.md`

2. **Investigate**:
   - Use Context7 MCP for library/framework documentation (if available)
   - Use Paper Search MCP for academic papers (if available)
   - Use Web Search for broader understanding (if available)
   - Check codebase for existing patterns with GitHub MCP (if available)

3. **Document Findings**:
   - **Question**: What are we investigating?
   - **Context**: Why are we researching this? Link to task/bug
   - **Findings**: Pros/cons, data, analysis with sources
   - **Recommendation**: Suggested next steps

4. **Link to Task**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py downstream TASK-XXX RES-XXX
   ```

## When to Create ADR

Create an Architectural Decision Record when:

- Choosing between competing technologies/approaches
- Making decisions that affect system architecture
- Establishing patterns that future code must follow

**Create ADR**:

```bash
python3 dev_ops/scripts/doc_ops.py create adr --title "Decision Title"
```

**ADR Structure**:

- **Status**: `proposed` → `accepted` (after review)
- **Context**: Problem and why decision is needed (link to RES-XXX)
- **Decision**: Clear statement of the choice made
- **Consequences**: Pros, cons, and risks

**Superseding ADRs**:

If an existing ADR is outdated:

1. Create new ADR referencing the old one
2. Update old ADR: `status: superseded`, `superseded_by: ADR-YYY`

## Standards

- Every research needs frontmatter with linked artifacts
- Include sources with citations
- Summarize findings clearly
- List downstream artifacts (usually plans or ADRs)

## Exit Criteria

- [ ] RES-XXX created in `dev_ops/research/`
- [ ] Findings and recommendations documented
- [ ] ADR created if decision was made
- [ ] Linked to task upstream
- [ ] Move task to Planning
