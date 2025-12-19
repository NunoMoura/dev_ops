#!/usr/bin/env python3
"""
Health check script for DevOps framework installations.

Validates that the framework is properly installed and configured.
"""

import os
import sys
import argparse


def check_path_exists(path: str, description: str) -> bool:
    """Check if a path exists and report."""
    exists = os.path.exists(path)
    status = "✅" if exists else "❌"
    print(f"  {status} {description}: {path}")
    return exists


def check_directory_not_empty(path: str, description: str) -> bool:
    """Check if directory exists and is not empty."""
    if not os.path.isdir(path):
        print(f"  ❌ {description}: {path} (not found)")
        return False
    contents = os.listdir(path)
    if not contents:
        print(f"  ⚠️  {description}: {path} (empty)")
        return False
    print(f"  ✅ {description}: {path} ({len(contents)} items)")
    return True


def check_import(module_name: str) -> bool:
    """Check if a module can be imported."""
    try:
        __import__(module_name)
        print(f"  ✅ Import: {module_name}")
        return True
    except ImportError as e:
        print(f"  ❌ Import: {module_name} ({e})")
        return False


def run_health_check(project_root: str = None, verbose: bool = False) -> int:
    """
    Run health checks on the DevOps framework installation.

    Args:
        project_root: Root directory of the project. Defaults to current directory.
        verbose: Show additional details.

    Returns:
        0 if all checks pass, 1 if any fail.
    """
    if project_root is None:
        project_root = os.getcwd()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    framework_root = os.path.dirname(script_dir)

    print("🔍 DevOps Framework Health Check")
    print("=" * 50)
    print(f"Framework Location: {framework_root}")
    print(f"Project Root: {project_root}")
    print()

    errors = 0
    warnings = 0

    # Check 1: Core Framework Files
    print("📁 Core Framework Files:")
    core_files = [
        (os.path.join(framework_root, "README.md"), "README.md"),
        (os.path.join(framework_root, "CHANGELOG.md"), "CHANGELOG.md"),
        (os.path.join(framework_root, "requirements.txt"), "requirements.txt"),
    ]
    for path, desc in core_files:
        if not check_path_exists(path, desc):
            warnings += 1
    print()

    # Check 2: Scripts Directory
    print("📂 Scripts Directory:")
    scripts_dir = os.path.join(framework_root, "scripts")
    required_scripts = [
        "doc_ops.py",
        "setup_ops.py",
        "utils.py",
        "template_ops.py",
        "project_ops.py",
    ]
    if os.path.isdir(scripts_dir):
        for script in required_scripts:
            if not check_path_exists(os.path.join(scripts_dir, script), script):
                errors += 1
    else:
        print(f"  ❌ Scripts directory not found: {scripts_dir}")
        errors += 1
    print()

    # Check 3: Rules Directory (Flat Structure)
    print("📂 Rules Directory:")
    rules_dir = os.path.join(framework_root, "rules")
    if os.path.isdir(rules_dir):
        phase_rules = [f for f in os.listdir(rules_dir) if f.startswith("phase_")]
        if not phase_rules:
            print(f"  ⚠️  No phase rules found in {rules_dir}")
            warnings += 1
        else:
            print(f"  ✅ Phase rules: {len(phase_rules)} found")
    else:
        print(f"  ❌ Rules directory not found: {rules_dir}")
        errors += 1
    print()

    # Check 4: Workflows Directory
    print("📂 Workflows Directory:")
    workflows_dir = os.path.join(framework_root, "workflows")
    if not check_directory_not_empty(workflows_dir, "Workflows"):
        errors += 1
    else:
        # Check for essential workflows
        essential = [
            "bootstrap.md",
            "create_task.md",
            "report_bug.md",
            "complete_task.md",
        ]
        for wf in essential:
            check_path_exists(os.path.join(workflows_dir, wf), wf)
    print()

    # Check 5: Kanban Board (7-Column Model)
    print("📋 Kanban Board:")
    try:
        from scripts.kanban_ops import load_board

        board = load_board(project_root)
        columns = board.get("columns", [])
        if len(columns) == 7:
            print("  ✅ Kanban board: 7 columns found")
        else:
            print(f"  ❌ Kanban board: {len(columns)} columns (expected 7)")
            errors += 1
    except Exception as e:
        print(f"  ⚠️  Could not validate Kanban board: {e}")
        warnings += 1
    print()

    # Check 6: Python Imports
    print("🐍 Python Imports:")
    # Add scripts to path for import checks
    sys.path.insert(0, framework_root)
    check_import("scripts.utils")
    check_import("scripts.doc_ops")
    check_import("scripts.template_ops")
    check_import("scripts.kanban_ops")
    print()

    # Check 7: Target Project (if different from framework)
    if project_root != framework_root:
        print("📂 Target Project Installation:")
        agent_dir = os.path.join(project_root, ".agent")
        dev_ops_dir = os.path.join(project_root, "dev_ops")

        if os.path.exists(agent_dir):
            check_directory_not_empty(os.path.join(agent_dir, "rules"), ".agent/rules")
            check_directory_not_empty(
                os.path.join(agent_dir, "workflows"), ".agent/workflows"
            )
        else:
            print("  ⚠️  .agent directory not found - run /bootstrap first")
            warnings += 1

        if os.path.exists(dev_ops_dir):
            # Check for direct artifact directories
            for subdir in ["plans", "research", "bugs", "adrs", "tests"]:
                check_path_exists(
                    os.path.join(dev_ops_dir, subdir), f"dev_ops/{subdir}"
                )
        else:
            print("  ⚠️  dev_ops directory not found - run /bootstrap first")
            warnings += 1
        print()

    # Summary
    print("=" * 50)
    if errors == 0 and warnings == 0:
        print("✅ All health checks passed!")
        return 0
    elif errors == 0:
        print(f"⚠️  Health check completed with {warnings} warning(s)")
        return 0
    else:
        print(f"❌ Health check failed: {errors} error(s), {warnings} warning(s)")
        return 1


def main():
    parser = argparse.ArgumentParser(description="DevOps Framework Health Check")
    parser.add_argument(
        "--project-root",
        default=None,
        help="Target project directory (default: current directory)",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Show verbose output"
    )

    args = parser.parse_args()
    sys.exit(run_health_check(args.project_root, args.verbose))


if __name__ == "__main__":
    main()
