import os
import re


def get_next_id(directory: str, prefix: str) -> str:
    """
    Scans a directory for files matching {prefix}-XXX_*.
    Returns the next available ID string (e.g., "001", "002").
    """
    if not os.path.exists(directory):
        os.makedirs(directory)
        return "001"

    files = os.listdir(directory)
    max_num = 0

    # Pattern: prefix-001_something.ext or prefix-001.ext
    # We look for the number immediately following the prefix and a dash
    pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)")

    for f in files:
        match = pattern.match(f)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num

    return f"{max_num + 1:03d}"


def sanitize_slug(text: str) -> str:
    """
    Converts text to a safe filename slug.
    e.g., "Fix Login Bug!" -> "fix_login_bug"
    """
    # Lowercase
    text = text.lower()
    # Replace non-alphanumeric with underscore
    text = re.sub(r"[^a-z0-9]+", "_", text)
    # Strip leading/trailing underscores
    text = text.strip("_")
    return text
