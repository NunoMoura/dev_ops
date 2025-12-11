import argparse
import subprocess
import sys
import json
import os

# Ensure we can import doc_ops from the same directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import doc_ops
except ImportError:
    # Fallback if running from a different context
    pass


def run_gh_command(args):
    """Runs a GitHub CLI command."""
    try:
        result = subprocess.run(
            ["gh"] + args, capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running gh command: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("Error: 'gh' CLI not found. Please install the GitHub CLI.")
        sys.exit(1)


def get_pr_details(pr_number):
    """Fetches PR comments and reviews."""
    json_str = run_gh_command(
        ["pr", "view", str(pr_number), "--json", "comments,reviews,title,body"]
    )
    return json.loads(json_str)


def extract_comments(pr_number):
    """Extracts comments from a PR."""
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


def create_pr(title, body, base="main"):
    """Creates a Pull Request."""
    print(f"🚀 Creating PR: {title}...")
    url = run_gh_command(
        ["pr", "create", "--title", title, "--body", body, "--base", base]
    )
    print(f"✅ PR Created: {url}")


def triage_feedback(pr_number):
    """Interactively triage PR feedback into Bugs or Backlog items."""
    print(f"🕵️  Triaging PR #{pr_number}...")
    pdata = get_pr_details(pr_number)

    items = pdata.get("comments", []) + [
        r for r in pdata.get("reviews", []) if r["body"]
    ]

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
            title = input("Feature Title: ")
            # Add to backlog
            # We reuse the backlog creation logic from doc_ops
            # But doc_ops.create_doc("backlog") adds to backlog
            doc_ops.create_doc("backlog", title)


def main():
    parser = argparse.ArgumentParser(description="PR Operations")
    subparsers = parser.add_subparsers(dest="command")

    # Extract Comments
    extract_parser = subparsers.add_parser(
        "extract-comments", help="Extract comments from a PR"
    )
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

    if args.command == "extract-comments":
        extract_comments(args.pr)
    elif args.command == "create":
        create_pr(args.title, args.body, args.base)
    elif args.command == "triage":
        triage_feedback(args.pr)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
