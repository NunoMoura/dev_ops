"""Project operations for detecting technology stack and generating rules."""

import argparse
import glob
import json
import os
import re
import sys
from collections import Counter
from typing import Any, Optional


def get_file_content(path: str) -> str:
    """Read and return file contents, or empty string if file doesn't exist.

    Args:
        path: Path to the file to read.

    Returns:
        File contents as string, or empty string if file doesn't exist.
    """
    if os.path.exists(path):
        with open(path, encoding="utf-8", errors="ignore") as f:
            return f.read()
    return ""


# Global mapping of technologies to their activation globs
# This separates file extension patterns from library/framework patterns
_GLOB_MAPPINGS = {
    # Languages
    "python": ["**/*.py"],
    "typescript": ["**/*.ts", "**/*.tsx"],
    "javascript": ["**/*.js", "**/*.jsx"],
    "go": ["**/*.go"],
    "rust": ["**/*.rs"],
    "java": ["**/*.java"],
    "cpp": ["**/*.cpp", "**/*.cc", "**/*.h", "**/*.hpp"],
    # Frameworks / Libraries
    "svelte": ["**/*.svelte"],
    "vue": ["**/*.vue"],
    "react": ["**/*.jsx", "**/*.tsx"],
    "fastapi": ["**/routers/*.py", "**/routes.py", "**/main.py"],
    "django": ["**/models.py", "**/views.py", "**/admin.py", "**/apps.py"],
    "flask": ["**/app.py", "**/views.py"],
    "sqlalchemy": ["**/models.py", "**/models/*.py"],
    "pydantic": ["**/schemas.py", "**/schemas/*.py"],
    # Databases
    "postgresql": ["**/migrations/**", "**/*.sql"],
    "mysql": ["**/*.sql"],
    "mongodb": ["mongod.conf"],
    "redis": ["redis.conf"],
    "sqlite": ["**/*.db", "**/*.sqlite", "**/*.sqlite3"],
}


def detect_patterns(project_root: str) -> dict[str, Any]:
    """Detect common file naming patterns and directories.

    Args:
        project_root: Path to the project root directory.

    Returns:
        Dictionary containing 'common_files' (counts) and 'common_dirs' (list).
    """
    patterns = {"common_files": {}, "common_dirs": []}

    file_names = []
    dir_names = []

    try:
        # Walk through the project (limited depth/exclusion handling implicitly via _check_triggers logic reuse?
        # No, we need explicit walk here but respecting exclusions)
        for root, dirs, files in os.walk(project_root):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in _EXCLUDED_DIRS]

            rel_root = os.path.relpath(root, project_root)
            if rel_root != ".":
                dir_names.append(os.path.basename(root) + "/")

            for f in files:
                if not f.startswith(".") and not f.startswith("__"):
                    file_names.append(f)
    except Exception:
        pass

    # Top 10 common files (excluding obvious noise if needed)
    file_counts = Counter(file_names).most_common(10)
    patterns["common_files"] = dict(file_counts)

    # Common directories - simplistic frequency of directory basenames
    dir_counts = Counter(dir_names).most_common(10)
    patterns["common_dirs"] = [d[0] for d in dir_counts]

    return patterns


