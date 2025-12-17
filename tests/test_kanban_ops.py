#!/usr/bin/env python3
"""Tests for kanban_ops.py."""

import os
import tempfile
import pytest

# Add scripts to path
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from kanban_ops import (
    get_board_path,
    load_board,
    save_board,
    create_task,
    get_tasks,
    link_artifact,
    mark_done,
    pick_task,
    claim_task,
    check_prerequisites,
)


@pytest.fixture
def temp_project():
    """Create a temporary project directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create the dev_ops/kanban directory
        kanban_dir = os.path.join(tmpdir, "dev_ops", "kanban")
        os.makedirs(kanban_dir)
        yield tmpdir


class TestBoardOperations:
    """Test basic board operations."""

    def test_get_board_path(self, temp_project):
        """Test board path generation."""
        path = get_board_path(temp_project)
        assert path.endswith("dev_ops/kanban/board.json")
        assert temp_project in path

    def test_load_empty_board(self, temp_project):
        """Test loading a non-existent board returns empty structure."""
        board = load_board(temp_project)
        assert board["version"] == 1
        assert board["columns"] == []
        assert board["items"] == []

    def test_save_and_load_board(self, temp_project):
        """Test saving and loading a board."""
        test_board = {
            "version": 1,
            "columns": [{"id": "todo", "name": "To Do"}],
            "items": [{"id": "TASK-001", "title": "Test"}],
        }
        save_board(test_board, temp_project)
        loaded = load_board(temp_project)
        assert loaded == test_board


class TestTaskOperations:
    """Test task CRUD operations."""

    def test_create_task(self, temp_project):
        """Test creating a task."""
        task_id = create_task(
            title="Test Task",
            description="A test task",
            priority="high",
            agent_ready=True,
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
        assert task["agentReady"] is True
        assert "prerequisites" in task
        assert "completion_criteria" in task

    def test_create_multiple_tasks(self, temp_project):
        """Test creating multiple tasks generates unique IDs."""
        id1 = create_task(title="Task 1", project_root=temp_project)
        id2 = create_task(title="Task 2", project_root=temp_project)
        id3 = create_task(title="Task 3", project_root=temp_project)

        assert id1 == "TASK-001"
        assert id2 == "TASK-002"
        assert id3 == "TASK-003"

    def test_get_tasks_filtered(self, temp_project):
        """Test filtering tasks by status and agent_ready."""
        create_task(title="Ready", agent_ready=True, project_root=temp_project)
        create_task(title="Not Ready", agent_ready=False, project_root=temp_project)

        ready_tasks = get_tasks(project_root=temp_project, agent_ready=True)
        assert len(ready_tasks) == 1
        assert ready_tasks[0]["title"] == "Ready"

    def test_mark_done(self, temp_project):
        """Test marking a task as done."""
        task_id = create_task(title="To Complete", project_root=temp_project)
        result = mark_done(task_id, project_root=temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert task["status"] == "done"


class TestArtifactLinking:
    """Test artifact linking operations."""

    def test_link_artifact(self, temp_project):
        """Test linking an artifact to a task."""
        task_id = create_task(title="With Artifact", project_root=temp_project)
        result = link_artifact(task_id, "PLAN-001", "output", temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert len(task["artifacts"]) == 1
        assert task["artifacts"][0]["id"] == "PLAN-001"
        assert task["artifacts"][0]["relation"] == "output"

    def test_link_artifact_duplicate(self, temp_project):
        """Test that duplicate artifacts are not added."""
        task_id = create_task(title="With Artifact", project_root=temp_project)
        link_artifact(task_id, "PLAN-001", "output", temp_project)
        link_artifact(task_id, "PLAN-001", "output", temp_project)  # Duplicate

        board = load_board(temp_project)
        task = board["items"][0]
        assert len(task["artifacts"]) == 1  # Should still be 1


class TestPrerequisites:
    """Test prerequisite checking."""

    def test_check_prerequisites_empty(self, temp_project):
        """Test that empty prerequisites pass."""
        task = {"prerequisites": {"tasks": [], "artifacts": [], "approvals": []}}
        ok, missing = check_prerequisites(task, temp_project)
        assert ok is True
        assert missing["tasks"] == []
        assert missing["artifacts"] == []

    def test_check_prerequisites_missing_task(self, temp_project):
        """Test that missing prerequisite tasks are detected."""
        # Create a task that depends on non-existent TASK-999
        task = {
            "prerequisites": {
                "tasks": ["TASK-999"],
                "artifacts": [],
                "approvals": [],
            }
        }
        ok, missing = check_prerequisites(task, temp_project)
        assert ok is False
        assert "TASK-999" in missing["tasks"]

    def test_check_prerequisites_completed_task(self, temp_project):
        """Test that completed prerequisite tasks pass."""
        # Create and complete a prerequisite task
        prereq_id = create_task(title="Prereq", project_root=temp_project)
        mark_done(prereq_id, project_root=temp_project)

        # Create a task that depends on the prereq
        task = {
            "prerequisites": {
                "tasks": [prereq_id],
                "artifacts": [],
                "approvals": [],
            }
        }
        ok, missing = check_prerequisites(task, temp_project)
        assert ok is True


class TestTaskPicking:
    """Test task picking and claiming."""

    def test_pick_task_priority_order(self, temp_project):
        """Test that pick_task selects highest priority first."""
        create_task(
            title="Low", priority="low", agent_ready=True, project_root=temp_project
        )
        create_task(
            title="High", priority="high", agent_ready=True, project_root=temp_project
        )
        create_task(
            title="Medium",
            priority="medium",
            agent_ready=True,
            project_root=temp_project,
        )

        picked = pick_task(project_root=temp_project)
        assert picked["title"] == "High"

    def test_claim_task_with_unmet_prerequisites(self, temp_project):
        """Test that claiming a task with unmet prerequisites fails."""
        # Create a task with unmet prerequisites
        task_id = create_task(
            title="Blocked Task",
            prerequisites={"tasks": ["TASK-999"], "artifacts": [], "approvals": []},
            agent_ready=True,
            project_root=temp_project,
        )

        result = claim_task(task_id, force=False, project_root=temp_project)
        assert result is False

    def test_claim_task_force(self, temp_project):
        """Test that force=True bypasses prerequisite check."""
        task_id = create_task(
            title="Blocked Task",
            prerequisites={"tasks": ["TASK-999"], "artifacts": [], "approvals": []},
            agent_ready=True,
            project_root=temp_project,
        )

        result = claim_task(task_id, force=True, project_root=temp_project)
        assert result is True
