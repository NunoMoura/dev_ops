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
    parser = argparse.ArgumentParser(description="Get the next highest priority issue")
    return parser


def get_next_issue() -> dict | None:
    """
    Get the next highest priority open issue.

    Returns:
        The issue dictionary, or None if no open issues exist.
    """
    if not os.path.exists(ISSUES_DIR):
        return None

    issues = []
    for filename in os.listdir(ISSUES_DIR):
        if filename.endswith(".json"):
            with open(os.path.join(ISSUES_DIR, filename), "r") as f:
                try:
                    issue = json.load(f)
                    if issue.get("status") == "open":
                        issues.append(issue)
                except json.JSONDecodeError:
                    continue

    if not issues:
        return None

    # Sort by priority (Critical > High > Medium > Low)
    priority_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    issues.sort(key=lambda x: priority_map.get(x.get("priority", "medium"), 4))

    return issues[0]


def main():
    parser = get_parser()
    args = parser.parse_args()  # noqa: F841

    next_issue = get_next_issue()

    if not next_issue:
        print("🎉 No open issues!")
        return

    print("👉 Next Issue:")
    print(json.dumps(next_issue, indent=4))


if __name__ == "__main__":
    main()
