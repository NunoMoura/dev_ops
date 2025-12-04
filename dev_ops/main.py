#!/usr/bin/env python3
import argparse
import sys
import os
import subprocess

# Import commands
# We use lazy imports or subprocess calls to keep it simple and decoupled
# for the first iteration, let's use subprocess to call the existing scripts
# to avoid refactoring everything into functions immediately,
# though importing would be faster.
# Given the structure, importing is better for "client" feel.

from dev_ops.commands import (
    log_issue,
    create_research,
    create_adr,
    init_antigravity,
    ci_check,
    git_commit,
)


def main():
    parser = argparse.ArgumentParser(description="DevOps Framework CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Init
    init_parser = subparsers.add_parser("init", help="Initialize dev_ops in a project")

    # Issue
    issue_parser = subparsers.add_parser("issue", help="Log a new issue")
    issue_parser.add_argument("title", help="Issue title")
    issue_parser.add_argument("--desc", help="Description", default="")
    issue_parser.add_argument("--priority", help="Priority", default="medium")

    # Research
    res_parser = subparsers.add_parser("research", help="Create a research note")
    res_parser.add_argument("topic", help="Research topic")

    # ADR
    adr_parser = subparsers.add_parser("adr", help="Create an ADR")
    adr_parser.add_argument("title", help="ADR title")

    # CI
    subparsers.add_parser("ci", help="Run CI checks")

    # Commit
    subparsers.add_parser("commit", help="Create a structured commit")

    # Update
    subparsers.add_parser("update", help="Update dev_ops framework")

    args = parser.parse_args()

    if args.command == "init":
        init_antigravity.init_antigravity()
    elif args.command == "issue":
        log_issue.log_issue(args.title, args.desc, args.priority)
    elif args.command == "research":
        # We need to adapt create_research to be callable with args if it isn't already
        # Currently it uses argparse inside. We might need to refactor it slightly
        # or just call it via subprocess for now to be safe.
        subprocess.run(
            [sys.executable, "-m", "dev_ops.commands.create_research", args.topic]
        )
    elif args.command == "adr":
        subprocess.run(
            [sys.executable, "-m", "dev_ops.commands.create_adr", args.title]
        )
    elif args.command == "ci":
        subprocess.run([sys.executable, "-m", "dev_ops.commands.ci_check"])
    elif args.command == "commit":
        subprocess.run([sys.executable, "-m", "dev_ops.commands.git_commit"])
    elif args.command == "update":
        print("🔄 Updating dev_ops...")
        # Fetch and run update.sh
        subprocess.run(
            "curl -fsSL https://raw.githubusercontent.com/your-org/dev_ops/main/update.sh | bash",
            shell=True,
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
