#!/usr/bin/env python3
import os
import sys
import shutil
import argparse

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import write_file, prompt_user
from detectors import (
    detect_python_details,
    detect_node_details,
    detect_go_details,
    detect_rust_details,
    detect_java_details,
    detect_cpp_details,
    detect_svelte_details,
    get_file_content,
)

# ==========================================
# Language Detection
# ==========================================


def detect_languages(project_root: str) -> list:
    """Detects primary programming languages in the project."""
    langs = set()
    for root, _, files in os.walk(project_root):
        if ".git" in root or "node_modules" in root or "venv" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                langs.add("python")
            elif file.endswith(".ts") or file.endswith(".tsx"):
                langs.add("typescript")
            elif file.endswith(".js") or file.endswith(".jsx"):
                langs.add("javascript")
            elif file.endswith(".go"):
                langs.add("go")
            elif file.endswith(".rs"):
                langs.add("rust")
            elif file.endswith(".java"):
                langs.add("java")
            elif file.endswith(".cpp") or file.endswith(".cc"):
                langs.add("cpp")
            elif file.endswith(".svelte"):
                langs.add("svelte")
    return list(langs)


def analyze_project(project_root, langs):
    """collects replacement map for templates based on language analysis."""
    replacements = {}

    if "python" in langs:
        replacements.update(detect_python_details(project_root))

    if "javascript" in langs or "typescript" in langs:
        replacements.update(detect_node_details(project_root))

    if "go" in langs:
        replacements.update(detect_go_details(project_root))

    if "rust" in langs:
        replacements.update(detect_rust_details(project_root))

    if "java" in langs:
        replacements.update(detect_java_details(project_root))

    if "cpp" in langs:
        replacements.update(detect_cpp_details(project_root))

    if "svelte" in langs:
        replacements.update(detect_svelte_details(project_root))

    return replacements


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


def get_proposed_rules(
    rules_src: str, project_root: str, langs: list, replacements: dict
) -> list:
    """
    Scans rules source and proposes actionable rules based on:
    - Core: Always included.
    - Languages: Included only if language is detected.
    - Patterns: Included by default (harmless if unused).
    - Linters: Included if matching linter/formatter is detected in replacements.
    - Libraries: Included if specific trigger files (e.g. Dockerfile) are found.
    """
    proposed = []

    # Define categories based on directory names
    for root, _, files in os.walk(rules_src):
        dir_name = os.path.basename(root)

        for file in files:
            if not file.endswith(".md"):
                continue

            if file.startswith("_"):
                continue

            src_path = os.path.join(root, file)
            rule = {
                "name": file,
                "src": src_path,
                "category": "Unknown",
                "reason": "Default",
            }

            if dir_name == "core":
                rule["category"] = "Core"
                rule["reason"] = "Essential DevOps rule"
                proposed.append(rule)

            elif dir_name == "languages":
                # Strict filtering for languages
                lang_name = os.path.splitext(file)[0]
                if lang_name in langs:
                    rule["category"] = "Language"
                    rule["reason"] = f"{lang_name.capitalize()} detected"
                    proposed.append(rule)

            elif dir_name == "patterns":
                rule["category"] = "Pattern"
                rule["reason"] = "Architectural pattern"
                proposed.append(rule)

            elif dir_name == "linters":
                # Check against detected tools in replacements
                tool_name = os.path.splitext(file)[0].lower()
                detected_tools = [
                    str(replacements.get("__LINTER__", "")).lower(),
                    str(replacements.get("__FORMATTER__", "")).lower(),
                ]
                # Also check build tools just in case
                detected_tools.append(
                    str(replacements.get("__BUILD_TOOL__", "")).lower()
                )

                if any(tool_name in t for t in detected_tools if t):
                    rule["category"] = "Linter"
                    rule["reason"] = f"Tool '{tool_name}' detected"
                    proposed.append(rule)
                else:
                    # Optional/Misc for linters not auto-detected
                    rule["category"] = "Linter (Opt)"
                    rule["reason"] = "Not detected, optional"
                    # We can choose to append or not. Let's append as Optional so user sees it.
                    proposed.append(rule)

            elif dir_name == "libraries":
                # Libraries/Infra triggers
                lib_name = os.path.splitext(file)[0].lower()
                is_relevant = False

                # Simple heuristics for common libs
                if lib_name == "docker" and os.path.exists(
                    os.path.join(project_root, "Dockerfile")
                ):
                    is_relevant = True
                elif lib_name == "kubernetes" and (
                    os.path.exists(os.path.join(project_root, "k8s"))
                    or os.path.exists(os.path.join(project_root, "helm"))
                ):
                    is_relevant = True
                elif lib_name in str(replacements.get("__KEY_LIBS__", "")).lower():
                    is_relevant = True

                if is_relevant:
                    rule["category"] = "Library"
                    rule["reason"] = f"{lib_name.capitalize()} detected"
                else:
                    rule["category"] = "Library (Opt)"
                    rule["reason"] = "Optional"

                proposed.append(rule)

            else:
                # Any other root-level rules or misc
                rule["category"] = "Misc"
                proposed.append(rule)

    return sorted(proposed, key=lambda x: (x["category"], x["name"]))


