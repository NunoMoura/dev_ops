#!/usr/bin/env python3
"""Tests for git_ops.py."""

import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from git_ops import git_commit, get_commit_parser


class TestGitOps(unittest.TestCase):
    """Test git operations."""

    def test_parser(self):
        """Test argument parser."""
        parser = get_commit_parser()
        args = parser.parse_args(["--context", "Fix bug", "--decision", "Refactor"])
        self.assertEqual(args.context, "Fix bug")
        self.assertEqual(args.decision, "Refactor")
        self.assertEqual(args.arch, "None")

    @patch("git_ops.run_command")
    @patch("git_ops.prompt_user")
    @patch("tempfile.NamedTemporaryFile")
    @patch("os.unlink")
    def test_git_commit_interactive(self, mock_unlink, mock_temp, mock_prompt, mock_run):
        """Test interactive git commit."""
        # Mock user inputs
        mock_prompt.side_effect = ["Fix bug", "Refactor X", "n", "y", "Verified"]

        # Mock temp file context manager
        mock_file = MagicMock()
        mock_file.name = "/tmp/mock_msg"
        mock_temp.return_value.__enter__.return_value = mock_file

        git_commit([])

        # Check prompts
        self.assertTrue(mock_prompt.called)

        # Check commit message content
        # We can't easily check what was written to the mock file without more complex mocking,
        # but we can verify run_command was called with the file path
        mock_run.assert_called_with("git commit -F /tmp/mock_msg")
        mock_unlink.assert_called_with("/tmp/mock_msg")

    @patch("git_ops.run_command")
    @patch("tempfile.NamedTemporaryFile")
    @patch("os.unlink")
    def test_git_commit_args(self, mock_unlink, mock_temp, mock_run):
        """Test git commit with arguments."""
        mock_file = MagicMock()
        mock_file.name = "/tmp/mock_msg"
        mock_temp.return_value.__enter__.return_value = mock_file

        git_commit(
            ["--context", "Ctx", "--decision", "Dec", "--arch", "Arch", "--verification", "Ver"]
        )

        # Should not prompt if all args provided (though internally code might verify logic...
        # actually the code only prompts if args are missing.
        # But wait, logic is: context = args.context or prompt_user()
        # So passing args should skip prompts.

        mock_run.assert_called_with("git commit -F /tmp/mock_msg")


if __name__ == "__main__":
    unittest.main()
