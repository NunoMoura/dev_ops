# Recursive Decomposition Rules

> How to break down complex tasks into manageable chunks.

## The Node vs. Leaf Concept

Every task is either a **Node** (Manager) or a **Leaf** (Worker).

### Node (Manager)

- **Role**: Coordinates sub-tasks.
- **Output**: Updated parent `SPEC.md` + Child Tasks.
- **Tool**: `node .dev_ops/scripts/devops.js create-task --parent-id TASK-XXX`
- **Constraint**: CANNOT modify implementation files. Can only modify its own level's `SPEC.md`.

### Leaf (Worker)

- **Role**: Implements the actual code.
- **Output**: Working software matching the Spec.
- **Tool**: `write_to_file`
- **Constraint**: CANNOT create sub-tasks (unless scope expands). Max nesting depth: 2 levels.

---

## Decomposition Triggers

Decompose a task into sub-tasks when **any** of these conditions are true during the **Plan** phase:

| # | Trigger | Example |
|---|---------|---------|
| 1 | **Multiple independent components** need changes | API + DB + UI all need work |
| 2 | **Estimated implementation > ~400 lines** of new code | Large feature spanning multiple files |
| 3 | **Different expertise domains** are involved | Frontend vs. infrastructure vs. data modeling |
| 4 | **Natural parallelism** exists — sub-tasks can run concurrently | DB schema + API endpoints can be done independently |
| 5 | **Different verification strategies** are needed | Unit tests vs. E2E vs. visual review |

> **Heuristic**: If your `SPEC.md` touches more than 2 unrelated component specs — you are a **Node**. Stop and decompose.

---

## Checklist vs. Sub-Task

This is the most important distinction in the decomposition model:

| Concept | When to use | Lifecycle |
|---------|-------------|-----------|
| **Checklist item** | Step can be done within ONE agent session in ONE phase | Lives on the task card |
| **Sub-task** | Step needs its own Understand → Plan → Implement → Verify cycle | Independent task card on the board |

**Rule**: If a step requires a fresh context window, its own research, or its own verification — it's a sub-task, not a checklist item.

### Parent Checklist = Tracking Overview

When a Node task decomposes, its checklist becomes a **progress tracker** for child tasks:

```markdown
## Checklist (Parent TASK-040)
- [ ] TASK-042: User DB Schema → col-backlog
- [ ] TASK-043: Profile API Endpoints → col-backlog
- [ ] TASK-044: Profile UI Components → col-backlog
```

Each child task gets its own **operational checklist** — the steps the agent actually executes.

---

## Decomposition Process

1. **Analyze**: Does this change affect multiple sub-components?
    - **Yes**: You are a Node. Delegate to children.
    - **No**: You are a Leaf. Do the work.

2. **Delegate**:
    - For each affected child component, create a new sub-task:

      ```bash
      node .dev_ops/scripts/devops.js create-task \
        --title "Implement [Child Name]" \
        --parent-id TASK-XXX
      ```

    - This automatically: sets `parentId` on the child, adds a tracking checklist entry to the parent, and blocks the parent.

3. **Link** (optional, for ordering):
    - Use `--depends-on` to declare execution order between siblings.

---

## Parent Lifecycle

| State | Condition |
|-------|-----------|
| `blocked` | Parent is auto-blocked when first child is created |
| Stays in **Plan** column | Parent waits while children flow through the pipeline |
| Unblocked → **Verify** | When all children reach Done (auto if `autoUnblockParent: true` in config) |
| **Done** | Parent validates the integrated result of all children |

---

## Constraint Checklist

- [ ] Did I modify code in a Node task? (Forbidden)
- [ ] Did I try to solve everything in one task? (Forbidden)
- [ ] Did I create child tasks for all necessary components? (Required)
- [ ] Did I exceed 2 levels of nesting? (Forbidden — escalate to human)
