import json
import os
import shutil
import sys
import tempfile
import unittest

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "payload", "scripts"))

from board_ops import (
    claim_task,
    create_task,
    get_active_agents,
    load_board,
    register_agent,
    unregister_agent,
)


class TestOwnerModel(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.dev_ops_dir = os.path.join(self.test_dir, ".dev_ops")
        os.makedirs(self.dev_ops_dir)

        # New board location: .dev_ops/board.json
        self.board_path = os.path.join(self.dev_ops_dir, "board.json")

        # Initialize empty board
        self.board = {
            "version": 1,
            "columns": [
                {"id": "col-backlog", "name": "Backlog"},
                {"id": "col-build", "name": "Build"},
                {"id": "col-done", "name": "Done"},
            ],
            "items": [],
        }
        with open(self.board_path, "w") as f:
            json.dump(self.board, f)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_create_task_with_implicit_owner(self):
        create_task(title="Legacy Task", assignee="nuno", project_root=self.test_dir)

        board = load_board(self.test_dir)
        task = board["items"][0]

        # Should have converted assignee string to owner object
        self.assertIn("owner", task)
        self.assertEqual(task["owner"]["type"], "human")
        self.assertEqual(task["owner"]["name"], "nuno")
        self.assertNotIn("assignee", task)  # Or ignored if we didn't remove it in create_task yet

    def test_register_agent(self):
        task_id = create_task(title="Agent Task", project_root=self.test_dir)

        success = register_agent(
            task_id,
            agent_type="antigravity",
            session_id="session-123",
            name="Gemini",
            project_root=self.test_dir,
        )
        self.assertTrue(success)

        board = load_board(self.test_dir)
        task = board["items"][0]

        self.assertEqual(task["status"], "in_progress")
        self.assertEqual(task["owner"]["type"], "antigravity")
        self.assertEqual(task["owner"]["sessionId"], "session-123")
        self.assertEqual(task["owner"]["name"], "Gemini")

    def test_claim_task_as_agent(self):
        """Test that claim_task sets up developer ownership correctly.

        Note: For agent claims, use register_agent() instead.
        claim_task() is for developers claiming tasks.
        """
        task_id = create_task(title="Claim Task", project_root=self.test_dir)

        # claim_task is for developers, not agents
        success = claim_task(task_id, force=True, name="CursorAgent", project_root=self.test_dir)
        self.assertTrue(success)

        board = load_board(self.test_dir)
        task = board["items"][0]

        # claim_task sets status to in_progress (developer working)
        self.assertEqual(task["status"], "in_progress")
        self.assertEqual(task["owner"]["type"], "developer")
        self.assertEqual(task["owner"]["name"], "CursorAgent")

    def test_get_active_agents(self):
        # Create 2 active tasks
        t1 = create_task(title="Task 1", project_root=self.test_dir)
        register_agent(t1, "antigravity", session_id="sess-1", project_root=self.test_dir)

        t2 = create_task(title="Task 2", project_root=self.test_dir)
        # For human/dev claims, use claim_task which sets in_progress status
        claim_task(t2, force=True, name="Dev", project_root=self.test_dir)

        # Create 1 inactive task
        create_task(title="Task 3", project_root=self.test_dir)

        active = get_active_agents(self.test_dir)
        # Only t1 should be active (in_progress status with agent owner)
        # t2 uses in_progress from claim_task, which is also picked up
        self.assertEqual(len(active), 2)

        agent_task = next(a for a in active if a["owner"]["type"] == "antigravity")
        dev_task = next(a for a in active if a["owner"]["type"] == "developer")

        self.assertEqual(agent_task["task_id"], t1)
        self.assertEqual(dev_task["task_id"], t2)

    def test_unregister_agent(self):
        task_id = create_task(title="Task 1", project_root=self.test_dir)
        register_agent(task_id, "antigravity", "sess-1", project_root=self.test_dir)

        unregister_agent(task_id, project_root=self.test_dir)

        board = load_board(self.test_dir)
        task = board["items"][0]
        self.assertNotIn("owner", task)


if __name__ == "__main__":
    unittest.main()
