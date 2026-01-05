#!/usr/bin/env python3
"""Version synchronization utility for DevOps Framework.

Checks that version numbers are consistent across all locations:
- pyproject.toml
- extension/package.json
- __init__.py
"""

import json
import re
import sys
from pathlib import Path


def get_versions() -> dict[str, str]:
    """Read versions from all locations."""
    root = Path(__file__).parent.parent
    versions = {}

    # pyproject.toml
    pyproject = root / "pyproject.toml"
    if pyproject.exists():
        match = re.search(r'version\s*=\s*"([^"]+)"', pyproject.read_text())
        versions["pyproject.toml"] = match.group(1) if match else "unknown"

    # extension/package.json
    pkg_json = root / "extension" / "package.json"
    if pkg_json.exists():
        data = json.loads(pkg_json.read_text())
        versions["extension/package.json"] = data.get("version", "unknown")

    # __init__.py
    init_py = root / "__init__.py"
    if init_py.exists():
        match = re.search(r'__version__\s*=\s*"([^"]+)"', init_py.read_text())
        versions["__init__.py"] = match.group(1) if match else "unknown"

    return versions


def check_sync() -> int:
    """Check if all versions are synchronized.

    Returns:
        0 if all versions match, 1 if mismatch detected.
    """
    versions = get_versions()
    unique = set(versions.values())

    print("Version Check:")
    for loc, ver in versions.items():
        print(f"  {loc}: {ver}")

    if len(unique) == 1:
        print(f"\n✅ All versions synchronized: {unique.pop()}")
        return 0
    else:
        print("\n❌ Version mismatch detected!")
        return 1


if __name__ == "__main__":
    sys.exit(check_sync())
