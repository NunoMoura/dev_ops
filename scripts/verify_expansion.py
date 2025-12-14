import os
import shutil
import subprocess
import sys

# Setup paths
PROJECTS_DIR = os.path.abspath("projects")
TEST_DIR = os.path.join(PROJECTS_DIR, "test_expansion")
BIN_DEV_OPS = os.path.abspath("bin/dev_ops")


def run_command(cmd, cwd):
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    return result


def setup_test_env():
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)
    os.makedirs(TEST_DIR)


def create_go_project():
    path = os.path.join(TEST_DIR, "go_proj")
    os.makedirs(path)
    with open(os.path.join(path, "main.go"), "w") as f:
        f.write("package main\nfunc main() {}")
    with open(os.path.join(path, "go.mod"), "w") as f:
        f.write(
            "module example.com/foo\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n)\n"
        )
    return path


def create_rust_project():
    path = os.path.join(TEST_DIR, "rust_proj")
    os.makedirs(path)
    with open(os.path.join(path, "main.rs"), "w") as f:
        f.write("fn main() {}")
    with open(os.path.join(path, "Cargo.toml"), "w") as f:
        f.write(
            '[package]\nname = "rust_proj"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\ntokio = "1.0"\nserde = "1.0"'
        )
    return path


def create_java_project():
    path = os.path.join(TEST_DIR, "java_proj")
    os.makedirs(path)
    with open(os.path.join(path, "Main.java"), "w") as f:
        f.write("public class Main {}")
    with open(os.path.join(path, "build.gradle"), "w") as f:
        f.write('plugins { id "java" }\njava { sourceCompatibility = "21" }')
    return path


def create_cpp_project():
    path = os.path.join(TEST_DIR, "cpp_proj")
    os.makedirs(path)
    with open(os.path.join(path, "main.cpp"), "w") as f:
        f.write("int main() { return 0; }")
    with open(os.path.join(path, "CMakeLists.txt"), "w") as f:
        f.write(
            "cmake_minimum_required(VERSION 3.10)\nproject(CppProj)\nset(CMAKE_CXX_STANDARD 20)"
        )
    return path


def create_svelte_project():
    path = os.path.join(TEST_DIR, "svelte_proj")
    os.makedirs(path)
    with open(os.path.join(path, "App.svelte"), "w") as f:
        f.write("<script></script>")
    with open(os.path.join(path, "package.json"), "w") as f:
        f.write(
            '{"engines": {"node": ">=18"}, "devDependencies": {"svelte": "^4.0.0", "vite": "^4.0.0", "eslint": "^8.0.0"}}'
        )
    with open(os.path.join(path, "pnpm-lock.yaml"), "w") as f:
        f.write("")
    return path


def verify_file_content(file_path, checks):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False

    with open(file_path, "r") as f:
        content = f.read()

    all_passed = True
    for check in checks:
        if check in content:
            print(f"   ✅ Found '{check}'")
        else:
            print(f"   ❌ Missing '{check}'")
            all_passed = False
    return all_passed


def main():
    print("🚀 Starting Setup Ops Verification...")
    setup_test_env()

    tests = [
        ("Go", create_go_project, "go.md", ["Go Version: `1.22`", "gin"]),
        (
            "Rust",
            create_rust_project,
            "rust.md",
            ["Rust Version: `2021`", "tokio", "serde"],
        ),
        ("Java", create_java_project, "java.md", ["Java Version: `21`", "gradle"]),
        ("C++", create_cpp_project, "cpp.md", ["C++ Version: `C++20`", "cmake"]),
        (
            "Svelte",
            create_svelte_project,
            "svelte.md",
            ["Node Version: `>=18`", "pnpm", "eslint", "svelte"],
        ),
    ]

    failed = False
    for name, creator, rule_file, checks in tests:
        print(f"\n--- Testing {name} ---")
        path = creator()
        cmd = f"{BIN_DEV_OPS} --target {path}"
        res = run_command(cmd, path)
        if res.returncode != 0:
            print(f"❌ {name} bootstrap failed: {res.stderr}")
            print(f"Stdout: {res.stdout}")
            failed = True
            continue

        rule_path = os.path.join(path, ".agent", "rules", rule_file)
        if not verify_file_content(rule_path, checks):
            print(f"❌ {name} verification failed.")
            print(f"Stdout: {res.stdout}")
            if os.path.exists(rule_path):
                with open(rule_path, "r") as f:
                    print(f"File content:\n{f.read()}")
            failed = True
        else:
            print(f"✅ {name} passed.")

    if failed:
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")


if __name__ == "__main__":
    main()
