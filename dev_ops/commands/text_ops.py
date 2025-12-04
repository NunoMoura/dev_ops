import re


def sanitize_name(name: str) -> str:
    """Converts name to kebab-case."""
    return re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
