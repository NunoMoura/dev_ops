#!/usr/bin/env python3
import os
import sys
import argparse
import datetime
import re

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import write_file, read_file, get_next_id, sanitize_slug, prompt_user

# ==========================================
# CONSTANTS
# ==========================================

# We assume this script runs from [Project]/dev_ops/scripts/doc_ops.py
# So Project Root is ../../
script_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(script_dir))
DOCS_DIR = os.path.join(PROJECT_ROOT, "dev_ops", "docs")

DOC_TYPES = {
    "adr": {"dir": "adrs", "prefix": "ADR"},
    "bug": {"dir": "bugs", "prefix": "BUG"},
    "plan": {"dir": "plans", "prefix": "PLN"},
    "research": {"dir": "research", "prefix": "RES"},
    "backlog": {"file": "backlog.md"},
}

DOC_STATUS_REGEX = r"^status:\s*(.*)$"

# ==========================================
# Helpers
# ==========================================


def extract_template(workflow_path: str) -> str:
    """Extracts template content from a workflow markdown file."""
    if not os.path.exists(workflow_path):
        return ""

    content = read_file(workflow_path)
    # Naive extraction: Look for a block that looks like a template
    # Or just returning the whole thing might be wrong if it has steps.
    # Usually we put the template inside a code block or just prompt the agent to write it.
    # For now, let's look for a `Template:` section or similar if we defined one.
    # If not, we might need a fallback default template.

    # Let's try to find ```markdown ... ``` block?
    matches = re.findall(r"```markdown(.*?)```", content, re.DOTALL)
    if matches:
        return matches[0].strip()

    return ""


def get_default_template(doc_type: str) -> str:
    if doc_type == "adr":
        return "# {{id}} - {{title}}\n\nDate: {{date}}\n\n## Status\nProposed\n\n## Context\n\n## Decision\n\n## Consequences\n"
    elif doc_type == "bug":
        return "# {{id}} - {{title}}\n\nPriority: {{priority}}\nStatus: Open\n\n## Description\n{{description}}\n\n## Context\n{{context}}\n"
    elif doc_type == "plan":
        return "# {{id}} - {{title}}\n\n## Goal\n\n## Proposed Changes\n\n## Verification\n"
    elif doc_type == "research":
        return "# {{id}} - {{title}}\n\n## Question\n\n## Findings\n\n## Conclusion\n"
    return "# {{title}}"


# ==========================================
# COMMANDS
# ==========================================


def create_doc(doc_type: str, title: str, priority: str = "medium", desc: str = ""):
    if doc_type not in DOC_TYPES:
        print(f"Unknown doc type: {doc_type}")
        return

    config = DOC_TYPES[doc_type]

    # 1. Prepare Paths
    if "dir" in config:
        target_dir = os.path.join(DOCS_DIR, config["dir"])
        os.makedirs(target_dir, exist_ok=True)
        doc_id = get_next_id(config["prefix"], target_dir)
        slug = sanitize_slug(title)
        filename = f"{doc_id}-{slug}.md"
        filepath = os.path.join(target_dir, filename)
    if doc_type == "backlog":
        backlog_path = os.path.join(DOCS_DIR, "backlog.md")
        if not os.path.exists(backlog_path):
            write_file(
                backlog_path,
                "# Project Backlog\n\n## High Priority\n\n## Medium Priority\n\n## Low Priority\n",
            )
            print(f"✅ Created Backlog: {backlog_path}")

        # Append item
        if title:
            content = read_file(backlog_path)
            # Naive append to High Priority (or just end)
            # Let's just append to High Priority for now or bottom
            new_item = f"\n- [ ] {title}\n"
            # Try to insert after "## High Priority" if exists
            if "## High Priority" in content:
                content = content.replace(
                    "## High Priority", f"## High Priority{new_item}", 1
                )
            else:
                content += new_item
            write_file(backlog_path, content, overwrite=True)
            print(f"✅ Added to Backlog: {title}")
        return

    # 2. Get Template
    # Try to find workflow file in .agent/workflows to extract template?
    workflow_file = f"{doc_type}.md"
    workflow_path = os.path.join(PROJECT_ROOT, ".agent", "workflows", workflow_file)
    template = extract_template(workflow_path)
    if not template:
        template = get_default_template(doc_type)

    # 3. Fill Template
    content = template.replace("{{id}}", doc_id)
    content = content.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())
    content = content.replace("{{priority}}", priority)
    content = content.replace("{{description}}", desc)
    content = content.replace(
        "{{context}}", f"Created via doc_ops at {datetime.datetime.now()}"
    )

    # 4. Write
    write_file(filepath, content)
    print(f"✅ Created {doc_type.upper()}: {filepath}")


