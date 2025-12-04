#!/usr/bin/env python3
import argparse
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from file_ops import write_file
from interaction import prompt_user
from shell_ops import run_shell_command


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Create and Run Tests")
    parser.add_argument("component", nargs="?", help="Component Name")
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("🧪 Creating/Running Test...")

    # 1. Gather Data
    component = args.component or prompt_user("Component Name")

    # 2. Determine Path (Mirroring Architecture)
    # Heuristic: Find the component in architecture/ to know the layer
    layer = "unknown"
    for root, dirs, files in os.walk("architecture"):
        if f"{component}.md" in files:
            layer = os.path.basename(root)
            break

    if layer == "unknown":
        layer = prompt_user("Layer (e.g., backend, frontend)")

    test_path = f"tests/{layer}/test_{component}.py"

    # 3. Create Test File (if missing)
    if not os.path.exists(test_path):
        content = f"""import pytest

def test_{component}_initial():
    assert True
"""
        write_file(test_path, content)
    else:
        print(f"Test file exists: {test_path}")

    # 4. Run Test
    run_shell_command(f"pytest {test_path}")


if __name__ == "__main__":
    main()
