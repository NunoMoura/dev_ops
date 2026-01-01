#!/usr/bin/env python3
"""
Board Operations - Task management for DevOps Framework.

Provides Python functions to interact with the DevOps board stored at
dev_ops/board/board.json. Supports task prerequisites, completion criteria,
and artifact linking with identifiers.

Column = Workflow phase (6 phases), Status = Prediction-ready autonomy state:
- Columns: Backlog, Understand, Plan, Build, Verify, Done
- Status: ready, agent_active, needs_feedback, blocked, done
"""

import argparse
import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

# Valid priority values
VALID_PRIORITIES = frozenset({"high", "medium", "low", "p0", "p1", "p2"})


def _load_default_columns() -> list[dict]:
    """Load default columns from columns.json."""
    from utils import get_dev_ops_root

    dev_ops_root = get_dev_ops_root()

    # Framework repo: payload/board/columns.json
    # User project: .dev_ops/columns.json
    columns_path = os.path.join(dev_ops_root, "columns.json")
    if not os.path.exists(columns_path):
        # Framework repo has it in board/ subdirectory
        columns_path = os.path.join(dev_ops_root, "board", "columns.json")

    if os.path.exists(columns_path):
        try:
            with open(columns_path) as f:
                data = json.load(f)
                return data.get("columns", [])
        except json.JSONDecodeError:
            print(f"⚠️ Warning: {columns_path} - Invalid JSON. Using hardcoded defaults.")

    # Fallback to hardcoded if file not found or invalid
    return [
        {"id": "col-backlog", "name": "Backlog", "position": 1},
        {"id": "col-understand", "name": "Understand", "position": 2},
        {"id": "col-plan", "name": "Plan", "position": 3},
        {"id": "col-build", "name": "Build", "position": 4},
        {"id": "col-verify", "name": "Verify", "position": 5},
        {"id": "col-done", "name": "Done", "position": 6},
    ]


# Default column definitions (loaded from columns.json)
DEFAULT_COLUMNS = _load_default_columns()


def get_board_path(project_root: Optional[str] = None) -> str:
    """Get the path to the board JSON file.

    Returns:
        - Framework repo: payload/board/board.json
        - User project: .dev_ops/board.json
    """
    from utils import get_dev_ops_root

    if project_root is None:
        dev_ops_root = get_dev_ops_root()
    else:
        # When project_root is provided, construct path directly
        if os.path.isdir(os.path.join(project_root, "payload")):
            dev_ops_root = os.path.join(project_root, "payload")
        elif os.path.isdir(os.path.join(project_root, ".dev_ops")):
            dev_ops_root = os.path.join(project_root, ".dev_ops")
        else:
            raise RuntimeError(f"No payload or .dev_ops directory found in {project_root}")

    # User project: .dev_ops/board.json (flat)
    board_path = os.path.join(dev_ops_root, "board.json")
    if os.path.exists(board_path):
        return board_path

    # Framework repo: payload/board/board.json (nested)
    return os.path.join(dev_ops_root, "board", "board.json")


def get_current_task_path(project_root: Optional[str] = None) -> str:
    """Get the path to the .current_task file."""
    from utils import get_dev_ops_root

    if project_root is None:
        dev_ops_root = get_dev_ops_root()
    else:
        if os.path.isdir(os.path.join(project_root, "payload")):
            dev_ops_root = os.path.join(project_root, "payload")
        elif os.path.isdir(os.path.join(project_root, ".dev_ops")):
            dev_ops_root = os.path.join(project_root, ".dev_ops")
        else:
            raise RuntimeError(f"No payload or .dev_ops directory found in {project_root}")

    # Both environments: store at root of dev_ops directory
    return os.path.join(dev_ops_root, ".current_task")


def get_current_task(project_root: Optional[str] = None) -> Optional[str]:
    """Read the current task ID from .current_task file."""
    path = get_current_task_path(project_root)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().strip() or None
    return None


def set_current_task(task_id: Optional[str], project_root: Optional[str] = None) -> None:
    """Write the current task ID to .current_task file."""
    path = get_current_task_path(project_root)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if task_id:
        with open(path, "w") as f:
            f.write(task_id + "\n")
    elif os.path.exists(path):
        os.remove(path)


