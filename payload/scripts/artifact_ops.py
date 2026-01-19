#!/usr/bin/env python3
"""Artifact Operations - Create and manage ephemeral artifacts and archives.

Handles ephemeral artifacts with sequential IDs:
- PLN-XXX (plans)
- VAL-XXX (validation reports)
- BUG-XXX (bugs)
- RES-XXX (research)

Also handles archiving completed tasks with their linked artifacts.
"""

import argparse
import datetime
import io
import json
import os
import sys
import tarfile

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import (
    get_artifact_working_dir,
    get_dev_ops_root,
    get_next_id,
    read_file,
    sanitize_slug,
    write_file,
)

# ==========================================
# CONSTANTS
# ==========================================

# Artifact types and their prefixes (no subdirectories in new structure)
ARTIFACT_TYPES = {
    "plan": {"prefix": "PLN"},
    "validation": {"prefix": "VAL"},
    "bug": {"prefix": "BUG"},
    "research": {"prefix": "RES"},
}


# ==========================================
# HELPERS
# ==========================================


def get_template(artifact_type: str, project_root: str | None = None) -> str:
    """Load template from templates/artifacts/ directory."""
    try:
        dev_ops_root = get_dev_ops_root(project_root)
        template_path = os.path.join(dev_ops_root, "templates", "artifacts", f"{artifact_type}.md")
        if os.path.exists(template_path):
            return read_file(template_path)
    except RuntimeError:
        pass  # Not in a valid environment, use fallback

    # Fallback templates
    fallbacks = {
        "research": '---\nid: "{{id}}"\ntitle: "{{title}}"\ntype: research\nlifecycle: ephemeral\ndate: "{{date}}"\nstatus: Active\n---\n\n# {{id}} - {{title}}\n\n## Scope\n\n## Findings\n\n## Recommendation\n',
        "plan": '---\nid: "{{id}}"\ntitle: "{{title}}"\ntype: plan\nlifecycle: ephemeral\ndate: "{{date}}"\nstatus: Draft\n---\n\n# {{id}} - {{title}}\n\n## Goal\n\n## Checklist\n\n- [ ] **[test]** Description\n- [ ] **[code]** Description\n\n## Acceptance Criteria\n\n## Verification\n',
        "bug": '---\nid: "{{id}}"\ntitle: "{{title}}"\ntype: bug\nlifecycle: ephemeral\ndate: "{{date}}"\npriority: {{priority}}\nstatus: Open\n---\n\n# {{id}} - {{title}}\n\n## Description\n\n{{description}}\n',
    }
    return fallbacks.get(artifact_type, "# {{title}}")


# ==========================================
# COMMANDS
# ==========================================


def create_artifact(
    artifact_type: str,
    title: str,
    priority: str = "medium",
    description: str = "",
    project_root: str | None = None,
) -> str:
    """Create a new artifact in the flat .tmp/artifacts/ directory.

    Returns the artifact ID.
    """
    if artifact_type not in ARTIFACT_TYPES:
        print(f"❌ Unknown artifact type: {artifact_type}")
        print(f"   Valid types: {', '.join(ARTIFACT_TYPES.keys())}")
        sys.exit(1)

    # Get flat artifact working directory
    artifact_dir = get_artifact_working_dir(project_root)

    # Generate ID (scan flat directory for prefix)
    prefix = ARTIFACT_TYPES[artifact_type]["prefix"]
    artifact_id = get_next_id(prefix, artifact_dir)
    slug = sanitize_slug(title)
    filename = f"{artifact_id}-{slug}.md"
    filepath = os.path.join(artifact_dir, filename)

    # Fill template
    template = get_template(artifact_type, project_root)
    content = template.replace("{{id}}", artifact_id)
    content = content.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())
    content = content.replace("{{priority}}", priority)
    content = content.replace("{{description}}", description)

    write_file(filepath, content)
    print(f"✅ Created {artifact_type.upper()}: {filepath}")
    return artifact_id


def list_artifacts(artifact_type: str, project_root: str | None = None) -> None:
    """List all artifacts of a given type from flat directory."""
    if artifact_type not in ARTIFACT_TYPES:
        print(f"❌ Unknown artifact type: {artifact_type}")
        return

    artifact_dir = get_artifact_working_dir(project_root)
    prefix = ARTIFACT_TYPES[artifact_type]["prefix"]

    if not os.path.exists(artifact_dir):
        print(f"No {artifact_type}s found.")
        return

    # Filter by prefix in flat directory
    files = [f for f in os.listdir(artifact_dir) if f.startswith(prefix) and f.endswith(".md")]
    files.sort()

    if not files:
        print(f"No {artifact_type}s found.")
        return

    print(f"\n📂 {artifact_type.upper()} Artifacts:")
    for f in files:
        print(f"  - {f}")


# ==========================================
# ARCHIVE OPERATIONS
# ==========================================


def get_archive_dir(project_root: str | None = None) -> str:
    """Get the archive directory path."""
    dev_ops_root = get_dev_ops_root(project_root)
    archive_dir = os.path.join(dev_ops_root, "archive")
    os.makedirs(archive_dir, exist_ok=True)
    return archive_dir


