import os
import sys
from typing import Optional


def prompt_user(question: str, default: Optional[str] = None) -> str:
    """Prompts the user for input. Handles pipes and headless mode."""
    # 1. Headless Mode
    if os.environ.get("HEADLESS", "").lower() == "true":
        return default or "TODO_FILL_ME"

    # Prepare prompt
    if default:
        prompt_text = f"{question} [{default}]: "
    else:
        prompt_text = f"{question}: "

    # 2. Interactive Input
    try:
        # If stdin is a tty, use standard input
        if sys.stdin.isatty():
            response = input(prompt_text).strip()

        # If stdin is NOT a tty (e.g. piped curl | bash), try to access /dev/tty explicitly
        else:
            # Only works on Unix-like systems
            try:
                with open("/dev/tty", "r") as tty_in, open("/dev/tty", "w") as tty_out:
                    tty_out.write(prompt_text)
                    tty_out.flush()
                    response = tty_in.readline().strip()
            except (IOError, OSError):
                # Fallback if /dev/tty is not available (e.g. CI/CD without tty)
                return default or "TODO_FILL_ME"

    except (EOFError, KeyboardInterrupt):
        # Handle cases where input stream is closed
        return default or "TODO_FILL_ME"

    return response if response else (default or "")
