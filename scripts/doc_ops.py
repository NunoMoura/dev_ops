#!/usr/bin/env python3
"""Document Operations - Create and manage persistent documents.

Handles persistent documents in dev_ops/docs/:
- Architecture docs (dev_ops/docs/architecture/)
- Test docs (dev_ops/docs/tests/)
- Features (dev_ops/docs/features/)
- PRDs (dev_ops/docs/prds/)
- Research (dev_ops/docs/research/) - supports ADRs

Documents use descriptive names, not sequential IDs.
"""

import argparse
import datetime
import os
import sys

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import read_file, sanitize_slug, write_file

# ==========================================
# CONSTANTS
# ==========================================

script_dir = os.path.dirname(os.path.abspath(__file__))
DEV_OPS_ROOT = os.path.dirname(script_dir)
PROJECT_ROOT = os.path.dirname(DEV_OPS_ROOT)
DOCS_DIR = os.path.join(PROJECT_ROOT, "dev_ops", "docs")
TEMPLATES_DIR = os.path.join(DEV_OPS_ROOT, "templates")

# Directories to skip when scaffolding
SCAFFOLD_SKIP_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    "venv",
    "dist",
    "out",
    ".agent",
    "dev_ops",
    "docs",
    ".vscode",
    ".idea",
    "coverage",
    "build",
    "target",
    "bin",
    "obj",
    ".next",
    ".nuxt",
}

# File extensions that indicate code folders
CODE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java", ".cpp", ".c", ".h"}

# Test directory patterns
TEST_DIRS = {"tests", "test", "__tests__", "spec", "e2e"}


# ==========================================
# HELPERS
# ==========================================


def get_doc_template() -> str:
    """Load doc template from templates/docs/doc.md."""
    template_path = os.path.join(TEMPLATES_DIR, "docs", "doc.md")
    if os.path.exists(template_path):
        return read_file(template_path)

    # Fallback
    return """---
title: "{{title}}"
type: doc
lifecycle: persistent
path: "{{path}}"
status: undocumented
---

# {{title}}

## Purpose

## Overview

## Decisions
"""


def get_feature_template() -> str:
    """Load feature template from templates/docs/feature.md."""
    template_path = os.path.join(TEMPLATES_DIR, "docs", "feature.md")
    if os.path.exists(template_path):
        return read_file(template_path)
    # Fallback
    return """---
title: "{{title}}"
type: feature
lifecycle: persistent
date: "{{date}}"
status: Draft
---

# {{title}}

## Summary

## User Stories

## Acceptance Criteria
"""


def get_prd_template() -> str:
    """Load PRD template from templates/docs/prd.md."""
    template_path = os.path.join(TEMPLATES_DIR, "docs", "prd.md")
    if os.path.exists(template_path):
        return read_file(template_path)
    # Fallback
    return """---
title: "{{title}}"
type: prd
lifecycle: persistent
date: "{{date}}"
status: Draft
---

# {{title}}

## Vision

## Goals

## Features
"""


def _is_test_folder(folder_path: str) -> bool:
    """Check if folder is a test folder."""
    parts = folder_path.split(os.sep)
    return any(p in TEST_DIRS for p in parts)


def _has_code_files(folder_path: str) -> bool:
    """Check if folder contains any code files."""
    try:
        for entry in os.listdir(folder_path):
            if os.path.isfile(os.path.join(folder_path, entry)):
                ext = os.path.splitext(entry)[1]
                if ext in CODE_EXTENSIONS:
                    return True
    except PermissionError:
        pass
    return False


# ==========================================
# COMMANDS
# ==========================================


def create_doc(title: str, path: str = "", category: str = "architecture") -> str:
    """Create a new document. Returns the filepath."""
    target_dir = os.path.join(DOCS_DIR, category)
    os.makedirs(target_dir, exist_ok=True)

    slug = sanitize_slug(title)
    filename = f"{slug}.md"
    filepath = os.path.join(target_dir, filename)

    if os.path.exists(filepath):
        print(f"⚠️  Document already exists: {filepath}")
        return filepath

    template = get_doc_template()
    content = template.replace("{{title}}", title)
    content = content.replace("{{path}}", path)

    write_file(filepath, content)
    print(f"✅ Created document: {filepath}")
    return filepath


def create_feature(title: str) -> str:
    """Create a new feature document. Returns the filepath."""
    target_dir = os.path.join(DOCS_DIR, "features")
    os.makedirs(target_dir, exist_ok=True)

    slug = sanitize_slug(title)
    filename = f"{slug}.md"
    filepath = os.path.join(target_dir, filename)

    if os.path.exists(filepath):
        print(f"⚠️  Feature already exists: {filepath}")
        return filepath

    template = get_feature_template()
    content = template.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())
    # Remove ID placeholder since features use slugs
    content = content.replace("{{id}}", slug.upper())

    write_file(filepath, content)
    print(f"✅ Created feature: {filepath}")
    return filepath


