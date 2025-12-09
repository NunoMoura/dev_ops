#!/usr/bin/env python3
import argparse
import os
import sys
import tempfile

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from interaction import prompt_user
from shell_ops import run_shell_command


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(
        description="Commit changes with a structured message"
    )
    parser.add_argument("--context", help="Context (Why?)")
    parser.add_argument("--decision", help="Decision (What?)")
    parser.add_argument("--arch", help="Architecture Changes", default="None")
    parser.add_argument("--verification", help="Verification", default="Tests passed")
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()

    print("💾 Structured Git Commit...")

    # 1. Gather Data
    context = args.context or prompt_user("Context (Why?)")
    decision = args.decision or prompt_user("Decision (What?)")
    arch = args.arch
    if not args.arch and prompt_user("Architecture Changes? (y/n)", "n").lower() == "y":
        arch = prompt_user("Describe Changes")

    verification = args.verification
    if not args.verification and prompt_user("Verification? (y/n)", "y").lower() == "y":
        verification = prompt_user("Verification Steps", "Tests passed")

    # 2. Format Message
    message = f"""{decision}

**Context**: {context}
**Architecture**: {arch}
**Verification**: {verification}
"""

    # 3. Commit
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write(message)
        msg_path = f.name

    run_shell_command(f"git commit -F {msg_path}")
    os.unlink(msg_path)

    print("✅ Committed!")


if __name__ == "__main__":
    main()
