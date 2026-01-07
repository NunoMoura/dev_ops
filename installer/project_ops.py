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

    args = parser.parse_args()

    if args.command == "detect":
        stack = detect_stack(args.target)

        if args.format == "json":
            # Include patterns in JSON output for bootstrap orchestration
            patterns = detect_patterns(args.target)
            output = {"stack": stack, "patterns": patterns}
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
            patterns = detect_patterns(args.target)
            print("\n📂 Common Files:")
            for f, count in patterns["common_files"].items():
                print(f"  {f}: {count}")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
