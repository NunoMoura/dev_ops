#!/usr/bin/env python3
"""Git Operations - Git and GitHub CLI utilities.

Provides:
- Structured git commits
- Git notes for traceability
- GitHub PR operations (create, extract comments, triage)
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
from typing import Any

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import DevOpsError, prompt_user, run_command

# ==========================================
# EXCEPTIONS
# ==========================================


class GitHubCLIError(DevOpsError):
    """Raised when a GitHub CLI command fails."""

    pass


class GitHubCLINotFoundError(DevOpsError):
    """Raised when GitHub CLI is not installed."""

    pass


# ==========================================
# GIT UTILITIES
# ==========================================


def get_head_sha(short: bool = True) -> str | None:
    """Get the current HEAD commit SHA."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            sha = result.stdout.strip()
            return sha[:7] if short else sha
    except Exception:
        pass
    return None


def add_git_note(commit_sha: str, note_content: str) -> bool:
    """Attach a git note to a commit."""
    try:
        result = subprocess.run(
            ["git", "notes", "add", "-f", "-m", note_content, commit_sha],
            capture_output=True,
            text=True,
        )
        return result.returncode == 0
    except Exception:
        return False


def git_commit(
    context: str = "", decision: str = "", arch: str = "None", verification: str = "Tests passed"
):
    """Create a structured git commit."""
    print("💾 Structured Git Commit...")

    # Gather data if not provided
    context = context or prompt_user("Context (Why?)")
    decision = decision or prompt_user("Decision (What?)")

    message = f"""{decision}

**Context**: {context}
**Architecture**: {arch}
**Verification**: {verification}
"""

    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write(message)
        msg_path = f.name

    run_command(f"git commit -F {msg_path}")
    os.unlink(msg_path)
    print("✅ Committed!")


