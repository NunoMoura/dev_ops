#!/usr/bin/env python3
import sys
import os
import argparse
import datetime
import re

# Add project root to sys.path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from dev_ops.commands.common.file_ops import read_file, write_file, list_files
from dev_ops.commands.utils.id_gen import get_next_id, sanitize_slug

TEMPLATE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "templates", "adr.md"
)
ADR_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "docs", "adr"
)


def get_next_adr_number():
    if not os.path.exists(ADR_DIR):
        os.makedirs(ADR_DIR)
        return 1

    files = list_files(ADR_DIR)
    max_num = 0
    for f in files:
        match = re.match(r"(\d+)_", f)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
    return max_num + 1


def create_adr(title):
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Error: Template not found at {TEMPLATE_PATH}")
        sys.exit(1)

    # number = get_next_adr_number() # OLD
    next_id = get_next_id(ADR_DIR, "ADR")

    # slug = title.lower().replace(" ", "_").replace("-", "_") # OLD
    slug = sanitize_slug(title)

    filename = f"ADR-{next_id}_{slug}.md"
    filepath = os.path.join(ADR_DIR, filename)

    content = read_file(TEMPLATE_PATH)
    content = content.replace("[Number]", next_id)
    content = content.replace("[Title]", title)
    content = content.replace("[YYYY-MM-DD]", datetime.date.today().isoformat())

    write_file(filepath, content)
    print(f"✅ Created ADR: {filepath}")
    return filepath


def main():
    parser = argparse.ArgumentParser(
        description="Create a new Architecture Decision Record (ADR)."
    )
    parser.add_argument("--title", required=True, help="Title of the decision.")
    args = parser.parse_args()

    create_adr(args.title)


if __name__ == "__main__":
    main()
