#!/usr/bin/env python3
import os
import sys
import shutil
import argparse
import subprocess
import json

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import write_file, prompt_user
from project_ops import detect_stack, get_file_content


# ==========================================
# Kanban Extension Installation
# ==========================================


def install_kanban_extension(dev_ops_root: str):
    """Install the DevOps Kanban VS Code extension if not already installed."""
    print("\n🔧 Checking Kanban extension...")

    # Check if already installed
    try:
        result = subprocess.run(
            ["code", "--list-extensions"], capture_output=True, text=True, timeout=30
        )
        if "devops-kanban" in result.stdout.lower():
            print("   ✅ DevOps Kanban extension already installed")
            return
    except Exception as e:
        print(f"   ⚠️ Could not check extensions: {e}")

    # Install from VSIX
    vsix_path = os.path.join(
        dev_ops_root, "vendor", "titan-kanban", "devops-kanban-0.0.1.vsix"
    )
    if os.path.exists(vsix_path):
        print("   📦 Installing DevOps Kanban extension...")
        try:
            subprocess.run(
                ["code", "--install-extension", vsix_path], check=True, timeout=60
            )
            print("   ✅ DevOps Kanban extension installed")
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ Failed to install extension: {e}")
    else:
        print(f"   ⚠️ Extension VSIX not found at {vsix_path}")


def init_kanban_board(project_root: str):
    """Initialize the Kanban board if not exists."""
    kanban_dir = os.path.join(project_root, "dev_ops", "kanban")
    board_path = os.path.join(kanban_dir, "board.json")

    if os.path.exists(board_path):
        print("   ✅ Kanban board already exists")
        return

    print("   📋 Initializing Kanban board...")
    os.makedirs(kanban_dir, exist_ok=True)

    initial_board = {
        "version": 1,
        "columns": [
            {"id": "backlog", "name": "Backlog", "position": 1},
            {"id": "in-progress", "name": "In Progress", "position": 2},
            {"id": "review", "name": "Review", "position": 3},
            {"id": "done", "name": "Done", "position": 4},
        ],
        "items": [],
    }

    with open(board_path, "w") as f:
        json.dump(initial_board, f, indent=2)

    print("   ✅ Kanban board initialized at dev_ops/kanban/board.json")


# ==========================================
# Project Summary
# ==========================================


def summarize_project(project_root: str):
    """Generates a summary of the project structure."""
    print(f"\n📊 Summarizing project at {project_root}...")
    file_count = 0
    dir_count = 0
    for root, dirs, files in os.walk(project_root):
        if ".git" in root or "node_modules" in root or "venv" in root:
            continue
        dir_count += len(dirs)
        file_count += len(files)
    print(f"   Found {file_count} files in {dir_count} directories.")


# ==========================================
# Workflows & Rules Installation
# ==========================================


# ==========================================
# Rule Proposal & Installation
# ==========================================


def get_core_rules(rules_src: str) -> list:
    """Get all Core rules that should always be present."""
    proposed = []
    core_path = os.path.join(rules_src, "core")
    if os.path.exists(core_path):
        for file in os.listdir(core_path):
            if file.endswith(".md") and not file.startswith("_"):
                proposed.append(
                    {
                        "name": file,
                        "src": os.path.join(core_path, file),
                        "category": "Core",
                        "reason": "Essential DevOps rule",
                        "replacements": {},
                    }
                )
    return proposed


def get_all_rules(rules_src: str, project_root: str):
    """Combines Core rules with Dynamic Stack rules."""
    core_rules = get_core_rules(rules_src)
    dynamic_rules = detect_stack(project_root)

    # Fix paths for dynamic rules (templates need full path)
    for rule in dynamic_rules:
        # Prepend rules_src to the template relative path
        rule["src"] = os.path.join(
            rules_src, "..", rule["template"]
        )  # template is like 'rules/languages/_template.md'
        # Actually rules_src is '.../rules', so we need to go up one level if template starts with rules/
        # Or just construct it correctly.
        # project_ops returns 'rules/languages/_template.md'.
        # rules_src is '/path/to/rules'.
        # So we want '/path/to/rules/languages/_template.md'
        # project_ops template is relative to Repo Root.
        # rules_src is '.../dev_ops/rules'
        repo_root = os.path.dirname(rules_src)
        rule["src"] = os.path.join(repo_root, rule["template"])

    return sorted(core_rules + dynamic_rules, key=lambda x: (x["category"], x["name"]))


