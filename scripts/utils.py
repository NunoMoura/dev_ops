import os
import sys
import re
import subprocess
from typing import Optional

# ==========================================
# Interaction
# ==========================================


def prompt_user(question: str, default: Optional[str] = None) -> str:
    """Prompts the user for input. Handles pipes and headless mode."""
    if os.environ.get("HEADLESS", "").lower() == "true":
        return default or "TODO_FILL_ME"

    if default:
        prompt_text = f"{question} [{default}]: "
    else:
        prompt_text = f"{question}: "

    if os.environ.get("BATCH_MODE"):
        return input(prompt_text).strip()

    try:
        if sys.stdin.isatty():
            response = input(prompt_text).strip()
        else:
            try:
                with open("/dev/tty", "r") as tty_in, open("/dev/tty", "w") as tty_out:
                    tty_out.write(prompt_text)
                    tty_out.flush()
                    response = tty_in.readline().strip()
            except (IOError, OSError):
                return default or "TODO_FILL_ME"
    except (EOFError, KeyboardInterrupt):
        return default or "TODO_FILL_ME"

    return response if response else (default or "")


# ==========================================
# File Ops
# ==========================================


def write_file(path: str, content: str, overwrite: bool = False) -> None:
    """Writes content to a file. Errors if file exists and overwrite is False."""
    if os.path.exists(path) and not overwrite:
        print(f"Error: File '{path}' already exists. Use --overwrite to replace.")
        sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    with open(path, "w") as f:
        f.write(content)
    print(f"Created: {path}")


def read_file(path: str) -> str:
    """Reads content from a file."""
    with open(path, "r") as f:
        return f.read()


# ==========================================
# ID Generation
# ==========================================


def get_next_id(prefix: str, directory: str) -> str:
    """
    Scans directory for files like PREFIX-001-*.md and returns PREFIX-002.
    """
    if not os.path.exists(directory):
        return f"{prefix}-001"

    files = os.listdir(directory)
    max_id = 0
    pattern = re.compile(f"^{prefix}-(\\d{{3}})")

    for f in files:
        match = pattern.match(f)
        if match:
            num = int(match.group(1))
            if num > max_id:
                max_id = num

    next_num = max_id + 1
    return f"{prefix}-{next_num:03d}"


def sanitize_slug(text: str) -> str:
    """Converts text to kebab-case slug."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text


# ==========================================
# Shell Ops
# ==========================================


def run_command(command: str) -> str:
    """Runs a shell command and returns output."""
    try:
        result = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT)
        return result.decode("utf-8").strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(e.output.decode("utf-8"))
        sys.exit(1)
