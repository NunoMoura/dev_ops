import os
import re
import json


def get_file_content(path):
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read()
    return ""


def detect_python_details(project_root):
    """Detects Python version, build tool, etc."""
    details = {
        "__PYTHON_VERSION__": "3.x",
        "__BUILD_TOOL__": "pip",
        "__LINTER__": "pylint/flake8",
        "__FORMATTER__": "black",
        "__KEY_LIBS__": "None detected",
        "__DI_FRAMEWORK__": "None detected",
    }

    # Pyproject.toml analysis
    pyproject_path = os.path.join(project_root, "pyproject.toml")
    pyproject_content = get_file_content(pyproject_path)

    if pyproject_content:
        if "poetry" in pyproject_content:
            details["__BUILD_TOOL__"] = "poetry"
        elif "project" in pyproject_content:  # PEP 621
            details["__BUILD_TOOL__"] = "pip/build"

        if "ruff" in pyproject_content:
            details["__LINTER__"] = "ruff"
            details["__FORMATTER__"] = "ruff"

        if "python" in pyproject_content:
            # Improved extraction for "python = '^3.11'" or 'python = ">=3.10"'
            match = re.search(
                r"python\s*=\s*[\"']\D*([0-9]+\.[0-9]+)[\"']", pyproject_content
            )
            if match:
                details["__PYTHON_VERSION__"] = match.group(1)

    # Requirements.txt analysis
    req_path = os.path.join(project_root, "requirements.txt")
    req_content = get_file_content(req_path)
    if req_content:
        libs = []
        for lib in ["numpy", "pandas", "django", "flask", "fastapi"]:
            if lib in req_content.lower():
                libs.append(lib)
        if libs:
            details["__KEY_LIBS__"] = ", ".join(libs)

        if "fastapi" in req_content.lower():
            details["__DI_FRAMEWORK__"] = "FastAPI"

    return details


def detect_node_details(project_root):
    """Detects Node version, package manager, etc."""
    details = {
        "__NODE_VERSION__": "20.x",
        "__PACKAGE_MANAGER__": "npm",
        "__LINTER__": "eslint",
        "__FORMATTER__": "prettier",
        "__KEY_LIBS__": "None detected",
    }

    package_json_path = os.path.join(project_root, "package.json")
    package_content = get_file_content(package_json_path)

    if package_content:
        try:
            data = json.loads(package_content)
            engines = data.get("engines", {})
            details["__NODE_VERSION__"] = engines.get("node", "20.x")

            deps = data.get("dependencies", {})
            dev_deps = data.get("devDependencies", {})
            all_deps = {**deps, **dev_deps}

            # Package Manager (lock files usually better but checking scripts/engines)
            if os.path.exists(os.path.join(project_root, "yarn.lock")):
                details["__PACKAGE_MANAGER__"] = "yarn"
            elif os.path.exists(os.path.join(project_root, "pnpm-lock.yaml")):
                details["__PACKAGE_MANAGER__"] = "pnpm"

            # Tools
            if "eslint" in all_deps:
                details["__LINTER__"] = "eslint"
            if "prettier" in all_deps:
                details["__FORMATTER__"] = "prettier"

            # Libs
            libs = []
            for lib in ["react", "vue", "svelte", "express", "next", "zod"]:
                if lib in all_deps:
                    libs.append(lib)
            if libs:
                details["__KEY_LIBS__"] = ", ".join(libs)

        except Exception:
            pass

    return details


def detect_go_details(project_root):
    """Detects Go version and modules."""
    details = {
        "__GO_VERSION__": "1.21",
        "__BUILD_TOOL__": "go build",
        "__LINTER__": "golangci-lint",
        "__FORMATTER__": "gofmt",
        "__KEY_LIBS__": "None detected",
    }

    mod_path = os.path.join(project_root, "go.mod")
    content = get_file_content(mod_path)
    if content:
        match = re.search(r"go\s+([0-9]+\.[0-9]+)", content)
        if match:
            details["__GO_VERSION__"] = match.group(1)

        libs = []
        for lib in ["gin", "echo", "gorm", "cobra", "viper"]:
            if lib in content:
                libs.append(lib)
        if libs:
            details["__KEY_LIBS__"] = ", ".join(libs)

    return details


