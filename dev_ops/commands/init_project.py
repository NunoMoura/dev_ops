#!/usr/bin/env python3
import argparse
import datetime
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from interaction import prompt_user
from file_ops import write_file
from template_ops import read_template, fill_template


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(
        description="Bootstrap a new project with AGENTS.md"
    )
    parser.add_argument("--name", help="Project Name")
    parser.add_argument("--owner", help="Project Owner")
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("🚀 Bootstrapping Project...")

    # 1. Gather Data
    project_name = args.name or prompt_user("Project Name")
    owner = args.owner or prompt_user("Owner Name")

    # 2. Read Template
    template_content = read_template("agents.md")

    # 3. Fill Template
    placeholders = {
        "name": project_name,
        "owner": owner,
        "YYYY-MM-DD": datetime.date.today().isoformat(),
    }

    content = fill_template(template_content, placeholders)

    # 4. Write File
    write_file("AGENTS.md", content)

    print("✅ Project bootstrapped! AGENTS.md created.")


if __name__ == "__main__":
    main()
