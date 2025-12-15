#!/usr/bin/env python3
"""Template operations for extracting templates from workflow files."""

import os
import re


def extract_template_from_workflow(workflow_path: str) -> str:
    """
    Extracts template content from a workflow markdown file.

    Supports multiple formats:
    1. ```markdown ... ``` blocks
    2. ````text ... ```` blocks (for nested code blocks)
    3. Raw content under ## Template section

    Args:
        workflow_path: Path to the workflow markdown file.

    Returns:
        Extracted template content, or empty string if not found.
    """
    if not os.path.exists(workflow_path):
        return ""

    with open(workflow_path, "r") as f:
        content = f.read()

    # Try to find ## Template section first
    template_section_match = re.search(
        r"## Template\s*\n(.*?)(?=\n## |\Z)", content, re.DOTALL
    )

    if not template_section_match:
        return ""

    template_section = template_section_match.group(1)

    # Case 1: ````text ... ```` wrapper (4 backticks for nested code blocks)
    quad_match = re.search(
        r"````(?:text|markdown)?\s*\n(.*?)````", template_section, re.DOTALL
    )
    if quad_match:
        return quad_match.group(1).strip()

    # Case 2: ```markdown ... ``` wrapper (3 backticks)
    triple_match = re.search(
        r"```(?:markdown)?\s*\n(.*?)```", template_section, re.DOTALL
    )
    if triple_match:
        return triple_match.group(1).strip()

    # Case 3: Raw content (no wrapper)
    return template_section.strip()
