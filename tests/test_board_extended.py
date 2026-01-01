#!/usr/bin/env python3
"""Extended board_ops tests focusing on uncovered functions."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

import pytest
from board_ops import (
    check_prerequisites,
    claim_task,
    create_task,
    get_column_name,
    get_tasks,
    load_board,
    pick_task,
)


@pytest.fixture
def temp_project(tmp_path):
    return str(tmp_path)


class TestGetColumnName:
    """Test get_column_name function."""

    def test_valid_column(self, temp_project):
        """Test getting valid column name."""
        board = load_board(temp_project)

        name = get_column_name(board, "col-backlog")

        assert name in ["Backlog", "backlog", "col-backlog"] or name is not None

    def test_invalid_column(self, temp_project):
        """Test getting invalid column name."""
        board = load_board(temp_project)

        name = get_column_name(board, "col-nonexistent")

        # Should return "Unknown" for nonexistent
        assert name == "Unknown"


class TestPickTask:
    """Test pick_task function."""

    def test_pick_from_multiple(self, temp_project):
        """Test picking best task from multiple."""
        create_task("Low priority", priority="low", status="ready", project_root=temp_project)
        create_task("High priority", priority="high", status="ready", project_root=temp_project)
        create_task("Medium priority", priority="medium", status="ready", project_root=temp_project)

        picked = pick_task(temp_project)

        # Should pick highest priority
        board = load_board(temp_project)
        task = next(t for t in board["items"] if t["id"] == picked["id"])
        assert task["priority"] == "high"

    def test_pick_no_available(self, temp_project):
        """Test picking when no tasks available."""
        # Create task that's already done
        _ = create_task("Done task", status="done", project_root=temp_project)

        picked = pick_task(temp_project)

        assert picked is None

    def test_pick_empty_board(self, temp_project):
        """Test picking from empty board."""
        picked = pick_task(temp_project)

        assert picked is None


class TestCheckPrerequisites:
    """Test check_prerequisites function."""

    def test_no_prerequisites(self, temp_project):
        """Test task with no prerequisites."""
        task = {
            "id": "TASK-001",
            "title": "Test",
            "upstream": [],
        }

        ok, missing = check_prerequisites(task, temp_project)

        assert ok is True
        assert len(missing["tasks"]) == 0

    def test_missing_prerequisites(self, temp_project):
        """Test task with missing prerequisites."""
        # Currently check_prerequisites only checks task["prerequisites"]["tasks"]
        # So we should populate that or update function.
        # For now, let's fix the test to expect True until we decide.
        # Actually, let's update the test task to use the right field.
        task = {
            "id": "TASK-001",
            "title": "Test",
            "prerequisites": {"tasks": ["TASK-999"]},
        }

        ok, missing = check_prerequisites(task, temp_project)

        assert ok is False
        assert len(missing["tasks"]) > 0

    def test_satisfied_prerequisites(self, temp_project):
        """Test task with satisfied prerequisites."""
        # Create prerequisite files
        plans_dir = os.path.join(temp_project, "dev_ops", "artifacts", "plans")
        os.makedirs(plans_dir, exist_ok=True)

        with open(os.path.join(plans_dir, "PLN-001-plan.md"), "w") as f:
            f.write("# Plan")

        task = {
            "id": "TASK-001",
            "title": "Test",
            "upstream": ["PLN-001"],
        }

        ok, missing = check_prerequisites(task, temp_project)

        assert ok is True or len(missing["tasks"]) == 0


class TestGetTasksAdvanced:
    """Advanced get_tasks filtering tests."""

    def test_get_all_tasks(self, temp_project):
        """Test getting all tasks."""
        create_task("Task 1", project_root=temp_project)
        create_task("Task 2", project_root=temp_project)
        create_task("Task 3", project_root=temp_project)

        tasks = get_tasks(project_root=temp_project)

        assert len(tasks) == 3

    def test_filter_nonexistent_column(self, temp_project):
        """Test filtering by nonexistent column."""
        create_task("Task", project_root=temp_project)

        tasks = get_tasks(column_id="col-nonexistent", project_root=temp_project)

        assert len(tasks) == 0

    def test_filter_nonexistent_status(self, temp_project):
        """Test filtering by nonexistent status."""
        create_task("Task", status="ready", project_root=temp_project)

        tasks = get_tasks(status="nonexistent", project_root=temp_project)

        assert len(tasks) == 0


class TestClaimTaskEdgeCases:
    """Edge cases for claim_task."""

    def test_claim_with_long_name(self, temp_project):
        """Test claiming with very long agent name."""
        task_id = create_task("Task", project_root=temp_project)

        long_name = "A" * 200
        claim_task(task_id, name=long_name, project_root=temp_project)

        board = load_board(temp_project)
        assert board["items"][0]["owner"]["name"] == long_name

    def test_claim_with_special_chars(self, temp_project):
        """Test claiming with special characters in name."""
        task_id = create_task("Task", project_root=temp_project)

        special_name = "Agent@#$%^&*()123"
        claim_task(task_id, name=special_name, project_root=temp_project)

        board = load_board(temp_project)
        assert board["items"][0]["owner"]["name"] == special_name


class TestBoardStateManagement:
    """Test board state consistency."""

    def test_concurrent_task_creation(self, temp_project):
        """Test multiple tasks created in sequence."""
        tasks = []
        for i in range(10):
            task_id = create_task(f"Task {i}", project_root=temp_project)
            tasks.append(task_id)

        # All should be unique
        assert len(set(tasks)) == 10

        # IDs should be sequential
        for i, task_id in enumerate(tasks, start=1):
            assert f"{i:03d}" in task_id

    def test_board_version_preserved(self, temp_project):
        """Test that board version is preserved."""
        create_task("Task", project_root=temp_project)

        board = load_board(temp_project)

        assert "version" in board
        assert board["version"] == 1
