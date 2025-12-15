import os


def get_file_content(path):
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read()
    return ""


def detect_stack(project_root):
    """
    Scans the project and returns a list of 'Stack Items' (Rules to create).
    Each item contains:
    - name: Filename for the rule (e.g. python.md)
    - category: Language, Linter, Library
    - template: Path to the _template.md file
    - replacements: Dictionary of values to fill in the template
    """
    stack = []

    # ---------------------------------------------------------
    # 1. Languages
    # ---------------------------------------------------------
    # Definitions: (Language Name, Trigger Files, Extension, Template)
    # Note: We rely on the template to exist at rules/languages/_template.md
    languages = [
        ("python", ["pyproject.toml", "requirements.txt", "**/*.py"], "py"),
        ("typescript", ["tsconfig.json", "**/*.ts", "**/*.tsx"], "ts"),
        ("javascript", ["package.json", "**/*.js", "**/*.jsx"], "js"),
        ("go", ["go.mod", "**/*.go"], "go"),
        ("rust", ["Cargo.toml", "**/*.rs"], "rs"),
        ("java", ["pom.xml", "build.gradle", "**/*.java"], "java"),
        ("cpp", ["CMakeLists.txt", "Makefile", "**/*.cpp", "**/*.cc"], "cpp"),
    ]

    detected_langs = set()

    for lang_name, triggers, ext in languages:
        if _check_triggers(project_root, triggers):
            detected_langs.add(lang_name)
            stack.append(
                {
                    "name": f"{lang_name}.md",
                    "category": "Language",
                    "template": "rules/languages/_template.md",
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
    # Definitions: (Tool Name, Trigger Content/Files)
    # We scan common config files for these strings
    tools = [
        ("eslint", ["package.json", ".eslintrc*", "eslint.config.js"]),
        ("prettier", ["package.json", ".prettierrc*", "prettier.config.js"]),
        ("ruff", ["pyproject.toml", "ruff.toml"]),
        ("pylint", ["pyproject.toml", ".pylintrc"]),
        ("black", ["pyproject.toml"]),
        ("gofmt", ["go.mod"]),  # Implicit in Go usually
        ("golangci-lint", [".golangci.yml", ".golangci.yaml"]),
        ("clippy", ["Cargo.toml"]),  # Standard in Rust
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
                    "category": "Linter",  # Or Tool
                    "template": "rules/linters/_template.md",
                    "replacements": {
                        "[Linter Name]": tool_name.capitalize(),
                        "[Linter/Tool Name]": tool_name.capitalize(),
                        "[Tool Name]": tool_name.capitalize(),
                        # Infer config file extension or generic
                        "[config_file_ext]": "json"
                        if tool_name in ["eslint", "prettier"]
                        else "toml",
                    },
                }
            )

    # ---------------------------------------------------------
    # 3. Libraries / Infrastructure
    # ---------------------------------------------------------
    libs = [
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
                    "template": "rules/libraries/_template.md",
                    "replacements": {
                        "[Library Name]": lib_name.capitalize(),
                    },
                }
            )

    return stack


def _check_triggers(root, triggers, content_search=None):
    """
    Checks if any trigger matches.
    If trigger is a glob (has *), we walk.
    If trigger is a file, we check existence.
    If content_search is provided, we check if the file content contains that string (for package.json etc).
    """
    import glob

    for t in triggers:
        if "*" in t:
            # Glob check
            # We limit depth to avoid analyzing node_modules
            # Simple walk or glob? glob.glob with recursive=True is easy
            # But let's verify if we need to implement a safer walker
            # For now, let's assume if it's a simple glob relative to root
            try:
                matches = glob.glob(os.path.join(root, t), recursive=True)
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
                    # Check if key is in content (e.g. "react" in package.json)
                    # We reuse the tool/lib name as the search key usually
                    if content_search.lower() in content:
                        return True
                else:
                    return True
    return False
