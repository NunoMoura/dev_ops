#!/usr/bin/env python3
"""Archive Operations - Archive and search completed tasks.

Handles archiving completed tasks and their artifacts to compressed archives:
- Creates .dev_ops/archive/TASK-XXX.tar.gz
- Maintains archive/index.json for quick search
- Supports full-text search across archives
- Extract archives for viewing
"""

import argparse
import json
import os
import sys
import tarfile
from datetime import datetime

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import get_artifact_working_dir, get_dev_ops_root

# ==========================================
# CONSTANTS
# ==========================================


def get_archive_dir(project_root: str | None = None) -> str:
    """Get the archive directory path."""
    dev_ops_root = get_dev_ops_root(project_root)
    archive_dir = os.path.join(dev_ops_root, "archive")
    os.makedirs(archive_dir, exist_ok=True)
    return archive_dir


def get_index_path(project_root: str | None = None) -> str:
    """Get the archive index.json path."""
    return os.path.join(get_archive_dir(project_root), "index.json")


# ==========================================
# INDEX OPERATIONS
# ==========================================


def load_index(project_root: str | None = None) -> dict:
    """Load the archive index.json file."""
    index_path = get_index_path(project_root)
    if not os.path.exists(index_path):
        return {"version": 1, "archives": []}

    try:
        with open(index_path) as f:
            return json.load(f)
    except json.JSONDecodeError:
        print("⚠️ Warning: Corrupt index.json, recreating...")
        return {"version": 1, "archives": []}


def save_index(index: dict, project_root: str | None = None) -> None:
    """Save the archive index.json file."""
    index_path = get_index_path(project_root)
    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)


def update_index(
    task_id: str, task_data: dict, artifact_count: int, project_root: str | None = None
) -> None:
    """Add or update an entry in the archive index."""
    index = load_index(project_root)

    # Remove existing entry if present
    index["archives"] = [a for a in index.get("archives", []) if a.get("taskId") != task_id]

    # Add new entry
    entry = {
        "taskId": task_id,
        "title": task_data.get("title", ""),
        "archivedAt": datetime.now().isoformat(),
        "artifactCount": artifact_count,
        "priority": task_data.get("priority", "medium"),
        "completedAt": task_data.get("updatedAt", ""),
    }
    index["archives"].append(entry)

    # Sort by archivedAt descending (newest first)
    index["archives"].sort(key=lambda x: x.get("archivedAt", ""), reverse=True)

    save_index(index, project_root)


# ==========================================
# ARCHIVE OPERATIONS
# ==========================================


def archive_task(task_id: str, task_data: dict, project_root: str | None = None) -> bool:
    """Archive a completed task and its linked artifacts.

    Creates archive/TASK-XXX.tar.gz containing:
    - task.json: Snapshot of task state
    - Linked artifacts from .tmp/artifacts/

    Args:
        task_id: Task ID to archive
        task_data: Task dictionary from board
        project_root: Optional project root path

    Returns:
        True if successful, False otherwise
    """
    archive_dir = get_archive_dir(project_root)
    archive_path = os.path.join(archive_dir, f"{task_id}.tar.gz")

    # Collect artifacts to archive
    artifact_files = []
    artifact_dir = get_artifact_working_dir(project_root)

    # Look for artifacts linked to this task
    # Artifacts are named: PREFIX-NNN-slug.md
    # We need to find artifacts mentioned in task's upstream/downstream
    for artifact_id in task_data.get("upstream", []) + task_data.get("downstream", []):
        # Find matching files in artifact directory
        if os.path.exists(artifact_dir):
            for filename in os.listdir(artifact_dir):
                if filename.startswith(artifact_id):
                    artifact_files.append(os.path.join(artifact_dir, filename))

    # Create archive
    try:
        with tarfile.open(archive_path, "w:gz") as tar:
            # Add task snapshot
            task_json = json.dumps(task_data, indent=2)
            import io

            task_info = tarfile.TarInfo(name="task.json")
            task_info.size = len(task_json.encode())
            tar.addfile(task_info, io.BytesIO(task_json.encode()))

            # Add artifacts
            for artifact_path in artifact_files:
                arcname = os.path.basename(artifact_path)
                tar.add(artifact_path, arcname=arcname)

        # Update index
        update_index(task_id, task_data, len(artifact_files), project_root)

        # Clean up archived artifacts from tmp
        for artifact_path in artifact_files:
            try:
                os.remove(artifact_path)
            except OSError:
                pass  # Ignore errors deleting temp files

        print(f"✅ Archived {task_id} ({len(artifact_files)} artifacts) to {archive_path}")
        return True

    except Exception as e:
        print(f"❌ Failed to archive {task_id}: {e}")
        return False


