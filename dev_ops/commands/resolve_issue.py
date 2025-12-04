#!/usr/bin/env python3
import argparse
import json
import os
import sys
import datetime

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

ISSUES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "issues"
)


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Resolve an issue")
    parser.add_argument("id", help="Issue ID")
    return parser


def resolve_issue(issue_id: str) -> bool:
    """
    Resolve an issue by ID.

    Args:
        issue_id: The ID of the issue to resolve.

    Returns:
        True if successful, False if issue not found.
    """
    filename = os.path.join(ISSUES_DIR, f"{issue_id}.json")

    if not os.path.exists(filename):
        return False

    with open(filename, "r") as f:
        issue = json.load(f)

    issue["status"] = "closed"
    issue["resolved_at"] = datetime.datetime.now().isoformat()

    with open(filename, "w") as f:
        json.dump(issue, f, indent=4)

    return True


def main():
    parser = get_parser()
    args = parser.parse_args()

    if resolve_issue(args.id):
        print(f"✅ Issue {args.id} resolved!")
    else:
        print(f"❌ Issue {args.id} not found.")
        sys.exit(1)


if __name__ == "__main__":
    main()