def detect_rust_details(project_root):
    """Detects Rust edition and crates."""
    details = {
        "__RUST_VERSION__": "2021",  # Edition
        "__BUILD_TOOL__": "cargo",
        "__LINTER__": "clippy",
        "__FORMATTER__": "rustfmt",
        "__KEY_LIBS__": "None detected",
    }

    cargo_path = os.path.join(project_root, "Cargo.toml")
    content = get_file_content(cargo_path)
    if content:
        if "edition" in content:
            match = re.search(r"edition\s*=\s*[\"\'\s](20[0-9]{2})[\"\'\s]", content)
            if match:
                details["__RUST_VERSION__"] = match.group(1)

        libs = []
        for lib in ["tokio", "serde", "axum", "actix", "clap"]:
            if lib in content:
                libs.append(lib)
        if libs:
            details["__KEY_LIBS__"] = ", ".join(libs)

    return details


def detect_java_details(project_root):
    """Detects Java version and build tool."""
    details = {
        "__JAVA_VERSION__": "17",
        "__BUILD_TOOL__": "maven",
        "__LINTER__": "checkstyle",
        "__FORMATTER__": "google-java-format",
        "__KEY_LIBS__": "None detected",
    }

    pom_path = os.path.join(project_root, "pom.xml")
    gradle_path = os.path.join(project_root, "build.gradle")

    if os.path.exists(gradle_path):
        details["__BUILD_TOOL__"] = "gradle"
        content = get_file_content(gradle_path)
        if "sourceCompatibility" in content:
            match = re.search(
                r"sourceCompatibility\s*=\s*[\"\'\s]?([0-9]+)[\"\'\s]?", content
            )
            if match:
                details["__JAVA_VERSION__"] = match.group(1)
    elif os.path.exists(pom_path):
        details["__BUILD_TOOL__"] = "maven"
        # Maven XML parsing is verbose, skipping for regex summary for now
        content = get_file_content(pom_path)
        match = re.search(r"<java.version>([0-9]+)</java.version>", content)
        if match:
            details["__JAVA_VERSION__"] = match.group(1)

    return details


def detect_cpp_details(project_root):
    """Detects C++ standard."""
    details = {
        "__CPP_VERSION__": "C++17",
        "__BUILD_TOOL__": "cmake",
        "__LINTER__": "clang-tidy",
        "__FORMATTER__": "clang-format",
        "__KEY_LIBS__": "None detected",
    }

    cmake_path = os.path.join(project_root, "CMakeLists.txt")
    if os.path.exists(cmake_path):
        details["__BUILD_TOOL__"] = "cmake"
        content = get_file_content(cmake_path)
        match = re.search(r"set\(CMAKE_CXX_STANDARD\s+([0-9]+)\)", content)
        if match:
            details["__CPP_VERSION__"] = f"C++{match.group(1)}"
    elif os.path.exists(os.path.join(project_root, "Makefile")):
        details["__BUILD_TOOL__"] = "make"

    return details


def detect_svelte_details(project_root):
    # Svelte often uses same structure as Node but we might look for specific config
    details = detect_node_details(project_root)
    # Map node details to Svelte specific keys if they exist in the rules, but rules/svelte.md uses NODE keys for most parts
    # Except it has __NODE_VERSION__ etc which is same as node.
    # Check for svelte specific lib if not already found in node details

    # Force add svelte libs if not detected by generics
    if "svelte" not in details["__KEY_LIBS__"]:
        if os.path.exists(os.path.join(project_root, "svelte.config.js")):
            if details["__KEY_LIBS__"] == "None detected":
                details["__KEY_LIBS__"] = "svelte"
            else:
                details["__KEY_LIBS__"] += ", svelte"

    return details
