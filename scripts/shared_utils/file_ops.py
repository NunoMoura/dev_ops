import os
import sys


def write_file(path: str, content: str, overwrite: bool = False) -> None:
    """Writes content to a file. Errors if file exists and overwrite is False."""
    if os.path.exists(path) and not overwrite:
        print(f"Error: File '{path}' already exists. Use --overwrite to replace.")
        sys.exit(1)

    # Ensure directory exists
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    with open(path, "w") as f:
        f.write(content)
    print(f"Created: {path}")


def read_file(path: str) -> str:
    """Reads content from a file."""
    with open(path, "r") as f:
        return f.read()
