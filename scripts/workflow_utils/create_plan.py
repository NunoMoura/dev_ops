#!/usr/bin/env python3
import argparse
import datetime
import os
import sys

# Add project root to sys.path
sys.path.append(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)

from scripts.shared_utils.id_gen import get_next_id, sanitize_slug
from scripts.shared_utils.doc_ops import find_doc_by_id
from scripts.shared_utils.template_ops import extract_template_from_workflow

PLANS_DIR = os.path.join(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ),
    "dev_ops",
    "plans",
)


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Create a new execution plan")
    parser.add_argument("--title", required=True, help="Plan Title")
    parser.add_argument(
        "--docs", nargs="+", help="List of related document IDs (e.g. BUG-001 ADR-002)"
    )
    parser.add_argument(
        "--code", nargs="+", help="List of related code files (e.g. src/main.py)"
    )
    return parser


def create_plan(
    title: str, related_doc_ids: list[str] = None, related_code_paths: list[str] = None
) -> str:
    """
    Create a new plan.
    """
    if not os.path.exists(PLANS_DIR):
        os.makedirs(PLANS_DIR)

    # get_next_id("PLN", PLANS_DIR) -> "PLN-XXX"
    plan_id = get_next_id("PLN", PLANS_DIR)
    slug = sanitize_slug(title)

    related_docs = related_doc_ids or []
    related_code = related_code_paths or []

    # Fetch context from related docs
    context_lines = []
    for doc_id in related_docs:
        doc = find_doc_by_id(doc_id)
        if doc:
            context_lines.append(
                f"- **{doc_id}**: {doc.get('title', 'No Title')} ({doc.get('status', 'unknown')})"
            )
        else:
            context_lines.append(f"- **{doc_id}**: *Document not found*")

    context_str = "\n".join(context_lines)
    if not context_str:
        context_str = "[Why are we doing this?]"

    # Workflow Path
    repo_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
    # 2. Read Template from Workflow
    workflow_path = os.path.join(repo_root, "workflows", "plan.md")

    if not os.path.exists(workflow_path):
        print(f"Error: Workflow not found at {workflow_path}")
        sys.exit(1)

    try:
        content = extract_template_from_workflow(workflow_path)
    except ValueError as e:
        print(f"Error parsing workflow: {e}")
        sys.exit(1)

    # Replace Placeholders
    content = content.replace("{{id}}", plan_id)
    content = content.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.datetime.now().isoformat())
    content = content.replace("{{related_docs}}", str(related_docs))
    content = content.replace("{{related_code}}", str(related_code))
    content = content.replace("{{context}}", context_str)

    filename = os.path.join(PLANS_DIR, f"{plan_id}-{slug}.md")  # Hyphen
    with open(filename, "w") as f:
        f.write(content)

    return plan_id


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("📝 Creating Plan...")

    plan_id = create_plan(args.title, args.docs, args.code)

    print(f"✅ Plan Created: {args.title} (ID: {plan_id})")


if __name__ == "__main__":
    main()
