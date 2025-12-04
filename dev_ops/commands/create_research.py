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
from text_ops import sanitize_name
from dev_ops.commands.utils.id_gen import get_next_id, sanitize_slug


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
    # short_name = sanitize_name(topic) # OLD

    research_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "research",
    )
    next_id = get_next_id(research_dir, "RES")
    slug = sanitize_slug(topic)

    date_str = datetime.date.today().isoformat()

    # 2. Read Template
    template_content = read_template("research.md")

    # 3. Fill Template
    placeholders = {"topic": topic, "YYYY-MM-DD": date_str, "status": "active"}

    content = fill_template(template_content, placeholders)

    # 4. Write File
    # file_path = f"research/{short_name}.md" # OLD
    filename = f"RES-{next_id}_{slug}.md"
    file_path = os.path.join(research_dir, filename)

    write_file(file_path, content)

    print(f"✅ Research note created at: {file_path}")


if __name__ == "__main__":
    main()