def install_rules(proposed_rules: list, rules_dest: str):
    """Installs the selected rules with text replacement."""
    print("\n📦 Installing Rules...")

    # Flatten structure by categories? No, user wants .agent/rules/ filled.
    # We should probably respect categories in destination?
    # Original logic: dest_path = os.path.join(rules_dest, rule["name"]) -> Flat structure if name is just "python.md"
    # But names could collide if flatten. Let's create subdirs.

    for rule in proposed_rules:
        # Create subfolder based on category if needed
        # Core rules go to root, others to subdirs
        cat_dir = {
            "Core": "",  # Core rules go to rules/ root
            "Language": "languages",
            "Linter": "linters",
            "Library": "libraries",
            "Pattern": "patterns",
        }.get(rule.get("category"), "misc")

        if cat_dir:
            target_dir = os.path.join(rules_dest, cat_dir)
        else:
            target_dir = rules_dest
        os.makedirs(target_dir, exist_ok=True)

        if not os.path.exists(rule["src"]):
            print(f"   ! Warning: Source for {rule['name']} not found at {rule['src']}")
            continue

        # Read
        content = get_file_content(rule["src"])

        # Apply Rule-Specific Replacements
        custom_repls = rule.get("replacements", {})
        for key, value in custom_repls.items():
            content = content.replace(key, str(value))
        dest_path = os.path.join(target_dir, rule["name"])
        write_file(dest_path, content)
        print(f"   - Installed {cat_dir}/{rule['name']} ({rule['category']})")


# ==========================================
# Bootstrap / Setup
# ==========================================


