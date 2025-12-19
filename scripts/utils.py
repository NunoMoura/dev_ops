"""Utility functions for the DevOps framework scripts."""

import os
import sys
import re
import subprocess
from typing import Optional


# ==========================================
# Exceptions
# ==========================================


class DevOpsError(Exception):
    """Base exception for DevOps framework errors."""
    pass


class CommandError(DevOpsError):
    """Raised when a shell command fails."""
    pass


class FileExistsError(DevOpsError):
    """Raised when attempting to write to an existing file without overwrite."""
    pass


# ==========================================
# Interaction
# ==========================================


def prompt_user(question: str, default: Optional[str] = None) -> str:
    """Prompt the user for input, handling pipes and headless mode.

    Args:
        question: The prompt message to display.
        default: Default value to return if no input provided.

    Returns:
        User's input, or default value if applicable.
    """
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


def write_file(
    path: str,
    content: str,
    overwrite: bool = False,
    quiet: bool = False
) -> None:
    """Write content to a file.

    Args:
        path: Path to the file to write.
        content: Content to write to the file.
        overwrite: If True, overwrite existing files. If False, raise error.
        quiet: If True, suppress success messages.

    Raises:
        FileExistsError: If file exists and overwrite is False.
    """
    if os.path.exists(path) and not overwrite:
        raise FileExistsError(f"File '{path}' already exists. Use overwrite=True to replace.")

    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    with open(path, "w") as f:
        f.write(content)
    
    if not quiet:
        print(f"Created: {path}")


def read_file(path: str) -> str:
    """Read and return content from a file.

    Args:
        path: Path to the file to read.

    Returns:
        File contents as a string.
    """
    with open(path, "r") as f:
        return f.read()


# ==========================================
# ID Generation
# ==========================================


def get_next_id(prefix: str, directory: str) -> str:
    """Generate the next sequential ID for a given prefix and directory.

    Scans the directory for files matching PREFIX-NNN-*.md pattern
    and returns the next sequential ID.

    Args:
        prefix: ID prefix (e.g., 'PLN', 'RES', 'BUG').
        directory: Directory to scan for existing files.

    Returns:
        Next ID in format 'PREFIX-NNN' (e.g., 'PLN-001').
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
    """Convert text to a URL-safe kebab-case slug.

    Args:
        text: Text to convert to slug.

    Returns:
        Lowercase kebab-case slug, or 'untitled' if empty.
    """
    if not text or not text.strip():
        return "untitled"
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text if text else "untitled"


# ==========================================
# Shell Ops
# ==========================================


def run_command(
    command: str,
    raise_on_error: bool = True,
    quiet: bool = False
) -> str:
    """Execute a shell command and return its output.

    Args:
        command: Shell command to execute.
        raise_on_error: If True, raise CommandError on failure.
            If False, return empty string on failure.
        quiet: If True, suppress error messages to stdout.

    Returns:
        Command output as string, or empty string on failure if raise_on_error=False.

    Raises:
        CommandError: If command fails and raise_on_error is True.
    """
    try:
        result = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT)
        return result.decode("utf-8").strip()
    except subprocess.CalledProcessError as e:
        error_output = e.output.decode("utf-8") if e.output else ""
        if raise_on_error:
            raise CommandError(f"Command failed: {command}\n{error_output}")
        if not quiet:
            print(f"Error running command: {command}")
            print(error_output)
        return ""
