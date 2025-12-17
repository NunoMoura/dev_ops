#!/usr/bin/env python3
"""
Kanban Operations - Wrapper for Titan Kanban board management.

Provides Python functions to interact with the Kanban board stored at
local/kanban.json. Used by workflows to create, update, and manage tasks.
"""

import json
import os
import sys
from datetime import datetime
from typing import Optional

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def get_board_path(project_root: Optional[str] = None) -> str:
    """Get the path to the Kanban board JSON file."""
    if project_root is None:
        # Assume script is in [project]/dev_ops/scripts/
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
    return os.path.join(project_root, "local", "kanban.json")


def load_board(project_root: Optional[str] = None) -> dict:
    """Load the Kanban board from JSON file."""
    board_path = get_board_path(project_root)
    if not os.path.exists(board_path):
        return {"version": 1, "columns": [], "items": []}
    with open(board_path, "r") as f:
        return json.load(f)


def save_board(board: dict, project_root: Optional[str] = None) -> None:
    """Save the Kanban board to JSON file."""
    board_path = get_board_path(project_root)
    os.makedirs(os.path.dirname(board_path), exist_ok=True)
    with open(board_path, "w") as f:
        json.dump(board, f, indent=2)


def get_tasks(
    project_root: Optional[str] = None,
    status: Optional[str] = None,
    agent_ready: Optional[bool] = None,
) -> list:
    """Get tasks from the board, optionally filtered by status or agentReady."""
    board = load_board(project_root)
    tasks = board.get("items", [])

    if status:
        tasks = [t for t in tasks if t.get("status") == status]
    if agent_ready is not None:
        tasks = [t for t in tasks if t.get("agentReady") == agent_ready]

    return tasks


def create_task(
    title: str,
    summary: str = "",
    column_id: str = "col-idea",
    tags: Optional[list] = None,
    priority: str = "medium",
    agent_ready: bool = False,
    project_root: Optional[str] = None,
) -> str:
    """Create a new task on the Kanban board. Returns the task ID."""
    board = load_board(project_root)

    # Generate unique ID
    existing_ids = [t.get("id", "") for t in board.get("items", [])]
    task_num = 1
    while f"task-{task_num:03d}" in existing_ids:
        task_num += 1
    task_id = f"task-{task_num:03d}"

    task = {
        "id": task_id,
        "columnId": column_id,
        "title": title,
        "summary": summary,
        "status": "todo",
        "priority": priority,
        "tags": tags or [],
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "agentReady": agent_ready,
        "entryPoints": [],
    }

    if "items" not in board:
        board["items"] = []
    board["items"].append(task)
    save_board(board, project_root)

    print(f"✅ Created task: {task_id} - {title}")
    return task_id


def link_artifact(
    task_id: str, artifact_path: str, project_root: Optional[str] = None
) -> bool:
    """Link an artifact file to a task's entryPoints."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            if "entryPoints" not in task:
                task["entryPoints"] = []
            if artifact_path not in task["entryPoints"]:
                task["entryPoints"].append(artifact_path)
                task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
                save_board(board, project_root)
                print(f"✅ Linked {artifact_path} to {task_id}")
                return True
    print(f"⚠️ Task {task_id} not found")
    return False


def mark_in_progress(task_id: str, project_root: Optional[str] = None) -> bool:
    """Mark a task as in progress."""
    return _update_task_status(task_id, "in_progress", project_root)


def mark_blocked(task_id: str, project_root: Optional[str] = None) -> bool:
    """Mark a task as blocked."""
    return _update_task_status(task_id, "blocked", project_root)


def mark_done(
    task_id: str,
    outputs: Optional[list] = None,
    project_root: Optional[str] = None,
) -> bool:
    """Mark a task as done and optionally add output artifacts."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["status"] = "done"
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            if outputs:
                if "entryPoints" not in task:
                    task["entryPoints"] = []
                for output in outputs:
                    if output not in task["entryPoints"]:
                        task["entryPoints"].append(output)
            save_board(board, project_root)
            print(f"✅ Marked {task_id} as done")
            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def _update_task_status(
    task_id: str, status: str, project_root: Optional[str] = None
) -> bool:
    """Internal helper to update task status."""
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["status"] = status
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"
            save_board(board, project_root)
            print(f"✅ Marked {task_id} as {status}")
            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def pick_task(project_root: Optional[str] = None) -> Optional[dict]:
    """Pick the next available task based on priority and status.

    Selection criteria:
    1. Status is 'todo' (not claimed)
    2. agentReady is True
    3. Priority order: high > medium > low
    4. Oldest updatedAt wins ties
    """
    tasks = get_tasks(project_root=project_root, status="todo", agent_ready=True)

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


def claim_task(task_id: str, project_root: Optional[str] = None) -> bool:
    """Claim a task by marking it as in_progress."""
    return _update_task_status(task_id, "in_progress", project_root)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Kanban board operations.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # List tasks
    list_parser = subparsers.add_parser("list", help="List tasks")
    list_parser.add_argument("--status", help="Filter by status")
    list_parser.add_argument(
        "--agent-ready", action="store_true", help="Show only agent-ready tasks"
    )

    # Create task
    create_parser = subparsers.add_parser("create", help="Create a task")
    create_parser.add_argument("--title", required=True, help="Task title")
    create_parser.add_argument("--summary", default="", help="Task summary")
    create_parser.add_argument(
        "--agent-ready", action="store_true", help="Mark as agent-ready"
    )

    # Mark done
    done_parser = subparsers.add_parser("done", help="Mark task as done")
    done_parser.add_argument("task_id", help="Task ID")
    done_parser.add_argument("--outputs", nargs="*", help="Output artifacts")

    # Link artifact
    link_parser = subparsers.add_parser("link", help="Link artifact to task")
    link_parser.add_argument("task_id", help="Task ID")
    link_parser.add_argument("artifact", help="Artifact path")

    # Pick task
    pick_parser = subparsers.add_parser("pick", help="Pick next available task")
    pick_parser.add_argument(
        "--claim", action="store_true", help="Also claim the picked task"
    )

    # Claim task
    claim_parser = subparsers.add_parser("claim", help="Claim a task")
    claim_parser.add_argument("task_id", help="Task ID to claim")

    args = parser.parse_args()

    if args.command == "list":
        tasks = get_tasks(
            status=args.status,
            agent_ready=True if args.agent_ready else None,
        )
        for t in tasks:
            print(f"  {t['id']}: {t['title']} [{t['status']}]")
    elif args.command == "create":
        create_task(
            title=args.title, summary=args.summary, agent_ready=args.agent_ready
        )
    elif args.command == "done":
        mark_done(args.task_id, outputs=args.outputs)
    elif args.command == "link":
        link_artifact(args.task_id, args.artifact)
    elif args.command == "pick":
        task = pick_task()
        if task and args.claim:
            claim_task(task["id"])
    elif args.command == "claim":
        claim_task(args.task_id)
