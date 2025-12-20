#!/usr/bin/env python3
"""
Kanban Operations - Task management for DevOps Framework.

Provides Python functions to interact with the Kanban board stored at
dev_ops/kanban/board.json. Supports task prerequisites, completion criteria,
and artifact linking with identifiers.

Column = Workflow phase, Status = Autonomy state:
- Columns: Backlog, Research, Planning, Implementing, Review, Testing, Done
- Status: todo, in_progress, blocked, pending, done
"""

import argparse
import json
import os
from datetime import datetime
from typing import Any, Optional

# Valid priority values
VALID_PRIORITIES = frozenset({"high", "medium", "low", "p0", "p1", "p2"})


def _load_default_columns() -> list[dict]:
    """Load default columns from shared columns.json."""
    # Look for columns.json relative to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Try framework root first (one level up from scripts/)
    columns_path = os.path.join(os.path.dirname(script_dir), "columns.json")

    if os.path.exists(columns_path):
        try:
            with open(columns_path) as f:
                data = json.load(f)
                return data.get("columns", [])
        except json.JSONDecodeError:
            print(f"⚠️ Warning: Check {columns_path} - Invalid JSON. Using defaults.")

    # Fallback to hardcoded if file not found or invalid
    return [
        {"id": "col-backlog", "name": "Backlog", "position": 1},
        {"id": "col-research", "name": "Research", "position": 2},
        {"id": "col-planning", "name": "Planning", "position": 3},
        {"id": "col-implementing", "name": "Implementing", "position": 4},
        {"id": "col-review", "name": "Review", "position": 5},
        {"id": "col-testing", "name": "Testing", "position": 6},
        {"id": "col-done", "name": "Done", "position": 7},
    ]


# Default column definitions (loaded from columns.json)
DEFAULT_COLUMNS = _load_default_columns()


def get_board_path(project_root: Optional[str] = None) -> str:
    """Get the path to the Kanban board JSON file."""
    if project_root is None:
        # Assume script is in [project]/dev_ops/scripts/
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
    return os.path.join(project_root, "dev_ops", "kanban", "board.json")


def load_board(project_root: Optional[str] = None) -> dict:
    """Load the Kanban board from JSON file."""
    board_path = get_board_path(project_root)
    if not os.path.exists(board_path):
        return {"version": 1, "columns": DEFAULT_COLUMNS.copy(), "items": []}
    with open(board_path) as f:
        board = json.load(f)
    # Ensure columns exist
    if not board.get("columns"):
        board["columns"] = DEFAULT_COLUMNS.copy()
    return board


def save_board(board: dict, project_root: Optional[str] = None) -> None:
    """Save the Kanban board to JSON file."""
    board_path = get_board_path(project_root)
    os.makedirs(os.path.dirname(board_path), exist_ok=True)
    with open(board_path, "w") as f:
        json.dump(board, f, indent=2)


def get_column_name(board: dict, column_id: str) -> str:
    """Get column name from column ID."""
    for col in board.get("columns", []):
        if col.get("id") == column_id:
            return col.get("name", "Unknown")
    return "Unknown"


