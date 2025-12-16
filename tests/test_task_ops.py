"""Tests for task_ops.py - Kanban task management."""

import os
import sys
import tempfile
import shutil
import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

import task_ops


@pytest.fixture
def temp_kanbn_dir(tmp_path, monkeypatch):
    """Create a temporary .kanbn directory for testing."""
    kanbn_dir = tmp_path / ".kanbn"
    tasks_dir = kanbn_dir / "tasks"
    tasks_dir.mkdir(parents=True)

    # Create initial index.md
    index_content = """---
startedColumns:
  - In Progress
completedColumns:
  - Done
---

# DevOps Task Board

Test board.

## Backlog

## In Progress

## Review

## Done

## Archive
"""
    (kanbn_dir / "index.md").write_text(index_content)

    # Patch the module constants
    monkeypatch.setattr(task_ops, "KANBN_DIR", str(kanbn_dir))
    monkeypatch.setattr(task_ops, "TASKS_DIR", str(tasks_dir))
    monkeypatch.setattr(task_ops, "INDEX_PATH", str(kanbn_dir / "index.md"))

    return kanbn_dir


class TestCreateTask:
    """Tests for create_task function."""

    def test_create_task_creates_file(self, temp_kanbn_dir):
        """Verify task file is created in .kanbn/tasks/."""
        task_id = task_ops.create_task(
            title="Test Task", workflow="/plan", description="A test task"
        )

        assert task_id == "TASK-001"

        tasks_dir = temp_kanbn_dir / "tasks"
        files = list(tasks_dir.glob("task-001-*.md"))
        assert len(files) == 1

    def test_create_task_updates_index(self, temp_kanbn_dir):
        """Verify task is added to Backlog column in index."""
        task_ops.create_task(title="Index Test Task")

        index_content = (temp_kanbn_dir / "index.md").read_text()
        assert "task-001" in index_content.lower()

    def test_create_task_increments_id(self, temp_kanbn_dir):
        """Verify task IDs increment correctly."""
        task_id1 = task_ops.create_task(title="First Task")
        task_id2 = task_ops.create_task(title="Second Task")

        assert task_id1 == "TASK-001"
        assert task_id2 == "TASK-002"


class TestClaimTask:
    """Tests for claim_task function."""

    def test_claim_sets_assigned(self, temp_kanbn_dir):
        """Verify claim updates task metadata."""
        task_id = task_ops.create_task(title="Claim Test")
        task_ops.claim_task(task_id, "test-agent")

        tasks_dir = temp_kanbn_dir / "tasks"
        task_file = list(tasks_dir.glob(f"{task_id.lower()}-*.md"))[0]
        content = task_file.read_text()

        assert 'assigned: "test-agent"' in content


class TestProgressTask:
    """Tests for progress_task function."""

    def test_progress_moves_between_columns(self, temp_kanbn_dir):
        """Verify column transitions work."""
        task_id = task_ops.create_task(title="Progress Test")

        # Initially in Backlog
        columns = task_ops.parse_index()
        assert task_id.lower() in columns.get("Backlog", [])

        # Move to In Progress
        task_ops.progress_task(task_id, "In Progress")
        columns = task_ops.parse_index()
        assert task_id.lower() not in columns.get("Backlog", [])
        assert task_id.lower() in columns.get("In Progress", [])


class TestCompleteTask:
    """Tests for complete_task function."""

    def test_complete_links_outputs(self, temp_kanbn_dir):
        """Verify artifacts are linked on completion."""
        task_id = task_ops.create_task(title="Complete Test")
        task_ops.complete_task(task_id, outputs="PLN-001.md")

        tasks_dir = temp_kanbn_dir / "tasks"
        task_file = list(tasks_dir.glob(f"{task_id.lower()}-*.md"))[0]
        content = task_file.read_text()

        assert 'outputs: "PLN-001.md"' in content

    def test_complete_moves_to_done(self, temp_kanbn_dir):
        """Verify task moves to Done column."""
        task_id = task_ops.create_task(title="Complete Move Test")
        task_ops.complete_task(task_id)

        columns = task_ops.parse_index()
        assert task_id.lower() in columns.get("Done", [])


class TestListTasks:
    """Tests for list_tasks function."""

    def test_list_all_tasks(self, temp_kanbn_dir, capsys):
        """Verify listing all tasks works."""
        task_ops.create_task(title="List Task 1")
        task_ops.create_task(title="List Task 2")

        task_ops.list_tasks()
        captured = capsys.readouterr()

        assert "Backlog" in captured.out
        assert "task-001" in captured.out.lower() or "TASK-001" in captured.out

    def test_list_filtered_by_column(self, temp_kanbn_dir, capsys):
        """Verify column filtering works."""
        task_ops.create_task(title="Filter Test")
        task_ops.list_tasks(column="Backlog")

        captured = capsys.readouterr()
        assert "Backlog" in captured.out


class TestParseIndex:
    """Tests for parse_index function."""

    def test_parse_index_returns_columns(self, temp_kanbn_dir):
        """Verify index parsing returns column structure."""
        columns = task_ops.parse_index()

        assert "Backlog" in columns
        assert "In Progress" in columns
        assert "Done" in columns

    def test_parse_index_includes_tasks(self, temp_kanbn_dir):
        """Verify tasks are included in parsed columns."""
        task_ops.create_task(title="Parse Test")
        columns = task_ops.parse_index()

        assert len(columns.get("Backlog", [])) == 1
