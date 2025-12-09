#!/usr/bin/env python3
import argparse
import datetime
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
    parser = argparse.ArgumentParser(description="Resolve a bug")
    parser.add_argument("id", help="Bug ID")
    return parser


def find_bug_file(bug_id):
    if not os.path.exists(BUGS_DIR):
        return None

    # Check if ID matches exactly or is a prefix
    for filename in os.listdir(BUGS_DIR):
        if filename.startswith(f"{bug_id}-") or filename == f"{bug_id}.md":
            return os.path.join(BUGS_DIR, filename)
    return None


def resolve_bug(bug_id: str) -> bool:
    """
    Resolve a bug by ID.

    Args:
        bug_id: The ID of the bug to resolve.

    Returns:
        True if successful, False if bug not found.
    """
    filepath = find_bug_file(bug_id)

    if not filepath:
        return False

    with open(filepath, "r") as f:
        content = f.read()

    if content.startswith("---\n"):
        end_idx = content.find("\n---\n", 4)
        if end_idx != -1:
            frontmatter = content[4:end_idx]
            try:
                data = yaml.safe_load(frontmatter)

                # Update status
                data["status"] = "closed"
                data["resolved_at"] = datetime.datetime.now().isoformat()

                # Reconstruct content
                new_frontmatter = yaml.dump(data, sort_keys=False).strip()
                new_content = f"---\n{new_frontmatter}\n---{content[end_idx + 4 :]}"

                with open(filepath, "w") as f:
                    f.write(new_content)

                return True
            except yaml.YAMLError:
                print(f"Error parsing YAML in {filepath}")
                return False

    print(f"No valid frontmatter found in {filepath}")
    return False


def main():
    parser = get_parser()
    args = parser.parse_args()

    if resolve_bug(args.id):
        print(f"✅ Bug {args.id} resolved!")
    else:
        print(f"❌ Bug {args.id} not found.")
        sys.exit(1)


if __name__ == "__main__":
    main()
