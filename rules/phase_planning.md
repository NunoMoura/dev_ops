---
activation_mode: Model Decides
description: Planning phase - design before implementation.
---

# Planning Phase

Design and break down implementation before coding.

## Artifact

**ID Format**: `PLN-XXX`
**Location**: `dev_ops/plans/`
**Template**: `templates/plan.md`

## Frontmatter

```yaml
---
id: PLN-001
title: Implementation Plan
type: plan
upstream: [RES-001, ADR-001]
downstream: []
linked_tasks: [TASK-001]
---
```

## How to Create a Plan

1. **Gather Context**:
   - Review upstream research (`RES-XXX`) and decisions (`ADR-XXX`)
   - Research library capabilities (use Context7 MCP if available)
   - Check existing code patterns (use GitHub MCP if available)

2. **Create Plan Artifact**:

   ```bash
   python3 dev_ops/scripts/doc_ops.py create plan --title "Plan Title"
   ```

   This generates `dev_ops/plans/PLN-XXX-plan-title.md`

3. **Fill In Details**:
   - **Goal**: High-level objective
   - **Context**: Summary of *why* we are doing this, link to research
   - **Proposed Changes**: Group by component, list files to modify/create
   - **Verification**: How to verify success (tests, manual checks)
   - **Related**: IDs of all upstream artifacts

4. **Link to Task**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py downstream TASK-XXX PLN-XXX
   ```

5. **Link to Component**:

   Set the `component` field in the plan frontmatter:

   ```yaml
   component: architecture/domain/users/auth.md
   ```

   Update the component doc's Context section to reference this plan.

## Plan Structure

```markdown
# PLN-XXX - Title

## Goal
What we're building and why

## Context
Summary of research and decisions informing this plan.
References: RES-XXX, ADR-XXX

## Proposed Changes

### Component 1
- [ ] Create `src/module/file.py`
- [ ] Modify `src/api/routes.py`

### Component 2
- [ ] Add tests in `tests/module/`

## Entry Points
- `src/module/file.py` - main implementation
- `tests/module/test_file.py` - test coverage

## Acceptance Criteria
- [ ] Feature works as specified
- [ ] Tests pass
- [ ] Documentation updated

## Risks
- Risk 1: mitigation strategy
```

## Standards

- Reference upstream research and ADRs
- Break work into discrete, testable tasks
- Define acceptance criteria
- List entry points (files to modify)
- Include risk assessment

## Exit Criteria

- [ ] PLN-XXX created in `dev_ops/plans/`
- [ ] Context and proposed changes filled out
- [ ] Linked to research/ADR upstream
- [ ] Plan reviewed (if required)
- [ ] Move task to In Progress
