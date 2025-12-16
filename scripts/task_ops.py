#!/usr/bin/env python3
"""
task_ops.py - Manage Kanban board tasks for dev_ops framework.

Commands:
  create   Create a new task
  claim    Claim/assign a task to an agent or user
  progress Move a task between columns
  complete Mark a task as done, link outputs
  list     List tasks by column
"""

import os
import sys
import argparse
import datetime
import re
from typing import Dict, List, Optional, Tuple

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import write_file, read_file, sanitize_slug

# ==========================================
# CONSTANTS
# ==========================================

script_dir = os.path.dirname(os.path.abspath(__file__))
# PROJECT_ROOT is the root containing dev_ops (one level above dev_ops dir)
# Since this script is in dev_ops/scripts/, we go up two levels
DEV_OPS_ROOT = os.path.dirname(script_dir)  # dev_ops/
PROJECT_ROOT = os.path.dirname(DEV_OPS_ROOT)  # actual project root
# Kanban board lives inside the dev_ops repo
KANBN_DIR = os.path.join(DEV_OPS_ROOT, "kanban")
TASKS_DIR = os.path.join(KANBN_DIR, "tasks")
INDEX_PATH = os.path.join(KANBN_DIR, "board.md")
TEMPLATES_DIR = os.path.join(DEV_OPS_ROOT, "templates")

DEFAULT_COLUMNS = ["Backlog", "In Progress", "Review", "Done", "Archive"]

# ==========================================
# Index Parsing
# ==========================================


def parse_frontmatter(content: str) -> Tuple[Dict, str]:
    """Parse YAML frontmatter and return (frontmatter_dict, body)."""
    if not content.startswith("---"):
        return {}, content

    end_match = re.search(r"\n---\n", content[3:])
    if not end_match:
        return {}, content

    frontmatter_str = content[3 : end_match.start() + 3]
    body = content[end_match.end() + 3 :]

    # Simple YAML parsing (key: value)
    fm = {}
    current_key = None
    current_list = None

    for line in frontmatter_str.split("\n"):
        if re.match(r"^\s+- ", line):  # List item
            if current_key and current_list is not None:
                current_list.append(line.strip().lstrip("- ").strip())
        elif ":" in line:
            if current_key and current_list is not None:
                fm[current_key] = current_list
            parts = line.split(":", 1)
            current_key = parts[0].strip()
            value = parts[1].strip() if len(parts) > 1 else ""
            if value:
                fm[current_key] = value
                current_list = None
            else:
                current_list = []

    if current_key and current_list is not None:
        fm[current_key] = current_list

    return fm, body


def parse_index() -> Dict[str, List[str]]:
    """Parse index.md and return {column_name: [task_ids]}."""
    if not os.path.exists(INDEX_PATH):
        return {col: [] for col in DEFAULT_COLUMNS}

    content = read_file(INDEX_PATH)
    _, body = parse_frontmatter(content)

    columns = {}
    current_column = None

    for line in body.split("\n"):
        if line.startswith("## "):
            current_column = line[3:].strip()
            columns[current_column] = []
        elif current_column and line.strip().startswith("- ["):
            # Parse: - [task-id](tasks/task-id.md)
            match = re.search(r"\[([^\]]+)\]", line)
            if match:
                columns[current_column].append(match.group(1))

    return columns


def write_index(columns: Dict[str, List[str]], frontmatter: str = "") -> None:
    """Write columns back to index.md."""
    if not frontmatter:
        # Preserve existing frontmatter
        if os.path.exists(INDEX_PATH):
            content = read_file(INDEX_PATH)
            fm, _ = parse_frontmatter(content)
            if content.startswith("---"):
                end_match = re.search(r"\n---\n", content[3:])
                if end_match:
                    frontmatter = content[: end_match.end() + 3]

    lines = [frontmatter] if frontmatter else []
    lines.append("# DevOps Task Board\n")
    lines.append(
        "Central coordination board for dev_ops framework work. "
        "Tasks represent workflow executions that produce artifacts.\n"
    )

    for col in DEFAULT_COLUMNS:
        lines.append(f"## {col}\n")
        for task_id in columns.get(col, []):
            lines.append(f"- [{task_id}](tasks/{task_id}.md)")
        lines.append("")

    with open(INDEX_PATH, "w") as f:
        f.write("\n".join(lines))