def list_archives(project_root: str | None = None) -> list[dict]:
    """List all archived tasks from index.

    Returns:
        List of archive entries sorted by archivedAt (newest first)
    """
    index = load_index(project_root)
    archives = index.get("archives", [])

    if not archives:
        print("ℹ️ No archived tasks found.")
        return []

    print(f"\n📦 Archived Tasks ({len(archives)}):\n")
    for entry in archives:
        print(f"  {entry['taskId']}: {entry['title']}")
        print(f"    Archived: {entry.get('archivedAt', 'Unknown')[:10]}")
        print(f"    Artifacts: {entry.get('artifactCount', 0)}")
        print()

    return archives


def search_archive(query: str, project_root: str | None = None) -> list[dict]:
    """Search archive index by task ID or title.

    Args:
        query: Search term (case-insensitive)
        project_root: Optional project root path
    """
    index = load_index(project_root)
    archives = index.get("archives", [])
    query_lower = query.lower()

    matches = [
        a
        for a in archives
        if query_lower in a.get("taskId", "").lower() or query_lower in a.get("title", "").lower()
    ]

    if not matches:
        print(f"ℹ️ No archives matching '{query}' found.")
        return []

    print(f"\n📦 Found {len(matches)} matching archive(s):\n")
    for entry in matches:
        print(f"  {entry['taskId']}: {entry['title']}")
        print(f"    Archived: {entry.get('archivedAt', 'Unknown')[:10]}")
        print()

    return matches


def extract_archive(
    task_id: str, dest_dir: str | None = None, project_root: str | None = None
) -> str | None:
    """Extract an archived task to a directory.

    Args:
        task_id: Task ID to extract
        dest_dir: Optional destination directory (defaults to /tmp/TASK-XXX)
        project_root: Optional project root path
    """
    archive_dir = get_archive_dir(project_root)
    archive_path = os.path.join(archive_dir, f"{task_id}.tar.gz")

    if not os.path.exists(archive_path):
        print(f"❌ Archive not found: {task_id}")
        return None

    if dest_dir is None:
        dest_dir = os.path.join("/tmp", task_id)

    try:
        os.makedirs(dest_dir, exist_ok=True)

        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(dest_dir)

        print(f"✅ Extracted {task_id} to {dest_dir}")
        return dest_dir

    except Exception as e:
        print(f"❌ Failed to extract {task_id}: {e}")
        return None


def get_archive_info(task_id: str, project_root: str | None = None) -> dict | None:
    """Get information about an archived task from index."""
    index = load_index(project_root)
    archives = index.get("archives", [])

    for entry in archives:
        if entry.get("taskId") == task_id:
            return entry

    return None


# ==========================================
# MAIN
# ==========================================


def main():
    parser = argparse.ArgumentParser(description="Manage archived tasks.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # LIST
    subparsers.add_parser("list", help="List all archived tasks")

    # SEARCH
    search_parser = subparsers.add_parser("search", help="Search archived tasks")
    search_parser.add_argument("query", help="Search term (task ID or title)")

    # EXTRACT
    extract_parser = subparsers.add_parser("extract", help="Extract an archived task")
    extract_parser.add_argument("task_id", help="Task ID to extract")
    extract_parser.add_argument("--dest", help="Destination directory")

    # INFO
    info_parser = subparsers.add_parser("info", help="Get info about an archived task")
    info_parser.add_argument("task_id", help="Task ID to look up")

    args = parser.parse_args()

    if args.command == "list":
        list_archives()
    elif args.command == "search":
        search_archive(args.query)
    elif args.command == "extract":
        extract_archive(args.task_id, args.dest)
    elif args.command == "info":
        info = get_archive_info(args.task_id)
        if info:
            print(json.dumps(info, indent=2))
        else:
            print(f"❌ {args.task_id} not found in archive")


if __name__ == "__main__":
    main()
