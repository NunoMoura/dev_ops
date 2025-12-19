#!/usr/bin/env python3
"""Tests for setup_ops.py."""

import os
import sys
import tempfile
import json

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from setup_ops import get_core_rules, init_kanban_board, get_all_rules, install_kanban_extension
from unittest.mock import patch, MagicMock


class TestGetCoreRules:
    """Test get_core_rules function."""

    def test_returns_all_phase_rules(self):
        """Test that all expected phase rules are returned."""
        # Get the rules source directory
        script_dir = os.path.dirname(os.path.dirname(__file__))
        rules_src = os.path.join(script_dir, "rules")

        rules = get_core_rules(rules_src)
        rule_names = [r["name"] for r in rules]

        expected = [
            "dev_ops_guide.md",
            "phase_backlog.md",
            "phase_research.md",
            "phase_planning.md",
            "phase_inprogress.md",
            "phase_testing.md",
            "phase_done.md",
            "phase_blocked.md",
        ]

        for name in expected:
            assert name in rule_names, f"Missing rule: {name}"

    def test_all_rules_have_category_core(self):
        """Test that all returned rules have category 'Core'."""
        script_dir = os.path.dirname(os.path.dirname(__file__))
        rules_src = os.path.join(script_dir, "rules")

        rules = get_core_rules(rules_src)

        for rule in rules:
            assert rule["category"] == "Core"


class TestInitKanbanBoard:
    """Test init_kanban_board function."""

    def test_creates_board_json(self):
        """Test that a valid board.json is created."""
        with tempfile.TemporaryDirectory() as tmpdir:
            init_kanban_board(tmpdir)

            board_path = os.path.join(tmpdir, "dev_ops", "kanban", "board.json")
            assert os.path.exists(board_path)

            with open(board_path) as f:
                board = json.load(f)

            assert board["version"] == 1
            assert len(board["columns"]) == 7
            assert board["items"] == []

    def test_does_not_overwrite_existing(self):
        """Test that existing board is not overwritten."""
        with tempfile.TemporaryDirectory() as tmpdir:
            kanban_dir = os.path.join(tmpdir, "dev_ops", "kanban")
            os.makedirs(kanban_dir)
            board_path = os.path.join(kanban_dir, "board.json")

            # Create existing board with custom content
            existing = {"version": 1, "columns": [], "items": [{"id": "existing"}]}
            with open(board_path, "w") as f:
                json.dump(existing, f)

            # Try to init
            init_kanban_board(tmpdir)

            # Should be unchanged
            with open(board_path) as f:
                board = json.load(f)

            assert len(board["items"]) == 1
            assert board["items"][0]["id"] == "existing"


class TestGetAllRules:
    """Test get_all_rules function."""

    def test_combines_core_and_dynamic(self):
        """Test that core rules are included."""
        with tempfile.TemporaryDirectory() as tmpdir:
            script_dir = os.path.dirname(os.path.dirname(__file__))
            rules_src = os.path.join(script_dir, "rules")

            rules = get_all_rules(rules_src, tmpdir)

            # Should have at least the core rules
            categories = set(r["category"] for r in rules)
            assert "Core" in categories


class TestKanbanExtension:
    """Test kanban extension installation."""

    @patch("setup_ops.subprocess.run")
    @patch("setup_ops.glob.glob")
    def test_installs_latest_vsix(self, mock_glob, mock_run):
        """Test that the latest VSIX version is installed."""
        # Mock VSIX files with different versions
        mock_glob.return_value = [
            "/path/to/extension/dev-ops-0.0.9.vsix",
            "/path/to/extension/dev-ops-0.1.0.vsix",
            "/path/to/extension/dev-ops-0.0.1.vsix",
        ]

        # Mock successful installation
        mock_run.return_value.stdout = "dev-ops"  # Simulate check that it's already installed?
        # Wait, if already installed, it returns early.
        # We want to test the case where it's NOT installed.

        # 1. First call checks list-extensions
        # 2. Second call (if needed) does install-extension

        # Let's mock the first call to return empty string (not installed)
        mock_run.side_effect = [
            MagicMock(stdout="other-extension"),  # list-extensions
            MagicMock(returncode=0),  # install-extension
        ]

        with tempfile.TemporaryDirectory():
            # We need the dev_ops_root path. The function takes dev_ops_root.
            install_kanban_extension("/path/to")

        # Verify glob called with correct pattern
        mock_glob.assert_called_with("/path/to/extension/dev-ops-*.vsix")

        # Verify install command called with the LATEST version (0.1.0)
        # 0.1.0 > 0.0.9 > 0.0.1
        # It should pick dev-ops-0.1.0.vsix
        expected_vsix = "/path/to/extension/dev-ops-0.1.0.vsix"

        # Check call args of the second call
        args, _ = mock_run.call_args
        # mock_run("code", "--install-extension", vsix_path)
        assert args[0] == ["code", "--install-extension", expected_vsix]
