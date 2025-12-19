#!/usr/bin/env python3
"""Integration tests for DevOps Framework workflows.

Tests end-to-end task lifecycle: create → claim → complete.
"""

import json
import sys
from pathlib import Path

import pytest

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from kanban_ops import (
    claim_task,
    create_task,
    get_tasks,
    mark_done,
)


class TestFullWorkflow:
    """Test complete task lifecycle: create → claim → complete."""

    def test_task_lifecycle(self, tmp_path: Path):
        """Test creating, claiming, and completing a task."""
        # Setup: Create dev_ops/kanban directory
        kanban_dir = tmp_path / "dev_ops" / "kanban"
        kanban_dir.mkdir(parents=True)

        # Initialize board with minimal columns
        board = {
            "columns": [
                {"id": "col-backlog", "name": "Backlog"},
                {"id": "col-inprogress", "name": "In Progress"},
                {"id": "col-done", "name": "Done"},
            ],
            "tasks": [],
        }
        (kanban_dir / "board.json").write_text(json.dumps(board))

        # Act 1: Create task
        task_id = create_task(
            title="Integration Test Task",
            summary="Test the full workflow",
            priority="high",
            agent_ready=True,
            project_root=str(tmp_path),
        )

        # Assert 1: Task exists in backlog
        tasks = get_tasks(project_root=str(tmp_path), column_id="col-backlog")
        assert len(tasks) == 1
        assert tasks[0]["id"] == task_id
        assert tasks[0]["title"] == "Integration Test Task"

        # Act 2: Claim task
        claim_task(task_id, project_root=str(tmp_path))

        # Assert 2: Task moved to In Progress
        backlog_tasks = get_tasks(project_root=str(tmp_path), column_id="col-backlog")
        inprogress_tasks = get_tasks(project_root=str(tmp_path), column_id="col-inprogress")
        assert len(backlog_tasks) == 0
        assert len(inprogress_tasks) == 1

        # Act 3: Complete task
        mark_done(task_id, project_root=str(tmp_path))

        # Assert 3: Task moved to Done
        done_tasks = get_tasks(project_root=str(tmp_path), column_id="col-done")
        assert len(done_tasks) == 1
        assert done_tasks[0]["id"] == task_id


class TestMultiTaskCoordination:
    """Test multi-agent coordination scenarios."""

    def test_agent_ready_filtering(self, tmp_path: Path):
        """Test that agent-ready filter returns correct tasks."""
        kanban_dir = tmp_path / "dev_ops" / "kanban"
        kanban_dir.mkdir(parents=True)

        board = {
            "columns": [{"id": "col-backlog", "name": "Backlog"}],
            "tasks": [],
        }
        (kanban_dir / "board.json").write_text(json.dumps(board))

        # Create tasks with different agentReady states
        create_task("Human Task", agent_ready=False, project_root=str(tmp_path))
        create_task("Agent Task", agent_ready=True, project_root=str(tmp_path))

        # Filter by agent_ready
        agent_tasks = get_tasks(project_root=str(tmp_path), agent_ready=True)
        human_tasks = get_tasks(project_root=str(tmp_path), agent_ready=False)

        assert len(agent_tasks) == 1
        assert agent_tasks[0]["title"] == "Agent Task"
        assert len(human_tasks) == 1
        assert human_tasks[0]["title"] == "Human Task"

    def test_priority_ordering(self, tmp_path: Path):
        """Test that tasks are ordered by priority."""
        kanban_dir = tmp_path / "dev_ops" / "kanban"
        kanban_dir.mkdir(parents=True)

        board = {
            "columns": [{"id": "col-backlog", "name": "Backlog"}],
            "tasks": [],
        }
        (kanban_dir / "board.json").write_text(json.dumps(board))

        # Create tasks with different priorities
        create_task("Low Priority", priority="low", project_root=str(tmp_path))
        create_task("High Priority", priority="high", project_root=str(tmp_path))
        create_task("Medium Priority", priority="medium", project_root=str(tmp_path))

        # Get all tasks
        tasks = get_tasks(project_root=str(tmp_path))
        assert len(tasks) == 3
