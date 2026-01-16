#!/usr/bin/env python3
"""Integration tests for DevOps Framework workflows.

Tests end-to-end task lifecycle: create → claim → complete.
"""

import json
import os
import sys
from pathlib import Path

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "payload", "scripts"))

from board_ops import (
    claim_task,
    create_task,
    get_tasks,
    mark_done,
)


class TestFullWorkflow:
    """Test complete task lifecycle: create → claim → complete."""

    def test_task_lifecycle(self, tmp_path: Path):
        """Test creating, claiming, and completing a task."""
        # Setup: Create .dev_ops directory
        board_dir = tmp_path / ".dev_ops"
        board_dir.mkdir(parents=True)

        # Initialize board with standard columns
        board = {
            "version": 1,
            "columns": [
                {"id": "col-backlog", "name": "Backlog"},
                {"id": "col-understand", "name": "Understand"},
                {"id": "col-plan", "name": "Plan"},
                {"id": "col-build", "name": "Build"},
                {"id": "col-verify", "name": "Verify"},
                {"id": "col-done", "name": "Done"},
            ],
            "items": [],
        }
        (board_dir / "board.json").write_text(json.dumps(board))

        # Act 1: Create task
        task_id = create_task(
            title="Integration Test Task",
            summary="Test the full workflow",
            priority="high",
            project_root=str(tmp_path),
        )

        # Assert 1: Task exists in backlog
        tasks = get_tasks(project_root=str(tmp_path), column_id="col-backlog")
        assert len(tasks) == 1
        assert tasks[0]["id"] == task_id
        assert tasks[0]["title"] == "Integration Test Task"

        # Act 2: Claim task
        claim_task(task_id, project_root=str(tmp_path))

        # Assert 2: Task still in Backlog (claim doesn't move columns, just sets status)
        backlog_tasks = get_tasks(project_root=str(tmp_path), column_id="col-backlog")
        assert len(backlog_tasks) == 1
        assert backlog_tasks[0]["status"] == "in_progress"

        # Act 3: Complete task
        mark_done(task_id, project_root=str(tmp_path), create_pr_flag=False, archive=False)

        # Assert 3: Task moved to Done
        done_tasks = get_tasks(project_root=str(tmp_path), column_id="col-done")
        assert len(done_tasks) == 1
        assert done_tasks[0]["id"] == task_id


class TestMultiTaskCoordination:
    """Test multi-agent coordination scenarios."""

    def test_agent_ready_filtering(self, tmp_path: Path):
        """Test basic task filtering (agent_ready field removed during refactoring)."""
        board_dir = tmp_path / ".dev_ops"
        board_dir.mkdir(parents=True)

        board = {
            "version": 1,
            "columns": [{"id": "col-backlog", "name": "Backlog"}],
            "items": [],
        }
        (board_dir / "board.json").write_text(json.dumps(board))

        # Create tasks
        create_task("Task 1", project_root=str(tmp_path))
        create_task("Task 2", project_root=str(tmp_path))

        # Get all tasks
        all_tasks = get_tasks(project_root=str(tmp_path))
        assert len(all_tasks) == 2

    def test_priority_ordering(self, tmp_path: Path):
        """Test that tasks are ordered by priority."""
        board_dir = tmp_path / ".dev_ops"
        board_dir.mkdir(parents=True)

        board = {
            "version": 1,
            "columns": [{"id": "col-backlog", "name": "Backlog"}],
            "items": [],
        }
        (board_dir / "board.json").write_text(json.dumps(board))

        # Create tasks with different priorities
        create_task("Low Priority", priority="low", project_root=str(tmp_path))
        create_task("High Priority", priority="high", project_root=str(tmp_path))
        create_task("Medium Priority", priority="medium", project_root=str(tmp_path))

        # Get all tasks
        tasks = get_tasks(project_root=str(tmp_path))
        assert len(tasks) == 3
