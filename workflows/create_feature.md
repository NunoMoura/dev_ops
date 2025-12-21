---
description: Create a Feature specification and break it into board tasks
---

# Create Feature

Create a feature specification that defines scope and breaks into board tasks.

## Steps

1. **Create Feature artifact**:

   ```bash
   python3 dev_ops/scripts/doc_ops.py create feature --title "Feature Name"
   ```

2. **Fill in sections** using `templates/feature.md`:
   - Summary — What the feature does
   - User Stories — Who benefits and how
   - Acceptance Criteria — Definition of done
   - Technical Notes — Implementation hints
   - Risks — What could go wrong

3. **Break into tasks**:
   For each acceptance criterion or technical item:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py create \
     --title "Implement X" \
     --summary "From FEAT-XXX: acceptance criterion Y"
   ```

4. **Link artifacts**:

   ```bash
   # Link feature as upstream dependency on task
   python3 dev_ops/scripts/kanban_ops.py upstream TASK-XXX FEAT-XXX
   ```

5. **Update feature status**:
   - Change status to "In Progress" when tasks start
   - Link created TASK-XXX IDs in `linked_tasks` field

## Template

See [templates/feature.md](file:///templates/feature.md)

## Output

- `dev_ops/features/FEAT-XXX.md` — Feature specification
- Multiple TASK-XXX items on Kanban board
- Upstream/downstream links established
