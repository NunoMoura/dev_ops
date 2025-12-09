import os
import re
import glob

# Ensure we can import from core
# (Assuming typical PYTHONPATH handling or relative imports)
# During dev execution, sys.path might need adjustment if run directly, but here it's impoted by bootstrap.
from scripts.shared_utils.interaction import prompt_user
from scripts.shared_utils.file_ops import read_file, write_file


def get_placeholders(content):
    """Finds __PLACEHOLDERS__ in content."""
    return set(re.findall(r"__([A-Z_]+)__", content))


def process_rule(rule_path, dest_path):
    """Reads rule, prompts for placeholders, writes to dest."""
    content = read_file(rule_path)

    placeholders = get_placeholders(content)
    if placeholders:
        print(f"\nConfiguring {os.path.basename(rule_path)}:")
        for p in placeholders:
            val = prompt_user(f"Value for {p}")
            content = content.replace(f"__{p}__", val)

    # Ensure dir exists
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    write_file(dest_path, content)
    print(f"✅ Installed {os.path.basename(dest_path)}")


def install_rules(rules_src_dir, agent_rules_dir, project_root, langs):
    """Iterates and installs rules based on lang and globs."""
    for root, dirs, files in os.walk(rules_src_dir):
        for file in files:
            if not file.endswith(".md"):
                continue

            src_path = os.path.join(root, file)
            rel_path = os.path.relpath(src_path, rules_src_dir)

            # Filter Coding Languages
            if file.startswith("lang_"):
                lang_name = os.path.splitext(file)[0].replace("lang_", "")
                if lang_name not in langs:
                    continue

            # Smart Bootstrap (globs)
            content = read_file(src_path)
            glob_match = re.search(r'globs: "(.*)"', content)
            if glob_match:
                patterns = [p.strip() for p in glob_match.group(1).split(",")]
                found_match = False
                for p in patterns:
                    if glob.glob(os.path.join(project_root, p), recursive=True):
                        found_match = True
                        break

                if not found_match:
                    print(
                        f"⏩ Skipping {file} (No matching files found for globs: {patterns})"
                    )
                    continue

            dest_path = os.path.join(agent_rules_dir, rel_path)
            process_rule(src_path, dest_path)
