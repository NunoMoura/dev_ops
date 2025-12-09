import os


def summarize_project(project_root):
    """Scans project and prints a summary to save agent context/tokens."""
    print("\n📊 Analyzing Project Structure...")
    extensions = {}
    dirs = []
    file_count = 0

    # Walk project
    for root, d_names, f_names in os.walk(project_root):
        # Skip .git, .agent, node_modules, venv
        if any(
            ignore in root
            for ignore in [".git", ".agent", "node_modules", "venv", "__pycache__"]
        ):
            continue

        # Track top-level dirs
        if root == project_root:
            dirs = d_names

        for f in f_names:
            file_count += 1
            ext = os.path.splitext(f)[1].lower()
            if ext:
                extensions[ext] = extensions.get(ext, 0) + 1

    print(f"   📂 Top-level Directories: {', '.join(dirs)}")
    print(f"   📄 Total Files: {file_count}")
    print("   📁 File Types:")
    # Sort by count desc
    for ext, count in sorted(
        extensions.items(), key=lambda item: item[1], reverse=True
    ):
        print(f"      {ext}: {count}")
    print("-" * 40)
    return extensions