def detect_docs(project_root: str) -> dict[str, Any]:
    """Detect existing DevOps-relevant documentation.

    Args:
        project_root: Path to project root.

    Returns:
        Dictionary mapping doc type to path (if found) or None.
    """
    docs = {
        "prd": None,
        "constitution": None,
        "architecture": None,
        "readme": None,
        "contributing": None,
        "changelog": None,
    }

    # PRD - various locations
    prd_patterns = [
        "docs/prd*.md",
        "docs/PRD*.md",
        ".dev_ops/docs/prds/*.md",
        "PRD.md",
        "prd.md",
    ]
    for pattern in prd_patterns:
        matches = glob.glob(os.path.join(project_root, pattern), recursive=False)
        if matches:
            docs["prd"] = os.path.relpath(matches[0], project_root)
            break

    # Constitution / Non-negotiables
    const_patterns = [
        ".dev_ops/docs/constitution.md",
        "docs/constitution.md",
        "CONSTITUTION.md",
    ]
    for pattern in const_patterns:
        path = os.path.join(project_root, pattern)
        if os.path.exists(path):
            docs["constitution"] = pattern
            break

    # Architecture docs
    arch_patterns = [
        "docs/architecture/",
        ".dev_ops/docs/architecture/",
        "ARCHITECTURE.md",
        "docs/ARCHITECTURE.md",
    ]
    for pattern in arch_patterns:
        path = os.path.join(project_root, pattern)
        if os.path.exists(path):
            docs["architecture"] = pattern
            break

    # README quality check
    readme_path = os.path.join(project_root, "README.md")
    if os.path.exists(readme_path):
        content = get_file_content(readme_path)
        word_count = len(content.split())
        if word_count > 500:
            docs["readme"] = "comprehensive"
        elif word_count > 100:
            docs["readme"] = "basic"
        else:
            docs["readme"] = "minimal"

    # Other standard docs
    if os.path.exists(os.path.join(project_root, "CONTRIBUTING.md")):
        docs["contributing"] = "CONTRIBUTING.md"
    if os.path.exists(os.path.join(project_root, "CHANGELOG.md")):
        docs["changelog"] = "CHANGELOG.md"

    return docs


def detect_tests(project_root: str) -> dict[str, Any]:
    """Detect test infrastructure.

    Args:
        project_root: Path to project root.

    Returns:
        Dictionary with test detection results.
    """
    tests = {
        "exists": False,
        "framework": None,
        "ci_configured": False,
        "test_dirs": [],
    }

    # Check for test directories
    test_dir_patterns = ["tests/", "test/", "__tests__/", "spec/"]
    for pattern in test_dir_patterns:
        test_path = os.path.join(project_root, pattern)
        if os.path.isdir(test_path):
            tests["exists"] = True
            tests["test_dirs"].append(pattern)

    # Detect test framework
    # Python
    if os.path.exists(os.path.join(project_root, "pyproject.toml")):
        content = get_file_content(os.path.join(project_root, "pyproject.toml"))
        if "pytest" in content.lower():
            tests["framework"] = "pytest"
        elif "unittest" in content.lower():
            tests["framework"] = "unittest"

    # JavaScript/TypeScript
    pkg_json = os.path.join(project_root, "package.json")
    if os.path.exists(pkg_json):
        content = get_file_content(pkg_json)
        if "jest" in content.lower():
            tests["framework"] = "jest"
        elif "mocha" in content.lower():
            tests["framework"] = "mocha"
        elif "vitest" in content.lower():
            tests["framework"] = "vitest"

    # CI/CD detection
    ci_patterns = [
        ".github/workflows/*.yml",
        ".github/workflows/*.yaml",
        ".gitlab-ci.yml",
        ".circleci/config.yml",
        "Jenkinsfile",
        ".travis.yml",
    ]
    for pattern in ci_patterns:
        matches = glob.glob(os.path.join(project_root, pattern))
        if matches:
            tests["ci_configured"] = True
            break

    return tests


def detect_versions(project_root: str, stack_items: list[str]) -> dict[str, str]:
    """Detect versions for detected stack items.

    Args:
        project_root: Path to project root.
        stack_items: List of detected technology names (lowercase).

    Returns:
        Dictionary mapping technology name to detected version string.
    """
    versions = {}

    # Python
    if "python" in stack_items:
        pyproject = os.path.join(project_root, "pyproject.toml")
        if os.path.exists(pyproject):
            content = get_file_content(pyproject)
            # Look for requires-python = ">=3.11" or python = "^3.11"
            match = re.search(r'(?:requires-python|python)\s*=\s*["\']([^"\']+)["\']', content)
            if match:
                versions["python"] = match.group(1)

    # Node/JS/TS/Frameworks
    package_json = os.path.join(project_root, "package.json")
    if os.path.exists(package_json):
        try:
            with open(package_json) as f:
                data = json.load(f)

                # Node engine
                if "engines" in data and "node" in data["engines"]:
                    versions["node"] = data["engines"]["node"]
                    # If javascript/typescript in stack, map node version to them roughly?
                    # Or just keep it as node version.

                # Dependencies
                deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}

                for item in stack_items:
                    if item in deps:
                        versions[item] = deps[item]
                    elif item == "typescript" and "typescript" in deps:
                        versions["typescript"] = deps["typescript"]
        except Exception:
            pass

    return versions