def load_board(project_root: Optional[str] = None) -> dict:
    """Load the DevOps board from JSON file."""
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
    """Save the DevOps board to JSON file."""
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
    status: str = "ready",
    assignee: Optional[str] = None,
    upstream: Optional[list[str]] = None,
    downstream: Optional[list[str]] = None,
    column_id: str = "col-backlog",
    spawn_from: Optional[str] = None,
    project_root: Optional[str] = None,
) -> str:
    """Create a new task on the DevOps board. Returns the task ID.

    Args:
        spawn_from: Optional parent task ID if this task was spawned from a blocker/conflict.
    """
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
        "status": status,  # Added: Save status field
        "owner": {"type": "human", "name": assignee} if assignee else None,
        "upstream": upstream or [],
        "downstream": downstream or [],
        "prerequisites": {"tasks": [], "approvals": []},
        "completionCriteria": {"artifacts": [], "tests": False, "review": False},
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    # Track spawned-from relationship for traceability
    if spawn_from:
        task["spawnedFrom"] = spawn_from
        task["summary"] = (
            f"Spawned from {spawn_from}: {summary}" if summary else f"Spawned from {spawn_from}"
        )

    if "items" not in board:
        board["items"] = []
    board["items"].append(task)
    save_board(board, project_root)

    spawn_info = f" (spawned from {spawn_from})" if spawn_from else ""
    print(f"✅ Created task: {task_id} - {title}{spawn_info}")
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
                task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
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
                task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
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
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            save_board(board, project_root)
            column_name = get_column_name(board, column_id)
            print(f"✅ Moved {task_id} to {column_name}")
            return True
    print(f"⚠️ Task {task_id} not found")
    return False


def mark_build(task_id: str, project_root: Optional[str] = None) -> bool:
    """Move a task to Build column."""
    return move_to_column(task_id, "col-build", project_root)


def set_status(task_id: str, status: str, project_root: Optional[str] = None) -> bool:
    """Set the status of a task (ready, agent_active, needs_feedback, blocked, done)."""
    valid_statuses = {"ready", "agent_active", "needs_feedback", "blocked", "done"}
    if status not in valid_statuses:
        print(f"⚠️ Invalid status: {status}. Must be one of: {', '.join(valid_statuses)}")
        return False

    board = load_board(project_root)
    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["status"] = status
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
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
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
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
                task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
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
            "status": "ready",
            "upstream": [task_id],  # Link to original as reference
            "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        board["items"].append(new_task)
        new_ids.append(new_id)
        print(f"✅ Created {new_id}: {title}")

    # Mark original as archived/done
    original_task["status"] = "done"
    original_task["summary"] = f"[SPLIT] Replaced by: {', '.join(new_ids)}"
    original_task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

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
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            save_board(board, project_root)

            return pr_url
        else:
            print(f"⚠️ Failed to create PR: {result.stderr}")
            return None
    except FileNotFoundError:
        print("⚠️ GitHub CLI (gh) not found. Please install it first.")
        return None


def record_phase_session(
    task_id: str,
    phase_name: str,
    session_id: str,
    project_root: Optional[str] = None,
) -> bool:
    """Record the session ID for a completed phase.

    Called when a phase is completed to store the AG session ID
    in the task's phases tracking.
    """
    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            if "phases" not in task:
                task["phases"] = {}
            task["phases"][phase_name] = {"sessionId": session_id}
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            save_board(board, project_root)
            print(f"✅ Recorded session {session_id[:8]}... for phase '{phase_name}'")
            return True

    print(f"⚠️ Task {task_id} not found")
    return False


def mark_done(
    task_id: str,
    outputs: Optional[list] = None,
    create_pr_flag: bool = False,
    capture_sha: bool = True,
    archive: bool = True,
    project_root: Optional[str] = None,
) -> bool:
    """Move a task to Done column, optionally add output artifacts, and archive.

    Args:
        archive: If True (default), automatically archive the task after completion.
    """
    import subprocess

    if not task_id:
        return False

    board = load_board(project_root)

    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["columnId"] = "col-done"
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

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

            # Archive task and artifacts
            if archive:
                archive_task(task_id, project_root=project_root)

            # Clear .current_task file
            set_current_task(None, project_root)

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
    tasks = get_tasks(project_root=project_root, column_id="col-backlog", status="ready")

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


