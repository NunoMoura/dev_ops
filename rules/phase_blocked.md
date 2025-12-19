---
activation_mode: Model Decides
description: Blocked phase - dependency handling.
---

# Blocked Phase

Tasks waiting on external dependencies.

## Purpose

Hold tasks that cannot progress due to:

- Missing prerequisite tasks
- Awaiting human approval
- External dependencies
- Unresolved blockers

## Standards

### Document Blocker

Add note to task explaining:

- What is blocking
- Who/what can unblock
- Expected resolution time

### Move to Blocked

```bash
python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-blocked
```

### Check Blockers Daily

Before starting new work:

```bash
python3 dev_ops/scripts/kanban_ops.py list --column col-blocked
```

Review if any blockers are resolved.

## Unblocking

When blocker resolved:

1. Update task notes
2. Move back to previous column:

```bash
python3 dev_ops/scripts/kanban_ops.py move TASK-XXX col-inprogress
```

## Exit Criteria

- [ ] Blocker resolved
- [ ] Task moved to appropriate column
- [ ] Notes updated with resolution