def detect_stack(project_root: str) -> list[dict[str, Any]]:
    """Scan the project and return a list of detected stack items (rules to create).

    Analyzes the project directory to detect programming languages, linters,
    and libraries/frameworks. Returns rule definitions that can be used to
    generate project-specific rule files.

    Args:
        project_root: Path to the project root directory.

    Returns:
        List of dictionaries containing rule definitions with keys:
        - name: Filename for the rule (e.g., python.md)
        - category: Language, Linter, or Library
        - template: Path to the _template.md file
        - replacements: Dictionary of placeholder values to fill in template
        - version: Detected version string (optional)
        - globs: List of glob patterns for activation
    """
    stack: list[dict[str, Any]] = []

    # ---------------------------------------------------------
    # 1. Languages
    # ---------------------------------------------------------
    languages: list[tuple[str, list[str], str]] = [
        ("python", ["pyproject.toml", "requirements.txt", "**/*.py"], "py"),
        ("typescript", ["tsconfig.json", "**/*.ts", "**/*.tsx"], "ts"),
        ("javascript", ["package.json", "**/*.js", "**/*.jsx"], "js"),
        ("go", ["go.mod", "**/*.go"], "go"),
        ("rust", ["Cargo.toml", "**/*.rs"], "rs"),
        ("java", ["pom.xml", "build.gradle", "**/*.java"], "java"),
        ("cpp", ["CMakeLists.txt", "Makefile", "**/*.cpp", "**/*.cc"], "cpp"),
    ]

    detected_langs: set[str] = set()

    for lang_name, triggers, ext in languages:
        if _check_triggers(project_root, triggers):
            detected_langs.add(lang_name)
            stack.append(
                {
                    "name": f"{lang_name}.md",
                    "category": "Language",
                    "template": "templates/rules/languages.md",
                    "replacements": {
                        "[Language Name]": lang_name.capitalize(),
                        "[Language]": lang_name.capitalize(),
                        "[extension]": ext,
                    },
                }
            )

    # ---------------------------------------------------------
    # 2. Linters / Tools
    # ---------------------------------------------------------
    tools: list[tuple[str, list[str]]] = [
        ("eslint", ["package.json", ".eslintrc*", "eslint.config.js"]),
        ("prettier", ["package.json", ".prettierrc*", "prettier.config.js"]),
        ("ruff", ["pyproject.toml", "ruff.toml"]),
        ("pylint", ["pyproject.toml", ".pylintrc"]),
        ("black", ["pyproject.toml"]),
        ("gofmt", ["go.mod"]),
        ("golangci-lint", [".golangci.yml", ".golangci.yaml"]),
        ("clippy", ["Cargo.toml"]),
        ("cargo", ["Cargo.toml"]),
        ("maven", ["pom.xml"]),
        ("gradle", ["build.gradle"]),
        ("poetry", ["pyproject.toml", "poetry.lock"]),
    ]

    for tool_name, triggers in tools:
        if _check_triggers(project_root, triggers, content_search=tool_name):
            stack.append(
                {
                    "name": f"{tool_name}.md",
                    "category": "Linter",
                    "template": "templates/rules/linters.md",
                    "replacements": {
                        "[Linter Name]": tool_name.capitalize(),
                        "[Linter/Tool Name]": tool_name.capitalize(),
                        "[Tool Name]": tool_name.capitalize(),
                        "[config_file_ext]": "json"
                        if tool_name in ["eslint", "prettier"]
                        else "toml",
                    },
                }
            )

    # ---------------------------------------------------------
    # 3. Libraries / Infrastructure
    # ---------------------------------------------------------
    libs: list[tuple[str, list[str]]] = [
        ("docker", ["Dockerfile", "docker-compose.yml"]),
        ("kubernetes", ["k8s/", "helm/", "Chart.yaml", "values.yaml"]),
        ("react", ["package.json"]),
        ("vue", ["package.json"]),
        ("svelte", ["package.json", "svelte.config.js"]),
        ("fastapi", ["requirements.txt", "pyproject.toml"]),
        ("django", ["requirements.txt", "pyproject.toml"]),
        ("flask", ["requirements.txt", "pyproject.toml"]),
        ("express", ["package.json"]),
        ("next", ["package.json", "next.config.js"]),
    ]

    for lib_name, triggers in libs:
        if _check_triggers(project_root, triggers, content_search=lib_name):
            stack.append(
                {
                    "name": f"{lib_name}.md",
                    "category": "Library",
                    "template": "templates/rules/libraries.md",
                    "replacements": {
                        "[Library Name]": lib_name.capitalize(),
                    },
                }
            )

    # ---------------------------------------------------------
    # 4. Databases
    # ---------------------------------------------------------
    databases: list[tuple[str, list[str]]] = [
        ("postgresql", ["docker-compose.yml", "alembic.ini", "**/*.sql"]),
        ("mysql", ["docker-compose.yml", "**/*.sql"]),
        ("mongodb", ["docker-compose.yml", "mongod.conf"]),
        ("redis", ["docker-compose.yml", "redis.conf"]),
        ("sqlite", ["**/*.db", "**/*.sqlite", "**/*.sqlite3"]),
    ]

    for db_name, triggers in databases:
        if _check_triggers(project_root, triggers, content_search=db_name):
            stack.append(
                {
                    "name": f"{db_name}.md",
                    "category": "Database",
                    "template": "templates/rules/databases.md",
                    "replacements": {
                        "[Database Name]": db_name.capitalize(),
                    },
                }
            )

    # Enrich stack with versions and globs
    detected_names = [item["name"].replace(".md", "").lower() for item in stack]
    versions = detect_versions(project_root, detected_names)

    for item in stack:
        name_key = item["name"].replace(".md", "").lower()

        # Add version if detected
        if name_key in versions:
            item["version"] = versions[name_key]

        # Add specific globs if mapped, otherwise default (agent should refine)
        if name_key in _GLOB_MAPPINGS:
            item["globs"] = _GLOB_MAPPINGS[name_key]
        else:
            # Fallback for unmapped items?
            # Or assume the template defaults will be handled by the agent.
            # But we want to avoid "Always On".
            pass

    return stack


