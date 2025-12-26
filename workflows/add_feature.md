---
description: Add a feature and decompose it into backlog tasks.
---

# Add Feature

Create a feature specification and break it into backlog tasks.

## Steps

1. **Create Feature artifact**:

   ```bash
   python3 dev_ops/scripts/artifact_ops.py create feature --title "Feature Name"
   ```

2. **Fill in sections** (see `templates/feature.md`):
   - Summary — What the feature does
   - User Stories — Who benefits and how
   - Acceptance Criteria — Definition of done
   - Technical Notes — Implementation hints

3. **Decompose into tasks**:

   For each acceptance criterion:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py create \
     --title "Implement X" \
     --trigger FEAT-XXX
   ```

4. **Link artifacts**:

   The `--trigger` flag automatically links FEAT-XXX as the task's trigger.

## Output

- `dev_ops/features/FEAT-XXX.md` — Feature specification
- Multiple TASK-XXX items in Backlog
