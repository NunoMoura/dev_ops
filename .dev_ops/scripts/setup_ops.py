#!/usr/bin/env python3
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys

# Add current directory to sys.path (for project_ops)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Add payload/scripts to sys.path (for board_ops, utils)
# ../payload/scripts relative to this file
sys.path.append(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "payload", "scripts")
)

from board_ops import DEFAULT_COLUMNS  # Import shared column definitions
from project_ops import get_file_content
from utils import prompt_user, write_file


# Current framework version - read from bundled assets (extension) or package.json (development)
def _get_framework_version() -> str:
    """Read framework version from bundled version.json or extension package.json.

    The build process generates dist/assets/version.json from extension/package.json,
    so package.json is the single source of truth.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Extension context: look for version.json in assets (sibling to scripts/)
    if "dist" in script_dir and "assets" in script_dir:
        version_file = os.path.join(os.path.dirname(script_dir), "version.json")
        if os.path.exists(version_file):
            try:
                with open(version_file) as f:
                    data = json.load(f)
                    return data.get("version", "0.0.0")
            except (json.JSONDecodeError, OSError):
                pass

    # Development context: read from extension/package.json
    # Script is in installer/, extension is sibling
    package_json = os.path.join(os.path.dirname(script_dir), "extension", "package.json")
    if os.path.exists(package_json):
        try:
            with open(package_json) as f:
                data = json.load(f)
                return data.get("version", "0.0.0")
        except (json.JSONDecodeError, OSError):
            pass

    return "0.0.0"


FRAMEWORK_VERSION = _get_framework_version()

# ==========================================
# CONSTANTS & PATHS
# ==========================================

# Module-level constants removed - setup_ops.py creates the environment,
# so we can't rely on get_dev_ops_root() at import time.
# Paths are computed inside bootstrap() and passed to functions as needed.

# Framework root is determined relative to this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMEWORK_ROOT = os.path.dirname(SCRIPT_DIR)  # installer/ -> root
TEMPLATES_DIR = os.path.join(FRAMEWORK_ROOT, "payload", "templates")


# ==========================================
# Audit Helpers
# ==========================================


def needs_update(src_path: str, dest_path: str) -> bool:
    """
    Check if destination file needs updating from source.
    Returns True if the file should be copied (missing or different size).
    """
    if not os.path.exists(dest_path):
        return True
    # Compare file sizes as quick check
    src_size = os.path.getsize(src_path)
    dest_size = os.path.getsize(dest_path)
    return src_size != dest_size


# ==========================================
# Extension Installation
# ==========================================


def install_extension(dev_ops_root: str):
    """Install the DevOps extension if not already installed."""
    print("\n🔧 Checking DevOps extension...")

    # Check if already installed
    try:
        result = subprocess.run(
            ["code", "--list-extensions"], capture_output=True, text=True, timeout=30
        )
        if "dev-ops" in result.stdout.lower():
            print("   ✅ DevOps extension already installed")
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
        print(f"   📦 Installing DevOps extension ({os.path.basename(vsix_path)})...")
        try:
            subprocess.run(["code", "--install-extension", vsix_path], check=True, timeout=60)
            print("   ✅ DevOps extension installed")
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ Failed to install extension: {e}")
    else:
        print(f"   ⚠️ No extension VSIX found matching {vsix_pattern}")


def detect_project_type(project_root: str) -> str:
    """
    Detect if project is greenfield or brownfield.
    Returns: 'greenfield', 'brownfield', or 'unknown'
    """
    file_count = 0
    has_manifest = False
    has_src_dir = False

    for root, dirs, files in os.walk(project_root):
        # Skip hidden directories
        relative_path = os.path.relpath(root, project_root)
        if any(part.startswith(".") for part in relative_path.split(os.sep)):
            continue

        file_count += len(files)

        # Check for dependency manifests
        for f in files:
            if f in [
                "package.json",
                "requirements.txt",
                "Cargo.toml",
                "go.mod",
                "pom.xml",
                "build.gradle",
                "composer.json",
            ]:
                has_manifest = True

        # Check for source directories
        if any(d in ["src", "lib", "app", "cmd", "pkg"] for d in dirs):
            has_src_dir = True

    # Decision logic
    if file_count < 5 and not has_manifest:
        return "greenfield"
    elif has_manifest or has_src_dir or file_count > 20:
        return "brownfield"
    else:
        return "unknown"


def init_board(project_root: str, project_type: str = None):
    """Initialize the DevOps board in .dev_ops/ directory.

    Creates an empty board with columns only. Tasks are generated by /bootstrap
    workflow which runs detection and creates context-aware tasks.
    """
    dev_ops_dir = os.path.join(project_root, ".dev_ops")
    board_path = os.path.join(dev_ops_dir, "board.json")  # Flat structure

    if os.path.exists(board_path):
        print("   ✅ DevOps board already exists")
        return

    print("   📋 Initializing empty DevOps board...")
    os.makedirs(dev_ops_dir, exist_ok=True)

    # Load columns from shared schema via board_ops
    columns = DEFAULT_COLUMNS

    # Create empty board - /bootstrap will generate context-aware tasks
    initial_board = {
        "version": 1,
        "columns": columns,
        "items": [],  # Empty - bootstrap generates tasks
    }

    with open(board_path, "w") as f:
        json.dump(initial_board, f, indent=2)

    print("   ✅ DevOps board initialized (empty)")
    print("   💡 Run /bootstrap to analyze your project and generate tasks")


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
    Detect which IDE is being used based on environment and binaries.
    Returns: 'antigravity', 'cursor', or 'unknown'
    """
    # Check for Antigravity via environment variables (most reliable)
    if os.environ.get("ANTIGRAVITY_AGENT") == "1":
        print("   🔍 Detected IDE: Antigravity")
        return "antigravity"

    # Check for Antigravity editor app root (primary indicator)
    if os.environ.get("ANTIGRAVITY_EDITOR_APP_ROOT"):
        print("   🔍 Detected IDE: Antigravity")
        return "antigravity"

    # Check for Antigravity via path markers
    if ".antigravity" in os.environ.get("VSCODE_GIT_ASKPASS_NODE", ""):
        print("   🔍 Detected IDE: Antigravity")
        return "antigravity"

    # Check for Cursor binary
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

    # Check for VS Code / code binary
    if shutil.which("code"):
        try:
            result = subprocess.run(
                ["code", "--version"], capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                # Could be VS Code or Antigravity variant
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


def get_all_rules(core_rules_src: str, base_path: str, project_root: str):
    """Returns Core rules for installation.

    Note: Template-based rules (languages, linters) are NOT installed here.
    They are generated during /bootstrap using:
        python3 .dev_ops/scripts/project_ops.py generate-rules --target . --ide <ide>
    """
    core_rules = get_core_rules(core_rules_src)

    # Dynamic rules (from detect_stack) are NO LONGER included here.
    # The templates (languages.md, linters.md) are just instructions for the agent.
    # Actual rules are generated via `project_ops.py generate-rules` during bootstrap.

    return sorted(core_rules, key=lambda x: (x["category"], x["name"]))


def install_rules(proposed_rules: list, rules_dest: str, ide: str = "antigravity"):
    """Installs the selected rules with text replacement and IDE-specific formatting."""
    print(f"\n📦 Installing Rules (format: {ide})...")

    installed_count = 0
    skipped_count = 0

    for rule in proposed_rules:
        # Antigravity: Flat structure, Cursor: Subdirectories
        category = rule.get("category", "misc")

        if ide == "antigravity":
            # Flat structure - all in rules/ root with category prefix
            target_dir = rules_dest
            rule_base = rule["name"].replace(".md", "")
            if category != "Core":
                rule_name = f"{category.lower()}_{rule_base}.md"
            else:
                rule_name = rule["name"]
        else:
            # Cursor: Use subdirectories
            cat_dir = {
                "Core": "",
                "Language": "languages",
                "Linter": "linters",
                "Library": "libraries",
                "Pattern": "patterns",
            }.get(category, "misc")

            if cat_dir:
                target_dir = os.path.join(rules_dest, cat_dir)
            else:
                target_dir = rules_dest
            rule_name = rule["name"]

        os.makedirs(target_dir, exist_ok=True)

        if not os.path.exists(rule["src"]):
            print(f"   ! Warning: Source for {rule['name']} not found at {rule['src']}")
            continue

        # Apply .mdc extension for Cursor before checking existence
        if ide == "cursor" and rule_name.endswith(".md"):
            rule_name = rule_name[:-3] + ".mdc"

        dest_path = os.path.join(target_dir, rule_name)

        if os.path.exists(dest_path):
            # Check if it's a Core rule and if it should be updated
            if category == "Core":
                # For Core rules, we update them if they haven't been modified by the user.
                # Simplified check: if it's a core rule, we update it unless it contains
                # a 'user-customized' marker.
                try:
                    with open(dest_path) as f:
                        old_content = f.read()
                    if "<!-- dev-ops-customized -->" in old_content:
                        print(f"   ⏭️ Skipped {rule_name} (User customized)")
                        skipped_count += 1
                        continue
                    else:
                        # Update core rule
                        action = "Updated"
                except Exception:
                    skipped_count += 1
                    continue
            else:
                skipped_count += 1
                continue
        else:
            action = "Installed"

        # Read template content (no replacements - agent will generate rules via /bootstrap)
        content = get_file_content(rule["src"])

        # Convert frontmatter for Cursor
        if ide == "cursor":
            content = convert_frontmatter_for_cursor(content)

        # Add a note about customization protection to Core rules
        if category == "Core":
            if "<!-- dev-ops-customized -->" not in content:
                content += "\n\n<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->\n"

        write_file(dest_path, content, overwrite=True)
        print(f"   ✓ {action} {rule_name} ({category})")
        installed_count += 1

    if skipped_count:
        print(f"   ⏭️ {skipped_count} rules already exist (preserved)")


# ==========================================
# Bootstrap / Setup
# ==========================================


def bootstrap(target_dir: str, ide_override: str | None = None, github_workflows: bool = False):
    PROJECT_ROOT = os.path.abspath(target_dir)

    # Locate Global Sources - detect context (extension vs framework repo)
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

    # Detect if running from VS Code extension context
    # Extension bundles assets as: dist/assets/scripts/, dist/assets/templates/, etc.
    is_extension_context = (
        "dist" in SCRIPT_DIR
        and "assets" in SCRIPT_DIR
        and os.path.basename(SCRIPT_DIR) == "scripts"
    )

    if is_extension_context:
        # Extension mode: assets are sibling directories to scripts/
        ASSETS_ROOT = os.path.dirname(SCRIPT_DIR)  # dist/assets/
        # RULES_SRC_DIR no longer used, we use RULE_BASE_PATH
        CORE_RULES_SRC_DIR = os.path.join(ASSETS_ROOT, "rules")
        WORKFLOWS_SRC_DIR = os.path.join(ASSETS_ROOT, "workflows")
        TEMPLATES_SRC_DIR = os.path.join(ASSETS_ROOT, "templates")
        SCRIPTS_SRC_DIR = os.path.join(ASSETS_ROOT, "scripts")
        DOCS_TEMPLATES_DIR = os.path.join(ASSETS_ROOT, "templates", "docs")
        GITHUB_SRC_DIR = os.path.join(
            ASSETS_ROOT, "github", "workflows"
        )  # payload/github/workflows/
        RULE_BASE_PATH = ASSETS_ROOT
        print(f"   📦 Running from extension context: {ASSETS_ROOT}")
        # Debug: verify paths exist
        print(
            f"   DEBUG: SCRIPTS_SRC_DIR exists: {os.path.exists(SCRIPTS_SRC_DIR)} - {SCRIPTS_SRC_DIR}"
        )
        print(
            f"   DEBUG: TEMPLATES_SRC_DIR exists: {os.path.exists(TEMPLATES_SRC_DIR)} - {TEMPLATES_SRC_DIR}"
        )
        print(
            f"   DEBUG: WORKFLOWS_SRC_DIR exists: {os.path.exists(WORKFLOWS_SRC_DIR)} - {WORKFLOWS_SRC_DIR}"
        )
    else:
        # Framework repo mode: payload/ sibling to installer/
        FRAMEWORK_ROOT = os.path.dirname(SCRIPT_DIR)  # installer/ -> root
        RULE_BASE_PATH = os.path.join(FRAMEWORK_ROOT, "payload")
        # Generator templates are under payload/templates

        CORE_RULES_SRC_DIR = os.path.join(
            FRAMEWORK_ROOT, "payload", "rules"
        )  # Actual rules (phases, guide)
        WORKFLOWS_SRC_DIR = os.path.join(FRAMEWORK_ROOT, "payload", "workflows")
        TEMPLATES_SRC_DIR = os.path.join(FRAMEWORK_ROOT, "payload", "templates")
        SCRIPTS_SRC_DIR = os.path.join(FRAMEWORK_ROOT, "payload", "scripts")
        DOCS_TEMPLATES_DIR = os.path.join(FRAMEWORK_ROOT, "payload", "templates", "docs")
        GITHUB_SRC_DIR = os.path.join(FRAMEWORK_ROOT, "payload", "github", "workflows")

    # Destination Paths - User project structure
    AGENT_DIR = os.path.join(PROJECT_ROOT, ".agent")
    DEVOPS_DIR = os.path.join(PROJECT_ROOT, ".dev_ops")  # Hidden directory
    DEVOPS_DOCS_DIR = os.path.join(DEVOPS_DIR, "docs")
    DEVOPS_ARCHIVE_DIR = os.path.join(DEVOPS_DIR, "archive")  # For completed tasks
    # Note: Active artifacts go in .dev_ops/.tmp/artifacts/ (created on-demand by scripts)

    print(f"🚀 Bootstrapping dev_ops in {PROJECT_ROOT}...")

    # 0. Detect IDE
    print("\n🔍 Detecting IDE...")
    if ide_override:
        detected_ide = ide_override
        print(f"   🔧 Using IDE override: {detected_ide}")
    else:
        detected_ide = detect_ide()

    # Get IDE-specific paths
    AGENT_DIR, AGENT_RULES_DIR, AGENT_WORKFLOWS_DIR, _ = get_ide_paths(PROJECT_ROOT, detected_ide)

    # 1. Summarize & Detect
    summarize_project(PROJECT_ROOT)

    # 2. Detect & Propose Rules
    print("🔍 Analyzing project stack...")

    proposed_rules = get_all_rules(CORE_RULES_SRC_DIR, RULE_BASE_PATH, PROJECT_ROOT)

    # 3. Interactive Confirmation
    ide_folder = ".cursor" if detected_ide == "cursor" else ".agent"
    print("\n📋 Proposed Rules Configuration:")
    print(f"   IDE: {detected_ide} → Target: {ide_folder}/rules/")
    print("   -------------------------------------------------")
    print(f"   {'Category':<15} | {'Rule':<20} | {'Reason'}")
    print("   -------------------------------------------------")
    for r in proposed_rules:
        reason = r.get("reason", "Detected from project stack")
        print(f"   {r['category']:<15} | {r['name']:<20} | {reason}")
    print("   -------------------------------------------------")

    # In headless mode, auto-proceed without confirmation
    if os.environ.get("HEADLESS"):
        print("\n✓ Auto-proceeding in headless mode")
    else:
        confirm = prompt_user("\nProceed with installation? (y/n)", "y")
        if confirm.lower() != "y":
            print("❌ Installation aborted by user.")
            return

    # 5. Execute Installation

    # Detect existing docs (don't copy - let bootstrap create migration task)
    print("\n📂 Checking Documentation...")
    existing_docs_path = None
    for candidate in ["docs", "documentation", "doc", "dev_docs", "specs", "requirements"]:
        path = os.path.join(PROJECT_ROOT, candidate)
        if os.path.exists(path) and os.path.isdir(path) and path != DEVOPS_DOCS_DIR:
            existing_docs_path = path
            break

    if existing_docs_path:
        print(f"   📄 Found existing docs at '{os.path.basename(existing_docs_path)}'")
        print("   💡 Run /bootstrap to create a migration task for these docs")

    # Check for mockups/design folders
    found_mockups = None
    for candidate in ["mockups", "designs", "ui", "ux", "wireframes"]:
        path = os.path.join(PROJECT_ROOT, candidate)
        if os.path.exists(path) and os.path.isdir(path):
            found_mockups = path
            break

    mockups_target = os.path.join(DEVOPS_DOCS_DIR, "ux", "mockups")
    if found_mockups:
        should_copy = prompt_user(
            f"Found mockups/designs at '{os.path.basename(found_mockups)}'. Copy to '.dev_ops/docs/ux/mockups'? (y/n)",
            "y",
        )
        if should_copy.lower() == "y":
            os.makedirs(mockups_target, exist_ok=True)
            shutil.copytree(found_mockups, mockups_target, dirs_exist_ok=True)
            print(f"✅ Copied mockups from {os.path.basename(found_mockups)}")
        else:
            print("Skipping mockups copy.")

    # Ensure Subdirectories in .dev_ops/
    # Persistent Docs folders
    os.makedirs(os.path.join(DEVOPS_DOCS_DIR, "architecture"), exist_ok=True)
    os.makedirs(os.path.join(DEVOPS_DOCS_DIR, "ux", "personas"), exist_ok=True)
    os.makedirs(os.path.join(DEVOPS_DOCS_DIR, "ux", "stories"), exist_ok=True)
    os.makedirs(os.path.join(DEVOPS_DOCS_DIR, "ux", "mockups"), exist_ok=True)

    # Archive structure (empty initially, index.json created by archive_ops)
    os.makedirs(DEVOPS_ARCHIVE_DIR, exist_ok=True)
    archive_index = {"version": 1, "archives": []}
    archive_index_path = os.path.join(DEVOPS_ARCHIVE_DIR, "index.json")
    if not os.path.exists(archive_index_path):
        with open(archive_index_path, "w") as f:
            json.dump(archive_index, f, indent=2)

    # Create/Update version.json
    version_path = os.path.join(DEVOPS_DIR, "version.json")
    with open(version_path, "w") as f:
        json.dump({"version": FRAMEWORK_VERSION}, f, indent=2)
    print(f"   📍 Framework version: {FRAMEWORK_VERSION}")

    # Scaffold architecture documentation
    print("\n📐 Scaffolding architecture documentation...")
    from project_ops import scaffold_architecture

    arch_dir = os.path.join(DEVOPS_DOCS_DIR, "architecture")
    template_path = os.path.join(TEMPLATES_SRC_DIR, "docs", "architecture_doc.md")

    try:
        results = scaffold_architecture(PROJECT_ROOT, arch_dir, template_path)
        if results["created"] > 0:
            print(f"   ✓ Created {results['created']} architecture doc(s)")
        if results["skipped"] > 0:
            print(f"   ⏭️ Skipped {results['skipped']} existing doc(s)")
    except Exception as e:
        print(f"   ⚠️  Scaffolding failed: {e}")

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

    # Install Scripts to .dev_ops/scripts/ (for workflows to use)
    DEVOPS_SCRIPTS_DIR = os.path.join(DEVOPS_DIR, "scripts")
    if os.path.exists(SCRIPTS_SRC_DIR):
        print("[PROGRESS] Installing scripts...")
        print("\n📦 Installing Scripts...")
        os.makedirs(DEVOPS_SCRIPTS_DIR, exist_ok=True)
        installed_count = 0
        skipped_count = 0
        for file in os.listdir(SCRIPTS_SRC_DIR):
            if file.endswith(".py") and not file.startswith("_"):
                src_path = os.path.join(SCRIPTS_SRC_DIR, file)
                dest_path = os.path.join(DEVOPS_SCRIPTS_DIR, file)
                if os.path.isfile(src_path):
                    if needs_update(src_path, dest_path):
                        shutil.copy2(src_path, dest_path)
                        action = "Updated" if os.path.exists(dest_path) else "Installed"
                        print(f"   ✓ {action} {file}")
                        installed_count += 1
                    else:
                        skipped_count += 1
        if skipped_count:
            print(f"   ⏭️ {skipped_count} scripts already up-to-date")
        # Also create __init__.py for package imports
        init_path = os.path.join(DEVOPS_SCRIPTS_DIR, "__init__.py")
        if not os.path.exists(init_path):
            with open(init_path, "w") as f:
                f.write('"""DevOps framework scripts."""\n')

    # Install Templates to .dev_ops/templates/ (for /bootstrap to use)
    DEVOPS_TEMPLATES_DIR = os.path.join(DEVOPS_DIR, "templates")
    if os.path.exists(TEMPLATES_SRC_DIR):
        print("[PROGRESS] Installing templates...")
        print("\n📦 Installing Templates...")
        installed_count = 0
        skipped_count = 0
        for root, _dirs, files in os.walk(TEMPLATES_SRC_DIR):
            rel_dir = os.path.relpath(root, TEMPLATES_SRC_DIR)
            dest_dir = (
                os.path.join(DEVOPS_TEMPLATES_DIR, rel_dir)
                if rel_dir != "."
                else DEVOPS_TEMPLATES_DIR
            )
            os.makedirs(dest_dir, exist_ok=True)
            for file in files:
                src_path = os.path.join(root, file)
                dest_path = os.path.join(dest_dir, file)
                if needs_update(src_path, dest_path):
                    shutil.copy2(src_path, dest_path)
                    installed_count += 1
                else:
                    skipped_count += 1
        if installed_count:
            print(f"   ✓ Updated {installed_count} template files")
        if skipped_count:
            print(f"   ⏭️ {skipped_count} templates already up-to-date")
        if not installed_count and not skipped_count:
            print("   - Installed templates to .dev_ops/templates/")

    # Install Rules (using the plan and IDE-specific format)
    if os.path.exists(CORE_RULES_SRC_DIR):
        print("[PROGRESS] Installing rules...")
        print(f"\n   DEBUG: Installing rules from: {CORE_RULES_SRC_DIR}")
        print(f"   DEBUG: Target directory: {AGENT_RULES_DIR}")
        install_rules(proposed_rules, AGENT_RULES_DIR, detected_ide)
    else:
        print(f"\n   ⚠️ Rules source directory not found: {CORE_RULES_SRC_DIR}")

    # Install Workflows/Commands (Antigravity: .agent/workflows, Cursor: .cursor/commands)
    if os.path.exists(WORKFLOWS_SRC_DIR):
        folder_name = "commands" if detected_ide == "cursor" else "workflows"
        print(f"[PROGRESS] Installing {folder_name}...")
        print(f"\n📦 Installing {folder_name.capitalize()}...")
        print(f"   DEBUG: Source: {WORKFLOWS_SRC_DIR}")
        print(f"   DEBUG: Target: {AGENT_WORKFLOWS_DIR}")

        os.makedirs(AGENT_WORKFLOWS_DIR, exist_ok=True)
        installed_count = 0
        skipped_count = 0
        for file in os.listdir(WORKFLOWS_SRC_DIR):
            if file.endswith(".md") and not file.startswith("_"):
                src_file = os.path.join(WORKFLOWS_SRC_DIR, file)
                dest_file = os.path.join(AGENT_WORKFLOWS_DIR, file)
                if needs_update(src_file, dest_file):
                    shutil.copy2(src_file, dest_file)
                    installed_count += 1
                    print(f"   ✓ Updated {file}")
                else:
                    skipped_count += 1

        if installed_count:
            print(f"   ✓ Updated {installed_count} {folder_name} files")
        if skipped_count:
            print(f"   ⏭️ {skipped_count} {folder_name} already up-to-date")
        if not installed_count and not skipped_count:
            print(f"   ⚠️ No workflow files found in {WORKFLOWS_SRC_DIR}")
    else:
        print(f"\n⚠️ Workflows source directory not found: {WORKFLOWS_SRC_DIR}")

    # Install nonnegotiables.md template to .dev_ops/docs/ (referenced by dev_ops_guide.md rule)
    nonneg_src = os.path.join(DOCS_TEMPLATES_DIR, "nonnegotiables.md")
    if os.path.exists(nonneg_src):
        nonneg_dest = os.path.join(DEVOPS_DOCS_DIR, "nonnegotiables.md")
        if not os.path.exists(nonneg_dest):
            shutil.copy2(nonneg_src, nonneg_dest)
            print("   📜 Created nonnegotiables.md template in docs/")

    # Install GitHub Actions Workflows (only if enabled)
    if github_workflows and GITHUB_SRC_DIR and os.path.exists(GITHUB_SRC_DIR):
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

    # Detect project type and prompt user
    print("\n🔍 Analyzing project type...")
    detected_type = detect_project_type(PROJECT_ROOT)

    # In headless mode, use detected type or default to greenfield
    if os.environ.get("HEADLESS") or os.environ.get("PROJECT_TYPE"):
        project_type = os.environ.get(
            "PROJECT_TYPE", detected_type if detected_type != "unknown" else "greenfield"
        )
        print(f"   Using project type: {project_type}")
    else:
        # Interactive mode - prompt user
        print(f"   Detected: {detected_type}")
        print("\n📋 Select project type:")
        print("   1. 🌱 Greenfield - New project (loads 8 starter tasks)")
        print("   2. 🏗️  Brownfield - Existing codebase (loads 10 audit tasks)")

        choice = prompt_user("Enter choice (1/2)", "1" if detected_type == "greenfield" else "2")
        project_type = "greenfield" if choice == "1" else "brownfield"

    # Initialize DevOps Board with template
    init_board(PROJECT_ROOT, project_type)

    # Verify installation
    print("\n📊 Installation Summary:")
    if os.path.exists(AGENT_RULES_DIR):
        rules_files = [
            f
            for f in os.listdir(AGENT_RULES_DIR)
            if os.path.isfile(os.path.join(AGENT_RULES_DIR, f))
        ]
        # Also count files in subdirectories (for development_phases)
        for _root, _dirs, files in os.walk(AGENT_RULES_DIR):
            for f in files:
                if f not in rules_files and not f.startswith("."):
                    rules_files.append(f)
        rules_count = len(rules_files)
        print(f"   Rules installed: {rules_count} files")
    else:
        print(f"   ⚠️ Rules directory not found: {AGENT_RULES_DIR}")

    if os.path.exists(AGENT_WORKFLOWS_DIR):
        workflows_files = [
            f
            for f in os.listdir(AGENT_WORKFLOWS_DIR)
            if os.path.isfile(os.path.join(AGENT_WORKFLOWS_DIR, f))
        ]
        workflows_count = len(workflows_files)
        print(f"   Workflows installed: {workflows_count} files")
    else:
        print(f"   ⚠️ Workflows directory not found: {AGENT_WORKFLOWS_DIR}")

    # Install Extension (if VS Code available and not already running from extension)
    if not is_extension_context:
        install_extension(os.path.dirname(SCRIPT_DIR))

    print("\n✨ Setup Complete!")
    print("\n📁 Created structure:")
    print("   .agent/          - IDE rules and workflows")
    print("   .dev_ops/        - Board state and documentation")
    print("     ├── board.json")
    print("     ├── archive/   - Archived tasks")
    print("     └── docs/      - Project documentation")
    print("\n🚀 Ready to use! Open this project in your IDE.")


def main():
    parser = argparse.ArgumentParser(description="Bootstrap/Setup dev_ops in a project.")
    parser.add_argument("--target", default=os.getcwd(), help="Target project directory")
    parser.add_argument(
        "--project-type",
        choices=["greenfield", "brownfield"],
        help="Project type (greenfield or brownfield)",
    )
    parser.add_argument(
        "--ide",
        choices=["antigravity", "cursor", "vscode"],
        help="Force IDE detection result",
    )
    parser.add_argument(
        "--github-workflows",
        action="store_true",
        help="Install GitHub workflow for PR comment triage",
    )
    args = parser.parse_args()

    # Set environment variable if project type specified
    if args.project_type:
        os.environ["PROJECT_TYPE"] = args.project_type

    # Map vscode to antigravity compatible
    ide = args.ide
    if ide == "vscode":
        ide = "antigravity"

    bootstrap(args.target, ide_override=ide, github_workflows=args.github_workflows)


if __name__ == "__main__":
    main()
