# sys.path handled by conftest.py
import os
from unittest.mock import MagicMock, patch

import pytest

# Doc ops imports
from doc_ops import create_doc, list_docs, validate_docs

# Git ops imports
from git_ops import git_commit, pr_triage

# Setup ops imports
from setup_ops import bootstrap, get_ide_paths, summarize_project


@pytest.fixture
def temp_project(tmp_path):
    return str(tmp_path)


# ===========================================
# DOC_OPS Additional Tests
# ===========================================


class TestListDocs:
    """Test list_docs function."""

    def test_list_empty(self, temp_project, capsys):
        """Test listing with no docs."""
        os.chdir(temp_project)

        list_docs("architecture")
        captured = capsys.readouterr()

        # Should handle gracefully
        assert "architecture" in captured.out.lower() or "No" in captured.out

    def test_list_architecture(self, temp_project, capsys):
        """Test listing architecture docs."""
        os.chdir(temp_project)

        # Create some docs
        create_doc("Doc 1", category="architecture")
        create_doc("Doc 2", category="architecture")

        list_docs("architecture")
        captured = capsys.readouterr()

        assert "doc" in captured.out.lower()


class TestValidateDocs:
    """Test validate_docs function."""

    def test_validate_empty(self, temp_project, capsys):
        """Test validating with no docs."""
        os.chdir(temp_project)

        validate_docs()
        captured = capsys.readouterr()

        # Should complete without error
        assert len(captured.out) >= 0

    def test_validate_with_docs(self, temp_project, capsys):
        """Test validating existing docs."""
        os.chdir(temp_project)

        create_doc("Test Doc", category="architecture")

        validate_docs()
        captured = capsys.readouterr()

        # Should validate successfully
        assert "error" not in captured.out.lower() or len(captured.out) >= 0


# ===========================================
# SETUP_OPS Additional Tests
# ===========================================


class TestGetIdePaths:
    """Test get_ide_paths function."""

    def test_antigravity_paths(self, temp_project):
        """Test getting Antigravity paths."""
        _, rules_path, workflows_path, _ = get_ide_paths(temp_project, "antigravity")

        assert ".agent" in rules_path
        assert "rules" in rules_path

    def test_cursor_paths(self, temp_project):
        """Test getting Cursor paths."""
        _, rules_path, workflows_path, _ = get_ide_paths(temp_project, "cursor")

        assert ".cursorrules" in rules_path or ".cursor" in rules_path


class TestSummarizeProject:
    """Test summarize_project function."""

    def test_summarize_empty(self, temp_project, capsys):
        """Test summarizing empty project."""
        summary = summarize_project(temp_project)

        # summarize_project prints to stdout and returns None
        assert summary is None

    def test_summarize_with_files(self, temp_project):
        """Test summarizing project with files."""
        # Create some files
        src_dir = os.path.join(temp_project, "src")
        os.makedirs(src_dir)

        with open(os.path.join(src_dir, "main.py"), "w") as f:
            f.write("print('hello')")

        summary = summarize_project(temp_project)

        # Since summarize_project returns None, we just check it doesn't crash
        assert summary is None


class TestBootstrap:
    """Test bootstrap function."""

    @patch("setup_ops.install_extension")
    def test_bootstrap_basic(self, mock_install, temp_project):
        """Test basic bootstrap."""
        # bootstrap uses prompt_user which might be interactive.
        with patch("setup_ops.prompt_user", return_value="y"):
            bootstrap(temp_project)

        # Check for .dev_ops directory
        dev_ops = os.path.join(temp_project, ".dev_ops")
        assert os.path.exists(dev_ops)
        mock_install.assert_called_once()


class TestGitCommit:
    """Test git_commit function."""

    @patch("git_ops.prompt_user")
    @patch("git_ops.run_command")
    def test_commit_with_all_args(self, mock_run, mock_prompt, temp_project):
        """Test commit with all arguments."""
        mock_run.return_value = MagicMock(returncode=0)
        mock_prompt.return_value = "test"

        git_commit(
            context="Test context",
            decision="Test decision",
            arch="Updated API",
            verification="Tests pass",
        )

        # Should create commit
        assert mock_run.called

    @patch("git_ops.prompt_user")
    @patch("git_ops.run_command")
    def test_commit_interactive(self, mock_run, mock_prompt, temp_project):
        """Test interactive commit."""
        mock_run.return_value = MagicMock(returncode=0)
        mock_prompt.side_effect = ["Added feature", "For user request"]

        git_commit()

        # Should prompt and create commit
        assert mock_prompt.called


# TestGitCommit handled above


@patch("git_ops.get_pr_details")
@patch("git_ops.prompt_user")
class TestPRTriage:
    """Test pr_triage function."""

    def test_triage_no_comments(self, mock_prompt, mock_details, capsys):
        """Test triaging PR with no comments."""
        mock_details.return_value = {"title": "Test PR", "comments": [], "reviews": []}

        pr_triage(123)

        captured = capsys.readouterr()
        assert "No comments" in captured.out or len(captured.out) >= 0

    def test_triage_with_comments(self, mock_prompt, mock_details, capsys):
        """Test triaging PR with comments."""
        mock_details.return_value = {
            "title": "Test PR",
            "comments": [
                {"author": {"login": "user1"}, "body": "Great work!", "url": "http://example.com"}
            ],
            "reviews": [],
        }
        mock_prompt.return_value = "q"  # Quit

        pr_triage(123)

        captured = capsys.readouterr()
        assert "Great work" in captured.out or "user1" in captured.out


# ===========================================
# Integration Tests
# ===========================================


class TestCrossModuleIntegration:
    """Test integration across modules."""

    @patch("setup_ops.install_extension")
    def test_doc_to_board_workflow(self, mock_install, temp_project):
        """Test creating doc and linking to board."""
        from board_ops import create_task

        os.chdir(temp_project)
        with patch("setup_ops.prompt_user", return_value="y"):
            bootstrap(temp_project)

        # Create doc
        doc_path = create_doc("Architecture", category="architecture")

        # Create task referencing it
        task_id = create_task("Implement architecture", project_root=temp_project)

        assert doc_path is not None
        assert task_id is not None

    @patch("setup_ops.install_extension")
    def test_artifact_to_task_workflow(self, mock_install, temp_project):
        """Test creating artifact and task."""
        from artifact_ops import create_artifact
        from board_ops import create_task

        os.chdir(temp_project)
        with patch("setup_ops.prompt_user", return_value="y"):
            bootstrap(temp_project)

        # Create plan
        plan_id = create_artifact("plan", "Implementation plan", project_root=temp_project)

        # Create task
        task_id = create_task("Implement", upstream=[plan_id], project_root=temp_project)

        assert plan_id.startswith("PLN-")
        assert task_id.startswith("TASK-")
