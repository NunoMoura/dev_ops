#!/usr/bin/env python3
import argparse
import json
import os
import sys
import yaml

# Add project root to sys.path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

BUGS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "dev_docs",
    "bugs",
)


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Get the next highest priority bug")
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
                if "title" not in data:
                    for line in content[end_idx + 5 :].split("\n"):
                        if line.startswith("# "):
                            data["title"] = line[2:].strip()
                            break
                return data
            except yaml.YAMLError:
                pass
    return None


def get_next_bug() -> dict | None:
    """
    Get the next highest priority open bug.

    Returns:
        The bug dictionary, or None if no open bugs exist.
    """
    if not os.path.exists(BUGS_DIR):
        return None

    bugs = []
    for filename in os.listdir(BUGS_DIR):
        if filename.endswith(".md"):
            filepath = os.path.join(BUGS_DIR, filename)
            bug = parse_frontmatter(filepath)
            if bug and bug.get("status") == "open":
                bugs.append(bug)

    if not bugs:
        return None

    # Sort by priority (Critical > High > Medium > Low)
    priority_map = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    bugs.sort(key=lambda x: priority_map.get(x.get("priority", "medium"), 4))

    return bugs[0]


def main():
    parser = get_parser()
    args = parser.parse_args()  # noqa: F841

    next_bug = get_next_bug()

    if not next_bug:
        print("🎉 No open bugs!")
        return

    print("👉 Next Bug:")
    # Print as JSON for easy parsing by other tools if needed, or just pretty print
    print(json.dumps(next_bug, indent=4, default=str))


if __name__ == "__main__":
    main()