def get_tasks(
    project_root: Optional[str] = None,
    column_id: Optional[str] = None,
    status: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Get tasks from the board, optionally filtered by column or status."""
    board = load_board(project_root)
    tasks = board.get("items", [])

    if column_id:
        tasks = [t for t in tasks if t.get("columnId") == column_id]
    if status is not None:
        tasks = [t for t in tasks if t.get("status") == status]

    return tasks


def create_task(
    title: str,
    summary: str = "",
    workflow: Optional[str] = None,
    priority: str = "medium",
    status: str = "todo",
    assignee: Optional[str] = None,
    upstream: Optional[list[str]] = None,
    downstream: Optional[list[str]] = None,
    column_id: str = "col-backlog",
    project_root: Optional[str] = None,
) -> str:
    """Create a new task on the Kanban board. Returns the task ID."""
    # Validate priority
    if priority.lower() not in VALID_PRIORITIES:
        raise ValueError(
            f"Invalid priority: {priority}. Must be one of: {', '.join(sorted(VALID_PRIORITIES))}"
        )

    board = load_board(project_root)

    # Generate unique ID (TASK-XXX format)
    existing_ids = [t.get("id", "") for t in board.get("items", [])]
    task_num = 1
    while f"TASK-{task_num:03d}" in existing_ids:
        task_num += 1
    task_id = f"TASK-{task_num:03d}"

    task = {
        "id": task_id,
        "columnId": column_id,
        "title": title,
        "summary": summary,
        "workflow": workflow,
        "priority": priority,
        "status": status,
        "assignee": assignee,
        "upstream": upstream or [],
        "downstream": downstream or [],
        "prerequisites": {"tasks": [], "approvals": []},
        "completionCriteria": {"artifacts": [], "tests": False, "review": False},
        "updatedAt": datetime.utcnow().isoformat() + "Z",
    }

    if "items" not in board:
        board["items"] = []
    board["items"].append(task)
    save_board(board, project_root)

    print(f"✅ Created task: {task_id} - {title}")
    return task_id


def add_upstream(
    task_id: str,
    artifact_id: str,
    project_root: Optional[str] = None,
) -> bool:
    """Add an upstream dependency to a task."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            if "upstream" not in task:
                task["upstream"] = []
            if artifact_id not in task["upstream"]:
                task["upstream"].append(artifact_id)
                task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
                save_board(board, project_root)
                print(f"✅ Added upstream {artifact_id} to {task_id}")
                return True
    print(f"⚠️ Task {task_id} not found")
    return False


def add_downstream(
    task_id: str,
    artifact_id: str,
    project_root: Optional[str] = None,
) -> bool:
    """Add a downstream dependency to a task."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            if "downstream" not in task:
                task["downstream"] = []
            if artifact_id not in task["downstream"]:
                task["downstream"].append(artifact_id)
                task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
                save_board(board, project_root)
                print(f"✅ Added downstream {artifact_id} to {task_id}")
                return True
    print(f"⚠️ Task {task_id} not found")
    return False


def move_to_column(task_id: str, column_id: str, project_root: Optional[str] = None) -> bool:
    """Move a task to a specific column."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["columnId"] = column_id
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            save_board(board, project_root)
            column_name = get_column_name(board, column_id)
            print(f"✅ Moved {task_id} to {column_name}")
            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def mark_implementing(task_id: str, project_root: Optional[str] = None) -> bool:
    """Move a task to Implementing column."""
    return move_to_column(task_id, "col-implementing", project_root)


def set_status(task_id: str, status: str, project_root: Optional[str] = None) -> bool:
    """Set the status of a task (todo, in_progress, blocked, pending, done)."""
    valid_statuses = {"todo", "in_progress", "blocked", "pending", "done"}
    if status not in valid_statuses:
        print(f"⚠️ Invalid status: {status}. Must be one of: {', '.join(valid_statuses)}")
        return False

    board = load_board(project_root)
    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["status"] = status
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            save_board(board, project_root)
            print(f"✅ Set {task_id} status to {status}")
            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def checklist_add(task_id: str, item: str, project_root: Optional[str] = None) -> bool:
    """Add a checklist item to a task."""
    board = load_board(project_root)
    for task in board.get("items", []):
        if task.get("id") == task_id:
            checklist = task.get("checklist", [])
            checklist.append({"text": item, "done": False})
            task["checklist"] = checklist
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            save_board(board, project_root)
            print(f"✅ Added checklist item to {task_id}: {item}")
            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def checklist_complete(task_id: str, index: int, project_root: Optional[str] = None) -> bool:
    """Mark a checklist item as complete by index (0-based)."""
    board = load_board(project_root)
    for task in board.get("items", []):
        if task.get("id") == task_id:
            checklist = task.get("checklist", [])
            if 0 <= index < len(checklist):
                checklist[index]["done"] = True
                task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
                save_board(board, project_root)
                print(f"✅ Completed checklist item {index}: {checklist[index]['text']}")
                return True
            else:
                print(f"⚠️ Invalid index {index}. Checklist has {len(checklist)} items.")
                return False
    print(f"⚠️ Task {task_id} not found")
    return False


def checklist_list(task_id: str, project_root: Optional[str] = None) -> list:
    """List all checklist items for a task."""
    board = load_board(project_root)
    for task in board.get("items", []):
        if task.get("id") == task_id:
            checklist = task.get("checklist", [])
            if not checklist:
                print(f"ℹ️ Task {task_id} has no checklist items.")
                return []
            for i, item in enumerate(checklist):
                status = "✓" if item.get("done") else " "
                print(f"  [{status}] {i}: {item.get('text', '')}")
            return checklist
    print(f"⚠️ Task {task_id} not found")
    return []


def replace_task(
    task_id: str,
    new_titles: list[str],
    project_root: Optional[str] = None,
) -> list[str]:
    """Replace a task with multiple simpler tasks. Returns IDs of new tasks."""
    board = load_board(project_root)
    new_ids = []

    # Find original task
    original_task = None
    for task in board.get("items", []):
        if task.get("id") == task_id:
            original_task = task
            break

    if not original_task:
        print(f"⚠️ Task {task_id} not found")
        return []

    # Get existing task IDs for unique ID generation
    existing_ids = [t.get("id", "") for t in board.get("items", [])]
    task_num = 1
    while f"TASK-{task_num:03d}" in existing_ids:
        task_num += 1

    # Create new tasks with properties from original
    for title in new_titles:
        new_id = f"TASK-{task_num:03d}"
        existing_ids.append(new_id)
        task_num += 1
        new_task = {
            "id": new_id,
            "columnId": original_task.get("columnId", "col-backlog"),
            "title": title,
            "summary": f"Split from {task_id}: {original_task.get('title', '')}",
            "priority": original_task.get("priority"),
            "status": "todo",
            "upstream": [task_id],  # Link to original as reference
            "updatedAt": datetime.utcnow().isoformat() + "Z",
        }
        board["items"].append(new_task)
        new_ids.append(new_id)
        print(f"✅ Created {new_id}: {title}")

    # Mark original as archived/done
    original_task["status"] = "done"
    original_task["summary"] = f"[SPLIT] Replaced by: {', '.join(new_ids)}"
    original_task["updatedAt"] = datetime.utcnow().isoformat() + "Z"

    save_board(board, project_root)
    print(f"✅ Marked original {task_id} as done (split into {len(new_ids)} tasks)")
    return new_ids


def create_pr(
    task_id: str,
    title: Optional[str] = None,
    body: Optional[str] = None,
    project_root: Optional[str] = None,
) -> Optional[str]:
    """Create a Pull Request using GitHub CLI. Returns PR URL if successful."""
    import subprocess

    board = load_board(project_root)
    task = None
    for t in board.get("items", []):
        if t.get("id") == task_id:
            task = t
            break

    if not task:
        print(f"⚠️ Task {task_id} not found")
        return None

    # Build PR title and body from task
    pr_title = title or f"{task_id}: {task.get('title', 'No title')}"
    pr_body_parts = [
        f"## Task: {task.get('title')}",
        "",
        task.get("summary", ""),
        "",
        f"Task ID: `{task_id}`",
    ]
    if task.get("workflow"):
        pr_body_parts.append(f"Workflow: `{task.get('workflow')}`")
    if task.get("upstream"):
        pr_body_parts.append(f"Upstream: {', '.join(task.get('upstream'))}")
    if task.get("downstream"):
        pr_body_parts.append(f"Downstream: {', '.join(task.get('downstream'))}")

    pr_body = body or "\n".join(pr_body_parts)

    try:
        result = subprocess.run(
            ["gh", "pr", "create", "--title", pr_title, "--body", pr_body],
            capture_output=True,
            text=True,
            cwd=project_root,
        )
        if result.returncode == 0:
            pr_url = result.stdout.strip()
            print(f"✅ Pull Request created: {pr_url}")

            # Add PR URL to task's downstream
            if "downstream" not in task:
                task["downstream"] = []
            if pr_url not in task["downstream"]:
                task["downstream"].append(pr_url)
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            save_board(board, project_root)

            return pr_url
        else:
            print(f"⚠️ Failed to create PR: {result.stderr}")
            return None
    except FileNotFoundError:
        print("⚠️ GitHub CLI (gh) not found. Please install it first.")
        return None


def mark_done(
    task_id: str,
    outputs: Optional[list] = None,
    create_pr_flag: bool = False,
    capture_sha: bool = True,
    project_root: Optional[str] = None,
) -> bool:
    """Move a task to Done column and optionally add output artifacts."""
    import subprocess

    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["columnId"] = "col-done"
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"

            # Capture commit SHA if requested
            if capture_sha:
                try:
                    result = subprocess.run(
                        ["git", "rev-parse", "HEAD"],
                        capture_output=True,
                        text=True,
                        cwd=project_root or os.getcwd(),
                    )
                    if result.returncode == 0:
                        task["commitSha"] = result.stdout.strip()[:7]
                except Exception:
                    pass  # Git not available or not in a repo

            if outputs:
                if "downstream" not in task:
                    task["downstream"] = []
                for output in outputs:
                    if output not in task["downstream"]:
                        task["downstream"].append(output)
            save_board(board, project_root)

            sha_info = f" (commit: {task.get('commitSha', 'N/A')})" if capture_sha else ""
            print(f"✅ Marked {task_id} as done{sha_info}")

            # Create PR if requested
            if create_pr_flag:
                create_pr(task_id, project_root=project_root)

            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def pick_task(project_root: Optional[str] = None) -> Optional[dict]:
    """Pick the next available task based on priority and column.

    Selection criteria:
    1. In Backlog column (not yet started)
    2. Status is 'todo' (ready to work on)
    3. Priority order: high > medium > low
    4. Oldest updatedAt wins ties
    """
    tasks = get_tasks(project_root=project_root, column_id="col-backlog", status="todo")

    if not tasks:
        print("ℹ️ No tasks available in Backlog")
        return None

    # Sort by priority (high first), then by updatedAt (oldest first)
    priority_order = {"high": 0, "p0": 0, "medium": 1, "p1": 1, "low": 2, "p2": 2}
    tasks.sort(
        key=lambda t: (
            priority_order.get(t.get("priority", "medium"), 1),
            t.get("updatedAt", ""),
        )
    )

    picked = tasks[0]
    print(f"📋 Suggested task: {picked['id']} - {picked['title']}")
    return picked


def check_prerequisites(task: dict, project_root: Optional[str] = None) -> tuple:
    """Check if task prerequisites are met. Returns (ok, missing)."""
    prereqs = task.get("prerequisites", {})
    missing = {"tasks": []}

    # Check task prerequisites
    required_tasks = prereqs.get("tasks", [])
    if required_tasks:
        board = load_board(project_root)
        all_tasks = {t["id"]: t for t in board.get("items", [])}
        for req_id in required_tasks:
            req_task = all_tasks.get(req_id)
            if not req_task or req_task.get("columnId") != "col-done":
                missing["tasks"].append(req_id)

    all_ok = not missing["tasks"]
    return all_ok, missing


def claim_task(task_id: str, force: bool = False, project_root: Optional[str] = None) -> bool:
    """Claim a task by moving it to Implementing. Validates prerequisites first."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            # Check prerequisites unless forced
            if not force:
                ok, missing = check_prerequisites(task, project_root)
                if not ok:
                    print(f"⚠️ Cannot claim {task_id} - prerequisites not met:")
                    if missing["tasks"]:
                        print(f"   Missing tasks: {missing['tasks']}")
                    return False

            # Move to Implementing and set status to in_progress
            task["columnId"] = "col-implementing"
            task["status"] = "in_progress"
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            save_board(board, project_root)
            print(f"✅ Claimed {task_id} - moved to Implementing")
            return True

    print(f"⚠️ Task {task_id} not found")
    return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kanban board operations.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # List tasks
    list_parser = subparsers.add_parser("list", help="List tasks")
    list_parser.add_argument("--column", help="Filter by column ID (e.g., col-backlog)")
    list_parser.add_argument(
        "--status",
        choices=["todo", "in_progress", "blocked", "pending", "done"],
        help="Filter by status",
    )

    # Create task
    create_parser = subparsers.add_parser("create", help="Create a task")
    create_parser.add_argument("--title", required=True, help="Task title")
    create_parser.add_argument("--summary", default="", help="Task summary")
    create_parser.add_argument("--workflow", help="Workflow to follow")
    create_parser.add_argument("--assignee", help="Agent or human assigned to task")
    create_parser.add_argument(
        "--column", default="col-backlog", help="Initial column (default: col-backlog)"
    )
    create_parser.add_argument(
        "--priority",
        default="medium",
        choices=["high", "medium", "low"],
        help="Task priority (default: medium)",
    )

    # Mark done
    done_parser = subparsers.add_parser("done", help="Mark task as done")
    done_parser.add_argument("task_id", help="Task ID")
    done_parser.add_argument("--outputs", nargs="*", help="Output artifacts")
    done_parser.add_argument(
        "--create-pr",
        action="store_true",
        dest="create_pr",
        help="Create a Pull Request using GitHub CLI",
    )

    # Set status
    status_parser = subparsers.add_parser("status", help="Set task status")
    status_parser.add_argument("task_id", help="Task ID")
    status_parser.add_argument(
        "status", choices=["todo", "in_progress", "blocked", "pending", "done"], help="New status"
    )

    # Add upstream
    upstream_parser = subparsers.add_parser("upstream", help="Add upstream dependency")
    upstream_parser.add_argument("task_id", help="Task ID")
    upstream_parser.add_argument("artifact_id", help="Artifact ID (e.g., PLN-001)")

    # Add downstream
    downstream_parser = subparsers.add_parser("downstream", help="Add downstream dependency")
    downstream_parser.add_argument("task_id", help="Task ID")
    downstream_parser.add_argument("artifact_id", help="Artifact ID")

    # Move task
    move_parser = subparsers.add_parser("move", help="Move task to column")
    move_parser.add_argument("task_id", help="Task ID")
    move_parser.add_argument("column_id", help="Target column ID")

    # Pick task
    pick_parser = subparsers.add_parser("pick", help="Pick next available task")
    pick_parser.add_argument("--claim", action="store_true", help="Also claim the picked task")

    # Claim task
    claim_parser = subparsers.add_parser("claim", help="Claim a task")
    claim_parser.add_argument("task_id", help="Task ID to claim")
    claim_parser.add_argument("--force", action="store_true", help="Skip prerequisite check")

    # Checklist management
    checklist_parser = subparsers.add_parser("checklist", help="Manage task checklist")
    checklist_sub = checklist_parser.add_subparsers(dest="checklist_action", required=True)

    checklist_add_parser = checklist_sub.add_parser("add", help="Add checklist item")
    checklist_add_parser.add_argument("task_id", help="Task ID")
    checklist_add_parser.add_argument("item", help="Checklist item text")

    checklist_complete_parser = checklist_sub.add_parser("complete", help="Complete checklist item")
    checklist_complete_parser.add_argument("task_id", help="Task ID")
    checklist_complete_parser.add_argument("index", type=int, help="Item index (0-based)")

    checklist_list_parser = checklist_sub.add_parser("list", help="List checklist items")
    checklist_list_parser.add_argument("task_id", help="Task ID")

    # Replace task with multiple simpler tasks
    replace_parser = subparsers.add_parser(
        "replace", help="Replace task with multiple simpler tasks"
    )
    replace_parser.add_argument("task_id", help="Task ID to replace")
    replace_parser.add_argument(
        "--with", nargs="+", dest="new_titles", required=True, help="Titles of new tasks"
    )

    args = parser.parse_args()

    if args.command == "list":
        board = load_board()
        tasks = get_tasks(
            column_id=args.column,
            status=args.status,
        )
        for t in tasks:
            col_name = get_column_name(board, t.get("columnId", ""))
            status_str = t.get("status", "todo")
            print(f"  {t['id']}: {t['title']} [{col_name}] ({status_str})")
    elif args.command == "create":
        create_task(
            title=args.title,
            summary=args.summary,
            workflow=args.workflow,
            priority=args.priority,
            assignee=args.assignee,
            column_id=args.column,
        )
    elif args.command == "done":
        mark_done(args.task_id, outputs=args.outputs, create_pr_flag=args.create_pr)
    elif args.command == "status":
        set_status(args.task_id, args.status)
    elif args.command == "upstream":
        add_upstream(args.task_id, args.artifact_id)
    elif args.command == "downstream":
        add_downstream(args.task_id, args.artifact_id)
    elif args.command == "move":
        move_to_column(args.task_id, args.column_id)
    elif args.command == "pick":
        task = pick_task()
        if task and args.claim:
            claim_task(task["id"])
    elif args.command == "claim":
        claim_task(args.task_id, force=args.force)
    elif args.command == "checklist":
        if args.checklist_action == "add":
            checklist_add(args.task_id, args.item)
        elif args.checklist_action == "complete":
            checklist_complete(args.task_id, args.index)
        elif args.checklist_action == "list":
            checklist_list(args.task_id)
    elif args.command == "replace":
        replace_task(args.task_id, args.new_titles)
