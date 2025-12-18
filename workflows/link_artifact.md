---
description: Link an artifact as upstream or downstream dependency of a task.
---

# Link Artifact Workflow

## Purpose

Associate artifacts with a Kanban task for traceability.

- **Upstream**: Artifacts this task depends on (inputs)
- **Downstream**: Artifacts this task produces (outputs)

## Prerequisites

- [ ] Task exists on the board
- [ ] Artifact file exists

## Steps

1. **Add Upstream Dependency** (input):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py upstream TASK-001 "RES-001"
   ```

   Output: `✅ Added upstream RES-001 to TASK-001`

2. **Add Downstream Output**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py downstream TASK-001 "PLN-001"
   ```

   Output: `✅ Added downstream PLN-001 to TASK-001`

3. **Via VS Code** (alternative):
   - Open Card Details for the task
   - Add artifacts to Upstream/Downstream fields

## Common Artifact Types

| Prefix | Type | Example |
|--------|------|---------|
| PLN | Plan | `PLN-001-auth-module` |
| RES | Research | `RES-002-caching` |
| ADR | Decision | `ADR-003-jwt-strategy` |

## Exit Criteria

- [ ] Artifact added to task's upstream or downstream
- [ ] Artifact visible in Card Details view
