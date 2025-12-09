#!/usr/bin/env python3
import argparse
import datetime

import os
import sys

# Add project root to sys.path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
)

from scripts.shared_utils.file_ops import write_file
from scripts.shared_utils.id_gen import get_next_id, sanitize_slug
from scripts.shared_utils.interaction import prompt_user
from scripts.shared_utils.template_ops import extract_template_from_workflow

BUGS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "docs",
    "bugs",
)


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Log a new bug")
    parser.add_argument("--title", help="Bug Title")
    parser.add_argument("--desc", help="Description")
    parser.add_argument(
        "--priority",
        choices=["low", "medium", "high", "critical"],
        default="medium",
        help="Priority",
    )
    return parser


def log_bug(title: str, description: str, priority: str = "medium") -> str:
    """
    Log a new bug.
    """
    # Workflow Path
    repo_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    # 2. Read Template from Workflow
    workflow_path = os.path.join(repo_root, "workflows", "bug.md")

    if not os.path.exists(workflow_path):
        print(f"Error: Workflow not found at {workflow_path}")
        sys.exit(1)

    # Ensure directory exists first to scan for IDs
    if not os.path.exists(BUGS_DIR):
        os.makedirs(BUGS_DIR)

    # get_next_id(doc_type, directory) -> "BUG-001"
    bug_id_full = get_next_id("BUG", BUGS_DIR)

    slug = sanitize_slug(title)

    filename = f"{bug_id_full}-{slug}.md"
    filepath = os.path.join(BUGS_DIR, filename)

    try:
        content = extract_template_from_workflow(workflow_path)
    except ValueError as e:
        print(f"Error parsing workflow: {e}")
        sys.exit(1)

    # Context Data
    created_at = datetime.datetime.now().isoformat()
    cwd = os.getcwd()
    context_str = f"CWD: {cwd}\nCreated: {created_at}"

    # Replace Placeholders
    content = content.replace("{{id}}", bug_id_full)
    content = content.replace("{{title}}", title)
    content = content.replace("{{description}}", description)
    content = content.replace("{{context}}", context_str)

    # Priority handling? The template didn't have {{priority}} in YAML?
    # Wait, I defined `priority: medium` default in template.
    # But I should probably inject the actual priority.
    # My template in bugs.md has `priority: medium`.
    # I should replace it.
    content = content.replace("priority: medium", f"priority: {priority}")

    write_file(filepath, content)
    return bug_id_full


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("📝 Logging Bug...")

    # Gather Data
    title = args.title or prompt_user("Bug Title")
    desc = args.desc or prompt_user("Description")
    priority = args.priority

    bug_id = log_bug(title, desc, priority)

    print(f"✅ Bug Logged: {title} (ID: {bug_id})")


if __name__ == "__main__":
    main()