def linkify_replacements(replacements: dict, proposed_rules: list) -> dict:
    """
    Updates replacement values to include Markdown links if the referenced library/tool
    has a corresponding rule being installed.
    """
    # Map 'clean_name' -> 'filename' for rules being installed
    # We focus on Libraries and Linters/Patterns mostly.
    installed_map = {}
    for rule in proposed_rules:
        name_stem = os.path.splitext(rule["name"])[0].lower()
        # Determine relative path from a rule file (in .agent/rules) to another rule file (in .agent/rules)
        # They are in the same dir, so it's just the filename.
        # BUT if we have categories in valid separate folders?
        # Wait, install_rules flattens "rules_dest".
        # Yes, install_rules: dest_path = os.path.join(rules_dest, rule["name"])
        # So they are all siblings in .agent/rules.
        installed_map[name_stem] = rule["name"]

    linked_replacements = replacements.copy()

    for key, value in replacements.items():
        if not isinstance(value, str):
            continue

        # Split by comma for lists like __KEY_LIBS__
        parts = [p.strip() for p in value.split(",")]
        new_parts = []

        for part in parts:
            part_lower = part.lower()
            # Basic matching: if the exact name matches a rule stem
            if part_lower in installed_map:
                target_file = installed_map[part_lower]
                # Markdown link: [Name](./target.md)
                # Since they are in the same folder (.agent/rules), usage is ./
                new_parts.append(f"[{part}](./{target_file})")
            else:
                new_parts.append(part)

        linked_replacements[key] = ", ".join(new_parts)

    return linked_replacements


def install_rules(proposed_rules: list, rules_dest: str, replacements: dict):
    """Installs the selected rules with text replacement customization."""
    print("\n📦 Installing Rules...")
    os.makedirs(rules_dest, exist_ok=True)

    for rule in proposed_rules:
        # REFACTOR: Read, Replace, Write
        content = get_file_content(rule["src"])

        # Apply replacements (Customization)
        for key, value in replacements.items():
            content = content.replace(key, str(value))

        dest_path = os.path.join(rules_dest, rule["name"])
        write_file(dest_path, content)
        print(f"   - Installed {rule['name']} ({rule['category']})")


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
    langs = detect_languages(PROJECT_ROOT)
    print(f"Detected languages: {', '.join(langs)}")

    # 2. Analyze for Customization (Replacements)
    replacements = analyze_project(PROJECT_ROOT, langs)

    # 3. Plan Rule Installation
    AGENT_RULES_DIR = os.path.join(AGENT_DIR, "rules")
    proposed_rules = get_proposed_rules(
        RULES_SRC_DIR, PROJECT_ROOT, langs, replacements
    )

    # Smart Linking: Update replacements to link to installed rules
    replacements = linkify_replacements(replacements, proposed_rules)

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
        "detectors.py",  # Make sure to include detectors as it is used by setup_ops!
    ]
    for script in scripts_to_copy:
        src = os.path.join(SCRIPTS_SRC_DIR, script)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DEVOPS_SCRIPTS_DIR, script))
            print(f"   - Installed {script}")
        else:
            print(f"   ! Warning: Script {script} not found in source.")

    # Install Rules (using the plan)
    install_rules(proposed_rules, AGENT_RULES_DIR, replacements)

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

    # Create Backlog
    backlog_path = os.path.join(DEVOPS_DOCS_DIR, "backlog.md")
    if not os.path.exists(backlog_path):
        write_file(
            backlog_path,
            "# Project Backlog\n\n## High Priority\n\n## Medium Priority\n\n## Low Priority\n",
        )

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
