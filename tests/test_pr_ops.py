#!/usr/bin/env python3
"""Tests for pr_ops.py."""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import subprocess

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from pr_ops import (
    run_gh_command,
    get_pr_details,
    create_pr,
    GitHubCLIError,
    GitHubCLINotFoundError,
)


class TestRunGhCommand(unittest.TestCase):
    """Tests for run_gh_command function."""

    @patch("pr_ops.subprocess.run")
    def test_successful_command(self, mock_run):
        """Test successful gh command execution."""
        mock_run.return_value = MagicMock(
            stdout="output text",
            returncode=0,
        )

        result = run_gh_command(["pr", "list"])

        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        self.assertEqual(args, ["gh", "pr", "list"])
        self.assertEqual(result, "output text")

    @patch("pr_ops.subprocess.run")
    def test_failed_command_raises_github_cli_error(self, mock_run):
        """Test that failed command raises GitHubCLIError."""
        mock_run.side_effect = subprocess.CalledProcessError(
            returncode=1, cmd="gh", stderr="error message"
        )

        with self.assertRaises(GitHubCLIError):
            run_gh_command(["pr", "view", "123"])

    @patch("pr_ops.subprocess.run")
    def test_gh_not_found_raises_not_found_error(self, mock_run):
        """Test that missing gh CLI raises GitHubCLINotFoundError."""
        mock_run.side_effect = FileNotFoundError()

        with self.assertRaises(GitHubCLINotFoundError):
            run_gh_command(["pr", "list"])


class TestGetPrDetails(unittest.TestCase):
    """Tests for get_pr_details function."""

    @patch("pr_ops.run_gh_command")
    def test_returns_parsed_json(self, mock_run_gh):
        """Test that PR details are returned as parsed JSON."""
        mock_run_gh.return_value = '{"title": "Test PR", "comments": []}'

        result = get_pr_details(123)

        mock_run_gh.assert_called_once_with(
            ["pr", "view", "123", "--json", "comments,reviews,title,body"]
        )
        self.assertEqual(result["title"], "Test PR")
        self.assertEqual(result["comments"], [])


class TestCreatePr(unittest.TestCase):
    """Tests for create_pr function."""

    @patch("pr_ops.run_gh_command")
    def test_creates_pr_with_defaults(self, mock_run_gh):
        """Test creating PR with default base branch."""
        mock_run_gh.return_value = "https://github.com/org/repo/pull/1"

        result = create_pr("Test Title", "Test Body")

        mock_run_gh.assert_called_once_with(
            ["pr", "create", "--title", "Test Title", "--body", "Test Body", "--base", "main"]
        )
        self.assertEqual(result, "https://github.com/org/repo/pull/1")

    @patch("pr_ops.run_gh_command")
    def test_creates_pr_with_custom_base(self, mock_run_gh):
        """Test creating PR with custom base branch."""
        mock_run_gh.return_value = "https://github.com/org/repo/pull/1"

        create_pr("Title", "Body", base="develop")

        args = mock_run_gh.call_args[0][0]
        self.assertIn("--base", args)
        self.assertEqual(args[args.index("--base") + 1], "develop")


class TestExceptionHierarchy(unittest.TestCase):
    """Tests for exception class hierarchy."""

    def test_github_cli_error_is_devops_error(self):
        """Test that GitHubCLIError inherits from DevOpsError."""
        from utils import DevOpsError

        self.assertTrue(issubclass(GitHubCLIError, DevOpsError))

    def test_github_cli_not_found_is_devops_error(self):
        """Test that GitHubCLINotFoundError inherits from DevOpsError."""
        from utils import DevOpsError

        self.assertTrue(issubclass(GitHubCLINotFoundError, DevOpsError))


if __name__ == "__main__":
    unittest.main()