def get_archive_index_path(project_root: str | None = None) -> str:
    """Get the archive index.json path."""
    return os.path.join(get_archive_dir(project_root), "index.json")


def load_archive_index(project_root: str | None = None) -> dict:
    """Load the archive index.json file."""
    index_path = get_archive_index_path(project_root)
    if not os.path.exists(index_path):
        return {"version": 1, "archives": []}
    try:
        with open(index_path) as f:
            return json.load(f)
    except json.JSONDecodeError:
        print("⚠️ Warning: Corrupt index.json, recreating...")
        return {"version": 1, "archives": []}


def save_archive_index(index: dict, project_root: str | None = None) -> None:
    """Save the archive index.json file."""
    index_path = get_archive_index_path(project_root)
    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)


def archive_task(task_id: str, task_data: dict, project_root: str | None = None) -> bool:
    """Archive a completed task and its linked artifacts.

    Creates archive/TASK-XXX.tar.gz containing:
    - task.json: Snapshot of task state
    - Linked artifacts from .tmp/artifacts/
    """
    archive_dir = get_archive_dir(project_root)
    archive_path = os.path.join(archive_dir, f"{task_id}.tar.gz")

    # Collect artifacts to archive
    artifact_files = []
    artifact_dir = get_artifact_working_dir(project_root)

    # Look for artifacts linked to this task
    for artifact_id in task_data.get("upstream", []) + task_data.get("downstream", []):
        if os.path.exists(artifact_dir):
            for filename in os.listdir(artifact_dir):
                if filename.startswith(artifact_id):
                    artifact_files.append(os.path.join(artifact_dir, filename))

    try:
        with tarfile.open(archive_path, "w:gz") as tar:
            # Add task snapshot
            task_json = json.dumps(task_data, indent=2)
            task_info = tarfile.TarInfo(name="task.json")
            task_info.size = len(task_json.encode())
            tar.addfile(task_info, io.BytesIO(task_json.encode()))

            # Add artifacts
            for artifact_path in artifact_files:
                arcname = os.path.basename(artifact_path)
                tar.add(artifact_path, arcname=arcname)

        # Update index
        index = load_archive_index(project_root)
        index["archives"] = [a for a in index.get("archives", []) if a.get("taskId") != task_id]
        entry = {
            "taskId": task_id,
            "title": task_data.get("title", ""),
            "archivedAt": datetime.datetime.now().isoformat(),
            "artifactCount": len(artifact_files),
            "priority": task_data.get("priority", "medium"),
        }
        index["archives"].append(entry)
        index["archives"].sort(key=lambda x: x.get("archivedAt", ""), reverse=True)
        save_archive_index(index, project_root)

        # Clean up archived artifacts from tmp
        for artifact_path in artifact_files:
            try:
                os.remove(artifact_path)
            except OSError:
                pass

        print(f"✅ Archived {task_id} ({len(artifact_files)} artifacts) to {archive_path}")
        return True

    except Exception as e:
        print(f"❌ Failed to archive {task_id}: {e}")
        return False


def list_archives(project_root: str | None = None) -> list[dict]:
    """List all archived tasks."""
    index = load_archive_index(project_root)
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


def search_archives(query: str, project_root: str | None = None) -> list[dict]:
    """Search archive index by task ID or title."""
    index = load_archive_index(project_root)
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
    return matches


def extract_archive(
    task_id: str, dest_dir: str | None = None, project_root: str | None = None
) -> str | None:
    """Extract an archived task to a directory."""
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


# ==========================================
# MAIN
# ==========================================


def main():
    parser = argparse.ArgumentParser(description="Manage ephemeral artifacts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # CREATE
    create_parser = subparsers.add_parser("create", help="Create a new artifact")
    create_parser.add_argument(
        "type",
        choices=list(ARTIFACT_TYPES.keys()),
        help="Artifact type",
    )
    create_parser.add_argument("--title", required=True, help="Artifact title")
    create_parser.add_argument("--priority", default="medium", help="Priority (for bugs)")
    create_parser.add_argument("--desc", default="", help="Description")

    # LIST
    list_parser = subparsers.add_parser("list", help="List artifacts")
    list_parser.add_argument(
        "type",
        choices=list(ARTIFACT_TYPES.keys()),
        help="Artifact type",
    )

    # ARCHIVE COMMANDS
    subparsers.add_parser("list-archives", help="List all archived tasks")

    search_parser = subparsers.add_parser("search-archives", help="Search archived tasks")
    search_parser.add_argument("query", help="Search term (task ID or title)")

    extract_parser = subparsers.add_parser("extract-archive", help="Extract an archived task")
    extract_parser.add_argument("task_id", help="Task ID to extract")
    extract_parser.add_argument("--dest", help="Destination directory")

    args = parser.parse_args()

    if args.command == "create":
        create_artifact(args.type, args.title, args.priority, args.desc)
    elif args.command == "list":
        list_artifacts(args.type)
    elif args.command == "list-archives":
        list_archives()
    elif args.command == "search-archives":
        search_archives(args.query)
    elif args.command == "extract-archive":
        extract_archive(args.task_id, getattr(args, "dest", None))


if __name__ == "__main__":
    main()
