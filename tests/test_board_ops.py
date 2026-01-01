#!/usr/bin/env python3
"""Tests for board_ops.py."""

import os

# Add scripts to path
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

from board_ops import (
    add_downstream,
    add_upstream,
    check_prerequisites,
    claim_task,
    create_task,
    get_board_path,
    load_board,
    mark_done,
    move_to_column,
    pick_task,
    save_board,
)


@pytest.fixture
def temp_project():
    """Create a temporary project directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create the dev_ops directory
        dev_ops_dir = os.path.join(tmpdir, "dev_ops")
        os.makedirs(dev_ops_dir)
        yield tmpdir


class TestBoardOperations:
    """Test basic board operations."""

    def test_get_board_path(self, temp_project):
        """Test board path generation."""
        path = get_board_path(temp_project)
        assert path.endswith("dev_ops/board.json")
        assert temp_project in path

    def test_load_empty_board(self, temp_project):
        """Test loading a non-existent board returns default structure."""
        board = load_board(temp_project)
        assert board["version"] == 1
        assert len(board["columns"]) == 6  # 6 default columns (Backlog to Done)
        assert board["items"] == []

    def test_save_and_load_board(self, temp_project):
        """Test saving and loading a board."""
        test_board = {
            "version": 1,
            "columns": [{"id": "col-test", "name": "Test", "position": 1}],
            "items": [{"id": "TASK-001", "title": "Test", "columnId": "col-test"}],
        }
        save_board(test_board, temp_project)
        loaded = load_board(temp_project)
        assert loaded["items"] == test_board["items"]


class TestTaskOperations:
    """Test task CRUD operations."""

    def test_create_task(self, temp_project):
        """Test creating a task."""
        task_id = create_task(
            title="Test Task",
            summary="A test task",
            priority="high",
            project_root=temp_project,
        )
        assert task_id == "TASK-001"

        # Verify task was saved
        board = load_board(temp_project)
        assert len(board["items"]) == 1
        task = board["items"][0]
        assert task["id"] == "TASK-001"
        assert task["title"] == "Test Task"
        assert task["priority"] == "high"
        # agentReady field removed during refactoring
        assert task["columnId"] == "col-backlog"

    def test_create_multiple_tasks(self, temp_project):
        """Test creating multiple tasks generates unique IDs."""
        id1 = create_task(title="Task 1", project_root=temp_project)
        id2 = create_task(title="Task 2", project_root=temp_project)
        id3 = create_task(title="Task 3", project_root=temp_project)

        assert id1 == "TASK-001"
        assert id2 == "TASK-002"
        assert id3 == "TASK-003"

    def test_get_tasks_filtered(self, temp_project):
        """Test filtering tasks by priority."""
        create_task(title="High Priority", priority="high", project_root=temp_project)
        create_task(title="Low Priority", priority="low", project_root=temp_project)

        # Test filtering by priority
        board = load_board(temp_project)
        high_tasks = [t for t in board["items"] if t.get("priority") == "high"]
        assert len(high_tasks) == 1
        assert high_tasks[0]["title"] == "High Priority"

    def test_mark_done(self, temp_project):
        """Test marking a task as done."""
        task_id = create_task(title="To Complete", project_root=temp_project)
        result = mark_done(
            task_id, project_root=temp_project, archive=False
        )  # Don't archive for test

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert task["columnId"] == "col-done"

    def test_move_to_column(self, temp_project):
        """Test moving a task to a specific column."""
        task_id = create_task(title="To Move", project_root=temp_project)
        result = move_to_column(task_id, "col-inprogress", temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert task["columnId"] == "col-inprogress"


class TestArtifactLinking:
    """Test artifact linking operations."""

    def test_add_upstream(self, temp_project):
        """Test adding an upstream dependency to a task."""
        task_id = create_task(title="With Upstream", project_root=temp_project)
        result = add_upstream(task_id, "RES-001", temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert "RES-001" in task["upstream"]

    def test_add_downstream(self, temp_project):
        """Test adding a downstream dependency to a task."""
        task_id = create_task(title="With Downstream", project_root=temp_project)
        result = add_downstream(task_id, "PLN-001", temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert "PLN-001" in task["downstream"]

    def test_add_upstream_duplicate(self, temp_project):
        """Test that duplicate upstreams are not added."""
        task_id = create_task(title="With Upstream", project_root=temp_project)
        add_upstream(task_id, "RES-001", temp_project)
        add_upstream(task_id, "RES-001", temp_project)  # Duplicate

        board = load_board(temp_project)
        task = board["items"][0]
        assert task["upstream"].count("RES-001") == 1


class TestPrerequisites:
    """Test prerequisite checking."""

    def test_check_prerequisites_empty(self, temp_project):
        """Test that empty prerequisites pass."""
        task = {"prerequisites": {"tasks": [], "approvals": []}}
        ok, missing = check_prerequisites(task, temp_project)
        assert ok is True
        assert missing["tasks"] == []

    def test_check_prerequisites_missing_task(self, temp_project):
        """Test that missing prerequisite tasks are detected."""
        task = {
            "prerequisites": {
                "tasks": ["TASK-999"],
                "approvals": [],
            }
        }
        ok, missing = check_prerequisites(task, temp_project)
        assert ok is False
        assert "TASK-999" in missing["tasks"]

    def test_check_prerequisites_completed_task(self, temp_project):
        """Test checking prerequisites when prerequisite task is completed."""
        # Create and complete a prerequisite task
        prereq_id = create_task(title="Prereq", project_root=temp_project)
        mark_done(
            prereq_id, project_root=temp_project, archive=False
        )  # Don't archive so we can check it

        # Create a task that depends on the prereq
        task = {
            "prerequisites": {
                "tasks": [prereq_id],
                "approvals": [],
            }
        }
        ok, missing = check_prerequisites(task, temp_project)
        assert ok is True


class TestTaskPicking:
    """Test task picking and claiming."""

    def test_pick_task_priority_order(self, temp_project):
        """Test that pick_task selects highest priority first."""
        create_task(title="Low", priority="low", status="ready", project_root=temp_project)
        create_task(title="High", priority="high", status="ready", project_root=temp_project)
        create_task(
            title="Medium",
            priority="medium",
            status="ready",
            project_root=temp_project,
        )

        picked = pick_task(project_root=temp_project)
        assert picked is not None
        assert picked["title"] == "High"

    def test_claim_task_with_unmet_prerequisites(self, temp_project):
        """Test that claiming a task with unmet prerequisites fails."""
        # Create a task
        task_id = create_task(
            title="Blocked Task",
            project_root=temp_project,
        )
        # Manually add prerequisites
        board = load_board(temp_project)
        board["items"][0]["prerequisites"] = {"tasks": ["TASK-999"], "approvals": []}
        save_board(board, temp_project)

        result = claim_task(task_id, force=False, project_root=temp_project)
        assert result is False

    def test_claim_task_force(self, temp_project):
        """Test that force=True bypasses prerequisite check."""
        task_id = create_task(
            title="Blocked Task",
            project_root=temp_project,
        )
        # Manually add prerequisites
        board = load_board(temp_project)
        board["items"][0]["prerequisites"] = {"tasks": ["TASK-999"], "approvals": []}
        save_board(board, temp_project)

        result = claim_task(task_id, force=True, project_root=temp_project)
        assert result is True
