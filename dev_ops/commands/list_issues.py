#!/usr/bin/env python3
import argparse
import json
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

ISSUES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "issues"
)


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="List open issues")
    parser.add_argument("--all", action="store_true", help="Show closed issues too")
    return parser


def list_issues(show_all: bool = False) -> list:
    """
    List issues.

    Args:
        show_all: If True, show all issues. If False, show only open issues.

    Returns:
        A list of issue dictionaries.
    """
    if not os.path.exists(ISSUES_DIR):
        return []

    issues = []
    for filename in os.listdir(ISSUES_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(ISSUES_DIR, filename), "r") as f:
                try:
                    issue = json.load(f)
                    if show_all or issue.get("status") == "open":
                        issues.append(issue)
                except json.JSONDecodeError:
                    continue

    # Sort by priority (Critical > High > Medium > Low)
    priority_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    issues.sort(key=lambda x: priority_map.get(x.get("priority", "medium"), 4))

    return issues


def main():
    parser = get_parser()
    args = parser.parse_args()

    issues = list_issues(args.all)

    if not issues:
        print("No issues found.")
        return

    print(f"📋 Issues ({len(issues)})")
    print("-" * 60)
    print(f"{'ID':<10} {'Priority':<10} {'Status':<10} {'Title'}")
    print("-" * 60)

    for issue in issues:
        print(
            f"{issue['id']:<10} {issue['priority']:<10} {issue['status']:<10} {issue['title']}"
        )


if __name__ == "__main__":
    main()
