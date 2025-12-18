#!/usr/bin/env python3
"""
Kanban Operations - Task management for DevOps Framework.

Provides Python functions to interact with the Kanban board stored at
dev_ops/kanban/board.json. Supports task prerequisites, completion criteria,
and artifact linking with identifiers.

Column = Status Model:
- Tasks are assigned to columns which determine their status
- 7 columns: Backlog, Research, Planning, In Progress, Review, Blocked, Done
"""

import json
import os
import sys
from datetime import datetime
from typing import Optional, List, Dict, Any

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Default column definitions (matches extension types.ts)
DEFAULT_COLUMNS = [
    {"id": "col-backlog", "name": "Backlog", "position": 1},
    {"id": "col-research", "name": "Research", "position": 2},
    {"id": "col-planning", "name": "Planning", "position": 3},
    {"id": "col-inprogress", "name": "In Progress", "position": 4},
    {"id": "col-review", "name": "Review", "position": 5},
    {"id": "col-blocked", "name": "Blocked", "position": 6},
    {"id": "col-done", "name": "Done", "position": 7},
]


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
    with open(board_path, "r") as f:
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
    agent_ready: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """Get tasks from the board, optionally filtered by column or agentReady."""
    board = load_board(project_root)
    tasks = board.get("items", [])

    if column_id:
        tasks = [t for t in tasks if t.get("columnId") == column_id]
    if agent_ready is not None:
        tasks = [t for t in tasks if t.get("agentReady") == agent_ready]

    return tasks


def create_task(
    title: str,
    summary: str = "",
    workflow: Optional[str] = None,
    priority: str = "medium",
    agent_ready: bool = False,
    upstream: Optional[List[str]] = None,
    downstream: Optional[List[str]] = None,
    column_id: str = "col-backlog",
    project_root: Optional[str] = None,
) -> str:
    """Create a new task on the Kanban board. Returns the task ID."""
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
        "agentReady": agent_ready,
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


def move_to_column(
    task_id: str, column_id: str, project_root: Optional[str] = None
) -> bool:
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


def mark_in_progress(task_id: str, project_root: Optional[str] = None) -> bool:
    """Move a task to In Progress column."""
    return move_to_column(task_id, "col-inprogress", project_root)


def mark_blocked(task_id: str, project_root: Optional[str] = None) -> bool:
    """Move a task to Blocked column."""
    return move_to_column(task_id, "col-blocked", project_root)


def mark_done(
    task_id: str,
    outputs: Optional[list] = None,
    project_root: Optional[str] = None,
) -> bool:
    """Move a task to Done column and optionally add output artifacts."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["columnId"] = "col-done"
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            if outputs:
                if "downstream" not in task:
                    task["downstream"] = []
                for output in outputs:
                    if output not in task["downstream"]:
                        task["downstream"].append(output)
            save_board(board, project_root)
            print(f"✅ Marked {task_id} as done")
            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def pick_task(project_root: Optional[str] = None) -> Optional[dict]:
    """Pick the next available task based on priority and column.

    Selection criteria:
    1. In Backlog column (not yet started)
    2. agentReady is True
    3. Priority order: high > medium > low
    4. Oldest updatedAt wins ties
    """
    tasks = get_tasks(
        project_root=project_root, column_id="col-backlog", agent_ready=True
    )

    if not tasks:
        print("ℹ️ No agent-ready tasks available")
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


def claim_task(
    task_id: str, force: bool = False, project_root: Optional[str] = None
) -> bool:
    """Claim a task by moving it to In Progress. Validates prerequisites first."""
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

            return move_to_column(task_id, "col-inprogress", project_root)

    print(f"⚠️ Task {task_id} not found")
    return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Kanban board operations.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # List tasks
    list_parser = subparsers.add_parser("list", help="List tasks")
    list_parser.add_argument("--column", help="Filter by column ID (e.g., col-backlog)")
    list_parser.add_argument(
        "--agent-ready", action="store_true", help="Show only agent-ready tasks"
    )

    # Create task
    create_parser = subparsers.add_parser("create", help="Create a task")
    create_parser.add_argument("--title", required=True, help="Task title")
    create_parser.add_argument("--summary", default="", help="Task summary")
    create_parser.add_argument("--workflow", help="Workflow to follow")
    create_parser.add_argument(
        "--agent-ready", action="store_true", help="Mark as agent-ready"
    )
    create_parser.add_argument(
        "--column", default="col-backlog", help="Initial column (default: col-backlog)"
    )

    # Mark done
    done_parser = subparsers.add_parser("done", help="Mark task as done")
    done_parser.add_argument("task_id", help="Task ID")
    done_parser.add_argument("--outputs", nargs="*", help="Output artifacts")

    # Add upstream
    upstream_parser = subparsers.add_parser("upstream", help="Add upstream dependency")
    upstream_parser.add_argument("task_id", help="Task ID")
    upstream_parser.add_argument("artifact_id", help="Artifact ID (e.g., PLN-001)")

    # Add downstream
    downstream_parser = subparsers.add_parser(
        "downstream", help="Add downstream dependency"
    )
    downstream_parser.add_argument("task_id", help="Task ID")
    downstream_parser.add_argument("artifact_id", help="Artifact ID")

    # Move task
    move_parser = subparsers.add_parser("move", help="Move task to column")
    move_parser.add_argument("task_id", help="Task ID")
    move_parser.add_argument("column_id", help="Target column ID")

    # Pick task
    pick_parser = subparsers.add_parser("pick", help="Pick next available task")
    pick_parser.add_argument(
        "--claim", action="store_true", help="Also claim the picked task"
    )

    # Claim task
    claim_parser = subparsers.add_parser("claim", help="Claim a task")
    claim_parser.add_argument("task_id", help="Task ID to claim")
    claim_parser.add_argument(
        "--force", action="store_true", help="Skip prerequisite check"
    )

    args = parser.parse_args()

    if args.command == "list":
        board = load_board()
        tasks = get_tasks(
            column_id=args.column,
            agent_ready=True if args.agent_ready else None,
        )
        for t in tasks:
            col_name = get_column_name(board, t.get("columnId", ""))
            print(f"  {t['id']}: {t['title']} [{col_name}]")
    elif args.command == "create":
        create_task(
            title=args.title,
            summary=args.summary,
            workflow=args.workflow,
            agent_ready=args.agent_ready,
            column_id=args.column,
        )
    elif args.command == "done":
        mark_done(args.task_id, outputs=args.outputs)
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
