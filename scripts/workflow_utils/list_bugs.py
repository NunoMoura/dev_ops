#!/usr/bin/env python3
import argparse
import os
import sys
import yaml

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

BUGS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "docs", "bugs"
)


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="List open bugs")
    parser.add_argument("--all", action="store_true", help="Show closed bugs too")
    return parser


def parse_frontmatter(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    if content.startswith("---\n"):
        end_idx = content.find("\n---\n", 4)
        if end_idx != -1:
            frontmatter = content[4:end_idx]
            try:
                data = yaml.safe_load(frontmatter)
                # Extract title from content if not in frontmatter
                # But our templates don't put title in frontmatter usually, it's the H1.
                # However, log_bug.py puts title in H1.
                # Let's try to extract H1 if title missing.
                if "title" not in data:
                    # Look for first line starting with #
                    for line in content[end_idx + 5 :].split("\n"):
                        if line.startswith("# "):
                            data["title"] = line[2:].strip()
                            break
                return data
            except yaml.YAMLError:
                pass
    return None


def list_bugs(show_all: bool = False) -> list:
    """
    List bugs.

    Args:
        show_all: If True, show all bugs. If False, show only open bugs.

    Returns:
        A list of bug dictionaries.
    """
    if not os.path.exists(BUGS_DIR):
        return []

    bugs = []
    for filename in os.listdir(BUGS_DIR):
        if filename.endswith(".md"):
            filepath = os.path.join(BUGS_DIR, filename)
            bug = parse_frontmatter(filepath)
            if bug:
                if show_all or bug.get("status") == "open":
                    bugs.append(bug)

    # Sort by priority (Critical > High > Medium > Low)
    priority_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    bugs.sort(key=lambda x: priority_map.get(x.get("priority", "medium"), 4))

    return bugs


def main():
    parser = get_parser()
    args = parser.parse_args()

    bugs = list_bugs(args.all)

    if not bugs:
        print("No bugs found.")
        return

    print(f"📋 Bugs ({len(bugs)})")
    print("-" * 60)
    print(f"{'ID':<10} {'Priority':<10} {'Status':<10} {'Title'}")
    print("-" * 60)

    for bug in bugs:
        print(
            f"{bug.get('id', 'N/A'):<10} {bug.get('priority', 'N/A'):<10} {bug.get('status', 'N/A'):<10} {bug.get('title', 'No Title')}"
        )


if __name__ == "__main__":
    main()