def register_agent(
    task_id: str,
    agent_type: str,
    session_id: Optional[str] = None,
    name: str = "antigravity",
    project_root: Optional[str] = None,
) -> bool:
    """Register an agent working on a task. Returns True if successful."""
    board = load_board(project_root)
    for task in board.get("items", []):
        if task.get("id") == task_id:
            task["owner"] = {
                "id": session_id or f"agent-{datetime.now(timezone.utc).timestamp()}",
                "type": agent_type,  # "agent" or "human"
                "name": name,
                "sessionId": session_id,
                "phase": get_column_name(board, task.get("columnId", "")),
                "startedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
            # Remove legacy assignee field
            if "assignee" in task:
                del task["assignee"]

            task["status"] = "agent_active"
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            save_board(board, project_root)
            print(f"✅ Registered {agent_type} '{name}' on {task_id}")
            return True

    print(f"⚠️ Task {task_id} not found")
    return False


def unregister_agent(task_id: str, project_root: Optional[str] = None) -> bool:
    """Remove agent from task (release ownership)."""
    board = load_board(project_root)
    for task in board.get("items", []):
        if task.get("id") == task_id:
            if "owner" in task:
                del task["owner"]
                task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                save_board(board, project_root)
                print(f"✅ Unregistered agent from {task_id}")
                return True
    print(f"⚠️ Task {task_id} not found")
    return False


def get_active_agents(project_root: Optional[str] = None) -> list[dict]:
    """Get all active agents (or humans) across all tasks."""
    board = load_board(project_root)
    active = []
    for task in board.get("items", []):
        owner = task.get("owner")
        if owner and task.get("status") in ["agent_active", "in_progress"]:
            active.append(
                {
                    "task_id": task["id"],
                    "task_title": task["title"],
                    "owner": owner,
                    "phase": get_column_name(board, task.get("columnId", "")),
                }
            )
    return active


def claim_task(
    task_id: str,
    force: bool = False,
    session_id: Optional[str] = None,
    agent_type: str = "agent",
    name: str = "antigravity",
    project_root: Optional[str] = None,
) -> bool:
    """Claim a task by setting status to in_progress/agent_active. Works at any phase.

    Does not change the task's column - just marks it as claimed.
    Both agents and humans can claim tasks at any phase.
    Optionally tracks the Antigravity session ID.
    """
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

            # Use register_agent logic logic
            task["owner"] = {
                "id": session_id or f"{agent_type}-{datetime.now(timezone.utc).timestamp()}",
                "type": agent_type,
                "name": name,
                "sessionId": session_id,
                "phase": get_column_name(board, task.get("columnId", "")),
                "startedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }
            if "assignee" in task:
                del task["assignee"]

            # Set status based on type
            # Set status based on type
            task["status"] = "agent_active"
            task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

            # Track session ID if provided (legacy field support)
            if session_id:
                task["currentSessionId"] = session_id
                if "phases" not in task:
                    task["phases"] = {}

            save_board(board, project_root)

            # Update .current_task file
            set_current_task(task_id, project_root)

            column_name = get_column_name(board, task.get("columnId", ""))
            print(f"✅ Claimed {task_id} in {column_name} by {name} ({agent_type})")
            return True

    print(f"⚠️ Task {task_id} not found")
    return False


def revert_task(
    task_id: str,
    project_root: Optional[str] = None,
) -> bool:
    """Revert a completed task using its stored commit SHA.

    Uses the commitSha stored when the task was marked done to perform
    a git revert. This enables smart undo of logical units of work.

    Args:
        task_id: The task ID to revert (must have commitSha field)
        project_root: Optional project root path

    Returns:
        True if revert successful, False otherwise
    """
    import subprocess

    board = load_board(project_root)
    task = None
    for t in board.get("items", []):
        if t.get("id") == task_id:
            task = t
            break

    if not task:
        print(f"⚠️ Task {task_id} not found")
        return False

    commit_sha = task.get("commitSha")
    if not commit_sha:
        print(f"⚠️ Task {task_id} has no commitSha - cannot revert")
        print("   Tasks must be completed with mark_done() to track commits.")
        return False

    # Perform git revert
    try:
        result = subprocess.run(
            ["git", "revert", "--no-commit", commit_sha],
            capture_output=True,
            text=True,
            cwd=project_root or os.getcwd(),
        )
        if result.returncode != 0:
            print(f"⚠️ Git revert failed: {result.stderr}")
            return False

        # Update task status
        task["status"] = "reverted"
        task["revertedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        save_board(board, project_root)

        print(f"✅ Reverted {task_id} (commit: {commit_sha})")
        print("   Changes staged but not committed. Review and commit when ready.")
        return True
    except FileNotFoundError:
        print("⚠️ Git not found. Please ensure git is installed.")
        return False
    except Exception as e:
        print(f"⚠️ Revert failed: {e}")
        return False


def archive_task(task_id: str, project_root: Optional[str] = None) -> bool:
    """Archive a completed task and its linked artifacts using archive_ops module.

    Creates .dev_ops/archive/TASK-XXX.tar.gz containing:
    - task.json: Snapshot of task state
    - Linked artifacts: RES-XXX, PLN-XXX, VAL-XXX files

    Args:
        task_id: The task ID to archive
        project_root: Optional project root path

    Returns:
        True if archive created successfully, False otherwise
    """
    board = load_board(project_root)
    task = None
    task_index = -1

    for i, t in enumerate(board.get("items", [])):
        if t.get("id") == task_id:
            task = t
            task_index = i
            break

    if not task:
        print(f"⚠️ Task {task_id} not found")
        return False

    # Use archive_ops module to create archive
    try:
        import archive_ops

        success = archive_ops.archive_task(task_id, task, project_root=project_root)

        if success:
            # Remove task from board after successful archival
            board["items"].pop(task_index)
            save_board(board, project_root)

        return success

    except ImportError:
        print("⚠️ archive_ops module not found")
        return False


def calculate_metrics(board: dict) -> dict:
    """Calculate board metrics (status counts, priority breakdown, total tasks)."""
    items = board.get("items", [])

    status_counts = {
        "ready": 0,
        "agent_active": 0,
        "needs_feedback": 0,
        "blocked": 0,
        "done": 0,
    }

    priority_counts = {
        "high": 0,
        "medium": 0,
        "low": 0,
    }

    for item in items:
        status = item.get("status", "ready")
        if status in status_counts:
            status_counts[status] += 1

        priority = item.get("priority", "medium")
        if priority in priority_counts:
            priority_counts[priority] += 1

    return {
        "totalTasks": len(items),
        "statusCounts": status_counts,
        "priorityCounts": priority_counts,
    }


def gather_session_context(task: dict, session_dir: Optional[str] = None) -> dict:
    """Gather context from the most recent Antigravity session.

    Looks for walkthrough.md and implementation_plan.md in the session directory.
    Also tries to get a git diff summary of recent changes.
    """
    import subprocess

    context = {
        "walkthrough": None,
        "plan": None,
        "git_summary": None,
    }

    # Try to find session artifacts
    if session_dir and os.path.isdir(session_dir):
        walkthrough_path = os.path.join(session_dir, "walkthrough.md")
        if os.path.exists(walkthrough_path):
            with open(walkthrough_path) as f:
                context["walkthrough"] = f.read()

        plan_path = os.path.join(session_dir, "implementation_plan.md")
        if os.path.exists(plan_path):
            with open(plan_path) as f:
                context["plan"] = f.read()

    # Try to get recent git changes
    try:
        result = subprocess.run(
            ["git", "diff", "--stat", "HEAD~3", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            context["git_summary"] = result.stdout.strip()
    except Exception:
        pass

    return context


def build_refinement_prompt(
    task: dict,
    feedback: str,
    context: dict,
    iteration: int,
    column_name: str,
) -> str:
    """Build a structured refinement prompt for the agent."""
    lines = [
        f"# Refinement Request for {task['id']}",
        "",
        f"**Task**: {task.get('title', 'Untitled')}",
        f"**Phase**: {column_name}",
        f"**Iteration**: {iteration}",
        "",
        "---",
        "",
        "## PM Feedback",
        "",
        feedback,
        "",
    ]

    if context.get("walkthrough"):
        # Truncate if too long
        walkthrough = context["walkthrough"]
        if len(walkthrough) > 3000:
            walkthrough = walkthrough[:3000] + "\n\n... (truncated)"
        lines.extend(
            [
                "---",
                "",
                "## Previous Work Summary",
                "",
                walkthrough,
                "",
            ]
        )

    if context.get("git_summary"):
        lines.extend(
            [
                "---",
                "",
                "## Recent Changes",
                "",
                "```",
                context["git_summary"],
                "```",
                "",
            ]
        )

    lines.extend(
        [
            "---",
            "",
            "## Instructions",
            "",
            "1. Review the previous work and PM feedback above",
            "2. Apply the current phase rules with this feedback in mind",
            "3. Address the specific concerns raised",
            "4. Update artifacts as needed",
            "",
        ]
    )

    return "\n".join(lines)


def refine_phase(
    task_id: str,
    feedback: str,
    session_dir: Optional[str] = None,
    project_root: Optional[str] = None,
) -> Optional[str]:
    """Generate a refinement prompt with context from previous session.

    1. Loads task and previous session context
    2. Structures PM feedback
    3. Updates task with refinement tracking
    4. Returns formatted prompt for agent

    Args:
        task_id: The task ID to refine
        feedback: PM's free-form feedback
        session_dir: Optional path to AG session directory with artifacts
        project_root: Optional project root path

    Returns:
        Formatted prompt string, or None if task not found
    """
    board = load_board(project_root)

    # Find the task
    task = None
    for t in board.get("items", []):
        if t.get("id") == task_id:
            task = t
            break

    if not task:
        print(f"⚠️ Task {task_id} not found")
        return None

    # Gather previous session context
    context = gather_session_context(task, session_dir)

    # Track iteration
    refinement_count = task.get("refinementCount", 0) + 1
    task["refinementCount"] = refinement_count

    if "refinementHistory" not in task:
        task["refinementHistory"] = []
    task["refinementHistory"].append(
        {
            "iteration": refinement_count,
            "feedback": feedback,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
    )

    task["updatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Get column name for prompt
    column_name = get_column_name(board, task.get("columnId", ""))

    # Build structured prompt
    prompt = build_refinement_prompt(task, feedback, context, refinement_count, column_name)

    # Save
    save_board(board, project_root)

    print(f"✅ Generated refinement prompt for {task_id} (iteration {refinement_count})")
    return prompt


def main():
    parser = argparse.ArgumentParser(description="DevOps board operations.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # List tasks
    list_parser = subparsers.add_parser("list", help="List tasks")
    list_parser.add_argument("--column", help="Filter by column ID (e.g., col-backlog)")
    list_parser.add_argument(
        "--status",
        choices=["ready", "agent_active", "needs_feedback", "blocked", "done"],
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
    create_parser.add_argument(
        "--spawn-from",
        dest="spawn_from",
        help="Parent task ID if spawned from blocker/conflict (e.g., TASK-001)",
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
        "status",
        choices=["ready", "agent_active", "needs_feedback", "blocked", "done"],
        help="New status",
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
    claim_parser.add_argument("--session-id", dest="session_id", help="Antigravity session ID")
    claim_parser.add_argument(
        "--type", dest="agent_type", default="agent", choices=["agent", "human"], help="Owner type"
    )
    claim_parser.add_argument("--name", default="antigravity", help="Owner name")

    # Register/Unregister
    register_parser = subparsers.add_parser("register", help="Register agent on task")
    register_parser.add_argument("task_id", help="Task ID")
    register_parser.add_argument("--type", dest="agent_type", default="agent", help="Agent type")
    register_parser.add_argument("--session-id", dest="session_id", help="Session ID")
    register_parser.add_argument("--name", default="antigravity", help="Agent name")

    unregister_parser = subparsers.add_parser("unregister", help="Unregister agent from task")
    unregister_parser.add_argument("task_id", help="Task ID")

    # Active agents
    subparsers.add_parser("active-agents", help="List active agents")

    # Record phase session
    record_phase_parser = subparsers.add_parser(
        "record-phase", help="Record session ID for a phase"
    )
    record_phase_parser.add_argument("task_id", help="Task ID")
    record_phase_parser.add_argument("phase_name", help="Phase name (e.g., researching, planning)")
    record_phase_parser.add_argument("session_id", help="Antigravity session ID")

    # Get current task
    subparsers.add_parser("current-task", help="Get current task ID from .current_task file")

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

    # Revert a completed task
    revert_parser = subparsers.add_parser("revert", help="Revert a task using its commit SHA")
    revert_parser.add_argument("task_id", help="Task ID to revert")

    # Refine phase - generate refinement prompt
    refine_parser = subparsers.add_parser(
        "refine", help="Generate refinement prompt with PM feedback"
    )
    refine_parser.add_argument("task_id", help="Task ID to refine")
    refine_parser.add_argument("--feedback", "-f", required=True, help="PM feedback for refinement")
    refine_parser.add_argument(
        "--session-dir",
        "-s",
        dest="session_dir",
        help="Path to AG session directory with walkthrough.md",
    )

    # JSON API Commands
    # Get full board state
    get_board_parser = subparsers.add_parser("get-board", help="Get full board state as JSON")
    get_board_parser.add_argument(
        "--format", default="json", choices=["json"], help="Output format"
    )

    # Get single task
    get_task_parser = subparsers.add_parser("get-task", help="Get single task as JSON")
    get_task_parser.add_argument("task_id", help="Task ID")
    get_task_parser.add_argument("--format", default="json", choices=["json"], help="Output format")

    # Get board metrics
    get_metrics_parser = subparsers.add_parser("get-metrics", help="Get board metrics as JSON")
    get_metrics_parser.add_argument(
        "--format", default="json", choices=["json"], help="Output format"
    )

    # Validate task ID
    validate_parser = subparsers.add_parser("validate-task-id", help="Validate task ID")
    validate_parser.add_argument("task_id", help="Task ID to validate")
    validate_parser.add_argument("--format", default="json", choices=["json"], help="Output format")

    # Get column name
    get_column_parser = subparsers.add_parser("get-column-name", help="Get column name from ID")
    get_column_parser.add_argument("column_id", help="Column ID")
    get_column_parser.add_argument(
        "--format", default="json", choices=["json"], help="Output format"
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
            spawn_from=args.spawn_from,
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
        claim_task(
            args.task_id,
            force=args.force,
            session_id=args.session_id,
            agent_type=args.agent_type,
            name=args.name,
        )
    elif args.command == "register":
        register_agent(args.task_id, args.agent_type, session_id=args.session_id, name=args.name)
    elif args.command == "unregister":
        unregister_agent(args.task_id)
    elif args.command == "active-agents":
        agents = get_active_agents()
        if not agents:
            print("[]")
        else:
            print(json.dumps(agents, indent=2))
    elif args.command == "checklist":
        if args.checklist_action == "add":
            checklist_add(args.task_id, args.item)
        elif args.checklist_action == "complete":
            checklist_complete(args.task_id, args.index)
        elif args.checklist_action == "list":
            checklist_list(args.task_id)
    elif args.command == "replace":
        replace_task(args.task_id, args.new_titles)
    elif args.command == "revert":
        revert_task(args.task_id)
    elif args.command == "record-phase":
        record_phase_session(args.task_id, args.phase_name, args.session_id)
    elif args.command == "current-task":
        current = get_current_task()
        if current:
            print(current)
        else:
            print("No current task")
    elif args.command == "refine":
        prompt = refine_phase(
            args.task_id,
            args.feedback,
            session_dir=args.session_dir,
        )
        if prompt:
            # Output prompt to stdout for extension to capture
            print("---PROMPT_START---")
            print(prompt)
            print("---PROMPT_END---")
    elif args.command == "get-board":
        board = load_board()
        print(json.dumps(board, indent=2 if args.format == "json" else None))
    elif args.command == "get-task":
        board = load_board()
        task = next((t for t in board.get("items", []) if t["id"] == args.task_id), None)
        print(json.dumps(task, indent=2 if args.format == "json" else None))
    elif args.command == "get-metrics":
        board = load_board()
        metrics = calculate_metrics(board)
        print(json.dumps(metrics, indent=2 if args.format == "json" else None))
    elif args.command == "validate-task-id":
        board = load_board()
        task_id = args.task_id
        # Simple validation: TASK-NNN format
        valid = bool(task_id and task_id.startswith("TASK-") and len(task_id) > 5)
        exists = any(t["id"] == task_id for t in board.get("items", []))
        result = {"valid": valid, "exists": exists}
        print(json.dumps(result, indent=2 if args.format == "json" else None))
    elif args.command == "get-column-name":
        board = load_board()
        column_name = get_column_name(board, args.column_id)
        result = {"columnId": args.column_id, "name": column_name}
        print(json.dumps(result, indent=2 if args.format == "json" else None))


if __name__ == "__main__":
    main()
