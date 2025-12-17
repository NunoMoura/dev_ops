---
description: Link an artifact or file to an existing task.
---

# Link Artifact Workflow

## Purpose

Associate a file or document with a Kanban task for traceability.
Linked artifacts appear in the task's `entryPoints`.

## Prerequisites

- [ ] Task exists on the board
- [ ] Artifact file exists

## Steps

1. **Link Single Artifact**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py link task-001 "PLN-001.md"
   ```

   Output: `✅ Linked PLN-001.md to task-001`

2. **Link Multiple Artifacts** (run multiple times):

   ```bash
   python3 dev_ops/scripts/kanban_ops.py link task-001 "RES-001.md"
   python3 dev_ops/scripts/kanban_ops.py link task-001 "src/feature.py"
   ```

3. **Via VS Code** (alternative):
   - Open Card Details for the task
   - Add files to Entry Points field

## Common Artifact Types

| Prefix | Type | Example |
|--------|------|---------|
| PLN | Plan | `PLN-001-auth-module.md` |
| RES | Research | `RES-002-caching.md` |
| ADR | Decision | `ADR-003-jwt-strategy.md` |
| FEAT | Feature | `FEAT-001-user-auth.md` |
| BUG | Bug | `BUG-004-login-error.md` |

## Exit Criteria

- [ ] Artifact added to task's `entryPoints`
- [ ] Artifact visible in Card Details view
