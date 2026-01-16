# sys.path handled by conftest.py

from board_ops import (
    claim_task,
    create_task,
    get_active_agents,
    load_board,
    register_agent,
    set_status,
    unregister_agent,
)

# temp_project fixture handled by conftest.py


class TestSetStatus:
    """Test set_status function."""

    def test_set_status_ready(self, temp_project):
        """Test setting status to ready."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = set_status(task_id, "ready", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "ready"

    def test_set_status_in_progress(self, temp_project):
        """Test setting status to in_progress."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = set_status(task_id, "in_progress", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "in_progress"

    def test_set_status_needs_feedback(self, temp_project):
        """Test setting status to needs_feedback."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = set_status(task_id, "needs_feedback", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "needs_feedback"

    def test_set_status_blocked(self, temp_project):
        """Test setting status to blocked."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = set_status(task_id, "blocked", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "blocked"

    def test_set_status_done(self, temp_project):
        """Test setting status to done."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = set_status(task_id, "done", temp_project)

        assert result is True
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "done"

    def test_set_status_invalid(self, temp_project):
        """Test setting invalid status."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = set_status(task_id, "invalid_status", temp_project)

        assert result is False
        # Status should remain unchanged
        board = load_board(temp_project)
        assert board["items"][0]["status"] != "invalid_status"

    def test_set_status_nonexistent_task(self, temp_project):
        """Test setting status on nonexistent task."""
        result = set_status("TASK-999", "ready", temp_project)
        assert result is False

    def test_status_transitions(self, temp_project):
        """Test multiple status transitions."""
        task_id = create_task(title="Task", project_root=temp_project)

        set_status(task_id, "ready", temp_project)
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "ready"

        set_status(task_id, "in_progress", temp_project)
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "in_progress"

        set_status(task_id, "done", temp_project)
        board = load_board(temp_project)
        assert board["items"][0]["status"] == "done"


class TestRegisterAgent:
    """Test register_agent function."""

    def test_register_agent_basic(self, temp_project):
        """Test basic agent registration."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = register_agent(
            task_id, "agent", session_id="session-123", name="TestAgent", project_root=temp_project
        )

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]

        assert task["owner"]["type"] == "agent"
        assert task["owner"]["name"] == "TestAgent"
        assert task["owner"]["sessionId"] == "session-123"
        assert task["status"] == "in_progress"

    def test_register_human(self, temp_project):
        """Test registering a human."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = register_agent(task_id, "human", name="Alice", project_root=temp_project)

        assert result is True
        board = load_board(temp_project)
        task = board["items"][0]

        assert task["owner"]["type"] == "human"
        assert task["owner"]["name"] == "Alice"

    def test_register_agent_updates_timestamp(self, temp_project):
        """Test that registration updates timestamp."""
        task_id = create_task(title="Task", project_root=temp_project)

        board = load_board(temp_project)
        original_time = board["items"][0]["updatedAt"]

        register_agent(task_id, "agent", name="Agent1", project_root=temp_project)

        board = load_board(temp_project)
        new_time = board["items"][0]["updatedAt"]
        assert new_time >= original_time

    def test_register_agent_nonexistent_task(self, temp_project):
        """Test registering agent on nonexistent task."""
        result = register_agent("TASK-999", "agent", name="Agent", project_root=temp_project)
        assert result is False

    def test_register_replaces_previous_owner(self, temp_project):
        """Test that new registration replaces previous owner."""
        task_id = create_task(title="Task", project_root=temp_project)

        register_agent(
            task_id, "agent", session_id="session-1", name="Agent1", project_root=temp_project
        )
        register_agent(
            task_id, "agent", session_id="session-2", name="Agent2", project_root=temp_project
        )

        board = load_board(temp_project)
        task = board["items"][0]
        assert task["owner"]["name"] == "Agent2"
        assert task["owner"]["sessionId"] == "session-2"


