#!/usr/bin/env python3
import os
import sys
import shutil
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.shared_utils.project_summary import summarize_project
from scripts.shared_utils.detector import detect_languages
from scripts.shared_utils.installer import install_rules


def main():
    parser = argparse.ArgumentParser(description="Bootstrap dev_ops agent rules.")
    parser.add_argument(
        "--target",
        default=os.getcwd(),
        help="Target project directory (default: current dir)",
    )
    args = parser.parse_args()

    PROJECT_ROOT = os.path.abspath(args.target)

    # DEV_OPS_ROOT is where this script lives (The Global Tool)
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    DEV_OPS_ROOT = os.path.dirname(SCRIPT_DIR)

    RULES_SRC_DIR = os.path.join(DEV_OPS_ROOT, "rules")
    AGENT_RULES_DIR = os.path.join(PROJECT_ROOT, ".agent", "rules")

    print(f"🚀 Bootstrapping dev_ops from {DEV_OPS_ROOT} to {PROJECT_ROOT}...")

    # 1. Summarize Project
    summarize_project(PROJECT_ROOT)

    # 2. Detect Languages
    langs = detect_languages(PROJECT_ROOT)
    print(f"Detected languages: {', '.join(langs)}")

    # 3. Install Rules
    install_rules(RULES_SRC_DIR, AGENT_RULES_DIR, PROJECT_ROOT, langs)

    # 4. Copy Workflows
    workflows_src_dir = os.path.join(DEV_OPS_ROOT, "workflows")
    workflows_dest_dir = os.path.join(PROJECT_ROOT, ".agent", "workflows")

    if os.path.exists(workflows_src_dir):
        print("\n📦 Copying Workflows...")
        os.makedirs(workflows_dest_dir, exist_ok=True)
        for file in os.listdir(workflows_src_dir):
            if file.endswith(".md"):
                shutil.copy2(
                    os.path.join(workflows_src_dir, file),
                    os.path.join(workflows_dest_dir, file),
                )
                print(f"✅ Installed workflow: {file}")

    # 5. Copy Scripts
    # We copy the scripts so the local workflows can run them self-contained
    scripts_src_dir = os.path.join(DEV_OPS_ROOT, "scripts")
    scripts_dest_dir = os.path.join(PROJECT_ROOT, ".agent", "scripts")

    print("\n📦 Copying Scripts...")
    if os.path.exists(scripts_src_dir):
        # We want to copy everything except maybe __pycache__
        # shutil.copytree requires dest to NOT exist usually, or use dirs_exist_ok=True (Py3.8+)
        shutil.copytree(
            scripts_src_dir,
            scripts_dest_dir,
            dirs_exist_ok=True,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
        )
        print("✅ Installed scripts to .agent/scripts")

    # 6. Initialize Data Directories (dev_ops/)
    print("\n📂 Initializing Data Directories...")
    data_structure = [
        "dev_ops/adrs",
        "dev_ops/bugs",
        "dev_ops/plans",
        "dev_ops/research",
    ]
    for rel_path in data_structure:
        full_path = os.path.join(PROJECT_ROOT, rel_path)
        os.makedirs(full_path, exist_ok=True)
        # Create .gitkeep to ensure git tracks it? Or just leave empty.
        with open(os.path.join(full_path, ".gitkeep"), "w") as f:
            pass
        print(f"✅ Created {rel_path}")

    # Create backlog.md if it doesn't exist
    backlog_path = os.path.join(PROJECT_ROOT, "dev_ops", "backlog.md")
    if not os.path.exists(backlog_path):
        with open(backlog_path, "w") as f:
            f.write(
                "# Project Backlog\n\n## High Priority\n\n## Medium Priority\n\n## Low Priority\n"
            )
        print("✅ Created dev_ops/backlog.md")

    print(
        "\n✨ Bootstrap Complete! Configuration installed to .agent/ and dev_ops/ directories."
    )


if __name__ == "__main__":
    main()