def board_commit(action: str, task_id: str, username: str) -> bool:
    """Create a board-only commit with standard format.

    Format: [devops] <action> <task-id> @<username>
    Actions: claim, release, update, done

    This standardized format enables:
    - Git-based task claiming (first push wins)
    - Collaboration visibility
    - Automated parsing of board history
    """
    valid_actions = ["claim", "release", "update", "done"]
    if action not in valid_actions:
        print(f"❌ Invalid action: {action}. Must be one of {valid_actions}")
        return False

    message = f"[devops] {action} {task_id} @{username}"
    print(f"📋 Board commit: {message}")

    try:
        # Stage board.json
        result = subprocess.run(
            ["git", "add", ".dev_ops/board.json"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"⚠️ Failed to stage board.json: {result.stderr}")
            return False

        # Commit
        result = subprocess.run(
            ["git", "commit", "-m", message],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            if "nothing to commit" in result.stdout or "nothing to commit" in result.stderr:
                print("ℹ️ No changes to commit")
                return True
            print(f"⚠️ Commit failed: {result.stderr}")
            return False

        print("✅ Board change committed!")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


# ==========================================
# GITHUB CLI UTILITIES
# ==========================================


def run_gh_command(args: list[str]) -> str:
    """Run a GitHub CLI command."""
    try:
        result = subprocess.run(["gh"] + args, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        raise GitHubCLIError(f"gh command failed: {e.stderr}") from e
    except FileNotFoundError as e:
        raise GitHubCLINotFoundError(
            "GitHub CLI (gh) not found. Install: https://cli.github.com/"
        ) from e


def get_pr_details(pr_number: int | str) -> dict[str, Any]:
    """Fetch PR comments and reviews."""
    json_str = run_gh_command(
        ["pr", "view", str(pr_number), "--json", "comments,reviews,title,body"]
    )
    return json.loads(json_str)


def pr_extract_comments(pr_number: int | str) -> None:
    """Extract and print comments from a PR."""
    print(f"🔍 Fetching comments for PR #{pr_number}...")
    pdata = get_pr_details(pr_number)

    print(f"\nTitle: {pdata.get('title')}")
    print("\n--- PR Comments ---")
    for comment in pdata.get("comments", []):
        print(f"\nUser: {comment['author']['login']}")
        print(f"Body: {comment['body']}")
        print(f"Link: {comment['url']}")

    print("\n--- Reviews ---")
    for review in pdata.get("reviews", []):
        print(f"\nUser: {review['author']['login']} ({review['state']})")
        if review["body"]:
            print(f"Body: {review['body']}")


def pr_create(title: str, body: str, base: str = "main") -> str:
    """Create a Pull Request."""
    print(f"🚀 Creating PR: {title}...")
    url = run_gh_command(["pr", "create", "--title", title, "--body", body, "--base", base])
    print(f"✅ PR Created: {url}")
    return url


def pr_triage(pr_number: int | str) -> None:
    """Interactively triage PR feedback into Bugs or Backlog items."""
    try:
        import doc_ops
    except ImportError:
        print("⚠️ doc_ops module not available. Cannot triage feedback.")
        return

    print(f"🕵️  Triaging PR #{pr_number}...")
    pdata = get_pr_details(pr_number)

    items = pdata.get("comments", []) + [r for r in pdata.get("reviews", []) if r["body"]]

    if not items:
        print("No comments or review notes found.")
        return

    for item in items:
        author = item["author"]["login"]
        body = item["body"]
        url = item.get("url", "No URL")

        print("\n" + "-" * 40)
        print(f"User: {author}")
        print(f"Content: {body}")
        print("-" * 40)

        choice = prompt_user("Action? (b)ug / (s)tory / (k)ip / (q)uit").lower().strip()

        if choice == "q":
            break
        elif choice == "k":
            continue
        elif choice == "b":
            import artifact_ops

            title = prompt_user("Bug Title")
            desc = f"Reported by {author} in PR #{pr_number}\nSource: {url}\n\n{body}"
            artifact_ops.create_artifact("bug", title, "high", desc)
        elif choice == "s":
            title = prompt_user("Story Title")
            doc_ops.create_story(title)


# ==========================================
# MAIN
# ==========================================


def main():
    parser = argparse.ArgumentParser(description="Git and GitHub operations.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # COMMIT
    commit_parser = subparsers.add_parser("commit", help="Create structured commit")
    commit_parser.add_argument("--context", help="Context (Why?)")
    commit_parser.add_argument("--decision", help="Decision (What?)")
    commit_parser.add_argument("--arch", default="None", help="Architecture changes")
    commit_parser.add_argument("--verification", default="Tests passed", help="Verification")

    # PR CREATE
    pr_create_parser = subparsers.add_parser("pr-create", help="Create a PR")
    pr_create_parser.add_argument("--title", required=True, help="PR Title")
    pr_create_parser.add_argument("--body", required=True, help="PR Body")
    pr_create_parser.add_argument("--base", default="main", help="Base branch")

    # PR EXTRACT
    pr_extract_parser = subparsers.add_parser("pr-extract", help="Extract PR comments")
    pr_extract_parser.add_argument("--pr", required=True, help="PR Number")

    # PR TRIAGE
    pr_triage_parser = subparsers.add_parser("pr-triage", help="Triage PR feedback")
    pr_triage_parser.add_argument("--pr", required=True, help="PR Number")

    # BOARD-COMMIT
    board_commit_parser = subparsers.add_parser(
        "board-commit", help="Commit board change with standard format"
    )
    board_commit_parser.add_argument(
        "action", choices=["claim", "release", "update", "done"], help="Action type"
    )
    board_commit_parser.add_argument("task_id", help="Task ID (e.g., TASK-001)")
    board_commit_parser.add_argument("--user", required=True, help="Username for commit message")

    args = parser.parse_args()

    try:
        if args.command == "commit":
            git_commit(args.context or "", args.decision or "", args.arch, args.verification)
        elif args.command == "pr-create":
            pr_create(args.title, args.body, args.base)
        elif args.command == "pr-extract":
            pr_extract_comments(args.pr)
        elif args.command == "pr-triage":
            pr_triage(args.pr)
        elif args.command == "board-commit":
            success = board_commit(args.action, args.task_id, args.user)
            if not success:
                sys.exit(1)
    except GitHubCLINotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except GitHubCLIError as e:
        print(f"❌ {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
