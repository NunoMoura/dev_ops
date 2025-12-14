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


def install_rules(rules_src: str, rules_dest: str, project_root: str, langs: list):
    """Installs relevant rules based on detected languages."""
    if not os.path.exists(rules_src):
        return

    print("\n📦 Installing Rules...")
    os.makedirs(rules_dest, exist_ok=True)

    # Analyze project to get replacements
    replacements = analyze_project(project_root, langs)

    # 1. Install Global Rules (Recursive Flattening)
    for root, _, files in os.walk(rules_src):
        for file in files:
            if file.endswith(".md"):
                # Filter language rules
                if os.path.basename(root) == "languages":
                    lang_name = os.path.splitext(file)[0]
                    if lang_name not in langs:
                        # Skip if language not detected
                        continue

                src_path = os.path.join(root, file)
                dest_path = os.path.join(rules_dest, file)

                # REFACTOR: Read, Replace, Write
                content = get_file_content(src_path)

                # Apply replacements
                for key, value in replacements.items():
                    content = content.replace(key, str(value))

                write_file(dest_path, content)

                print(f"   - Installed {file}")


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

    # 2. Consolidate Docs
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
                )  # Optional: Remove old? Let's be safe and keep it or ask?
                # shutil.rmtree(found_docs) BE SAFE, DONT DELETE FOR NOW
                print(
                    f"✅ Moved content to {DEVOPS_DOCS_DIR} (Old folder kept for safety, please delete manually)"
                )
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

    # 3. Create PRD if missing
    # Check for variants: prd.md, PRD.md, specs/prd.md...
    prd_found = False
    possible_names = ["prd.md", "PRD.md", "requirements.md", "specs.md"]

    # Check in root and docs
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

    # 4. Copy Scripts to Local dev_ops/scripts
    print("\n📦 Installing Local Scripts...")
    os.makedirs(DEVOPS_SCRIPTS_DIR, exist_ok=True)

    scripts_to_copy = [
        "doc_ops.py",
        "git_ops.py",
        "setup_ops.py",
        "utils.py",
        "pr_ops.py",
    ]
    for script in scripts_to_copy:
        src = os.path.join(SCRIPTS_SRC_DIR, script)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DEVOPS_SCRIPTS_DIR, script))
            print(f"   - Installed {script}")
        else:
            print(f"   ! Warning: Script {script} not found in source.")

    # 5. Install .agent/rules and workflows
    AGENT_RULES_DIR = os.path.join(AGENT_DIR, "rules")
    AGENT_WORKFLOWS_DIR = os.path.join(AGENT_DIR, "workflows")

    install_rules(RULES_SRC_DIR, AGENT_RULES_DIR, PROJECT_ROOT, langs)

    if os.path.exists(WORKFLOWS_SRC_DIR):
        print("\n📦 Installing Workflows...")
        os.makedirs(AGENT_WORKFLOWS_DIR, exist_ok=True)
        for file in os.listdir(WORKFLOWS_SRC_DIR):
            if file.endswith(".md"):
                shutil.copy2(
                    os.path.join(WORKFLOWS_SRC_DIR, file),
                    os.path.join(AGENT_WORKFLOWS_DIR, file),
                )
                print(f"   - Installed {file}")

    # 6. Install GitHub Actions Workflows
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

    # 6. Create Backlog
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
