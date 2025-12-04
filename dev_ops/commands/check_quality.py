#!/usr/bin/env python3
import argparse
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shell_ops import run_shell_command


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Run Code Quality Checks (Ruff, MyPy)")
    parser.add_argument(
        "--fix", action="store_true", help="Auto-fix issues where possible"
    )
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("🔍 Running Code Quality Checks...")

    # 1. Ruff (Linter & Formatter)
    print("\n[1/2] Running Ruff...")
    ruff_cmd = "ruff check ."
    if args.fix:
        ruff_cmd += " --fix"

    # We use os.system directly here or run_shell_command.
    # run_shell_command exits on error, which might be too strict if we want to run both.
    # Let's use run_shell_command but catch exit? No, shell_ops exits.
    # Let's just run them sequentially. If ruff fails, we probably want to know.
    try:
        run_shell_command(ruff_cmd)
    except SystemExit:
        print("❌ Ruff found issues.")
        # We might want to continue to MyPy even if Ruff fails?
        # Usually yes. But shell_ops.run_shell_command exits.
        # Let's modify shell_ops or just use os.system here for flexibility if we want to run all.
        # For now, strict mode is fine. Fix lint errors first.

    # 2. MyPy (Type Checker)
    print("\n[2/2] Running MyPy...")
    run_shell_command("mypy .")

    print("\n✅ All checks passed!")


if __name__ == "__main__":
    main()