def list_docs(doc_type: str):
    if doc_type not in DOC_TYPES:
        print(f"Unknown doc type: {doc_type}")
        return

    config = DOC_TYPES[doc_type]
    if "dir" not in config:
        print(f"Cannot list {doc_type} (single file?)")
        return

    target_dir = os.path.join(DOCS_DIR, config["dir"])
    if not os.path.exists(target_dir):
        print(f"No {doc_type}s found.")
        return

    print(f"\n📂 {doc_type.upper()} List:")
    for f in sorted(os.listdir(target_dir)):
        print(f" - {f}")


def resolve_doc(doc_type: str, doc_id: str):
    """Resolves a document (sets status to closed/completed)."""
    if doc_type not in DOC_TYPES:
        print(f"Unknown doc type: {doc_type}")
        return

    config = DOC_TYPES[doc_type]
    if "dir" not in config:
        print("Cannot resolve single-file types via ID yet.")
        return

    target_dir = os.path.join(DOCS_DIR, config["dir"])
    # Find file with ID prefix
    target_file = None
    if not os.path.exists(target_dir):
        print("Directory not found.")
        return

    for f in os.listdir(target_dir):
        if f.startswith(doc_id):
            target_file = os.path.join(target_dir, f)
            break

    if not target_file:
        print(f"File with ID {doc_id} not found.")
        return

    content = read_file(target_file)
    # Regex replace status
    # Needs to match `status: open` or similar in YAML frontmatter usually
    # Our templates use `status: active` or `status: open`

    if re.search(DOC_STATUS_REGEX, content, re.MULTILINE):
        new_content = re.sub(
            DOC_STATUS_REGEX, "status: closed", content, count=1, flags=re.MULTILINE
        )
        write_file(target_file, new_content, overwrite=True)
        print(f"✅ Resolved {doc_id}: Status set to closed.")
    else:
        print(f"⚠️  Could not find 'status:' field in {target_file}")


# ==========================================
# MAIN
# ==========================================


def main():
    parser = argparse.ArgumentParser(description="Manage dev_ops documentation.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # CREATE
    create_parser = subparsers.add_parser("create", help="Create a new document")
    create_parser.add_argument(
        "type",
        choices=["adr", "bug", "plan", "research", "backlog"],
        help="Document type",
    )
    create_parser.add_argument("--title", help="Title")
    create_parser.add_argument("--desc", help="Description")
    create_parser.add_argument(
        "--priority", default="medium", help="Priority (for bugs)"
    )

    # LIST
    list_parser = subparsers.add_parser("list", help="List documents")
    list_parser.add_argument(
        "type", choices=["adr", "bug", "plan", "research"], help="Document type"
    )

    # RESOLVE
    resolve_parser = subparsers.add_parser("resolve", help="Resolve a document")
    resolve_parser.add_argument("type", choices=["bug", "plan"], help="Document type")
    resolve_parser.add_argument("id", help="Document ID (e.g. BUG-001)")

    # VALIDATE
    subparsers.add_parser("validate", help="Validate documentation")

    args = parser.parse_args()

    if args.command == "create":
        title = args.title or prompt_user("Title")
        create_doc(args.type, title, args.priority, args.desc or "")
    elif args.command == "list":
        list_docs(args.type)
    elif args.command == "resolve":
        resolve_doc(args.type, args.id)
    elif args.command == "validate":
        validate_docs()


def validate_docs():
    """Validates that all documentation files are readable and have basic metadata."""
    print("🔍 Validating documentation...")
    error_count = 0

    # 1. Check directories
    if not os.path.exists(DOCS_DIR):
        print(f"❌ Docs directory not found: {DOCS_DIR}")
        return

    # 2. Iterate all known types
    for doc_type, config in DOC_TYPES.items():
        if "dir" in config:
            target_dir = os.path.join(DOCS_DIR, config["dir"])
            if os.path.exists(target_dir):
                for f in os.listdir(target_dir):
                    if f.endswith(".md"):
                        path = os.path.join(target_dir, f)
                        content = read_file(path)
                        if not content.strip():
                            print(f"⚠️  Empty file: {f}")
                            error_count += 1

    if error_count == 0:
        print("✅ Documentation is valid.")
    else:
        print(f"❌ Found {error_count} issues.")
        sys.exit(1)


if __name__ == "__main__":
    main()
