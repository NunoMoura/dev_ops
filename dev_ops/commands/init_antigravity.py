#!/usr/bin/env python3
import os
import sys
import shutil

# Add project root to sys.path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)


def read_file(path: str) -> str:
    with open(path, "r") as f:
        return f.read()


def init_antigravity(force: bool = False):
    print("🚀 Initializing Antigravity IDE Integration...")

    # 1. Define Paths
    workspace_root = os.getcwd()
    agent_dir = os.path.join(workspace_root, ".agent")
    rules_dir = os.path.join(agent_dir, "rules")
    workflows_dir = os.path.join(agent_dir, "workflows")

    # Source Paths (from the installed package or local source)
    # We assume this script is running from dev_ops/commands/
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    templates_dir = os.path.join(base_dir, "templates")
    workflows_src_dir = os.path.join(base_dir, "workflows")

    # 2. Create Directories
    directories_to_create = [
        agent_dir,
        rules_dir,
        workflows_dir,
        os.path.join(workspace_root, ".github"),
        os.path.join(workspace_root, "adr"),
        os.path.join(workspace_root, "research"),
        os.path.join(workspace_root, "issues"),
    ]

    for d in directories_to_create:
        if not os.path.exists(d):
            os.makedirs(d)
            print(f"✅ Created directory: {d}")
        else:
            print(f"ℹ️  Directory exists: {d}")

    # 3. Install Rules (agents.md -> rules/dev_ops.md)
    agents_md_src = os.path.join(templates_dir, "agents.md")
    if os.path.exists(agents_md_src):
        rule_dest = os.path.join(rules_dir, "dev_ops.md")
        if os.path.exists(rule_dest) and not force:
            print(f"⏭️  Skipping Rule (exists): {rule_dest}")
        else:
            action = "Overwrote" if os.path.exists(rule_dest) else "Installed"
            shutil.copy2(agents_md_src, rule_dest)
            print(f"✅ {action} Rule: {rule_dest}")
    else:
        print(f"⚠️  Warning: agents.md not found at {agents_md_src}")

    # 4. Install Workflows (Symlink or Copy)
    # Mapping: source_filename -> target_slash_command
    workflow_map = {
        "tdd.md": "tdd.md",
        "code_review.md": "review.md",
        "fix_issue.md": "fix.md",
        "bootstrap_agent.md": "bootstrap.md",
    }

    if os.path.exists(workflows_src_dir):
        for src_name, dest_name in workflow_map.items():
            src_path = os.path.join(workflows_src_dir, src_name)
            dest_path = os.path.join(workflows_dir, dest_name)

            if os.path.exists(src_path):
                if os.path.exists(dest_path) and not force:
                    print(f"⏭️  Skipping Workflow (exists): {dest_path}")
                else:
                    action = "Overwrote" if os.path.exists(dest_path) else "Installed"
                    shutil.copy2(src_path, dest_path)
                    print(
                        f"✅ {action} Workflow: /{dest_name.replace('.md', '')} -> {dest_path}"
                    )
            else:
                print(f"⚠️  Warning: Workflow {src_name} not found.")
    else:
        print(f"⚠️  Warning: Workflows directory not found at {workflows_src_dir}")

    print("\n🎉 Antigravity Integration Complete!")
    print("👉 Rules installed in .agent/rules/")
    print("👉 Workflows installed in .agent/workflows/ (Try /tdd, /review)")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = parser.parse_args()
    init_antigravity(force=args.force)