# Directories to exclude from glob searches
_EXCLUDED_DIRS = frozenset([".git", "node_modules", "venv", "__pycache__", "dist", "out"])


def _check_triggers(root: str, triggers: list[str], content_search: Optional[str] = None) -> bool:
    """Check if any trigger file or pattern matches in the project.

    Args:
        root: Project root directory path.
        triggers: List of file paths or glob patterns to check.
        content_search: Optional string to search for within matched files.

    Returns:
        True if any trigger matches (and optionally contains content_search).
    """
    for t in triggers:
        if "*" in t:
            # Glob check
            try:
                matches = glob.glob(os.path.join(root, t), recursive=True)
                # Filter out matches in excluded dirs
                matches = [m for m in matches if not any(x in m for x in _EXCLUDED_DIRS)]
                if matches:
                    return True
            except Exception:
                pass
        else:
            # File check
            path = os.path.join(root, t)
            if os.path.exists(path):
                if content_search:
                    content = get_file_content(path).lower()
                    if content_search.lower() in content:
                        return True
                else:
                    return True
    return False


def get_last_commit_time(path: str) -> int:
    """Get Unix timestamp of last commit touching this path.

    Returns 0 if path is not tracked or git is not available.
    """
    import subprocess

    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", path],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(path) or ".",
        )
        return int(result.stdout.strip()) if result.stdout.strip() else 0
    except (subprocess.SubprocessError, ValueError):
        return 0


def check_doc_freshness(doc_path: str, source_dir: str) -> str:
    """Check if architecture doc is fresh relative to source code.

    Returns:
        "current" - doc was modified after or with code changes
        "stale" - code was modified after the doc
        "new" - doc doesn't exist yet
    """
    if not os.path.exists(doc_path):
        return "new"

    doc_time = get_last_commit_time(doc_path)
    code_time = get_last_commit_time(source_dir)

    if doc_time >= code_time:
        return "current"
    else:
        return "stale"


