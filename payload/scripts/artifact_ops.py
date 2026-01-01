#!/usr/bin/env python3
"""Artifact Operations - Create and manage ephemeral artifacts.

Handles ephemeral artifacts with sequential IDs:
- PLN-XXX (plans)
- VAL-XXX (validation reports)
- BUG-XXX (bugs)

Note: Research, Features and PRDs are persistent docs, managed by doc_ops.py.
"""

import argparse
import datetime
import os
import sys
from typing import Optional

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


def get_template(artifact_type: str, project_root: Optional[str] = None) -> str:
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
    project_root: Optional[str] = None,
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


def list_artifacts(artifact_type: str, project_root: Optional[str] = None) -> None:
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

    args = parser.parse_args()

    if args.command == "create":
        create_artifact(args.type, args.title, args.priority, args.desc)
    elif args.command == "list":
        list_artifacts(args.type)


if __name__ == "__main__":
    main()
