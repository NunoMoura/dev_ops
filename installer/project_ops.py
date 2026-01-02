"""Project operations for detecting technology stack and generating rules."""

import argparse
import glob
import json
import os
import sys
from typing import Any, Optional


def get_file_content(path: str) -> str:
    """Read and return file contents, or empty string if file doesn't exist.

    Args:
        path: Path to the file to read.

    Returns:
        File contents as string, or empty string if file doesn't exist.
    """
    if os.path.exists(path):
        with open(path) as f:
            return f.read()
    return ""


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
            print(json.dumps(stack, indent=2))
        else:
            # Summary format
            print(f"\n🔍 Detected stack in {args.target}:")
            print(f"\n{'Category':<12} | {'Name':<20}")
            print("-" * 36)
            for item in stack:
                category = item["category"]
                name = item["name"].replace(".md", "")
                print(f"{category:<12} | {name:<20}")
            print(f"\nTotal: {len(stack)} items detected")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
