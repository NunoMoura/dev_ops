import os
import yaml

BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "dev_ops",
)

TYPE_MAP = {
    "ADR": "adrs",
    "RES": "research",
    "BUG": "bugs",
    "BCK": "backlog",
    "PLN": "plans",
}


def parse_frontmatter(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    if content.startswith("---\n"):
        end_idx = content.find("\n---\n", 4)
        if end_idx != -1:
            frontmatter = content[4:end_idx]
            try:
                data = yaml.safe_load(frontmatter)
                # Extract title from content if not in frontmatter
                if "title" not in data:
                    for line in content[end_idx + 5 :].split("\n"):
                        if line.startswith("# "):
                            data["title"] = line[2:].strip()
                            break
                data["filepath"] = filepath
                return data
            except yaml.YAMLError:
                pass
    return None


def find_doc_by_id(doc_id):
    """
    Finds a document by its ID (e.g., ADR-001).
    Returns the parsed metadata dict including 'filepath', or None.
    """
    prefix = doc_id.split("-")[0]
    subdir = TYPE_MAP.get(prefix)

    if not subdir:
        return None

    dirpath = os.path.join(BASE_DIR, subdir)
    if not os.path.exists(dirpath):
        return None

    for filename in os.listdir(dirpath):
        if filename.startswith(f"{doc_id}-") or filename == f"{doc_id}.md":
            filepath = os.path.join(dirpath, filename)
            return parse_frontmatter(filepath)

    return None
