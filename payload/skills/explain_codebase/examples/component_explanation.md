# Component Explanation Example

### BoardOpsService

**Purpose**
> Manages the Kanban board state, handling task creation, movement between columns, and status updates.

**Context**
> Central service used by CLI (`board_ops.py`), VS Code extension, and workflows. All task state changes flow through this service.

**Inner Workings**

The service operates on two JSON files:
- `board/board.json` - Task metadata and board configuration
- `board/columns.json` - Column definitions and task ordering

Key operations:

1. **Task Creation**: Generates unique TASK-XXX ID, creates task file, adds to backlog column
2. **Task Movement**: Updates column reference, validates phase transitions, commits changes
3. **Task Claiming**: Sets owner, updates `.current_task`, changes status to `agent_active`

State is persisted after each operation with optional git commit.

**Key Components**

- `create_task()` - Create new task with required fields
- `move_task()` - Move task between columns with validation
- `claim_task()` - Assign task to developer/agent
- `get_task()` - Retrieve task by ID
- `list_tasks()` - Query tasks by column/status

**Dependencies**

- External: `pyyaml` for frontmatter parsing, `gitpython` for commits
- Internal: `git_ops.py` for atomic commits, `utils.py` for ID generation

**Usage Example**

```python
from scripts.board_ops import BoardOpsService

service = BoardOpsService(board_path=".dev_ops/board")

# Create a task
task = service.create_task(
    title="Implement login",
    summary="Add email/password login",
    priority="high",
    commit=True
)

# Move to next phase
service.move_task(task.id, "col-understand", commit=True)
```
