#!/usr/bin/env python3
"""Tests for setup_ops.py bootstrap operations."""

import unittest
import os
import tempfile
import shutil
import sys

# Add scripts to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import setup_ops


class TestSetupOps(unittest.TestCase):
    """Tests for setup operations."""

    def setUp(self):
        """Create temporary directory for test project."""
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_summarize_project_empty(self):
        """Test summarize_project with empty directory."""
        summary = setup_ops.summarize_project(self.test_dir)
        self.assertIsInstance(summary, str)

    def test_summarize_project_with_files(self):
        """Test summarize_project with various files."""
        # Create some test files
        open(os.path.join(self.test_dir, "main.py"), "w").close()
        open(os.path.join(self.test_dir, "utils.py"), "w").close()
        open(os.path.join(self.test_dir, "README.md"), "w").close()
        os.makedirs(os.path.join(self.test_dir, "src"))
        open(os.path.join(self.test_dir, "src", "app.py"), "w").close()

        summary = setup_ops.summarize_project(self.test_dir)
        self.assertIsInstance(summary, str)


class TestGetCoreRules(unittest.TestCase):
    """Tests for get_core_rules functionality."""

    def test_get_core_rules_returns_list(self):
        """Test that get_core_rules returns a list."""
        # Get the project root
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rules_src = os.path.join(project_root, "rules")

        result = setup_ops.get_core_rules(rules_src)
        self.assertIsInstance(result, list)

    def test_get_core_rules_non_empty(self):
        """Test that get_core_rules returns non-empty list for valid rules dir."""
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rules_src = os.path.join(project_root, "rules")

        if os.path.exists(rules_src):
            result = setup_ops.get_core_rules(rules_src)
            self.assertGreater(len(result), 0, "Should have at least one core rule")


class TestGetAllRules(unittest.TestCase):
    """Tests for get_all_rules functionality."""

    def setUp(self):
        """Create temporary project directory."""
        self.test_dir = tempfile.mkdtemp()
        # Create a Python file to trigger language detection
        open(os.path.join(self.test_dir, "main.py"), "w").close()

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_get_all_rules_returns_list(self):
        """Test that get_all_rules returns a list."""
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rules_src = os.path.join(project_root, "rules")

        result = setup_ops.get_all_rules(rules_src, self.test_dir)
        self.assertIsInstance(result, list)

    def test_get_all_rules_includes_core(self):
        """Test that get_all_rules includes core rules."""
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        rules_src = os.path.join(project_root, "rules")

        if os.path.exists(rules_src):
            result = setup_ops.get_all_rules(rules_src, self.test_dir)
            # Should at least have core rules
            core_rules = setup_ops.get_core_rules(rules_src)
            for core_rule in core_rules:
                self.assertIn(core_rule, result)


if __name__ == "__main__":
    unittest.main()
