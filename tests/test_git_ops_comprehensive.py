#!/usr/bin/env python3
"""Comprehensive tests for git_ops.py."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

from git_ops import (
    GitHubCLIError,
    GitHubCLINotFoundError,
    add_git_note,
    get_head_sha,
    git_commit,
    main,
    pr_create,
    pr_extract_comments,
    pr_triage,
    run_gh_command,
)


class TestGitOpsComprehensive:
    """Comprehensive tests for git_ops functions."""

    def test_get_head_sha_success(self):
        """Test get_head_sha success."""
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout="abcdef123456789\n")
            sha = get_head_sha(short=True)
            assert sha == "abcdef1"

            sha_full = get_head_sha(short=False)
            assert sha_full == "abcdef123456789"

    def test_get_head_sha_failure(self):
        """Test get_head_sha failure."""
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = Exception("git error")
            assert get_head_sha() is None

    def test_add_git_note_success(self):
        """Test add_git_note success."""
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            assert add_git_note("abc", "note") is True

    def test_add_git_note_failure(self):
        """Test add_git_note failure."""
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=1)
            assert add_git_note("abc", "note") is False

            mock_run.side_effect = Exception("git error")
            assert add_git_note("abc", "note") is False

    @patch("git_ops.prompt_user")
    @patch("git_ops.run_command")
    def test_git_commit_interactive(self, mock_run_cmd, mock_prompt):
        """Test git_commit with user prompts."""
        mock_prompt.side_effect = ["My Context", "My Decision"]
        git_commit()
        assert mock_prompt.call_count == 2
        assert mock_run_cmd.called

    def test_run_gh_command_not_found(self):
        """Test run_gh_command when gh is missing."""
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError()
            with pytest.raises(GitHubCLINotFoundError):
                run_gh_command(["pr", "list"])

    def test_run_gh_command_error(self):
        """Test run_gh_command when gh returns error."""
        with patch("subprocess.run") as mock_run:
            # Create a mock object that behaves like CompletedProcess but can be used for error checking
            # Actually subprocess.run raises CalledProcessError if check=True
            from subprocess import CalledProcessError

            mock_run.side_effect = CalledProcessError(1, ["gh"], stderr="error message")
            with pytest.raises(GitHubCLIError) as exc:
                run_gh_command(["pr", "list"])
            assert "error message" in str(exc.value)

    def test_run_gh_command_success(self):
        """Line 109: run_gh_command success."""
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout="success\n")
            assert run_gh_command(["pr", "list"]) == "success"

    @patch("git_ops.run_gh_command")
    def test_pr_extract_comments(self, mock_gh):
        """Test pr_extract_comments."""
        mock_gh.return_value = json.dumps(
            {
                "title": "Test PR",
                "comments": [{"author": {"login": "user1"}, "body": "comment 1", "url": "url1"}],
                "reviews": [{"author": {"login": "user2"}, "state": "APPROVED", "body": "nice"}],
            }
        )
        pr_extract_comments(123)
        assert mock_gh.called

    @patch("git_ops.run_gh_command")
    def test_pr_create(self, mock_gh):
        """Test pr_create."""
        mock_gh.return_value = "https://github.com/PR/1"
        url = pr_create("Title", "Body")
        assert url == "https://github.com/PR/1"

    @patch("git_ops.get_pr_details")
    @patch("git_ops.prompt_user")
    def test_pr_triage_full(self, mock_prompt, mock_get_details):
        """Test pr_triage with various choices."""
        mock_get_details.return_value = {
            "comments": [
                {"author": {"login": "user1"}, "body": "fix bug", "url": "url1"},
                {"author": {"login": "user2"}, "body": "add story", "url": "url2"},
                {"author": {"login": "user3"}, "body": "skip", "url": "url3"},
                {"author": {"login": "user4"}, "body": "quit", "url": "url4"},
            ],
            "reviews": [],
        }

        mock_prompt.side_effect = ["b", "Fixed Bug", "s", "New Story", "k", "q"]

        with patch.dict("sys.modules", {"artifact_ops": MagicMock(), "doc_ops": MagicMock()}):
            import artifact_ops
            import doc_ops

            pr_triage(123)
            assert artifact_ops.create_artifact.called
            assert doc_ops.create_story.called

    @patch("git_ops.get_pr_details")
    @patch("git_ops.prompt_user")
    def test_pr_triage_no_items(self, mock_prompt, mock_get_details):
        """Test pr_triage with no items."""
        mock_get_details.return_value = {"comments": [], "reviews": []}
        pr_triage(123)
        assert not mock_prompt.called

    def test_pr_triage_import_error(self):
        """Line 157-159: pr_triage with doc_ops ImportData."""
        with patch.dict("sys.modules", {"doc_ops": None}):
            # We need to reload git_ops or patch the import within it
            # Since pr_triage does 'import doc_ops' LOCALLY, patching sys.modules should work.
            with patch("builtins.print") as mock_print:
                pr_triage(123)
                mock_print.assert_any_call(
                    "⚠️ doc_ops module not available. Cannot triage feedback."
                )

    def test_main_cli_dispatch(self):
        """Test main CLI entries."""
        with patch("sys.argv", ["git_ops.py", "commit", "--context", "C", "--decision", "D"]):
            with patch("git_ops.git_commit") as mock_commit:
                main()
                mock_commit.assert_called_once_with("C", "D", "None", "Tests passed")

        with patch("sys.argv", ["git_ops.py", "pr-create", "--title", "T", "--body", "B"]):
            with patch("git_ops.pr_create") as mock_pr:
                main()
                mock_pr.assert_called_once_with("T", "B", "main")

        with patch("sys.argv", ["git_ops.py", "pr-extract", "--pr", "123"]):
            with patch("git_ops.pr_extract_comments") as mock_ext:
                main()
                mock_ext.assert_called_once_with("123")

        with patch("sys.argv", ["git_ops.py", "pr-triage", "--pr", "123"]):
            with patch("git_ops.pr_triage") as mock_tri:
                main()
                mock_tri.assert_called_once_with("123")

    def test_main_cli_errors(self):
        """Test main handle errors."""
        with patch("sys.argv", ["git_ops.py", "pr-create", "--title", "T", "--body", "B"]):
            with patch("git_ops.pr_create", side_effect=GitHubCLINotFoundError("missing")):
                with pytest.raises(SystemExit) as exc:
                    main()
                assert exc.value.code == 1

            with patch("git_ops.pr_create", side_effect=GitHubCLIError("failed")):
                with pytest.raises(SystemExit) as exc:
                    main()
                assert exc.value.code == 1
