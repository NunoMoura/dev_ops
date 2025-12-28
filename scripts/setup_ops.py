#!/usr/bin/env python3
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from kanban_ops import DEFAULT_COLUMNS  # Import shared column definitions
from project_ops import detect_stack, get_file_content
from utils import prompt_user, write_file

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
        if "dev-ops" in result.stdout.lower():
            print("   ✅ DevOps Kanban extension already installed")
            return
    except Exception as e:
        print(f"   ⚠️ Could not check extensions: {e}")

    # Install from VSIX - find latest version dynamically
    vsix_pattern = os.path.join(dev_ops_root, "extension", "dev-ops-*.vsix")
    vsix_files = glob.glob(vsix_pattern)

    # Sort by version number (assuming format dev-ops-X.Y.Z.vsix)
    # If generic sort fails, we can rely on file modification time as a fallback or just alpha sort
    # Alpha sort works if versions are zero-padded or simple enough.
    vsix_files = sorted(vsix_files, reverse=True)  # simplistic sort, usually sufficient for X.Y.Z

    vsix_path = vsix_files[0] if vsix_files else None

    if vsix_path and os.path.exists(vsix_path):
        print(f"   📦 Installing DevOps Kanban extension ({os.path.basename(vsix_path)})...")
        try:
            subprocess.run(["code", "--install-extension", vsix_path], check=True, timeout=60)
            print("   ✅ DevOps Kanban extension installed")
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ Failed to install extension: {e}")
    else:
        print(f"   ⚠️ No extension VSIX found matching {vsix_pattern}")


def init_kanban_board(project_root: str):
    """Initialize the Kanban board if not exists."""
    dev_ops_dir = os.path.join(project_root, "dev_ops")
    board_path = os.path.join(dev_ops_dir, "board.json")

    if os.path.exists(board_path):
        print("   ✅ Kanban board already exists")
        return

    print("   📋 Initializing Kanban board...")
    os.makedirs(dev_ops_dir, exist_ok=True)

    # Load columns from shared schema via kanban_ops
    columns = DEFAULT_COLUMNS

    initial_board = {
        "version": 1,
        "columns": columns,
        "items": [],
    }

    with open(board_path, "w") as f:
        json.dump(initial_board, f, indent=2)

    print("   ✅ Kanban board initialized at dev_ops/board.json")


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
# IDE Detection & Format Conversion
# ==========================================


