#!/usr/bin/env python3
"""Comprehensive tests for board_ops.py advanced operations."""

import os
import sys

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))


import pytest
from board_ops import (
    add_downstream,
    add_upstream,
    create_task,
    load_board,
    mark_build,
    record_phase_session,
    replace_task,
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    return str(tmp_path)


class TestUpstream:
    """Test add_upstream function."""

    def test_add_upstream_artifact(self, temp_project):
        """Test adding upstream artifact."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = add_upstream(task_id, "PLN-001", temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert "PLN-001" in task["upstream"]

    def test_add_multiple_upstream(self, temp_project):
        """Test adding multiple upstream artifacts."""
        task_id = create_task(title="Task", project_root=temp_project)

        add_upstream(task_id, "PLN-001", temp_project)
        add_upstream(task_id, "RES-003", temp_project)
        add_upstream(task_id, "DOC-007", temp_project)

        board = load_board(temp_project)
        task = board["items"][0]
        assert len(task["upstream"]) == 3
        assert "PLN-001" in task["upstream"]
        assert "RES-003" in task["upstream"]
        assert "DOC-007" in task["upstream"]

    def test_add_duplicate_upstream(self, temp_project):
        """Test that duplicate upstream is not added."""
        task_id = create_task(title="Task", project_root=temp_project)

        add_upstream(task_id, "PLN-001", temp_project)
        add_upstream(task_id, "PLN-001", temp_project)  # Duplicate

        board = load_board(temp_project)
        task = board["items"][0]
        assert len(task["upstream"]) == 1
        assert task["upstream"] == ["PLN-001"]

    def test_add_upstream_nonexistent_task(self, temp_project):
        """Test adding upstream to nonexistent task."""
        result = add_upstream("TASK-999", "PLN-001", temp_project)
        assert result is False


class TestDownstream:
    """Test add_downstream function."""

    def test_add_downstream_artifact(self, temp_project):
        """Test adding downstream artifact."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = add_downstream(task_id, "PR-042", temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert "PR-042" in task["downstream"]

    def test_add_multiple_downstream(self, temp_project):
        """Test adding multiple downstream artifacts."""
        task_id = create_task(title="Task", project_root=temp_project)

        add_downstream(task_id, "PR-042", temp_project)
        add_downstream(task_id, "VAL-005", temp_project)

        board = load_board(temp_project)
        task = board["items"][0]
        assert len(task["downstream"]) == 2
        assert "PR-042" in task["downstream"]
        assert "VAL-005" in task["downstream"]

    def test_add_duplicate_downstream(self, temp_project):
        """Test that duplicate downstream is not added."""
        task_id = create_task(title="Task", project_root=temp_project)

        add_downstream(task_id, "PR-042", temp_project)
        add_downstream(task_id, "PR-042", temp_project)  # Duplicate

        board = load_board(temp_project)
        task = board["items"][0]
        assert len(task["downstream"]) == 1

    def test_add_downstream_nonexistent_task(self, temp_project):
        """Test adding downstream to nonexistent task."""
        result = add_downstream("TASK-999", "PR-042", temp_project)
        assert result is False


class TestReplaceTask:
    """Test replace_task function."""

    def test_replace_with_subtasks(self, temp_project):
        """Test replacing a task with subtasks."""
        task_id = create_task(title="Big Task", priority="high", project_root=temp_project)

        new_ids = replace_task(task_id, ["Subtask 1", "Subtask 2", "Subtask 3"], temp_project)

        assert len(new_ids) == 3
        board = load_board(temp_project)

        # Original task should be marked done
        original = next(t for t in board["items"] if t["id"] == task_id)
        assert original["status"] == "done"
        assert "[SPLIT]" in original["summary"]

        # New tasks should exist
        new_tasks = [t for t in board["items"] if t["id"] in new_ids]
        assert len(new_tasks) == 3

        # Verify subtasks have correct properties
        for task in new_tasks:
            assert task_id in task["upstream"]  # Linked to original
            assert task["priority"] == "high"  # Inherited priority

    def test_replace_generates_unique_ids(self, temp_project):
        """Test that replace generates unique IDs."""
        create_task(title="Task 1", project_root=temp_project)  # TASK-001
        create_task(title="Task 2", project_root=temp_project)  # TASK-002
        task_id = create_task(title="Task 3", project_root=temp_project)  # TASK-003

        new_ids = replace_task(task_id, ["Sub 1", "Sub 2"], temp_project)

        # Should be TASK-004 and TASK-005
        assert "TASK-004" in new_ids
        assert "TASK-005" in new_ids

    def test_replace_nonexistent_task(self, temp_project):
        """Test replacing nonexistent task."""
        new_ids = replace_task("TASK-999", ["Sub 1"], temp_project)
        assert new_ids == []


class TestPhaseRecording:
    """Test record_phase_session function."""

    def test_record_single_phase(self, temp_project):
        """Test recording a single phase."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = record_phase_session(task_id, "Understand", "session-abc", temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]

        assert "phases" in task
        assert "Understand" in task["phases"]
        assert task["phases"]["Understand"]["sessionId"] == "session-abc"

    def test_record_multiple_phases(self, temp_project):
        """Test recording multiple phases."""
        task_id = create_task(title="Task", project_root=temp_project)

        record_phase_session(task_id, "Understand", "session-1", temp_project)
        record_phase_session(task_id, "Plan", "session-2", temp_project)
        record_phase_session(task_id, "Build", "session-3", temp_project)

        board = load_board(temp_project)
        task = board["items"][0]

        assert len(task["phases"]) == 3
        assert task["phases"]["Understand"]["sessionId"] == "session-1"
        assert task["phases"]["Plan"]["sessionId"] == "session-2"
        assert task["phases"]["Build"]["sessionId"] == "session-3"

    def test_record_phase_updates_existing(self, temp_project):
        """Test that recording same phase updates it."""
        task_id = create_task(title="Task", project_root=temp_project)

        record_phase_session(task_id, "Build", "session-old", temp_project)
        record_phase_session(task_id, "Build", "session-new", temp_project)

        board = load_board(temp_project)
        task = board["items"][0]

        assert task["phases"]["Build"]["sessionId"] == "session-new"

    def test_record_phase_nonexistent_task(self, temp_project):
        """Test recording phase on nonexistent task."""
        result = record_phase_session("TASK-999", "Build", "session", temp_project)
        assert result is False


class TestMarkBuild:
    """Test mark_build function."""

    def test_mark_build_moves_to_column(self, temp_project):
        """Test that mark_build moves task to Build column."""
        task_id = create_task(title="Task", column_id="col-backlog", project_root=temp_project)
        result = mark_build(task_id, temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]
        assert task["columnId"] == "col-build"

    def test_mark_build_nonexistent_task(self, temp_project):
        """Test mark_build on nonexistent task."""
        result = mark_build("TASK-999", temp_project)
        assert result is False


class TestAdvancedIntegration:
    """Integration tests for advanced workflows."""

    def test_full_task_relationship_workflow(self, temp_project):
        """Test building complete task relationship graph."""
        # Create upstream artifacts (simulated)
        task_id = create_task(title="Implement Login", project_root=temp_project)

        # Add upstream dependencies
        add_upstream(task_id, "PLN-001-login-plan", temp_project)
        add_upstream(task_id, "RES-002-auth-research", temp_project)

        # Add downstream outputs
        add_downstream(task_id, "PR-123", temp_project)
        add_downstream(task_id, "VAL-456-login-tests", temp_project)

        board = load_board(temp_project)
        task = board["items"][0]

        assert len(task["upstream"]) == 2
        assert len(task["downstream"]) == 2
        assert "PLN-001-login-plan" in task["upstream"]
        assert "PR-123" in task["downstream"]

    def test_task_split_and_track(self, temp_project):
        """Test splitting task and tracking through phases."""
        # Create complex task
        original_id = create_task(
            title="Complex Feature", priority="high", project_root=temp_project
        )

        # Split into subtasks
        subtask_ids = replace_task(
            original_id, ["Design UI", "Implement Backend", "Write Tests"], temp_project
        )

        # Track first subtask through phases
        task1 = subtask_ids[0]
        record_phase_session(task1, "Understand", "ag-session-1", temp_project)
        record_phase_session(task1, "Plan", "ag-session-2", temp_project)
        mark_build(task1, temp_project)
        record_phase_session(task1, "Build", "ag-session-3", temp_project)

        # Verify tracking
        board = load_board(temp_project)
        task = next(t for t in board["items"] if t["id"] == task1)

        assert task["columnId"] == "col-build"
        assert len(task["phases"]) == 3
        assert "Understand" in task["phases"]
        assert "Plan" in task["phases"]
        assert "Build" in task["phases"]
