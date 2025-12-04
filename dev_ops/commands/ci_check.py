#!/usr/bin/env python3
import argparse
import os
import re
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shell_ops import run_shell_command


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Run local CI checks (Pre-flight)")
    parser.add_argument("--strict", action="store_true", help="Fail on untracked TODOs")
    return parser


def check_untracked_todos(root_dir: str) -> bool:
    """Scans for # TODO comments and checks if they are tracked in issues."""
    print("\n[3/3] Scanning for untracked TODOs...")

    # Simple grep-like scan
    # In a real scenario, we might want to ignore .git, venv, etc.
    # For now, let's just use git grep if available, or os.walk

    todo_pattern = re.compile(r"#\s*TODO")
    issue_pattern = re.compile(r"Issue:\s*#?(\w+)")  # Expecting TODO ... (Issue: #123)

    found_untracked = False

    for root, dirs, files in os.walk(root_dir):
        if ".git" in dirs:
            dirs.remove(".git")
        if "__pycache__" in dirs:
            dirs.remove("__pycache__")
        if "venv" in dirs:
            dirs.remove("venv")

        for file in files:
            if not file.endswith((".py", ".md", ".txt")):
                continue

            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r") as f:
                    lines = f.readlines()
                    for i, line in enumerate(lines):
                        if todo_pattern.search(line):
                            # Check if it has an issue ID
                            if not issue_pattern.search(line):
                                print(
                                    f"⚠️  Untracked TODO in {file}:{i + 1}: {line.strip()}"
                                )
                                found_untracked = True
            except Exception:
                pass  # Ignore binary or unreadable files

    if found_untracked:
        print("Tip: Use 'python3 dev_ops/commands/log_issue.py' to track these.")
        return False

    print("✅ No untracked TODOs found.")
    return True


def run_ci_checks(strict: bool = False) -> bool:
    """
    Run local CI checks.

    Args:
        strict: If True, fail on untracked TODOs.

    Returns:
        True if all checks pass, False otherwise.
    """
    print("🚀 Running Pre-flight Checks...")
    project_root = os.getcwd()

    # 1. Check Quality (Lint/Type)
    print("\n[1/3] Code Quality...")
    try:
        run_shell_command("python3 dev_ops/commands/check_quality.py")
    except Exception:
        print("❌ Quality Checks Failed.")
        return False

    # 2. Run Tests
    print("\n[2/3] Unit Tests...")
    try:
        run_shell_command("python3 dev_ops/commands/run_tests.py")
    except Exception:
        print("❌ Tests Failed.")
        return False

    # 3. Scan TODOs
    all_tracked = check_untracked_todos(project_root)

    if strict and not all_tracked:
        print("❌ Strict mode: Untracked TODOs found.")
        return False

    print("\n✅ All Checks Passed! Ready to Fly ✈️")
    return True


def main():
    parser = get_parser()
    args = parser.parse_args()

    if not run_ci_checks(args.strict):
        sys.exit(1)


if __name__ == "__main__":
    main()
