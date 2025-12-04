#!/usr/bin/env python3
import argparse
import datetime
import json
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from interaction import prompt_user
from dev_ops.commands.utils.id_gen import get_next_id, sanitize_slug

ISSUES_DIR = os.path.join(os.getcwd(), "dev_ops", "issues")


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Log a new issue/stub")
    parser.add_argument("--title", help="Issue Title")
    parser.add_argument("--desc", help="Description")
    parser.add_argument(
        "--priority",
        choices=["low", "medium", "high", "critical"],
        default="medium",
        help="Priority",
    )
    return parser


def log_issue(title: str, description: str, priority: str = "medium") -> str:
    """
    Log a new issue or stub.

    Args:
        title: The title of the issue.
        description: A detailed description.
        priority: Priority level (low, medium, high, critical).

    Returns:
        The ID of the created issue.
    """
    # Create Issue Object
    # issue_id = str(uuid.uuid4())[:8] # OLD

    # Ensure directory exists first to scan for IDs
    if not os.path.exists(ISSUES_DIR):
        os.makedirs(ISSUES_DIR)

    next_id_num = get_next_id(ISSUES_DIR, "ISSUE")
    slug = sanitize_slug(title)
    issue_id = f"ISSUE-{next_id_num}"

    issue = {
        "id": issue_id,
        "title": title,
        "description": description,
        "priority": priority,
        "status": "open",
        "created_at": datetime.datetime.now().isoformat(),
        "context": {"cwd": os.getcwd()},
    }

    # Save to File
    filename = os.path.join(ISSUES_DIR, f"{issue_id}_{slug}.json")
    with open(filename, "w") as f:
        json.dump(issue, f, indent=4)

    return issue_id


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("📝 Logging Issue...")

    # Gather Data
    title = args.title or prompt_user("Issue Title")
    desc = args.desc or prompt_user("Description")
    priority = args.priority

    issue_id = log_issue(title, desc, priority)

    print(f"✅ Issue Logged: {title} (ID: {issue_id})")


if __name__ == "__main__":
    main()