class TestUnregisterAgent:
    """Test unregister_agent function."""

    def test_unregister_agent(self, temp_project):
        """Test unregistering an agent."""
        task_id = create_task(title="Task", project_root=temp_project)
        register_agent(task_id, "agent", name="Agent", project_root=temp_project)

        result = unregister_agent(task_id, temp_project)
        assert result is True

        board = load_board(temp_project)
        task = board["items"][0]
        assert "owner" not in task

    def test_unregister_no_agent(self, temp_project):
        """Test unregistering when no agent registered."""
        task_id = create_task(title="Task", project_root=temp_project)
        result = unregister_agent(task_id, temp_project)
        # Returns True even if no owner
        assert result is True

    def test_unregister_nonexistent_task(self, temp_project):
        """Test unregistering from nonexistent task."""
        result = unregister_agent("TASK-999", temp_project)
        assert result is False


class TestGetActiveAgents:
    """Test get_active_agents function."""

    def test_get_active_agents_empty(self, temp_project):
        """Test getting active agents when none exist."""
        create_task(title="Task 1", project_root=temp_project)
        create_task(title="Task 2", project_root=temp_project)

        active = get_active_agents(temp_project)
        assert len(active) == 0

    def test_get_active_agents_single(self, temp_project):
        """Test getting single active agent."""
        task_id = create_task(title="Task", project_root=temp_project)
        register_agent(
            task_id, "agent", session_id="session-1", name="Agent1", project_root=temp_project
        )

        active = get_active_agents(temp_project)
        assert len(active) == 1
        assert active[0]["task_id"] == task_id
        assert active[0]["task_title"] == "Task"
        assert active[0]["owner"]["name"] == "Agent1"

    def test_get_active_agents_multiple(self, temp_project):
        """Test getting multiple active agents."""
        task1 = create_task(title="Task 1", project_root=temp_project)
        task2 = create_task(title="Task 2", project_root=temp_project)
        task3 = create_task(title="Task 3", project_root=temp_project)

        register_agent(task1, "agent", name="Agent1", project_root=temp_project)
        register_agent(task2, "agent", name="Agent2", project_root=temp_project)
        # Don't register on task3

        active = get_active_agents(temp_project)
        assert len(active) == 2

        task_ids = {a["task_id"] for a in active}
        assert task1 in task_ids
        assert task2 in task_ids
        assert task3 not in task_ids

    def test_get_active_agents_filters_by_status(self, temp_project):
        """Test that only agent_active/in_progress tasks are returned."""
        task1 = create_task(title="Task 1", project_root=temp_project)
        task2 = create_task(title="Task 2", project_root=temp_project)

        register_agent(task1, "agent", name="Agent1", project_root=temp_project)
        register_agent(task2, "agent", name="Agent2", project_root=temp_project)

        # Set task2 to done status
        set_status(task2, "done", temp_project)

        active = get_active_agents(temp_project)
        # Only task1 should be active
        assert len(active) == 1
        assert active[0]["task_id"] == task1


class TestAgentIntegration:
    """Integration tests for agent workflows."""

    def test_agent_claim_workflow(self, temp_project):
        """Test full agent claim and work workflow."""
        task_id = create_task(title="Implement feature", status="ready", project_root=temp_project)

        # Agent claims task
        claim_task(task_id, session_id="ag-123", name="Antigravity", project_root=temp_project)

        # Verify agent is active
        active = get_active_agents(temp_project)
        assert len(active) == 1
        assert active[0]["owner"]["name"] == "Antigravity"

        # Agent completes work and unregisters
        unregister_agent(task_id, temp_project)

        # Verify no longer active
        active = get_active_agents(temp_project)
        assert len(active) == 0

    def test_multiple_agents_parallel(self, temp_project):
        """Test multiple agents working in parallel."""
        tasks = []
        for i in range(5):
            task_id = create_task(title=f"Task {i + 1}", project_root=temp_project)
            tasks.append(task_id)

        # Assign 3 agents
        register_agent(tasks[0], "agent", name="Agent-Alpha", project_root=temp_project)
        register_agent(tasks[1], "agent", name="Agent-Beta", project_root=temp_project)
        register_agent(tasks[3], "agent", name="Agent-Gamma", project_root=temp_project)

        active = get_active_agents(temp_project)
        assert len(active) == 3

        agent_names = {a["owner"]["name"] for a in active}
        assert "Agent-Alpha" in agent_names
        assert "Agent-Beta" in agent_names
        assert "Agent-Gamma" in agent_names
