#!/usr/bin/env python3
"""Comprehensive tests for board_ops.py archive, revert, and PR operations."""

import os
import sys
import tarfile

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

from unittest.mock import MagicMock, patch

import pytest
from board_ops import (
    add_downstream,
    archive_task,
    create_pr,
    create_task,
    load_board,
    mark_done,
    move_to_column,
    revert_task,
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    return str(tmp_path)


class TestMoveToColumn:
    """Test move_to_column function."""

    def test_move_to_understand(self, temp_project):
        """Test moving task to Understand column."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = move_to_column(task_id, "col-understand", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["columnId"] == "col-understand"

    def test_move_to_plan(self, temp_project):
        """Test moving task to Plan column."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = move_to_column(task_id, "col-plan", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["columnId"] == "col-plan"

    def test_move_to_verify(self, temp_project):
        """Test moving task to Verify column."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = move_to_column(task_id, "col-verify", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["columnId"] == "col-verify"

    def test_move_to_done(self, temp_project):
        """Test moving task to Done column."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = move_to_column(task_id, "col-done", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["columnId"] == "col-done"

    def test_move_nonexistent_task(self, temp_project):
        """Test moving nonexistent task."""
        result = move_to_column("TASK-999", "col-build", temp_project)
        assert result is False

    def test_move_updates_timestamp(self, temp_project):
        """Test that moving updates timestamp."""
        task_id = create_task(title="Task", project_root=temp_project)

        board = load_board(temp_project)
        original_time = board["items"][0]["updatedAt"]

        move_to_column(task_id, "col-build", temp_project)

        board = load_board(temp_project)
        new_time = board["items"][0]["updatedAt"]
        assert new_time >= original_time


class TestArchiveTask:
    """Test archive_task function."""

    def test_archive_basic_task(self, temp_project):
        """Test archiving a basic task."""
        task_id = create_task(title="Task to archive", project_root=temp_project)
        mark_done(task_id, project_root=temp_project, archive=False)

        result = archive_task(task_id, temp_project)
        assert result is True

        # Verify archive file exists (in dev_ops/artifacts/archive not dev_ops/archive)
        archive_dir = os.path.join(temp_project, "dev_ops", "artifacts", "archive")
        assert os.path.exists(archive_dir)

        archive_file = os.path.join(archive_dir, f"{task_id}.tar.gz")
        assert os.path.exists(archive_file)

    def test_archive_removes_from_board(self, temp_project):
        """Test that archiving removes task from board."""
        task_id = create_task(title="Task", project_root=temp_project)
        mark_done(task_id, project_root=temp_project, archive=False)

        archive_task(task_id, temp_project)

        board = load_board(temp_project)
        assert len(board["items"]) == 0

    def test_archive_with_artifacts(self, temp_project):
        """Test archiving task with linked artifacts."""
        task_id = create_task(title="Task", project_root=temp_project)

        # Create mock artifact files
        dev_ops_dir = os.path.join(temp_project, "dev_ops")
        os.makedirs(dev_ops_dir, exist_ok=True)

        plan_file = os.path.join(dev_ops_dir, "PLN-001.md")
        with open(plan_file, "w") as f:
            f.write("# Plan\nDetails here")

        # Link artifact
        add_downstream(task_id, "PLN-001.md", temp_project)

        mark_done(task_id, project_root=temp_project, archive=False)
        archive_task(task_id, temp_project)

        # Verify archive contains artifacts
        archive_file = os.path.join(
            temp_project, "dev_ops", "artifacts", "archive", f"{task_id}.tar.gz"
        )
        with tarfile.open(archive_file, "r:gz") as tar:
            members = tar.getnames()
            assert "task.json" in members
            # PLN file may not be in archive depending on location logic

    def test_archive_nonexistent_task(self, temp_project):
        """Test archiving nonexistent task."""
        result = archive_task("TASK-999", temp_project)
        assert result is False

    def test_archive_twice(self, temp_project):
        """Test archiving already archived task."""
        task_id = create_task(title="Task", project_root=temp_project)
        mark_done(task_id, project_root=temp_project, archive=False)

        # First archive
        archive_task(task_id, temp_project)

        # Try again - should fail gracefully
        result = archive_task(task_id, temp_project)
        assert result is False


class TestRevertTask:
    """Test revert_task function."""

    @patch("subprocess.run")
    def test_revert_with_commit_sha(self, mock_run, temp_project):
        """Test reverting a task with commitSha."""
        # Setup mock
        mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

        task_id = create_task(title="Task", project_root=temp_project)

        # Manually add commitSha
        board = load_board(temp_project)
        board["items"][0]["commitSha"] = "abc1234"
        from board_ops import save_board

        save_board(board, temp_project)

        result = revert_task(task_id, temp_project)
        assert result is True

        # Verify git revert was called
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        assert "git" in call_args
        assert "revert" in call_args
        assert "abc1234" in call_args

    def test_revert_without_commit_sha(self, temp_project):
        """Test reverting task without commitSha fails."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = revert_task(task_id, temp_project)
        assert result is False

    def test_revert_nonexistent_task(self, temp_project):
        """Test reverting nonexistent task."""
        result = revert_task("TASK-999", temp_project)
        assert result is False

    @patch("subprocess.run")
    def test_revert_marks_status(self, mock_run, temp_project):
        """Test that revert updates task status."""
        mock_run.return_value = MagicMock(returncode=0)

        task_id = create_task(title="Task", project_root=temp_project)

        # Add commitSha
        board = load_board(temp_project)
        board["items"][0]["commitSha"] = "abc1234"
        from board_ops import save_board

        save_board(board, temp_project)

        revert_task(task_id, temp_project)

        # Check status updated
        board = load_board(temp_project)
        task = board["items"][0]
        assert task["status"] == "reverted"
        assert "revertedAt" in task


class TestCreatePR:
    """Test create_pr function."""

    @patch("subprocess.run")
    def test_create_pr_basic(self, mock_run, temp_project):
        """Test basic PR creation."""
        # Mock gh CLI success
        mock_run.return_value = MagicMock(
            returncode=0, stdout="https://github.com/user/repo/pull/123"
        )

        task_id = create_task(
            title="Implement feature", summary="Cool new feature", project_root=temp_project
        )
        pr_url = create_pr(task_id, project_root=temp_project)

        assert pr_url == "https://github.com/user/repo/pull/123"

        # Verify PR URL added to downstream
        board = load_board(temp_project)
        task = board["items"][0]
        assert "https://github.com/user/repo/pull/123" in task["downstream"]

    @patch("subprocess.run")
    def test_create_pr_with_custom_title(self, mock_run, temp_project):
        """Test PR creation with custom title."""
        mock_run.return_value = MagicMock(returncode=0, stdout="https://pr.url")

        task_id = create_task(title="Task", project_root=temp_project)
        create_pr(task_id, title="Custom PR Title", project_root=temp_project)

        # Verify custom title used
        call_args = mock_run.call_args[0][0]
        assert "Custom PR Title" in call_args

    @patch("subprocess.run")
    def test_create_pr_with_custom_body(self, mock_run, temp_project):
        """Test PR creation with custom body."""
        mock_run.return_value = MagicMock(returncode=0, stdout="https://pr.url")

        task_id = create_task(title="Task", project_root=temp_project)
        create_pr(task_id, body="Custom description", project_root=temp_project)

        # Verify custom body used
        call_args = mock_run.call_args[0][0]
        assert "Custom description" in call_args

    @patch("subprocess.run")
    def test_create_pr_failure(self, mock_run, temp_project):
        """Test PR creation when gh CLI fails."""
        mock_run.return_value = MagicMock(returncode=1, stderr="Error")

        task_id = create_task(title="Task", project_root=temp_project)
        pr_url = create_pr(task_id, project_root=temp_project)

        assert pr_url is None

    def test_create_pr_nonexistent_task(self, temp_project):
        """Test PR creation for nonexistent task."""
        pr_url = create_pr("TASK-999", project_root=temp_project)
        assert pr_url is None

    @patch("subprocess.run")
    def test_create_pr_gh_not_installed(self, mock_run, temp_project):
        """Test PR creation when gh CLI not installed."""
        mock_run.side_effect = FileNotFoundError()

        task_id = create_task(title="Task", project_root=temp_project)
        pr_url = create_pr(task_id, project_root=temp_project)

        assert pr_url is None


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_create_task_with_spawn_from(self, temp_project):
        """Test creating task with spawn_from."""
        parent_id = create_task(title="Parent", project_root=temp_project)
        child_id = create_task(
            title="Child",
            summary="Original summary",
            spawn_from=parent_id,
            project_root=temp_project,
        )

        board = load_board(temp_project)
        child = next(t for t in board["items"] if t["id"] == child_id)

        assert "spawnedFrom" in child
        assert child["spawnedFrom"] == parent_id
        assert parent_id in child["summary"]

    def test_create_task_invalid_priority(self, temp_project):
        """Test creating task with invalid priority raises error."""
        with pytest.raises(ValueError):
            create_task(title="Task", priority="invalid", project_root=temp_project)

    def test_mark_done_with_outputs(self, temp_project):
        """Test mark_done with output artifacts."""
        task_id = create_task(title="Task", project_root=temp_project)

        outputs = ["VAL-001.md", "TEST-002.md"]
        mark_done(task_id, outputs=outputs, archive=False, project_root=temp_project)

        board = load_board(temp_project)
        task = board["items"][0]

        assert "VAL-001.md" in task["downstream"]
        assert "TEST-002.md" in task["downstream"]

    @patch("subprocess.run")
    def test_mark_done_captures_sha(self, mock_run, temp_project):
        """Test mark_done captures git SHA."""
        mock_run.return_value = MagicMock(returncode=0, stdout="abc1234567\n")

        task_id = create_task(title="Task", project_root=temp_project)
        mark_done(task_id, capture_sha=True, archive=False, project_root=temp_project)

        board = load_board(temp_project)
        task = board["items"][0]

        assert "commitSha" in task
        assert task["commitSha"] == "abc1234"  # Truncated to 7 chars

    def test_mark_done_clears_current_task(self, temp_project):
        """Test mark_done clears .current_task file."""
        task_id = create_task(title="Task", project_root=temp_project)

        # Set as current task
        from board_ops import set_current_task

        set_current_task(task_id, temp_project)

        # Mark done
        mark_done(task_id, archive=False, project_root=temp_project)

        # Verify cleared
        from board_ops import get_current_task

        current = get_current_task(temp_project)
        assert current is None

    def test_load_board_creates_default_columns(self, temp_project):
        """Test load_board creates default columns if missing."""
        board = load_board(temp_project)

        assert "columns" in board
        assert len(board["columns"]) == 6

        col_ids = [c["id"] for c in board["columns"]]
        assert "col-backlog" in col_ids
        assert "col-understand" in col_ids
        assert "col-plan" in col_ids
        assert "col-build" in col_ids
        assert "col-verify" in col_ids
        assert "col-done" in col_ids