def create_prd(title: str, owner: str = "") -> str:
    """Create a new PRD document. Returns the filepath."""
    target_dir = os.path.join(DOCS_DIR, "prds")
    os.makedirs(target_dir, exist_ok=True)

    slug = sanitize_slug(title)
    filename = f"{slug}.md"
    filepath = os.path.join(target_dir, filename)

    if os.path.exists(filepath):
        print(f"⚠️  PRD already exists: {filepath}")
        return filepath

    template = get_prd_template()
    content = template.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())
    content = content.replace("{{owner}}", owner)
    content = content.replace("{{id}}", slug.upper())

    write_file(filepath, content)
    print(f"✅ Created PRD: {filepath}")
    return filepath


def scaffold_docs(project_root: str) -> dict:
    """Scaffold documentation from source folder structure."""
    docs_arch = os.path.join(project_root, "docs", "architecture")
    docs_tests = os.path.join(project_root, "docs", "tests")

    created = {"architecture": [], "tests": []}
    processed_folders = set()

    print(f"🔍 Scaffolding docs for: {project_root}")
    print()

    for root, dirs, _ in os.walk(project_root):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in SCAFFOLD_SKIP_DIRS]

        # Skip the root itself
        if root == project_root:
            continue

        rel_path = os.path.relpath(root, project_root)

        # Skip if no code files in this folder
        if not _has_code_files(root):
            continue

        # Skip if already processed
        if rel_path in processed_folders:
            continue
        processed_folders.add(rel_path)

        folder_name = os.path.basename(root)

        if _is_test_folder(rel_path):
            md_path = os.path.join(docs_tests, rel_path + ".md")
            category = "tests"
        else:
            md_path = os.path.join(docs_arch, rel_path + ".md")
            category = "architecture"

        # Skip if exists
        if os.path.exists(md_path):
            continue

        # Create parent directories
        os.makedirs(os.path.dirname(md_path), exist_ok=True)

        # Generate stub
        template = get_doc_template()
        content = template.replace("{{title}}", folder_name)
        content = content.replace("{{path}}", rel_path)

        with open(md_path, "w") as f:
            f.write(content)

        created[category].append(rel_path)
        print(f"  📄 {category}: {rel_path}.md")

    print()
    print(f"✅ Architecture docs: {len(created['architecture'])}")
    print(f"✅ Test docs: {len(created['tests'])}")

    if not created["architecture"] and not created["tests"]:
        print("   (No new docs created - folders may already be documented)")

    return created


def validate_docs() -> bool:
    """Validate that all documentation files are readable."""
    print("🔍 Validating documentation...")
    error_count = 0

    if not os.path.exists(DOCS_DIR):
        print(f"❌ Docs directory not found: {DOCS_DIR}")
        return False

    for category in ["architecture", "tests"]:
        target_dir = os.path.join(DOCS_DIR, category)
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
        return True
    else:
        print(f"❌ Found {error_count} issues.")
        return False


def list_docs(category: str = "architecture") -> None:
    """List all documents in a category."""
    target_dir = os.path.join(DOCS_DIR, category)

    if not os.path.exists(target_dir):
        print(f"No {category} docs found.")
        return

    files = sorted(os.listdir(target_dir))
    print(f"\n📂 {category.upper()} Documents:")
    for f in files:
        if f.endswith(".md"):
            print(f"  - {f}")


# ==========================================
# MAIN
# ==========================================


def main():
    parser = argparse.ArgumentParser(description="Manage persistent documents.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # CREATE
    create_parser = subparsers.add_parser("create", help="Create a new document")
    create_parser.add_argument("--title", required=True, help="Document title")
    create_parser.add_argument("--path", default="", help="Path being documented")
    create_parser.add_argument(
        "--category",
        default="architecture",
        choices=["architecture", "tests", "research"],
        help="Document category",
    )

    # SCAFFOLD
    scaffold_parser = subparsers.add_parser("scaffold", help="Scaffold docs from source structure")
    scaffold_parser.add_argument("--root", default=PROJECT_ROOT, help="Project root")

    # VALIDATE
    subparsers.add_parser("validate", help="Validate documentation")

    # LIST
    list_parser = subparsers.add_parser("list", help="List documents")
    list_parser.add_argument(
        "--category",
        default="architecture",
        choices=["architecture", "tests", "features", "prds", "research"],
        help="Document category",
    )

    # CREATE-FEATURE
    feature_parser = subparsers.add_parser("create-feature", help="Create a new feature doc")
    feature_parser.add_argument("--title", required=True, help="Feature title")

    # CREATE-PRD
    prd_parser = subparsers.add_parser("create-prd", help="Create a new PRD doc")
    prd_parser.add_argument("--title", required=True, help="PRD title")
    prd_parser.add_argument("--owner", default="", help="Product owner")

    args = parser.parse_args()

    if args.command == "create":
        create_doc(args.title, args.path, args.category)
    elif args.command == "scaffold":
        scaffold_docs(args.root)
    elif args.command == "validate":
        success = validate_docs()
        sys.exit(0 if success else 1)
    elif args.command == "list":
        list_docs(args.category)
    elif args.command == "create-feature":
        create_feature(args.title)
    elif args.command == "create-prd":
        create_prd(args.title, args.owner)


if __name__ == "__main__":
    main()
