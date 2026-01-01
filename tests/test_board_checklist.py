#!/usr/bin/env python3
"""Comprehensive tests for board_ops.py checklist operations."""

import os
import sys

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

import pytest
from board_ops import (
    checklist_add,
    checklist_complete,
    checklist_list,
    create_task,
    load_board,
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    return str(tmp_path)


class TestChecklistAdd:
    """Test checklist_add function."""

    def test_add_single_item(self, temp_project):
        """Test adding a single checklist item."""
        task_id = create_task(title="Task with checklist", project_root=temp_project)
        result = checklist_add(task_id, "Complete documentation", temp_project)

        assert result is True

        board = load_board(temp_project)
        task = board["items"][0]
        assert "checklist" in task
        assert len(task["checklist"]) == 1
        assert task["checklist"][0]["text"] == "Complete documentation"
        assert task["checklist"][0]["done"] is False

    def test_add_multiple_items(self, temp_project):
        """Test adding multiple checklist items."""
        task_id = create_task(title="Task", project_root=temp_project)

        checklist_add(task_id, "Item 1", temp_project)
        checklist_add(task_id, "Item 2", temp_project)
        checklist_add(task_id, "Item 3", temp_project)

        board = load_board(temp_project)
        task = board["items"][0]
        assert len(task["checklist"]) == 3
        assert task["checklist"][0]["text"] == "Item 1"
        assert task["checklist"][1]["text"] == "Item 2"
        assert task["checklist"][2]["text"] == "Item 3"

    def test_add_to_nonexistent_task(self, temp_project):
        """Test adding to a task that doesn't exist."""
        result = checklist_add("TASK-999", "Item", temp_project)
        assert result is False

    def test_updates_timestamp(self, temp_project):
        """Test that adding item updates task timestamp."""
        task_id = create_task(title="Task", project_root=temp_project)

        board = load_board(temp_project)
        original_time = board["items"][0]["updatedAt"]

        checklist_add(task_id, "New item", temp_project)

        board = load_board(temp_project)
        new_time = board["items"][0]["updatedAt"]
        assert new_time >= original_time  # Should be updated


class TestChecklistComplete:
    """Test checklist_complete function."""

    def test_complete_first_item(self, temp_project):
        """Test completing the first checklist item."""
        task_id = create_task(title="Task", project_root=temp_project)
        checklist_add(task_id, "Item 1", temp_project)
        checklist_add(task_id, "Item 2", temp_project)

        result = checklist_complete(task_id, 0, temp_project)
        assert result is True

        board = load_board(temp_project)
        task = board["items"][0]
        assert task["checklist"][0]["done"] is True
        assert task["checklist"][1]["done"] is False

    def test_complete_multiple_items(self, temp_project):
        """Test completing multiple items."""
        task_id = create_task(title="Task", project_root=temp_project)
        checklist_add(task_id, "Item 1", temp_project)
        checklist_add(task_id, "Item 2", temp_project)
        checklist_add(task_id, "Item 3", temp_project)

        checklist_complete(task_id, 0, temp_project)
        checklist_complete(task_id, 2, temp_project)

        board = load_board(temp_project)
        task = board["items"][0]
        assert task["checklist"][0]["done"] is True
        assert task["checklist"][1]["done"] is False
        assert task["checklist"][2]["done"] is True

    def test_complete_invalid_index(self, temp_project):
        """Test completing with invalid index."""
        task_id = create_task(title="Task", project_root=temp_project)
        checklist_add(task_id, "Item 1", temp_project)

        # Index too high
        result = checklist_complete(task_id, 5, temp_project)
        assert result is False

        # Negative index
        result = checklist_complete(task_id, -1, temp_project)
        assert result is False

    def test_complete_nonexistent_task(self, temp_project):
        """Test completing item on nonexistent task."""
        result = checklist_complete("TASK-999", 0, temp_project)
        assert result is False

    def test_complete_empty_checklist(self, temp_project):
        """Test completing when task has no checklist."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = checklist_complete(task_id, 0, temp_project)
        assert result is False


class TestChecklistList:
    """Test checklist_list function."""

    def test_list_populated_checklist(self, temp_project):
        """Test listing a populated checklist."""
        task_id = create_task(title="Task", project_root=temp_project)
        checklist_add(task_id, "Item 1", temp_project)
        checklist_add(task_id, "Item 2", temp_project)
        checklist_complete(task_id, 0, temp_project)

        items = checklist_list(task_id, temp_project)

        assert len(items) == 2
        assert items[0]["text"] == "Item 1"
        assert items[0]["done"] is True
        assert items[1]["text"] == "Item 2"
        assert items[1]["done"] is False

    def test_list_empty_checklist(self, temp_project):
        """Test listing empty checklist."""
        task_id = create_task(title="Task", project_root=temp_project)
        items = checklist_list(task_id, temp_project)
        assert items == []

    def test_list_nonexistent_task(self, temp_project):
        """Test listing checklist for nonexistent task."""
        items = checklist_list("TASK-999", temp_project)
        assert items == []


class TestChecklistIntegration:
    """Integration tests for checklist workflow."""

    def test_full_checklist_workflow(self, temp_project):
        """Test complete checklist workflow."""
        task_id = create_task(title="Implement Feature", project_root=temp_project)

        # Add items
        checklist_add(task_id, "Write tests", temp_project)
        checklist_add(task_id, "Write code", temp_project)
        checklist_add(task_id, "Review code", temp_project)

        # Complete some items
        checklist_complete(task_id, 0, temp_project)
        checklist_complete(task_id, 1, temp_project)

        # Verify state
        items = checklist_list(task_id, temp_project)
        assert len(items) == 3
        assert items[0]["done"] is True  # Write tests
        assert items[1]["done"] is True  # Write code
        assert items[2]["done"] is False  # Review code

    def test_checklist_progress_tracking(self, temp_project):
        """Test tracking checklist completion progress."""
        task_id = create_task(title="Task", project_root=temp_project)

        # Add 5 items
        for i in range(5):
            checklist_add(task_id, f"Item {i + 1}", temp_project)

        # Complete 3 items
        checklist_complete(task_id, 0, temp_project)
        checklist_complete(task_id, 2, temp_project)
        checklist_complete(task_id, 4, temp_project)

        items = checklist_list(task_id, temp_project)
        completed = sum(1 for item in items if item["done"])
        progress = (completed / len(items)) * 100

        assert completed == 3
        assert progress == 60.0
