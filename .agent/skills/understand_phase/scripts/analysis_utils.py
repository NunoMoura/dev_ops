import ast
import json
import os
import re
import subprocess
from typing import Any


def detect_stack(project_root: str = ".") -> dict[str, Any]:
    """
    Detects project stack using the robust 'devops' CLI.

    Args:
        project_root: Root of the project (defaults to current dir).

    Returns:
        Dict containing stack detection results (languages, frameworks, etc.)
    """
    cmd = ["node", ".dev_ops/scripts/devops.js", "detect"]
    try:
        # Run command from project root
        result = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except (subprocess.CalledProcessError, FileNotFoundError, json.JSONDecodeError):
        # Fallback or error if CLI not ready
        print("Warning: Could not run 'devops detect'. Ensure extension is built and installed.")
        return {}


def find_definitions(directory: str, name_pattern: str) -> list[dict[str, Any]]:
    """
    Finds class and function definitions matching a regex pattern.

    Args:
        directory: Root directory to search.
        name_pattern: Regex pattern to match definition names.

    Returns:
        List of dicts with file, line, type, and name.
    """
    results = []
    regex = re.compile(name_pattern)

    for root, _, files in os.walk(directory):
        for file in files:
            path = os.path.join(root, file)

            # Python AST parsing
            if file.endswith(".py"):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        tree = ast.parse(f.read(), filename=path)

                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                            if regex.search(node.name):
                                results.append(
                                    {
                                        "file": path,
                                        "line": node.lineno,
                                        "type": type(node).__name__,
                                        "name": node.name,
                                    }
                                )
                except Exception:
                    continue

            # TS/JS Regex parsing (simple)
            elif file.endswith((".ts", ".js", ".tsx", ".jsx")):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        lines = f.readlines()

                    for i, line in enumerate(lines):
                        # Simple heuristics for classes and functions
                        # class Name
                        # function name(
                        # const name = (
                        # interface Name
                        line_strip = line.strip()
                        if not line_strip:
                            continue

                        # Use simple regex for definition detection in TS
                        # This is naive but better than nothing for a simple utils script
                        ts_def_regex = r"(?:export\s+)?(?:class|function|interface|type|const|let|var)\s+([a-zA-Z0-9_]+)"
                        m = re.search(ts_def_regex, line_strip)
                        if m:
                            def_name = m.group(1)
                            if regex.search(def_name):
                                results.append(
                                    {
                                        "file": path,
                                        "line": i + 1,
                                        "type": "definition",  # Simplified type
                                        "name": def_name,
                                        "match": line_strip,
                                    }
                                )
                except Exception:
                    continue

    return results


def get_imports(file_path: str) -> list[str]:
    """
    Returns a list of imported module names from a Python file.
    """
    imports = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=file_path)

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
    except Exception:
        pass
    return imports


def grep_context(pattern: str, directory: str, context: int = 2) -> list[dict[str, Any]]:
    """
    Searches for a regex pattern in files and returns matches with context.

    Args:
        pattern: Regex pattern to search for.
        directory: Directory to search.
        context: Number of lines of context to include.

    Returns:
        List of dicts with file, line, match, and context_lines.
    """
    results = []
    regex = re.compile(pattern)

    for root, _, files in os.walk(directory):
        for file in files:
            # Skip binary and likely non-text files, but allow most code
            if file.endswith((".pyc", ".git", ".png", ".jpg")):
                continue

            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()

                for i, line in enumerate(lines):
                    if regex.search(line):
                        start_ctx = max(0, i - context)
                        end_ctx = min(len(lines), i + context + 1)
                        results.append(
                            {
                                "file": path,
                                "line": i + 1,
                                "match": line.strip(),
                                "context_lines": [l.rstrip() for l in lines[start_ctx:end_ctx]],
                            }
                        )
            except Exception:
                continue

    return results
