#!/usr/bin/env python3
"""PR Operations - GitHub CLI wrapper for PR management.

Provides utilities for extracting PR comments, creating PRs, and
triaging feedback into bugs or backlog items.
"""

import argparse
import json
import os
import subprocess
import sys
from typing import Any

# Ensure we can import doc_ops from the same directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import DevOpsError

try:
    import doc_ops
except ImportError:
    # Fallback if running from a different context
    doc_ops = None  # type: ignore


class GitHubCLIError(DevOpsError):
    """Raised when a GitHub CLI command fails."""

    pass


class GitHubCLINotFoundError(DevOpsError):
    """Raised when GitHub CLI is not installed."""

    pass


def run_gh_command(args: list[str]) -> str:
    """Run a GitHub CLI command.

    Args:
        args: Command arguments to pass to gh.

    Returns:
        Command output as string.

    Raises:
        GitHubCLIError: If the command fails.
        GitHubCLINotFoundError: If gh CLI is not installed.
    """
    try:
        result = subprocess.run(["gh"] + args, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        raise GitHubCLIError(f"gh command failed: {e.stderr}") from e
    except FileNotFoundError as e:
        raise GitHubCLINotFoundError(
            "GitHub CLI (gh) not found. Please install it: https://cli.github.com/"
        ) from e


def get_pr_details(pr_number: int | str) -> dict[str, Any]:
    """Fetch PR comments and reviews.

    Args:
        pr_number: PR number to fetch.

    Returns:
        Dictionary with PR title, body, comments, and reviews.

    Raises:
        GitHubCLIError: If fetching fails.
    """
    json_str = run_gh_command(
        ["pr", "view", str(pr_number), "--json", "comments,reviews,title,body"]
    )
    return json.loads(json_str)


def extract_comments(pr_number: int | str) -> None:
    """Extract and print comments from a PR.

    Args:
        pr_number: PR number to extract comments from.
    """
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


def create_pr(title: str, body: str, base: str = "main") -> str:
    """Create a Pull Request.

    Args:
        title: PR title.
        body: PR body/description.
        base: Base branch to merge into.

    Returns:
        URL of the created PR.

    Raises:
        GitHubCLIError: If PR creation fails.
    """
    print(f"🚀 Creating PR: {title}...")
    url = run_gh_command(["pr", "create", "--title", title, "--body", body, "--base", base])
    print(f"✅ PR Created: {url}")
    return url


def triage_feedback(pr_number: int | str) -> None:
    """Interactively triage PR feedback into Bugs or Backlog items.

    Args:
        pr_number: PR number to triage.
    """
    if doc_ops is None:
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

        print("\n----------------------------------------")
        print(f"User: {author}")
        print(f"Content: {body}")
        print("----------------------------------------")

        choice = input("Action? (b)ug / (f)eature / (s)kip / (q)uit: ").lower().strip()

        if choice == "q":
            break
        elif choice == "s":
            continue
        elif choice == "b":
            title = input("Bug Title: ")
            desc = f"Reported by {author} in PR #{pr_number}\nSource: {url}\n\n{body}"
            doc_ops.create_doc("bug", title, "high", desc)
        elif choice == "f":
            title = input("Task Title: ")
            doc_ops.create_doc("backlog", title)


def main() -> None:
    """Main entry point for PR operations CLI."""
    parser = argparse.ArgumentParser(description="PR Operations")
    subparsers = parser.add_subparsers(dest="command")

    # Extract Comments
    extract_parser = subparsers.add_parser("extract-comments", help="Extract comments from a PR")
    extract_parser.add_argument("--pr", required=True, help="PR Number")

    # Create PR
    create_parser = subparsers.add_parser("create", help="Create a PR")
    create_parser.add_argument("--title", required=True, help="PR Title")
    create_parser.add_argument("--body", required=True, help="PR Body")
    create_parser.add_argument("--base", default="main", help="Base branch")

    # Triage
    triage_parser = subparsers.add_parser("triage", help="Triage PR feedback")
    triage_parser.add_argument("--pr", required=True, help="PR Number")

    args = parser.parse_args()

    try:
        if args.command == "extract-comments":
            extract_comments(args.pr)
        elif args.command == "create":
            create_pr(args.title, args.body, args.base)
        elif args.command == "triage":
            triage_feedback(args.pr)
        else:
            parser.print_help()
    except GitHubCLINotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)
    except GitHubCLIError as e:
        print(f"❌ {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
