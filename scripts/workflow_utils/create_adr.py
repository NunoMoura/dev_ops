#!/usr/bin/env python3
import sys
import os
import argparse


# Add project root to sys.path
sys.path.append(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)

from scripts.shared_utils.file_ops import write_file
from scripts.shared_utils.id_gen import get_next_id, sanitize_slug
from scripts.shared_utils.template_ops import extract_template_from_workflow

ADR_DIR = os.path.join(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ),
    "dev_docs",
    "adrs",
)


def create_adr(title):
    repo_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    # 2. Read Template from Workflow
    workflow_path = os.path.join(repo_root, "workflows", "adr.md")

    if not os.path.exists(workflow_path):
        print(f"Error: Workflow not found at {workflow_path}")
        sys.exit(1)

    # number = get_next_adr_number()
    next_id = get_next_id("ADR", ADR_DIR)
    slug = sanitize_slug(title)

    filename = f"{next_id}-{slug}.md"
    filepath = os.path.join(ADR_DIR, filename)

    try:
        content = extract_template_from_workflow(workflow_path)
    except ValueError as e:
        print(f"Error parsing workflow: {e}")
        sys.exit(1)

    content = content.replace(
        "{{id}}", next_id
    )  # Handle Handlebars style if used in template
    # Old template used [Number], new one uses {{id}}
    # But wait, the plan said "Template content goes here".
    # And my written file has {{id}}.
    # The REPLACE logic needs to match the placeholders.
    # New template: id: {{id}}
    # I should also replace [Short title] maybe?
    # Or just let the user fill it.
    # The PROMPT in the template says "ACTION REQUIRED: Agent, please fill...".
    # But usually we want to prepopulate if we can.
    # Let's keep it simple: replace {{id}} and {{date}} if present?
    # The user didn't ask for generic template engine, just "scripts usage".

    # Check for [Number] just in case I copy pasted old template? No, I wrote new one.

    # Let's maintain basic replacements
    content = content.replace("{{id}}", next_id)

    # We might want to replace title if we have a placeholder?
    # The template has [Short title].
    content = content.replace("[Short title]", title)

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
