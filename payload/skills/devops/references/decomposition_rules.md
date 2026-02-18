# Recursive Decomposition Rules

> How to break down complex tasks into manageable chunks.

## The Node vs. Leaf Concept

Every task is either a **Node** (Manager) or a **Leaf** (Worker).

### Node (Manager)

- **Role**: Coordinates sub-tasks.
- **Output**: Updated parent `SPEC.md` + Child Tasks.
- **Tool**: `node .dev_ops/scripts/devops.js create-task`
- **Constraint**: CANNOT modify implementation files. Can only modify its own level's `SPEC.md`.

### Leaf (Worker)

- **Role**: Implements the actual code.
- **Output**: Working software matching the Spec.
- **Tool**: `write_to_file`
- **Constraint**: CANNOT create sub-tasks (unless scope expands).

## Decomposition Process

1. **Analyze**: Does this change affect multiple sub-components?
    - **Yes**: You are a Node. Delegate to children.
    - **No**: You are a Leaf. Do the work.

2. **Delegate**:
    - For each affected child component, create a new task.
    - Task Title: "Update [Child Name] Spec to match [Parent] changes".
    - Task Dependency: The current task depends on the child tasks.

3. **Link**:
    - Update the current task's `dependsOn` list in `.dev_ops/tasks/[ID]/task.md` with the new child task IDs.

## Constraint Checklist

- [ ] Did I modify code in a Node task? (Forbidden)
- [ ] Did I try to solve everything in one task? (Forbidden)
- [ ] Did I create child tasks for all necessary components? (Required)