def bootstrap(target_dir: str):
    PROJECT_ROOT = os.path.abspath(target_dir)

    # Locate Global Sources (dev_ops_core)
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    # Assuming this script is running from [dev_ops_core]/scripts/setup_ops.py
    DEV_OPS_CORE_ROOT = os.path.dirname(SCRIPT_DIR)

    RULES_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, "rules")
    WORKFLOWS_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, "workflows")
    SCRIPTS_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, "scripts")

    # Destination Paths
    AGENT_DIR = os.path.join(PROJECT_ROOT, ".agent")
    DEVOPS_DIR = os.path.join(PROJECT_ROOT, "dev_ops")
    DEVOPS_DOCS_DIR = os.path.join(DEVOPS_DIR, "docs")
    DEVOPS_SCRIPTS_DIR = os.path.join(DEVOPS_DIR, "scripts")

    print(f"🚀 Bootstrapping dev_ops in {PROJECT_ROOT}...")

    # 1. Summarize & Detect
    summarize_project(PROJECT_ROOT)

    # 2. Detect & Propose Rules
    print("🔍 Analyzing project stack...")

    proposed_rules = get_all_rules(RULES_SRC_DIR, PROJECT_ROOT)

    # 3. Plan Rule Installation
    AGENT_RULES_DIR = os.path.join(AGENT_DIR, "rules")

    # 4. Interactive Confirmation
    print("\n📋 Proposed Rules Configuration:")
    print(f"   Target: {AGENT_RULES_DIR}")
    print("   -------------------------------------------------")
    print(f"   {'Category':<15} | {'Rule':<20} | {'Reason'}")
    print("   -------------------------------------------------")
    for r in proposed_rules:
        print(f"   {r['category']:<15} | {r['name']:<20} | {r['reason']}")
    print("   -------------------------------------------------")

    confirm = prompt_user("\nProceed with installation? (y/n)", "y")
    if confirm.lower() != "y":
        print("❌ Installation aborted by user.")
        return

    # 5. Execute Installation

    # Consolidate Docs
    print("\n📂 Checking Documentation...")
    # Check for existing doc folders
    found_docs = None
    for candidate in ["docs", "documentation", "doc", "dev_docs"]:
        path = os.path.join(PROJECT_ROOT, candidate)
        if os.path.exists(path) and os.path.isdir(path) and path != DEVOPS_DOCS_DIR:
            found_docs = path
            break

    if found_docs:
        should_move = prompt_user(
            f"Found existing docs at '{os.path.basename(found_docs)}'. Move to 'dev_ops/docs'? (y/n)",
            "y",
        )
        if should_move.lower() == "y":
            os.makedirs(os.path.dirname(DEVOPS_DOCS_DIR), exist_ok=True)
            if os.path.exists(DEVOPS_DOCS_DIR):
                print(f"Warning: {DEVOPS_DOCS_DIR} already exists. Merging content...")
                shutil.copytree(found_docs, DEVOPS_DOCS_DIR, dirs_exist_ok=True)
                shutil.rmtree(
                    found_docs
                )  # Safe to remove after copy? User said BE SAFE.
                # Let's keep the existing logic:
                # shutil.rmtree(found_docs) # BE SAFE, DONT DELETE FOR NOW
                print(f"✅ Moved content to {DEVOPS_DOCS_DIR} (Old folder removed)")
            else:
                shutil.move(found_docs, DEVOPS_DOCS_DIR)
                print(f"✅ Moved {os.path.basename(found_docs)} to {DEVOPS_DOCS_DIR}")
        else:
            print("Skipping docs move.")
            os.makedirs(DEVOPS_DOCS_DIR, exist_ok=True)
    else:
        os.makedirs(DEVOPS_DOCS_DIR, exist_ok=True)

    # Ensure Subdirectories
    for subdir in ["adrs", "bugs", "plans", "research"]:
        os.makedirs(os.path.join(DEVOPS_DOCS_DIR, subdir), exist_ok=True)

    # Create PRD if missing
    prd_found = False
    possible_names = ["prd.md", "PRD.md", "requirements.md", "specs.md"]
    search_dirs = [PROJECT_ROOT, DEVOPS_DOCS_DIR]

    for d in search_dirs:
        if not os.path.exists(d):
            continue
        for f in os.listdir(d):
            if f in possible_names:
                prd_found = True
                break
        if prd_found:
            break

    if not prd_found:
        print("📄 Creating prd.md template...")
        prd_path = os.path.join(DEVOPS_DOCS_DIR, "prd.md")
        write_file(
            prd_path,
            "# Product Requirement Document\n\n## Overview\n\n## Goals\n\n## User Stories\n",
        )
    else:
        print("✅ PRD found.")

    # Copy Scripts to Local dev_ops/scripts
    # NOTE: We can update the scripts being installed to include any new ones if needed.
    print("\n📦 Installing Local Scripts...")
    os.makedirs(DEVOPS_SCRIPTS_DIR, exist_ok=True)

    scripts_to_copy = [
        "doc_ops.py",
        "git_ops.py",
        "setup_ops.py",
        "utils.py",
        "pr_ops.py",
        "project_ops.py",  # Include project operations logic
    ]
    for script in scripts_to_copy:
        src = os.path.join(SCRIPTS_SRC_DIR, script)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DEVOPS_SCRIPTS_DIR, script))
            print(f"   - Installed {script}")
        else:
            print(f"   ! Warning: Script {script} not found in source.")

    # Install Rules (using the plan)
    install_rules(proposed_rules, AGENT_RULES_DIR)

    if os.path.exists(WORKFLOWS_SRC_DIR):
        print("\n📦 Installing Workflows...")
        AGENT_WORKFLOWS_DIR = os.path.join(AGENT_DIR, "workflows")
        os.makedirs(AGENT_WORKFLOWS_DIR, exist_ok=True)

        os.makedirs(AGENT_WORKFLOWS_DIR, exist_ok=True)
        for file in os.listdir(WORKFLOWS_SRC_DIR):
            if file.endswith(".md") and not file.startswith("_"):
                shutil.copy2(
                    os.path.join(WORKFLOWS_SRC_DIR, file),
                    os.path.join(AGENT_WORKFLOWS_DIR, file),
                )
                print(f"   - Installed {file}")

    # Install GitHub Actions Workflows
    GITHUB_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, ".github")
    GITHUB_DEST_DIR = os.path.join(PROJECT_ROOT, ".github")

    if os.path.exists(GITHUB_SRC_DIR):
        print("\n🤖 Installing CI/CD Workflows...")
        # Merge folders (usually .github/workflows)
        for root, dirs, files in os.walk(GITHUB_SRC_DIR):
            rel_path = os.path.relpath(root, GITHUB_SRC_DIR)
            dest_path = os.path.join(GITHUB_DEST_DIR, rel_path)
            os.makedirs(dest_path, exist_ok=True)
            for file in files:
                dest_file_path = os.path.join(dest_path, file)
                if os.path.exists(dest_file_path):
                    choice = prompt_user(
                        f"⚠️  {file} already exists in .github. Overwrite? (y/n)", "n"
                    )
                    if choice.lower() != "y":
                        print(f"   - Skipped {file}")
                        continue

                shutil.copy2(os.path.join(root, file), dest_file_path)
                print(f"   - Installed .github/{rel_path}/{file}")

    # Initialize Kanban Board (replaces old backlog.md)
    init_kanban_board(PROJECT_ROOT)

    # Install Kanban Extension (if VS Code available)
    install_kanban_extension(DEV_OPS_CORE_ROOT)

    print("\n✨ Setup Complete! dev_ops installed locally.")


def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap/Setup dev_ops in a project."
    )
    parser.add_argument(
        "--target", default=os.getcwd(), help="Target project directory"
    )
    args = parser.parse_args()

    bootstrap(args.target)


if __name__ == "__main__":
    main()