def check_architecture_sync(
    project_root: str,
    arch_docs_dir: str,
    create_tasks: bool = True,
) -> dict[str, Any]:
    """Check all architecture docs for freshness and optionally create sync tasks.

    Implements docs-first workflow: if code is modified after docs, the docs are stale
    and should be updated to reflect code changes.

    Args:
        project_root: Path to the project root directory.
        arch_docs_dir: Path to architecture docs directory.
        create_tasks: If True, create Critical priority tasks for stale docs.

    Returns:
        Dictionary with sync check results:
        - current: list of up-to-date docs
        - stale: list of docs needing update
        - new: list of docs without corresponding source
        - tasks_created: list of task IDs created (if create_tasks=True)
    """
    results = {
        "current": [],
        "stale": [],
        "new": [],
        "tasks_created": [],
    }

    if not os.path.exists(arch_docs_dir):
        return results

    # Walk the architecture docs directory
    for root, _, files in os.walk(arch_docs_dir):
        for file in files:
            if not file.endswith(".md"):
                continue

            doc_path = os.path.join(root, file)

            # Derive the source directory path from the doc path
            # e.g., .dev_ops/docs/architecture/extension/src/core.md -> extension/src/core
            rel_doc_path = os.path.relpath(doc_path, arch_docs_dir)
            source_rel_path = os.path.splitext(rel_doc_path)[0]  # Remove .md
            source_dir = os.path.join(project_root, source_rel_path)

            # Check freshness
            freshness = check_doc_freshness(doc_path, source_dir)

            if freshness == "current":
                results["current"].append(rel_doc_path)
            elif freshness == "stale":
                results["stale"].append(rel_doc_path)

                # Create sync task if requested
                if create_tasks:
                    task_id = _create_sync_task(project_root, rel_doc_path, source_rel_path)
                    if task_id:
                        results["tasks_created"].append(task_id)
            else:  # new - doc exists but source doesn't (orphaned)
                results["new"].append(rel_doc_path)

    return results


def _create_sync_task(project_root: str, doc_path: str, source_path: str) -> str | None:
    """Create a Critical priority sync task for a stale doc.

    Returns the task ID if created, None if failed.
    """
    try:
        # Import board_ops from the scripts directory
        import sys

        scripts_dir = os.path.join(project_root, ".dev_ops", "scripts")
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)

        from board_ops import create_task

        task_id = create_task(
            title=f"Sync: Update {doc_path}",
            summary=f"Code in {source_path} was modified after documentation. Update the architecture doc to reflect current implementation.",
            priority="high",  # Using 'high' as Critical equivalent
            column_id="col-backlog",
            project_root=project_root,
        )
        return task_id
    except Exception as e:
        print(f"Warning: Failed to create sync task: {e}")
        return None


