import os
import sys


def run_shell_command(command: str) -> None:
    """Runs a shell command."""
    print(f"Running: {command}")
    result = os.system(command)
    if result != 0:
        print(f"Error running command: {command}")
        sys.exit(1)
