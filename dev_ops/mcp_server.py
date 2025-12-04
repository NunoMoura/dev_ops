#!/usr/bin/env python3
import sys
import os

# Add current directory to sys.path to ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    print("Error: 'mcp' package not found. Please install it with 'pip install mcp'.")
    sys.exit(1)

from commands.log_issue import log_issue as log_issue_func
from commands.list_issues import list_issues as list_issues_func
from commands.next_issue import get_next_issue as get_next_issue_func
from commands.resolve_issue import resolve_issue as resolve_issue_func
from commands.ci_check import run_ci_checks as run_ci_checks_func
from commands.deploy import trigger_deploy as trigger_deploy_func

# Initialize FastMCP Server
mcp = FastMCP("dev_ops")


@mcp.tool()
def log_issue(title: str, description: str, priority: str = "medium") -> str:
    """
    Log a new issue or stub.

    Args:
        title: The title of the issue.
        description: A detailed description.
        priority: Priority level (low, medium, high, critical).
    """
    return log_issue_func(title, description, priority)


@mcp.tool()
def list_issues(show_all: bool = False) -> str:
    """
    List issues.

    Args:
        show_all: If True, show all issues. If False, show only open issues.
    """
    issues = list_issues_func(show_all)
    if not issues:
        return "No issues found."

    result = f"📋 Issues ({len(issues)})\n"
    result += "-" * 60 + "\n"
    result += f"{'ID':<10} {'Priority':<10} {'Status':<10} {'Title'}\n"
    result += "-" * 60 + "\n"

    for issue in issues:
        result += f"{issue['id']:<10} {issue['priority']:<10} {issue['status']:<10} {issue['title']}\n"

    return result


@mcp.tool()
def next_issue() -> str:
    """
    Get the next highest priority open issue.
    """
    issue = get_next_issue_func()
    if not issue:
        return "🎉 No open issues!"

    return f"👉 Next Issue:\n{issue}"


@mcp.tool()
def resolve_issue(issue_id: str) -> str:
    """
    Resolve an issue by ID.

    Args:
        issue_id: The ID of the issue to resolve.
    """
    if resolve_issue_func(issue_id):
        return f"✅ Issue {issue_id} resolved!"
    else:
        return f"❌ Issue {issue_id} not found."


@mcp.tool()
def ci_check(strict: bool = False) -> str:
    """
    Run local CI checks (Pre-flight).

    Args:
        strict: If True, fail on untracked TODOs.
    """
    if run_ci_checks_func(strict):
        return "✅ All Checks Passed!"
    else:
        return "❌ Checks Failed."


@mcp.tool()
def deploy(env: str, force: bool = False) -> str:
    """
    Trigger deployment.

    Args:
        env: Target environment (staging, production).
        force: If True, skip CI checks.
    """
    if trigger_deploy_func(env, force):
        return "✅ Deployment triggered successfully!"
    else:
        return "❌ Deployment failed."


def main():
    mcp.run()


if __name__ == "__main__":
    main()
