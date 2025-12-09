import os
import re
from typing import Optional


def sanitize_slug(text: Optional[str]) -> str:
    """
    Converts text to a safe filename slug.
    e.g. "Fix: The Login Bug!" -> "fix-the-login-bug"
    """
    if not text:
        return "untitled"

    # Lowercase
    text = text.lower()

    # Replace non-alphanumeric with hyphens
    text = re.sub(r"[^a-z0-9]+", "-", text)

    # Strip leading/trailing hyphens
    text = text.strip("-")

    return text if text else "untitled"


def get_next_id(prefix: str, directory: str) -> str:
    """
    Scans the directory for files matching PREFIX-XXX-.
    Returns the next ID string, e.g. "RES-005".
    """
    if not os.path.exists(directory):
        return f"{prefix}-001"

    max_id = 0

    # Pattern: PREFIX-(\d+)-?.*
    pattern = re.compile(rf"^{prefix}-(\d+)")

    for filename in os.listdir(directory):
        match = pattern.match(filename)
        if match:
            num = int(match.group(1))
            if num > max_id:
                max_id = num

    next_num = max_id + 1
    return f"{prefix}-{next_num:03d}"
