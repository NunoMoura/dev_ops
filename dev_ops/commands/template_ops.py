import os
import sys

# Constants
PROJECT_ROOT = os.getcwd()
DEV_OPS_DIR = os.path.join(PROJECT_ROOT, "dev_ops")
TEMPLATES_DIR = os.path.join(DEV_OPS_DIR, "templates")


def get_template_path(template_name: str) -> str:
    """Returns the absolute path to a template."""
    return os.path.join(TEMPLATES_DIR, template_name)


def read_template(template_name: str) -> str:
    """Reads a template file and returns its content."""
    path = get_template_path(template_name)
    if not os.path.exists(path):
        print(f"Error: Template '{template_name}' not found at {path}")
        sys.exit(1)

    with open(path, "r") as f:
        return f.read()


def fill_template(content: str, placeholders: dict) -> str:
    """Replaces placeholders in the content.
    Format: [placeholder] -> value
    """
    for key, value in placeholders.items():
        content = content.replace(f"[{key}]", str(value))
    return content
