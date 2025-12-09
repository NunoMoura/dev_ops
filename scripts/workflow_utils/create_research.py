#!/usr/bin/env python3
import argparse
import datetime
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from scripts.shared_utils.interaction import prompt_user
from scripts.shared_utils.file_ops import write_file
from scripts.shared_utils.id_gen import get_next_id, sanitize_slug
from scripts.shared_utils.template_ops import extract_template_from_workflow


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Create a Research Note")
    parser.add_argument("topic", nargs="?", help="Research Topic")
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("🧠 Creating Research Note...")

    # 1. Gather Data
    topic = args.topic or prompt_user("Research Topic")

    # Path setup
    repo_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    research_dir = os.path.join(repo_root, "dev_ops", "research")

    if not os.path.exists(research_dir):
        os.makedirs(research_dir)

    # get_next_id("RES", dir) -> "RES-001"
    next_id = get_next_id("RES", research_dir)
    slug = sanitize_slug(topic)

    date_str = datetime.date.today().isoformat()

    # 2. Read Template from Workflow
    workflow_path = os.path.join(repo_root, "workflows", "research.md")

    if not os.path.exists(workflow_path):
        print(f"Error: Workflow not found at {workflow_path}")
        sys.exit(1)

    try:
        content = extract_template_from_workflow(workflow_path)
    except ValueError as e:
        print(f"Error parsing workflow: {e}")
        sys.exit(1)

    # 3. Fill Template
    content = content.replace("{{id}}", next_id)
    content = content.replace("{{topic}}", topic)
    content = content.replace("{{date}}", date_str)

    # 4. Write File
    filename = f"{next_id}-{slug}.md"
    file_path = os.path.join(research_dir, filename)

    write_file(file_path, content)

    print(f"✅ Research note created at: {file_path}")


if __name__ == "__main__":
    main()
