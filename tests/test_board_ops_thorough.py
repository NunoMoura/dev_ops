# sys.path handled by conftest.py
import os
from unittest.mock import MagicMock, patch

from board_ops import (
    archive_task,
    calculate_metrics,
    create_pr,
    create_task,
    get_active_agents,
    get_column_name,
    load_board,
    main,
    mark_done,
    pick_task,
    record_phase_session,
    refine_phase,
    register_agent,
    revert_task,
    save_board,
    unregister_agent,
)

# temp_project handled by conftest.py


class TestBoardOpsThorough:
    """Thorough tests for board_ops functions."""

    def test_archive_task_full(self, temp_project):
        """Test archive_task with artifacts."""
        # Create a task
        task_id = create_task("Task to archive", project_root=temp_project)

        # Create some artifact files
        plans_dir = os.path.join(temp_project, ".dev_ops", ".tmp", "artifacts")
        os.makedirs(plans_dir, exist_ok=True)
        plan_file = os.path.join(plans_dir, "PLN-001-test.md")
        with open(plan_file, "w") as f:
            f.write("Plan content")

        # Link artifact to task
        board = load_board(temp_project)
        board["items"][0]["upstream"] = ["PLN-001"]
        save_board(board, temp_project)

        # Archive
        os.chdir(temp_project)
        success = archive_task(task_id, project_root=temp_project)

        assert success is True
        # Verify file removed
        assert not os.path.exists(plan_file)
        # Verify archive created
        archive_file = os.path.join(temp_project, ".dev_ops", "archive", f"{task_id}.tar.gz")
        assert os.path.exists(archive_file)
        # Verify task removed from board
        board = load_board(temp_project)
        assert len(board["items"]) == 0

    def test_archive_nonexistent_task(self, temp_project):
        """Test archiving task that doesn't exist."""
        success = archive_task("TASK-999", project_root=temp_project)
        assert success is False

    def test_calculate_metrics(self):
        """Test metrics calculation."""
        board = {
            "items": [
                {"status": "ready", "priority": "high"},
                {"status": "agent_active", "priority": "medium"},
                {"status": "done", "priority": "low"},
                {"status": "done", "priority": "high"},
            ]
        }
        metrics = calculate_metrics(board)

        assert metrics["totalTasks"] == 4
        assert metrics["statusCounts"]["ready"] == 1
        assert metrics["statusCounts"]["done"] == 2
        assert metrics["priorityCounts"]["high"] == 2

    def test_refine_phase_basic(self, temp_project):
        """Test refinement prompt generation."""
        task_id = create_task("Task to refine", project_root=temp_project)

        # Create a session directory with walkthrough.md
        session_dir = os.path.join(temp_project, "session")
        os.makedirs(session_dir)
        with open(os.path.join(session_dir, "walkthrough.md"), "w") as f:
            f.write("# Walkthrough Content")

        prompt = refine_phase(
            task_id, "Please improve this", session_dir=session_dir, project_root=temp_project
        )

        assert prompt is not None
        assert "Refinement Request" in prompt
        assert "improve this" in prompt
        assert "Walkthrough Content" in prompt

        # Check task update
        board = load_board(temp_project)
        task = board["items"][0]
        assert task["refinementCount"] == 1
        assert len(task["refinementHistory"]) == 1

    @patch("subprocess.run")
    def test_revert_task_success(self, mock_run, temp_project):
        """Test reverting a task via git."""
        task_id = create_task("Task to revert", project_root=temp_project)
        board = load_board(temp_project)
        board["items"][0]["commitSha"] = "abcdef1"
        save_board(board, temp_project)

        mock_run.return_value = MagicMock(returncode=0)

        success = revert_task(task_id, project_root=temp_project)

        assert success is True
        mock_run.assert_called_once()
        assert "revert" in mock_run.call_args[0][0]

    def test_register_unregister_agent_owners(self, temp_project):
        """Test registering and unregistering agents."""
        task_id = create_task("Task", project_root=temp_project)

        # Register
        register_agent(task_id, "agent", name="test-agent", project_root=temp_project)
        board = load_board(temp_project)
        assert board["items"][0]["owner"]["name"] == "test-agent"
        assert board["items"][0]["status"] == "agent_active"

        # Active agents
        active = get_active_agents(project_root=temp_project)
        assert len(active) == 1
        assert active[0]["task_id"] == task_id

        # Unregister
        unregister_agent(task_id, project_root=temp_project)
        board = load_board(temp_project)
        assert "owner" not in board["items"][0]

    def test_record_phase_session(self, temp_project):
        """Test recording session ID for a phase."""
        task_id = create_task("Task", project_root=temp_project)

        record_phase_session(task_id, "building", "sess-123", project_root=temp_project)

        board = load_board(temp_project)
        assert board["items"][0]["phases"]["building"]["sessionId"] == "sess-123"

    @patch("subprocess.run")
    def test_create_pr_full(self, mock_run, temp_project):
        """Test create_pr using gh CLI."""
        task_id = create_task("PR Task", project_root=temp_project)

        mock_run.return_value = MagicMock(returncode=0, stdout="https://github.com/PR/1")

        url = create_pr(task_id, project_root=temp_project)

        assert url == "https://github.com/PR/1"
        board = load_board(temp_project)
        assert any(url in d for d in board["items"][0].get("downstream", []))

    def test_main_cli_dispatch(self, temp_project):
        """Test CLI main entry point dispatching."""
        # Mock sys.argv
        os.chdir(temp_project)
        with patch("sys.argv", ["board_ops.py", "create", "--title", "CLI Task"]):
            main()

        board = load_board(temp_project)
        assert len(board["items"]) == 1
        assert board["items"][0]["title"] == "CLI Task"

    def test_get_column_name_variants(self):
        """Test get_column_name fallback and variants."""
        board = {"columns": [{"id": "c1", "name": "Column 1"}]}
        assert get_column_name(board, "c1") == "Column 1"
        assert get_column_name(board, "c2") == "Unknown"
        assert get_column_name({}, "c1") == "Unknown"

    @patch("subprocess.run")
    def test_mark_done_full(self, mock_run, temp_project):
        """Test mark_done with all features."""
        task_id = create_task("Done Task", project_root=temp_project)
        mock_run.return_value = MagicMock(returncode=0, stdout="abcdef123456789\n")

        os.chdir(temp_project)
        success = mark_done(
            task_id, outputs=["PR-123"], create_pr_flag=False, project_root=temp_project
        )

        assert success is True
        board = load_board(temp_project)
        # Task should be archived and thus removed from board
        assert len(board["items"]) == 0

        # Verify archive exists
        archive_file = os.path.join(temp_project, ".dev_ops", "archive", f"{task_id}.tar.gz")
        assert os.path.exists(archive_file)

    def test_mark_done_nonexistent(self, temp_project):
        """Test mark_done with nonexistent task."""
        success = mark_done("TASK-999", project_root=temp_project)
        assert success is False

    @patch("subprocess.run")
    def test_main_cli_various(self, mock_run, temp_project):
        """Test various other CLI commands in main()."""
        task_id = create_task("CLI Multi Task", project_root=temp_project)

        commands = [
            ["list"],
            ["list", "--column", "col-backlog"],
            ["status", task_id, "done"],
            ["upstream", task_id, "PLN-001"],
            ["downstream", task_id, "VAL-001"],
            ["move", task_id, "col-build"],
            ["active-agents"],
            ["get-board"],
            ["get-task", task_id],
            ["get-metrics"],
            ["validate-task-id", task_id],
            ["get-column-name", "col-backlog"],
            ["checklist", "list", task_id],
            ["checklist", "add", task_id, "New item"],
            ["checklist", "complete", task_id, "0"],
            ["pick"],
            ["pick", "--claim"],
            ["current-task"],
            ["refine", task_id, "--feedback", "Fix it"],
            ["register", task_id],
            ["unregister", task_id],
            ["replace", task_id, "--with", "Subtask 1", "Subtask 2"],
            ["record-phase", task_id, "planning", "sess-456"],
        ]

        os.chdir(temp_project)
        for cmd in commands:
            with patch("sys.argv", ["board_ops.py"] + cmd):
                try:
                    main()
                except SystemExit:
                    pass

    def test_pick_task_sorting(self, temp_project):
        """Test pick_task priority and date sorting."""
        create_task("Low", priority="low", project_root=temp_project)
        create_task("High", priority="high", project_root=temp_project)
        create_task("Medium", priority="medium", project_root=temp_project)

        picked = pick_task(project_root=temp_project)
        assert picked["priority"] == "high"
        assert picked["title"] == "High"