# ==========================================
# Task Operations
# ==========================================


def get_next_task_id() -> str:
    """Generate next TASK-XXX id."""
    if not os.path.exists(TASKS_DIR):
        return "TASK-001"

    files = os.listdir(TASKS_DIR)
    max_id = 0
    pattern = re.compile(r"^TASK-(\d{3})")

    for f in files:
        match = pattern.match(f.upper())
        if match:
            num = int(match.group(1))
            if num > max_id:
                max_id = num

    return f"TASK-{max_id + 1:03d}"


def create_task(
    title: str, workflow: str = "", description: str = "", workload: str = "Medium"
) -> str:
    """Create a new task and add it to Backlog."""
    os.makedirs(TASKS_DIR, exist_ok=True)

    task_id = get_next_task_id()
    slug = sanitize_slug(title)
    filename = f"{task_id.lower()}-{slug}.md"
    filepath = os.path.join(TASKS_DIR, filename)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    content = f"""---
created: {now}
updated: {now}
tags:
  - {workload}
workflow: {workflow}
assigned: ""
outputs: ""
---

# {title}

## Description

{description or "TODO: Add description"}

## Sub-tasks

- [ ] Claim task (set assigned)
- [ ] Execute workflow ({workflow or "specify workflow"})
- [ ] Link output artifacts

## Relations

## Comments
"""
    with open(filepath, "w") as f:
        f.write(content)

    # Add to index
    columns = parse_index()
    columns.setdefault("Backlog", []).append(task_id.lower())
    write_index(columns)

    print(f"✅ Created task: {task_id} - {title}")
    print(f"   File: {filepath}")
    return task_id


def claim_task(task_id: str, agent: str) -> None:
    """Assign a task to an agent/user."""
    task_file = find_task_file(task_id)
    if not task_file:
        print(f"❌ Task not found: {task_id}")
        return

    content = read_file(task_file)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Update assigned field
    content = re.sub(
        r'^assigned:\s*"?"?.*"?$', f'assigned: "{agent}"', content, flags=re.MULTILINE
    )
    content = re.sub(r"^updated:.*$", f"updated: {now}", content, flags=re.MULTILINE)

    with open(task_file, "w") as f:
        f.write(content)

    print(f"✅ Task {task_id} claimed by: {agent}")


def progress_task(task_id: str, column: str) -> None:
    """Move a task to a different column."""
    columns = parse_index()

    # Find and remove from current column
    found = False
    task_id_lower = task_id.lower()
    for col, tasks in columns.items():
        if task_id_lower in tasks:
            tasks.remove(task_id_lower)
            found = True
            print(f"   Moved from: {col}")
            break

    if not found:
        print(f"❌ Task not found in any column: {task_id}")
        return

    # Add to new column
    columns.setdefault(column, []).append(task_id_lower)
    write_index(columns)

    print(f"✅ Task {task_id} moved to: {column}")


def complete_task(task_id: str, outputs: str = "") -> None:
    """Mark task as complete and link outputs."""
    task_file = find_task_file(task_id)
    if not task_file:
        print(f"❌ Task not found: {task_id}")
        return

    content = read_file(task_file)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Update outputs and completed time
    if outputs:
        content = re.sub(
            r'^outputs:\s*"?"?.*"?$',
            f'outputs: "{outputs}"',
            content,
            flags=re.MULTILINE,
        )

    # Add completed timestamp if not present
    if "completed:" not in content:
        content = re.sub(
            r"^updated:.*$",
            f"updated: {now}\ncompleted: {now}",
            content,
            flags=re.MULTILINE,
        )

    with open(task_file, "w") as f:
        f.write(content)

    # Move to Done column
    progress_task(task_id, "Done")

    if outputs:
        print(f"   Outputs: {outputs}")


