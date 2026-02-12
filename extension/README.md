# DevOps Framework Extension

A VS Code extension providing a Board board for AI-assisted development workflows.
Part of the DevOps Framework for structured task management and artifact tracking.

## Features

- **Board storage** in `dev_ops/board.json`, automatically created with
  default columns if missing
- **6-column workflow**: Backlog → Understand → Plan → Implement → Verify → Done
- **Dual views**: List view for compact navigation, Board view for drag-and-drop
- **Task dependencies**: Track upstream (inputs) and downstream (outputs) artifacts
- **Agent-ready commands** for automation integration
- **Plan importer**: Import Markdown/JSON plans as tasks

## Commands

| Command | Description |
| --- | --- |
| `devops.initialize` | Initialize DevOps framework in workspace |
| `board.openBoard` | Open board JSON for editing |
| `board.getTasks` | Export board JSON for agents to parse |
| `board.pickNextTask` | Suggest next task by priority/recency |
| `board.showTaskDetails` | Show task summary with entry points |
| `board.createTask` | Create a new task |
| `board.moveTask` | Move task to another column |
| `board.markTaskInProgress` | Move to In Progress column |
| `board.markTaskBlocked` | Move to Blocked column |
| `board.markTaskDone` | Move to Done column |
| `board.filterTasks` | Apply text/tag filter |
| `board.toggleAgentReadyFilter` | Filter to agent-ready tasks |
| `board.importPlan` | Import plan file as tasks |
| `board.viewTaskHistory` | View task history file |

## Board Schema

`dev_ops/board.json`:

```jsonc
{
  "version": 1,
  "columns": [
    { "id": "col-backlog", "name": "Backlog", "position": 1 },
    { "id": "col-understand", "name": "Understand", "position": 2 },
    { "id": "col-plan", "name": "Plan", "position": 3 },
    { "id": "col-implement", "name": "Implement", "position": 4 },
    { "id": "col-verify", "name": "Verify", "position": 5 },
    { "id": "col-done", "name": "Done", "position": 6 }
  ],
  "items": [
    {
      "id": "TASK-001",
      "columnId": "col-backlog",
      "title": "Implement auth module",
      "summary": "Add JWT authentication to API",
      "priority": "high",
      "agentReady": true,
      "upstream": ["RES-001"],
      "downstream": ["PLN-001"],
      "updatedAt": "2025-12-18T12:00:00Z"
    }
  ]
}
```

## Task Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (TASK-XXX format) |
| `columnId` | string | Column ID (determines status) |
| `title` | string | Task title |
| `summary` | string | Brief description |
| `priority` | string | high, medium, low |
| `agentReady` | boolean | Ready for agent execution |
| `upstream` | string[] | Input artifact IDs |
| `downstream` | string[] | Output artifact IDs |
| `workflow` | string | Associated workflow path |
| `entryPoints` | string[] | Related file paths |
| `acceptanceCriteria` | string[] | Completion criteria |
| `checklist` | string[] | Sub-task checklist |

## Column = Status

Tasks don't have a separate `status` field. The column determines status:

| Column | Meaning |
|--------|---------|
| Backlog | Not started |
| Understand | Researching, creating RES-XXX |
| Plan | Creating PLN-XXX with checklist |
| Implement | TDD implementation |
| Verify | Quality gates, PR |
| Done | Complete |

## Integration with Python CLI

The extension works with `dev_ops/scripts/board_ops.py`:

```bash
# List tasks
python3 dev_ops/scripts/board_ops.py list --column col-backlog

# Create task
python3 dev_ops/scripts/board_ops.py create --title "Task name"

# Claim task
python3 dev_ops/scripts/board_ops.py claim TASK-001

# Complete task
python3 dev_ops/scripts/board_ops.py done TASK-001 --outputs "PLN-001"

# Add dependencies
python3 dev_ops/scripts/board_ops.py upstream TASK-001 "RES-001"
python3 dev_ops/scripts/board_ops.py downstream TASK-001 "PLN-001"
```

## Development

```bash
cd extension
pnpm install
pnpm run compile
```

## License

MIT
