#!/usr/bin/env python3
import argparse
import os
import sys

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from shell_ops import run_shell_command
from interaction import prompt_user


def get_parser() -> argparse.ArgumentParser:
    """Returns the argument parser for this command."""
    parser = argparse.ArgumentParser(description="Trigger Deployment")
    parser.add_argument(
        "--env",
        choices=["staging", "production"],
        default="staging",
        help="Target Environment",
    )
    parser.add_argument(
        "--force", action="store_true", help="Skip CI checks (Dangerous)"
    )
    return parser


def trigger_deploy(env: str, force: bool = False) -> bool:
    """
    Trigger deployment.

    Args:
        env: Target environment (staging, production).
        force: If True, skip CI checks.

    Returns:
        True if deployment triggered successfully, False otherwise.
    """
    print(f"🚀 Preparing to deploy to {env.upper()}...")

    # 1. Run CI Checks
    if not force:
        print("Running Pre-flight Checks...")
        try:
            run_shell_command("python3 dev_ops/commands/ci_check.py --strict")
        except Exception:
            print("❌ CI Checks Failed. Aborting Deployment.")
            return False
    else:
        print("⚠️  Skipping CI Checks (Force Mode)")

    # 2. Confirm
    if prompt_user(f"Are you sure you want to deploy to {env}?", "n").lower() != "y":
        print("Deployment Cancelled.")
        return False

    # 3. Trigger Deployment
    # Placeholder for actual deployment logic (e.g., git tag, API call)
    print(f"📡 Triggering deployment pipeline for {env}...")

    # Example: Tagging the release
    # tag = f"release-{env}-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    # run_shell_command(f"git tag {tag}")
    # run_shell_command(f"git push origin {tag}")

    print("✅ Deployment triggered successfully!")
    return True


def main():
    parser = get_parser()
    args = parser.parse_args()

    if not trigger_deploy(args.env, args.force):
        sys.exit(1)


if __name__ == "__main__":
    main()
