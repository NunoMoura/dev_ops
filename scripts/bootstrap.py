#!/usr/bin/env python3
import os
import sys
import shutil

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.shared_utils.project_summary import summarize_project
from scripts.shared_utils.detector import detect_languages
from scripts.shared_utils.installer import install_rules

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEV_OPS_ROOT = os.path.dirname(SCRIPT_DIR)
RULES_SRC_DIR = os.path.join(DEV_OPS_ROOT, "rules")
PROJECT_ROOT = os.path.dirname(
    DEV_OPS_ROOT
)  # Assuming dev_ops is installed in project root
AGENT_RULES_DIR = os.path.join(PROJECT_ROOT, ".agent", "rules")


def main():
    print("🚀 Bootstrapping Agent Rules...")

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

    print("\n✨ Bootstrap Complete! Configuration installed to .agent/")


if __name__ == "__main__":
    main()
