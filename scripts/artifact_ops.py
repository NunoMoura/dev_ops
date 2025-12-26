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

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import get_next_id, read_file, sanitize_slug, write_file

# ==========================================
# CONSTANTS
# ==========================================

script_dir = os.path.dirname(os.path.abspath(__file__))
DEV_OPS_ROOT = os.path.dirname(script_dir)
PROJECT_ROOT = os.path.dirname(DEV_OPS_ROOT)
ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "dev_ops", "artifacts")
TEMPLATES_DIR = os.path.join(DEV_OPS_ROOT, "templates")

ARTIFACT_TYPES = {
    "plan": {"dir": "plans", "prefix": "PLN"},
    "validation": {"dir": "validation_reports", "prefix": "VAL"},
    "bug": {"dir": "bugs", "prefix": "BUG"},
}


# ==========================================
# HELPERS
# ==========================================


def get_template(artifact_type: str) -> str:
    """Load template from templates/artifacts/ directory."""
    template_path = os.path.join(TEMPLATES_DIR, "artifacts", f"{artifact_type}.md")
    if os.path.exists(template_path):
        return read_file(template_path)

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
) -> str:
    """Create a new artifact. Returns the artifact ID."""
    if artifact_type not in ARTIFACT_TYPES:
        print(f"❌ Unknown artifact type: {artifact_type}")
        print(f"   Valid types: {', '.join(ARTIFACT_TYPES.keys())}")
        sys.exit(1)

    config = ARTIFACT_TYPES[artifact_type]
    target_dir = os.path.join(ARTIFACTS_DIR, config["dir"])
    os.makedirs(target_dir, exist_ok=True)

    # Generate ID
    artifact_id = get_next_id(config["prefix"], target_dir)
    slug = sanitize_slug(title)
    filename = f"{artifact_id}-{slug}.md"
    filepath = os.path.join(target_dir, filename)

    # Fill template
    template = get_template(artifact_type)
    content = template.replace("{{id}}", artifact_id)
    content = content.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())
    content = content.replace("{{priority}}", priority)
    content = content.replace("{{description}}", description)

    write_file(filepath, content)
    print(f"✅ Created {artifact_type.upper()}: {filepath}")
    return artifact_id


def list_artifacts(artifact_type: str) -> None:
    """List all artifacts of a given type."""
    if artifact_type not in ARTIFACT_TYPES:
        print(f"❌ Unknown artifact type: {artifact_type}")
        return

    config = ARTIFACT_TYPES[artifact_type]
    target_dir = os.path.join(ARTIFACTS_DIR, config["dir"])

    if not os.path.exists(target_dir):
        print(f"No {artifact_type}s found.")
        return

    files = sorted(os.listdir(target_dir))
    print(f"\n📂 {artifact_type.upper()} Artifacts:")
    for f in files:
        if f.endswith(".md"):
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
