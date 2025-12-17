---
description: Create a feature specification from an idea.
---

# Create Feature Workflow

## Purpose

Document and structure a feature idea before it becomes an implementation plan.
Features capture user stories, acceptance criteria, and risks upfront.

## Prerequisites

- [ ] An idea or feature request identified
- [ ] Optional: Kanban task in "Idea" or "Working" column

## Relations

- **Upstream**:
  - **Task**: Kanban task tracking this work
  - **Research**: `RES-XXX` (if research was done first)
- **Downstream**:
  - **Plan**: `PLN-XXX` (implementation plan)
  - **ADR**: `ADR-XXX` (architectural decisions)

## Template

Use [feature.md](file:///home/nunoc/projects/dev_ops/templates/feature.md).

**Example fill-in**:

- **Summary**: "Add user authentication to protect API endpoints"
- **User Stories**:

  ```markdown
  - As an API consumer, I want secure endpoints so that my data is protected.
  ```

- **Acceptance Criteria**:

  ```markdown
  - [ ] JWT tokens issued on login
  - [ ] Protected endpoints return 401 without token
  ```

## Steps

1. **Create the Feature Doc**:

   ```bash
   python3 dev_ops/scripts/doc_ops.py create feature --title "Feature Name"
   ```

2. **Fill in Details**:
   - **Summary**: One paragraph describing the feature
   - **User Stories**: Who benefits and how
   - **Acceptance Criteria**: Measurable conditions for done
   - **Risks**: What could go wrong

3. **Link to Kanban Task** (if applicable):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py link TASK-XXX "FEAT-XXX.md"
   ```

4. **Move to Plan** (when ready):
   - Use `/plan` workflow to create implementation plan
   - Reference this feature in the plan's Context section

## Exit Criteria

- [ ] Feature doc created in `dev_ops/docs/features/`
- [ ] User stories and acceptance criteria defined
- [ ] Linked to Kanban task (if tracked)