def scaffold_architecture(
    project_root: str,
    target_dir: str,
    template_path: str,
    max_depth: int = 4,
) -> dict[str, Any]:
    """Scaffold architecture documentation by mirroring project structure.

    Mirrors the project folder hierarchy in the target directory, with leaf
    directories becoming .md files. Implements smart filtering:
    - Source root detection (src, lib, app, etc.)
    - Extended exclusions (payload, templates, resources, etc.)
    - Code file requirement (only dirs with .py, .ts, .js, etc.)
    - Depth limiting (default 4 levels)

    Args:
        project_root: Path to the project root directory.
        target_dir: Directory where architecture docs should be created.
        template_path: Path to the component template file.
        max_depth: Maximum directory depth to scaffold (default 4).

    Returns:
        Dictionary with scaffolding results including count and file list.
    """
    import datetime

    results = {
        "created": 0,
        "skipped": 0,
        "filtered": 0,
        "files": [],
    }

    # Read template
    template_content = get_file_content(template_path)
    if not template_content:
        template_content = """---
title: "{title}"
type: doc
lifecycle: persistent
path: "{path}"
status: undocumented
coverage: 0
---

# {title}

## Purpose

<!-- What does this component do? Why does it exist? -->

## Overview

<!-- High-level summary of the component -->

## Public Interface

<!-- Key exports, entry points, or API surface -->

## Dependencies

| Depends On | Relationship |
|------------|--------------|
| — | — |

## Implementation Notes

<!-- Design decisions, gotchas, or future improvements -->

## Test Coverage

**Coverage**: {coverage}%
**Last Verified**: {date}
"""

    # Strategy 2: Extended exclusions
    scaffolding_excluded = _EXCLUDED_DIRS | {
        # Framework/config
        "payload",
        "templates",
        "resources",
        "assets",
        "static",
        # Temp/generated
        ".tmp",
        "tmp",
        "temp",
        "cache",
        ".cache",
        # Docs (already documentation)
        "docs",
        "documentation",
        ".dev_ops",
        # Build outputs
        "dist",
        "build",
        "out",
        "target",
        "bin",
        "obj",
        # Test fixtures/data
        "fixtures",
        "mocks",
        "__mocks__",
        "testdata",
        # Common non-code
        ".vscode-test",
        "coverage",
        "htmlcov",
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
    }

    # Strategy 3: Code file extensions
    CODE_EXTENSIONS = {
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".go",
        ".rs",
        ".java",
        ".kt",
        ".swift",
        ".c",
        ".cpp",
        ".h",
        ".cs",
        ".rb",
    }

    def has_code_files(directory: str, recursive: bool = False) -> bool:
        """Check if directory contains source code files.

        Args:
            directory: Path to check
            recursive: If True, also check immediate subdirectories
        """
        if not os.path.isdir(directory):
            return False

        # Check direct children
        for f in os.listdir(directory):
            full_path = os.path.join(directory, f)
            if os.path.isfile(full_path):
                ext = os.path.splitext(f)[1].lower()
                if ext in CODE_EXTENSIONS:
                    return True
            # Check one level deep if recursive
            elif recursive and os.path.isdir(full_path):
                for sub_f in os.listdir(full_path):
                    if os.path.isfile(os.path.join(full_path, sub_f)):
                        ext = os.path.splitext(sub_f)[1].lower()
                        if ext in CODE_EXTENSIONS:
                            return True
        return False

    def find_source_roots(root: str) -> list[str]:
        """Find directories that look like source code entry points.

        Strategy:
        1. Look for common source patterns (src, lib, app, etc.)
        2. Fallback: detect top-level dirs containing code files
        3. Final fallback: use project root
        """
        # Common source directory patterns (including monorepo patterns)
        SOURCE_PATTERNS = {
            # Standard src patterns
            "src",
            "lib",
            "app",
            "packages",
            "components",
            "modules",
            "core",
            # Monorepo/multi-project patterns
            "frontend",
            "backend",
            "client",
            "server",
            "api",
            "web",
            "mobile",
            # Test directories
            "tests",
            "test",
        }

        roots = []
        code_dirs = []

        for item in os.listdir(root):
            if item.startswith(".") or item in scaffolding_excluded:
                continue
            path = os.path.join(root, item)
            if os.path.isdir(path):
                # Check for common patterns
                if item in SOURCE_PATTERNS:
                    roots.append(item)
                # Also track dirs that have code files (check recursively for nested src/)
                elif has_code_files(path, recursive=True):
                    code_dirs.append(item)

        # If we found standard patterns, use them
        if roots:
            return roots
        # Otherwise, use dirs that contain code files
        if code_dirs:
            return code_dirs
        # Final fallback: scaffold from project root
        return [""]

    source_roots = find_source_roots(project_root)

    # First pass: collect all valid directories from source roots
    all_dirs = set()
    for source_root in source_roots:
        start_path = os.path.join(project_root, source_root) if source_root else project_root

        for root, dirs, _ in os.walk(start_path):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in scaffolding_excluded]

            rel_path = os.path.relpath(root, project_root)

            # Skip root and hidden directories
            if rel_path == "." or rel_path.startswith("."):
                continue

            # Strategy 4: Depth limiting
            depth = rel_path.count(os.sep) + 1
            if depth > max_depth:
                dirs.clear()  # Don't descend further
                continue

            all_dirs.add(rel_path)

    # Second pass: identify leaf directories (no children in our set)
    leaf_dirs = []
    for dir_path in all_dirs:
        has_children = any(
            other.startswith(dir_path + os.sep) for other in all_dirs if other != dir_path
        )
        if not has_children:
            leaf_dirs.append(dir_path)

    # Ensure target directory exists
    os.makedirs(target_dir, exist_ok=True)

    # Create mirrored structure with .md files for leaf directories
    for leaf_path in sorted(leaf_dirs):
        source_dir = os.path.join(project_root, leaf_path)

        # Strategy 3: Skip directories without code files
        if not has_code_files(source_dir):
            results["filtered"] += 1
            continue

        # Split path into parent and leaf name
        parent = os.path.dirname(leaf_path)
        leaf_name = os.path.basename(leaf_path)

        # Create parent folder structure in target
        target_parent = os.path.join(target_dir, parent) if parent else target_dir
        os.makedirs(target_parent, exist_ok=True)

        # Create .md file for the leaf directory
        component_file = f"{leaf_name}.md"
        component_path_full = os.path.join(target_parent, component_file)

        # Skip if file already exists
        if os.path.exists(component_path_full):
            results["skipped"] += 1
            continue

        # Generate content from template
        title = leaf_path.replace(os.sep, " / ")
        content = template_content.replace("{title}", title)
        content = content.replace("{path}", leaf_path)
        content = content.replace("{coverage}", "0")
        content = content.replace("{date}", datetime.datetime.now().strftime("%Y-%m-%d"))

        # Add file hints from the original directory
        file_list = [
            f
            for f in os.listdir(source_dir)
            if os.path.isfile(os.path.join(source_dir, f))
            and not f.startswith(".")
            and not f.startswith("__")
        ]
        if file_list and "<!-- Key exports, entry points, or API surface -->" in content:
            file_hint = f"<!-- Found {len(file_list)} files: {', '.join(file_list[:5])}{'...' if len(file_list) > 5 else ''} -->"
            content = content.replace(
                "<!-- Key exports, entry points, or API surface -->", file_hint
            )

        with open(component_path_full, "w", encoding="utf-8") as f:
            f.write(content)

        results["created"] += 1
        results["files"].append(os.path.join(parent, component_file) if parent else component_file)

    return results


