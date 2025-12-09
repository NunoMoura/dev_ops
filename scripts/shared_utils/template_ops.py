import os
import re


def extract_template_from_workflow(workflow_path: str) -> str:
    """
    Extracts the content of the ## Template section from a workflow file.
    Captures content until the next Level 2 header (##) or End of File.
    """
    if not os.path.exists(workflow_path):
        raise FileNotFoundError(f"Workflow file not found: {workflow_path}")

    with open(workflow_path, "r") as f:
        content = f.read()

    # Match '## Template' start
    # Then look for optional ```yaml block or just content
    # We want to be robust.
    # Pattern 1: ## Template\n\n```yaml\n(content)\n```
    # Pattern 2: ## Template\n(content)

    match_section = re.search(
        r"^## Template\s*\n(.*?)(?=\n^## |\Z)", content, re.MULTILINE | re.DOTALL
    )
    if not match_section:
        raise ValueError(
            f"Workflow file {workflow_path} is missing '## Template' section."
        )

    raw_template = match_section.group(1).strip()

    # MD025 Fix: Support wrapping the entire template in ```markdown to hide headers from linter
    # Check if the whole content is wrapped in a code block
    # We look for valid start ```xxx and matching end ```
    # But strictly, we expect ```markdown or ````markdown for this use case.
    # We capture the backticks used in group 1, and the content in group 2.
    wrapper_pattern = r"^(`{3,})(?:\w+)?\n(.*)\n\1$"
    wrapper_match = re.match(wrapper_pattern, raw_template, re.DOTALL)
    if wrapper_match:
        raw_template = wrapper_match.group(2)

    # Check if it starts with a yaml code block (Metadata)
    # ... (rest of logic)
    yaml_block_pattern = r"^```yaml\s*\n(.*?)\n```"

    match = re.search(yaml_block_pattern, raw_template, re.DOTALL)
    if match:
        yaml_content = match.group(1)
        # Replace the whole matched block (group 0) with valid frontmatter
        start, end = match.span()
        new_frontmatter = f"---\n{yaml_content}\n---"
        return new_frontmatter + raw_template[end:]

    return raw_template