def list_tasks(column: Optional[str] = None) -> None:
    """List tasks, optionally filtered by column."""
    columns = parse_index()

    if column:
        tasks = columns.get(column, [])
        print(f"\n📋 {column} ({len(tasks)} tasks):")
        for task_id in tasks:
            task_file = find_task_file(task_id)
            if task_file:
                title = extract_task_title(task_file)
                print(f"   - {task_id}: {title}")
    else:
        for col in DEFAULT_COLUMNS:
            tasks = columns.get(col, [])
            if tasks:
                print(f"\n📋 {col} ({len(tasks)} tasks):")
                for task_id in tasks:
                    task_file = find_task_file(task_id)
                    if task_file:
                        title = extract_task_title(task_file)
                        print(f"   - {task_id}: {title}")


# ==========================================
# Helpers
# ==========================================


def find_task_file(task_id: str) -> Optional[str]:
    """Find the task file by ID prefix."""
    if not os.path.exists(TASKS_DIR):
        return None

    task_id_lower = task_id.lower()
    for f in os.listdir(TASKS_DIR):
        if f.startswith(task_id_lower):
            return os.path.join(TASKS_DIR, f)
    return None


def extract_task_title(filepath: str) -> str:
    """Extract task title from file."""
    content = read_file(filepath)
    for line in content.split("\n"):
        if line.startswith("# "):
            return line[2:].strip()
    return "Untitled"


# ==========================================
# MAIN
# ==========================================


def main():
    parser = argparse.ArgumentParser(description="Manage Kanban board tasks.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # CREATE
    create_parser = subparsers.add_parser("create", help="Create a new task")
    create_parser.add_argument("--title", required=True, help="Task title")
    create_parser.add_argument(
        "--workflow", default="", help="Workflow to execute (e.g., /plan)"
    )
    create_parser.add_argument("--desc", default="", help="Description")
    create_parser.add_argument(
        "--workload",
        default="Medium",
        choices=["Nothing", "Small", "Medium", "Large", "Epic"],
        help="Workload estimate",
    )

    # CLAIM
    claim_parser = subparsers.add_parser("claim", help="Claim a task")
    claim_parser.add_argument("task_id", help="Task ID (e.g., TASK-001)")
    claim_parser.add_argument("--agent", required=True, help="Agent or user name")

    # PROGRESS
    progress_parser = subparsers.add_parser(
        "progress", help="Move task between columns"
    )
    progress_parser.add_argument("task_id", help="Task ID (e.g., TASK-001)")
    progress_parser.add_argument(
        "--column", required=True, choices=DEFAULT_COLUMNS, help="Target column"
    )

    # COMPLETE
    complete_parser = subparsers.add_parser("complete", help="Mark task as done")
    complete_parser.add_argument("task_id", help="Task ID (e.g., TASK-001)")
    complete_parser.add_argument(
        "--outputs", default="", help="Output artifact IDs (comma-separated)"
    )

    # LIST
    list_parser = subparsers.add_parser("list", help="List tasks")
    list_parser.add_argument(
        "--column", choices=DEFAULT_COLUMNS, help="Filter by column"
    )

    args = parser.parse_args()

    if args.command == "create":
        create_task(args.title, args.workflow, args.desc, args.workload)
    elif args.command == "claim":
        claim_task(args.task_id, args.agent)
    elif args.command == "progress":
        progress_task(args.task_id, args.column)
    elif args.command == "complete":
        complete_task(args.task_id, args.outputs)
    elif args.command == "list":
        list_tasks(args.column)


if __name__ == "__main__":
    main()