def main():
    """CLI entry point for project operations."""
    parser = argparse.ArgumentParser(description="DevOps project operations")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Detect command
    detect_parser = subparsers.add_parser("detect", help="Detect project stack")
    detect_parser.add_argument("--target", default=os.getcwd(), help="Target project directory")
    detect_parser.add_argument(
        "--format", choices=["json", "summary"], default="summary", help="Output format"
    )
    detect_parser.add_argument(
        "--include-docs", action="store_true", help="Include doc/test detection (for bootstrap)"
    )

    args = parser.parse_args()

    if args.command == "detect":
        stack = detect_stack(args.target)
        patterns = detect_patterns(args.target)

        if args.format == "json":
            # Determine project type based on stack detection
            # Has language files = brownfield, otherwise greenfield
            has_code = any(item["category"] == "Language" for item in stack)
            project_type = "brownfield" if has_code else "greenfield"

            # Full JSON output for bootstrap orchestration
            output = {
                "project_type": project_type,
                "stack": stack,
                "patterns": patterns,
            }
            # Always include docs/tests in JSON format (bootstrap needs it)
            output["docs"] = detect_docs(args.target)
            output["tests"] = detect_tests(args.target)
            print(json.dumps(output, indent=2))
        else:
            # Summary format
            print(f"\n🔍 Detected stack in {args.target}:")
            print(f"\n{'Category':<12} | {'Name':<20} | {'Version':<10}")
            print("-" * 48)
            for item in stack:
                category = item["category"]
                name = item["name"].replace(".md", "")
                version = item.get("version", "-")
                print(f"{category:<12} | {name:<20} | {version:<10}")
            print(f"\nTotal: {len(stack)} items detected")

            # Print pattern summary
            print("\n📂 Common Files:")
            for f, count in patterns["common_files"].items():
                print(f"  {f}: {count}")

            # Include docs if requested
            if args.include_docs:
                docs = detect_docs(args.target)
                tests = detect_tests(args.target)
                print("\n� Documentation:")
                for doc_type, value in docs.items():
                    status = value if value else "❌ Missing"
                    print(f"  {doc_type}: {status}")
                print("\n🧪 Tests:")
                print(f"  Exists: {'✅' if tests['exists'] else '❌'}")
                print(f"  Framework: {tests['framework'] or 'Unknown'}")
                print(f"  CI: {'✅' if tests['ci_configured'] else '❌'}")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
