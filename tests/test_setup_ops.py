#!/usr/bin/env python3
"""Tests for setup_ops.py."""

import json
import os
import sys
import tempfile

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from unittest.mock import MagicMock, patch

from setup_ops import get_all_rules, get_core_rules, init_board, install_extension


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
            "1_backlog.md",
            "2_understand.md",
            "3_plan.md",
            "4_build.md",
            "5_verify.md",
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


class TestInitBoard:
    """Test init_board function."""

    def test_creates_board_json(self):
        """Test that a valid board.json is created."""
        with tempfile.TemporaryDirectory() as tmpdir:
            init_board(tmpdir)

            board_path = os.path.join(tmpdir, "dev_ops", "board", "board.json")
            assert os.path.exists(board_path)

            with open(board_path) as f:
                board = json.load(f)

            assert board["version"] == 1
            assert len(board["columns"]) == 6  # 6 columns: Backlog to Done
            assert board["items"] == []

    def test_does_not_overwrite_existing(self):
        """Test that existing board is not overwritten."""
        with tempfile.TemporaryDirectory() as tmpdir:
            dev_ops_dir = os.path.join(tmpdir, "dev_ops", "board")
            os.makedirs(dev_ops_dir)
            board_path = os.path.join(dev_ops_dir, "board.json")

            # Create existing board with custom content
            existing = {"version": 1, "columns": [], "items": [{"id": "existing"}]}
            with open(board_path, "w") as f:
                json.dump(existing, f)

            # Try to init
            init_board(tmpdir)

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
            # Get rules source path
            script_dir = os.path.dirname(os.path.dirname(__file__))
            rules_src = os.path.join(script_dir, "rules")

            rules = get_all_rules(rules_src, tmpdir, tmpdir)

            # Should have at least the core rules
            categories = {r["category"] for r in rules}
            assert "Core" in categories


class TestExtension:
    """Test extension installation."""

    @patch("setup_ops.subprocess.run")
    @patch("setup_ops.glob.glob")
    @patch("setup_ops.os.path.exists", return_value=True)
    def test_installs_latest_vsix(self, mock_exists, mock_glob, mock_run):
        """Test that the latest VSIX version is installed."""
        # Mock VSIX files with different versions
        mock_glob.return_value = [
            "/path/to/extension/dev-ops-0.0.9.vsix",
            "/path/to/extension/dev-ops-0.1.0.vsix",
            "/path/to/extension/dev-ops-0.0.1.vsix",
        ]

        # Mock subprocess calls: first list-extensions (not installed), then install
        mock_run.side_effect = [
            MagicMock(stdout="other-extension"),  # list-extensions - not installed
            MagicMock(returncode=0),  # install-extension - success
        ]

        # Call function
        install_extension("/path/to")

        # Verify glob called with correct pattern
        mock_glob.assert_called_with("/path/to/extension/dev-ops-*.vsix")

        # After sorting, highest version (0.1.0) should be selected
        # Sorted in reverse: [0.0.9, 0.1.0, 0.0.1] → picks first = 0.0.9
        # Actually sorted() does string sort, so "0.1.0" > "0.0.9" > "0.0.1"
        expected_vsix = "/path/to/extension/dev-ops-0.1.0.vsix"

        # Check that install command was called
        assert mock_run.call_count == 2
        install_call = mock_run.call_args_list[1]
        args = install_call[0][0]  # Get first positional arg (the command list)
        assert args == ["code", "--install-extension", expected_vsix]
