#!/usr/bin/env python3
import sys
import os
import argparse
import json

# Add project root to sys.path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from dev_ops.commands.log_issue import log_issue


def get_parser():
    parser = argparse.ArgumentParser(
        description="Ingest feedback from external sources (CI, Bug Bots)."
    )
    parser.add_argument(
        "--source",
        required=True,
        help="Source of the feedback (e.g., 'github-actions', 'bug-bot').",
    )
    parser.add_argument("--title", required=True, help="Title of the issue.")
    parser.add_argument("--desc", required=True, help="Description or payload.")
    parser.add_argument(
        "--context", help="JSON string of additional context (e.g., file, line, url)."
    )
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()

    print(f"📥 Ingesting feedback from {args.source}...")

    # Format the description to include source info
    full_description = f"**Source**: {args.source}\n\n{args.desc}"

    if args.context:
        try:
            context_dict = json.loads(args.context)
            full_description += (
                "\n\n**Context**:\n```json\n"
                + json.dumps(context_dict, indent=2)
                + "\n```"
            )
        except json.JSONDecodeError:
            full_description += f"\n\n**Context**: {args.context}"

    # Log the issue
    # We use 'high' priority for CI/Bot feedback by default to ensure visibility
    issue_id = log_issue(args.title, full_description, priority="high")

    print(f"✅ Feedback ingested as Issue: {issue_id}")


if __name__ == "__main__":
    main()
