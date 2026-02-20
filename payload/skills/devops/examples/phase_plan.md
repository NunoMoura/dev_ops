# Example: Plan Phase

**Goal:** Convert research into a concrete checklist and task decomposition.

**Inputs:**

1. `RES-XXX.md` from the Understand phase.
2. `SPEC.md` headers for affected areas.

**Actions:**

1. Agent reads `RES-XXX.md` for context.
2. Agent updates `.dev_ops/tasks/TASK-XXX/task.md` checklist to define the implementation steps required.
3. Agent uses `create-task --parent-id TASK-XXX` to split work into sub-tasks (e.g., frontend sub-task, backend sub-task) if necessary.

**Output:**

1. A populated checklist in your current `task.md`:

```markdown
## Checklist
- [ ] Install Auth0 Node SDK
- [ ] Add Google provider to `AuthService.ts`
- [ ] Update frontend login widget
```

1. (Optional) Updated local `SPEC.md` if scaffolding a new component:

```markdown
---
title: "Auth Service"
type: spec
---

# Auth Service

## Overview
Handles user sessions and OAuth integrations.

## API / Key Exports
| Name | Type | Description |
|------|------|-------------|
| `login` | `function` | Initiates OAuth flow |
```

**Next Action:**
The agent STOPS and waits for the human to review the checklist and move the card(s) to the Implement phase.
