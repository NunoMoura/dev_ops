#!/usr/bin/env python3
import sys
import os
import argparse

# Add project root to sys.path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from dev_ops.commands.common.file_ops import write_file


def scaffold_test(target_file):
    if not os.path.exists(target_file):
        print(
            f"Warning: Target file {target_file} does not exist yet. Creating test anyway."
        )

    # Determine test path
    # e.g., dev_ops/commands/log_issue.py -> tests/commands/test_log_issue.py
    rel_path = os.path.relpath(target_file, os.getcwd())
    if rel_path.startswith("dev_ops/"):
        rel_path = rel_path[8:]  # Strip dev_ops/

    test_path = os.path.join(
        "tests", os.path.dirname(rel_path), "test_" + os.path.basename(rel_path)
    )

    # Create directory if needed
    os.makedirs(os.path.dirname(test_path), exist_ok=True)

    # Generate content
    module_name = os.path.splitext(os.path.basename(target_file))[0]
    content = f"""import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import target (Adjust path as needed)
# from dev_ops.{os.path.dirname(rel_path).replace("/", ".")}.{module_name} import {module_name}

class Test{module_name.capitalize()}(unittest.TestCase):
    def setUp(self):
        # Setup test fixtures
        pass

    def test_example(self):
        # TODO: Implement test
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()
"""

    if os.path.exists(test_path):
        print(f"Error: Test file {test_path} already exists.")
        return

    write_file(test_path, content)
    print(f"✅ Created Test Scaffold: {test_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Scaffold a test file for a given target."
    )
    parser.add_argument(
        "--target", required=True, help="Path to the file you want to test."
    )
    args = parser.parse_args()

    scaffold_test(args.target)


if __name__ == "__main__":
    main()
