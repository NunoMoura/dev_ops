#!/usr/bin/env python3
import argparse
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shell_ops import run_shell_command


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Run Tests (Pytest)")
    parser.add_argument(
        "path", nargs="?", default=".", help="Path to test file or directory"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("🧪 Running Tests...")

    cmd = f"pytest {args.path}"
    if args.verbose:
        cmd += " -v"

    run_shell_command(cmd)


if __name__ == "__main__":
    main()
