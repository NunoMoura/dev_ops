import os


def detect_languages(project_root):
    """Detects languages based on files in PROJECT_ROOT."""
    langs = []
    if os.path.exists(os.path.join(project_root, "package.json")):
        langs.append("javascript")
        langs.append("typescript")  # Assume TS often comes with JS packages or tsconfig
        if os.path.exists(
            os.path.join(project_root, "svelte.config.js")
        ) or os.path.exists(
            os.path.join(project_root, "vite.config.js")  # Often used with Svelte
        ):
            # Rough heuristic, but user can always delete if irrelevant
            langs.append("svelte")

    # Python Detection
    if (
        os.path.exists(os.path.join(project_root, "requirements.txt"))
        or os.path.exists(os.path.join(project_root, "pyproject.toml"))
        or os.path.exists(os.path.join(project_root, "Pipfile"))
        or os.path.exists(os.path.join(project_root, "setup.py"))
    ):
        langs.append("python")

    # Fallback: Scan for .py files if no config found
    if "python" not in langs:
        for root, _, files in os.walk(project_root):
            # Skip common ignored dirs to save time
            if any(
                p in root
                for p in [".git", ".venv", "venv", "__pycache__", "node_modules"]
            ):
                continue
            for file in files:
                if file.endswith(".py"):
                    langs.append("python")
                    break
            if "python" in langs:
                break
    if os.path.exists(os.path.join(project_root, "pom.xml")) or os.path.exists(
        os.path.join(project_root, "build.gradle")
    ):
        langs.append("java")
    if os.path.exists(os.path.join(project_root, "go.mod")):
        langs.append("go")
    if os.path.exists(os.path.join(project_root, "Cargo.toml")):
        langs.append("rust")
    if os.path.exists(os.path.join(project_root, "CMakeLists.txt")):
        langs.append("cpp")
    return langs