def detect_ide() -> str:
    """
    Detect which IDE is being used based on available binaries.
    Returns: 'antigravity', 'cursor', or 'unknown'
    """
    # Check for Cursor first (more specific)
    if shutil.which("cursor"):
        try:
            result = subprocess.run(
                ["cursor", "--version"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                print("   🔍 Detected IDE: Cursor")
                return "cursor"
        except Exception:
            pass

    # Check for Antigravity (code binary with specific marker)
    if shutil.which("code"):
        try:
            result = subprocess.run(
                ["code", "--version"], capture_output=True, text=True, timeout=5
            )
            # Antigravity typically identifies itself in version output
            if "antigravity" in result.stdout.lower():
                print("   🔍 Detected IDE: Antigravity")
                return "antigravity"
            # Default VS Code / Antigravity variant
            print("   🔍 Detected IDE: VS Code (assuming Antigravity-compatible)")
            return "antigravity"
        except Exception:
            pass

    print("   ⚠️ Could not detect IDE, defaulting to Antigravity format")
    return "antigravity"


def convert_frontmatter_for_cursor(content: str) -> str:
    """
    Convert Antigravity frontmatter format to Cursor .mdc format.

    Antigravity format:
        ---
        phase: build
        activation_mode: Model Decides
        triggers: [task_in_build]
        description: Build phase instructions
        ---

    Cursor format:
        ---
        alwaysApply: false
        description: Apply during Build phase - when implementing code from a plan
        ---

    Key differences:
    - Cursor uses alwaysApply (bool) instead of activation_mode (string)
    - Cursor doesn't have event-based triggers, uses description for AI context
    - Phase rules need enhanced descriptions for proper AI activation
    """
    import re

    # Find frontmatter block
    match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        return content

    frontmatter = match.group(1)
    body = content[match.end() :]

    # Extract phase for enhanced description (before removing it)
    phase_match = re.search(r"phase:\s*(\w+)", frontmatter)
    phase_name = phase_match.group(1) if phase_match else None

    # Extract existing description
    desc_match = re.search(r"description:\s*(.+?)(?:\n|$)", frontmatter)
    existing_desc = desc_match.group(1).strip() if desc_match else ""

    # Phase-to-context mapping for Cursor AI activation
    phase_contexts = {
        "backlog": "when claiming a new task from the backlog",
        "understand": "when researching and understanding a task's requirements",
        "plan": "when creating implementation plans and breaking down tasks",
        "build": "when implementing code and writing tests",
        "verify": "when testing, reviewing, and validating completed work",
    }

    # Convert activation_mode to alwaysApply
    always_apply = "activation_mode: Always On" in frontmatter

    # Extract globs (same syntax for both IDEs)
    globs_match = re.search(r"globs:\s*(\[.*?\])", frontmatter)
    globs_value = globs_match.group(1) if globs_match else None

    # Build new frontmatter
    new_lines = []
    new_lines.append(f"alwaysApply: {'true' if always_apply else 'false'}")

    # Add globs if present (file-pattern activation)
    if globs_value:
        new_lines.append(f"globs: {globs_value}")

    # Create enhanced description for phase rules
    if phase_name and phase_name.lower() in phase_contexts:
        phase_context = phase_contexts[phase_name.lower()]
        if existing_desc:
            new_desc = f"{existing_desc} - Apply {phase_context}"
        else:
            new_desc = f"{phase_name.capitalize()} phase rule - Apply {phase_context}"
        new_lines.append(f"description: {new_desc}")
    elif existing_desc:
        new_lines.append(f"description: {existing_desc}")

    # Ensure proper formatting
    new_frontmatter = "\n".join(new_lines) + "\n"

    return f"---\n{new_frontmatter}---\n{body}"


def get_ide_paths(project_root: str, ide: str) -> tuple:
    """Get the correct paths for rules and workflows based on IDE."""
    if ide == "cursor":
        agent_dir = os.path.join(project_root, ".cursor")
        rules_dir = os.path.join(agent_dir, "rules")
        workflows_dir = os.path.join(agent_dir, "commands")  # Cursor uses .cursor/commands/
        file_ext = ".mdc"
    else:  # antigravity or unknown
        agent_dir = os.path.join(project_root, ".agent")
        rules_dir = os.path.join(agent_dir, "rules")
        workflows_dir = os.path.join(agent_dir, "workflows")
        file_ext = ".md"

    return agent_dir, rules_dir, workflows_dir, file_ext


# ==========================================
# Workflows & Rules Installation
# ==========================================


# ==========================================
# Rule Proposal & Installation
# ==========================================


def get_core_rules(core_rules_src: str) -> list:
    """Get all Core rules that should always be present (phase rules and guide)."""
    proposed = []
    # Core rules are in rules/
    core_files = [
        "dev_ops_guide.md",
    ]
    # Phase rules are in rules/development_phases/
    phase_files = [
        "1_backlog.md",
        "2_understand.md",
        "3_plan.md",
        "4_build.md",
        "5_verify.md",
    ]
    for file in core_files:
        src_path = os.path.join(core_rules_src, file)
        if os.path.exists(src_path):
            proposed.append(
                {
                    "name": file,
                    "src": src_path,
                    "category": "Core",
                    "reason": "Essential DevOps guide",
                    "replacements": {},
                }
            )
    for file in phase_files:
        src_path = os.path.join(core_rules_src, "development_phases", file)
        if os.path.exists(src_path):
            proposed.append(
                {
                    "name": file,
                    "src": src_path,
                    "category": "Core",
                    "reason": "Development phase rule",
                    "replacements": {},
                }
            )
    return proposed


def get_all_rules(core_rules_src: str, templates_rules_src: str, project_root: str):
    """Combines Core rules with Dynamic Stack rules."""
    core_rules = get_core_rules(core_rules_src)
    dynamic_rules = detect_stack(project_root)

    # Fix paths for dynamic rules (templates need full path)
    # project_ops returns 'templates/rules/languages.md'
    # templates_rules_src is '.../templates/rules'
    # So we go up two levels to get repo root, then join with template path
    for rule in dynamic_rules:
        repo_root = os.path.dirname(os.path.dirname(templates_rules_src))
        rule["src"] = os.path.join(repo_root, rule["template"])

    return sorted(core_rules + dynamic_rules, key=lambda x: (x["category"], x["name"]))


def install_rules(proposed_rules: list, rules_dest: str, ide: str = "antigravity"):
    """Installs the selected rules with text replacement and IDE-specific formatting."""
    print(f"\n📦 Installing Rules (format: {ide})...")

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

        # Convert frontmatter for Cursor
        if ide == "cursor":
            content = convert_frontmatter_for_cursor(content)

        # Use correct file extension (rename .md to .mdc for Cursor)
        rule_name = rule["name"]
        if ide == "cursor" and rule_name.endswith(".md"):
            rule_name = rule_name[:-3] + ".mdc"

        dest_path = os.path.join(target_dir, rule_name)
        write_file(dest_path, content)
        print(f"   - Installed {cat_dir}/{rule_name} ({rule['category']})")


# ==========================================
# Bootstrap / Setup
# ==========================================


def bootstrap(target_dir: str):
    PROJECT_ROOT = os.path.abspath(target_dir)

    # Locate Global Sources (dev_ops_core)
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    # Assuming this script is running from [dev_ops_core]/scripts/setup_ops.py
    DEV_OPS_CORE_ROOT = os.path.dirname(SCRIPT_DIR)

    RULES_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, "templates", "rules")  # Generator templates
    CORE_RULES_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, "rules")  # Actual rules (phases, guide)
    WORKFLOWS_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, "workflows")
    SCRIPTS_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, "scripts")

    # Destination Paths
    AGENT_DIR = os.path.join(PROJECT_ROOT, ".agent")
    DEVOPS_DIR = os.path.join(PROJECT_ROOT, "dev_ops")
    DEVOPS_DOCS_DIR = os.path.join(DEVOPS_DIR, "docs")
    DEVOPS_SCRIPTS_DIR = os.path.join(DEVOPS_DIR, "scripts")

    print(f"🚀 Bootstrapping dev_ops in {PROJECT_ROOT}...")

    # 0. Detect IDE
    print("\n🔍 Detecting IDE...")
    detected_ide = detect_ide()

    # Get IDE-specific paths
    AGENT_DIR, AGENT_RULES_DIR, AGENT_WORKFLOWS_DIR, _ = get_ide_paths(PROJECT_ROOT, detected_ide)

    # 1. Summarize & Detect
    summarize_project(PROJECT_ROOT)

    # 2. Detect & Propose Rules
    print("🔍 Analyzing project stack...")

    proposed_rules = get_all_rules(CORE_RULES_SRC_DIR, RULES_SRC_DIR, PROJECT_ROOT)

    # 3. Interactive Confirmation
    ide_folder = ".cursor" if detected_ide == "cursor" else ".agent"
    print("\n📋 Proposed Rules Configuration:")
    print(f"   IDE: {detected_ide} → Target: {ide_folder}/rules/")
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
                shutil.rmtree(found_docs)  # Safe to remove after copy? User said BE SAFE.
                # Let's keep the existing logic:
                # shutil.rmtree(found_docs) # BE SAFE, DONT DELETE FOR NOW
                print(f"✅ Moved content to {DEVOPS_DOCS_DIR} (Old folder removed)")
            else:
                shutil.move(found_docs, DEVOPS_DOCS_DIR)
                print(f"✅ Moved {os.path.basename(found_docs)} to {DEVOPS_DOCS_DIR}")
        else:
            print("Skipping docs move.")
    # Ensure Subdirectories in dev_ops/
    for subdir in ["adrs", "bugs", "plans", "research", "tests"]:
        os.makedirs(os.path.join(DEVOPS_DIR, subdir), exist_ok=True)

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
        prd_path = os.path.join(DEVOPS_DIR, "prd.md")
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
        "artifact_ops.py",
        "project_ops.py",
        "kanban_ops.py",
        "health_check.py",
    ]
    for script in scripts_to_copy:
        src = os.path.join(SCRIPTS_SRC_DIR, script)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DEVOPS_SCRIPTS_DIR, script))
            print(f"   - Installed {script}")
        else:
            print(f"   ! Warning: Script {script} not found in source.")

    # Install Rules (using the plan and IDE-specific format)
    install_rules(proposed_rules, AGENT_RULES_DIR, detected_ide)

    # Install Workflows/Commands (Antigravity: .agent/workflows, Cursor: .cursor/commands)
    if os.path.exists(WORKFLOWS_SRC_DIR):
        folder_name = "commands" if detected_ide == "cursor" else "workflows"
        print(f"\n📦 Installing {folder_name.capitalize()}...")
        os.makedirs(AGENT_WORKFLOWS_DIR, exist_ok=True)
        for file in os.listdir(WORKFLOWS_SRC_DIR):
            if file.endswith(".md") and not file.startswith("_"):
                shutil.copy2(
                    os.path.join(WORKFLOWS_SRC_DIR, file),
                    os.path.join(AGENT_WORKFLOWS_DIR, file),
                )
                print(f"   - Installed {file}")

    # Install GitHub Actions Workflows (only PR triage, not full CI)
    GITHUB_SRC_DIR = os.path.join(DEV_OPS_CORE_ROOT, ".github", "workflows")
    GITHUB_DEST_DIR = os.path.join(PROJECT_ROOT, ".github", "workflows")

    # Only install pr_triage.yml - lightweight PR comment → task ingestion
    pr_triage_src = os.path.join(GITHUB_SRC_DIR, "pr_triage.yml")
    if os.path.exists(pr_triage_src):
        print("\n🤖 Installing PR Triage Workflow...")
        os.makedirs(GITHUB_DEST_DIR, exist_ok=True)
        pr_triage_dest = os.path.join(GITHUB_DEST_DIR, "pr_triage.yml")
        if os.path.exists(pr_triage_dest):
            choice = prompt_user("⚠️  pr_triage.yml already exists. Overwrite? (y/n)", "n")
            if choice.lower() != "y":
                print("   - Skipped pr_triage.yml")
            else:
                shutil.copy2(pr_triage_src, pr_triage_dest)
                print("   - Installed .github/workflows/pr_triage.yml")
        else:
            shutil.copy2(pr_triage_src, pr_triage_dest)
            print("   - Installed .github/workflows/pr_triage.yml")

    # Initialize Kanban Board (replaces old backlog.md)
    init_kanban_board(PROJECT_ROOT)

    # Install Kanban Extension (if VS Code available)
    install_kanban_extension(DEV_OPS_CORE_ROOT)

    print("\n✨ Setup Complete! dev_ops installed locally.")


def main():
    parser = argparse.ArgumentParser(description="Bootstrap/Setup dev_ops in a project.")
    parser.add_argument("--target", default=os.getcwd(), help="Target project directory")
    args = parser.parse_args()

    bootstrap(args.target)


if __name__ == "__main__":
    main()
