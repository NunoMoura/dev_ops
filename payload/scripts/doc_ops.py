#!/usr/bin/env python3
"""Document Operations - Create and manage persistent documents.

Handles persistent documents in dev_ops/docs/:
- Architecture docs (dev_ops/docs/architecture/)
- Test docs (dev_ops/docs/tests/)
- UX docs (dev_ops/docs/ux/) - users, stories, mockups
- PRDs (dev_ops/docs/prds/)

Documents use descriptive names, except stories which use STORY-XXX IDs.
"""

import argparse
import datetime
import os
import sys

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import (
    get_dev_ops_root,
    get_next_id,
    get_project_root,
    read_file,
    sanitize_slug,
    write_file,
)

# ==========================================
# CONSTANTS & PATHS
# ==========================================

PROJECT_ROOT = get_project_root()
DEV_OPS_ROOT = get_dev_ops_root()

# Templates are located in dev_ops/templates in both framework and project environments
TEMPLATES_DIR = os.path.join(DEV_OPS_ROOT, "templates")

# Documentation is in dev_ops/docs/
DOCS_DIR = os.path.join(DEV_OPS_ROOT, "docs")


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


def get_user_template() -> str:
    """Load user persona template from templates/docs/user.md."""
    template_path = os.path.join(TEMPLATES_DIR, "docs", "user.md")
    if os.path.exists(template_path):
        return read_file(template_path)
    # Fallback
    return """---
title: "{{title}}"
type: user
date: "{{date}}"
status: Draft
---

# {{title}}

## Role

## Goals

## Frustrations

## Behaviors

## Context
"""


def get_story_template() -> str:
    """Load user story template from templates/docs/story.md."""
    template_path = os.path.join(TEMPLATES_DIR, "docs", "story.md")
    if os.path.exists(template_path):
        return read_file(template_path)
    # Fallback
    return """---
id: "{{id}}"
title: "{{title}}"
type: story
date: "{{date}}"
status: Draft
persona: "{{persona}}"
---

# {{id}} - {{title}}

## User Story

As a **{{persona}}**,
I want **[goal]**,
so that **[benefit]**.

## Acceptance Criteria

- [ ] Criterion 1

## UX Notes
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


def get_mockup_template() -> str:
    """Load mockup template from templates/docs/mockup.md."""
    template_path = os.path.join(TEMPLATES_DIR, "docs", "mockup.md")
    if os.path.exists(template_path):
        return read_file(template_path)
    # Fallback
    return """---
id: "{{id}}"
title: "{{title}}"
type: mockup
date: "{{date}}"
status: Draft
fidelity: Low
component: "{{component}}"
---

# {{id}} - {{title}}

## Context

## Design

## Interactions

## States
"""


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


def create_user(title: str) -> str:
    """Create a new user persona document. Returns the filepath."""
    target_dir = os.path.join(DOCS_DIR, "ux", "personas")
    os.makedirs(target_dir, exist_ok=True)

    slug = sanitize_slug(title)
    filename = f"{slug}.md"
    filepath = os.path.join(target_dir, filename)

    if os.path.exists(filepath):
        print(f"⚠️  User persona already exists: {filepath}")
        return filepath

    template = get_user_template()
    content = template.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())

    write_file(filepath, content)
    print(f"✅ Created user persona: {filepath}")
    return filepath


def create_story(title: str, persona: str = "") -> str:
    """Create a new user story document. Returns the filepath."""
    target_dir = os.path.join(DOCS_DIR, "ux", "stories")
    os.makedirs(target_dir, exist_ok=True)

    # Generate STORY-XXX ID
    story_id = get_next_id("STORY", target_dir)
    slug = sanitize_slug(title)
    filename = f"{story_id}-{slug}.md"
    filepath = os.path.join(target_dir, filename)

    template = get_story_template()
    content = template.replace("{{id}}", story_id)
    content = content.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())
    content = content.replace("{{persona}}", persona)

    write_file(filepath, content)
    print(f"✅ Created user story: {filepath}")
    return filepath


def create_project_defs(title: str, owner: str = "") -> str:
    """Create a new Project Definition (PRD) document. Returns the filepath."""
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
    print(f"✅ Created Project Definition (PRD): {filepath}")
    return filepath


def create_mockup(title: str, component: str = "") -> str:
    """Create a new mockup document. Returns the filepath."""
    target_dir = os.path.join(DOCS_DIR, "ux", "mockups")
    os.makedirs(target_dir, exist_ok=True)

    # Generate MOCKUP-XXX ID
    mockup_id = get_next_id("MOCKUP", target_dir)
    slug = sanitize_slug(title)
    filename = f"{mockup_id}-{slug}.md"
    filepath = os.path.join(target_dir, filename)

    template = get_mockup_template()
    content = template.replace("{{id}}", mockup_id)
    content = content.replace("{{title}}", title)
    content = content.replace("{{date}}", datetime.date.today().isoformat())
    content = content.replace("{{component}}", component)

    write_file(filepath, content)
    print(f"✅ Created mockup: {filepath}")
    return filepath


# ==========================================
# MAIN
# ==========================================


def main():
    parser = argparse.ArgumentParser(description="Manage persistent documents.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # CREATE (architecture doc)
    create_parser = subparsers.add_parser("create", help="Create a new architecture document")
    create_parser.add_argument("--title", required=True, help="Document title")
    create_parser.add_argument("--path", default="", help="Path being documented")
    create_parser.add_argument(
        "--category",
        default="architecture",
        choices=["architecture", "tests"],
        help="Document category",
    )

    # CREATE-USER
    user_parser = subparsers.add_parser("create-user", help="Create a new user persona")
    user_parser.add_argument("--title", required=True, help="Persona name")

    # CREATE-STORY
    story_parser = subparsers.add_parser("create-story", help="Create a new user story")
    story_parser.add_argument("--title", required=True, help="Story title")
    story_parser.add_argument("--persona", default="", help="Linked persona")

    # CREATE-MOCKUP
    mockup_parser = subparsers.add_parser("create-mockup", help="Create a new mockup")
    mockup_parser.add_argument("--title", required=True, help="Mockup title")
    mockup_parser.add_argument("--component", default="", help="Component/feature this represents")

    # CREATE-PROJECT-DEFS (PRD)
    prd_parser = subparsers.add_parser(
        "create-project-defs", help="Create a new Project Definition (PRD)"
    )
    prd_parser.add_argument("--title", required=True, help="Project Definition title")
    prd_parser.add_argument("--owner", default="", help="Project Owner")

    args = parser.parse_args()

    if args.command == "create":
        create_doc(args.title, args.path, args.category)
    elif args.command == "create-user":
        create_user(args.title)
    elif args.command == "create-story":
        create_story(args.title, args.persona)
    elif args.command == "create-project-defs":
        create_project_defs(args.title, args.owner)
    elif args.command == "create-mockup":
        create_mockup(args.title, args.component)


if __name__ == "__main__":
    main()
