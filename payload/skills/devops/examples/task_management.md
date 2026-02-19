# Task Management Examples

This guide demonstrates how the agent can autonomously manage the task board using the provided CLI tools.

## 1. Updating Task Status & Content

**Scenario**: The agent has completed a sub-task and needs to mark checking items and update the description.

**Command**: `update-task`

```bash
# Add a checklist item
./scripts/update-task.sh --id TASK-123 --add-checklist "Review PR #42"

# Mark a checklist item as done
./scripts/update-task.sh --id TASK-123 --check-item "Review PR #42"

# Update status to 'verify'
./scripts/update-task.sh --id TASK-123 --status verify --title "Fix Login Bug (Reviewing)"
```

## 2. Reading Task Context

**Scenario**: The agent needs to understand the full context of a task, including its dependencies and current checklist state, before proceeding.

**Command**: `read-task`

```bash
# Get full JSON object of the task
./scripts/read-task.sh --id TASK-123
```

**Output Example**:

```json
{
  "id": "TASK-123",
  "title": "Fix Login Bug",
  "status": "in_progress",
  "checklist": [
    { "text": "Reproduce issue", "done": true },
    { "text": "Write failing test", "done": true },
    { "text": "Implement fix", "done": false }
  ]
}
```

## 3. Finding Work (Self-Assignment)

**Scenario**: The agent is idle and looks for blocked tasks to unblock or new work from the backlog.

**Command**: `list-tasks`

```bash
# Find blocked tasks
./scripts/list-tasks.sh --status blocked

# Find backlog tasks
./scripts/list-tasks.sh --column col-backlog
```

## 4. Creating Sub-Tasks (Decomposition)

**Scenario**: A high-level task is too complex and needs to be broken down.

**Command**: `create-task`

```bash
# Create a child task
./scripts/create-task.sh --parent-id TASK-100 --title "Implement Auth Service" --summary "Setup JWT handling"
```
