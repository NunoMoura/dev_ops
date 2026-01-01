import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

import board_ops


@pytest.fixture
def temp_project(tmp_path):
    project_dir = tmp_path / "project"
    project_dir.mkdir()
    dev_ops_dir = project_dir / "dev_ops"
    dev_ops_dir.mkdir()
    return str(project_dir)


class TestBoardOpsReady:
    def test_load_default_columns_json_error(self, temp_project):
        columns_json = os.path.join(temp_project, "columns.json")
        with open(columns_json, "w") as f:
            f.write("invalid")
        with patch("board_ops.os.path.dirname", return_value=temp_project):
            cols = board_ops._load_default_columns()
            assert len(cols) == 6

    def test_current_task_empty(self, temp_project):
        p = os.path.join(temp_project, "dev_ops", ".current_task")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as f:
            f.write("")
        assert board_ops.get_current_task(temp_project) is None

    def test_create_task_empty_items(self, temp_project):
        p = os.path.join(temp_project, "dev_ops", "board.json")
        with open(p, "w") as f:
            json.dump({"items": []}, f)
        assert board_ops.create_task("T", project_root=temp_project) is not None

    def test_missing_keys_ops(self, temp_project):
        tid = board_ops.create_task("T", project_root=temp_project)
        b = board_ops.load_board(temp_project)
        if "upstream" in b["items"][0]:
            del b["items"][0]["upstream"]
        board_ops.save_board(b, temp_project)
        assert board_ops.add_upstream(tid, "U", project_root=temp_project) is True

    @patch("subprocess.run")
    def test_create_pr_full(self, mock_run, temp_project):
        tid = board_ops.create_task("T", project_root=temp_project)
        b = board_ops.load_board(temp_project)
        t = b["items"][0]
        t["workflow"] = "w"
        t["upstream"] = ["U"]
        t["downstream"] = ["D"]
        board_ops.save_board(b, temp_project)
        mock_run.return_value = MagicMock(returncode=0, stdout="url")
        assert board_ops.create_pr(tid, project_root=temp_project) == "url"

    @patch("subprocess.run")
    def test_mark_done_various(self, mock_run, temp_project):
        tid = board_ops.create_task("T", project_root=temp_project)
        mock_run.return_value = MagicMock(returncode=0, stdout="url")
        assert board_ops.mark_done(tid, create_pr_flag=True, project_root=temp_project) is True

    def test_register_legacy(self, temp_project):
        tid = board_ops.create_task("T", project_root=temp_project)
        b = board_ops.load_board(temp_project)
        b["items"][0]["assignee"] = "o"
        board_ops.save_board(b, temp_project)
        board_ops.register_agent(tid, "a", project_root=temp_project)
        assert "assignee" not in board_ops.load_board(temp_project)["items"][0]

    def test_claim_gaps(self, temp_project):
        tid = board_ops.create_task("T", project_root=temp_project)
        assert board_ops.claim_task(tid, "a", session_id="s", project_root=temp_project) is True
        assert board_ops.claim_task("9", "a", project_root=temp_project) is False

    @patch("subprocess.run")
    def test_revert_fail(self, mock_run, temp_project):
        tid = board_ops.create_task("T", project_root=temp_project)
        b = board_ops.load_board(temp_project)
        b["items"][0]["commitSha"] = "c"
        board_ops.save_board(b, temp_project)
        mock_run.side_effect = Exception()
        assert board_ops.revert_task(tid, project_root=temp_project) is False

    @patch("board_ops.os.path.abspath")
    @patch("board_ops.os.path.dirname")
    def test_archive_root_none(self, mock_d, mock_a):
        mock_a.return_value = "/a/b/c/scripts/o.py"
        mock_d.side_effect = ["/a/b/c/scripts", "/a/b/c", "/a/b"]
        with patch("board_ops.load_board", return_value={"items": []}):
            assert board_ops.archive_task("T", None) is False

    @patch("subprocess.run")
    def test_gather_fail(self, mock_run):
        mock_run.side_effect = Exception()
        assert board_ops.gather_session_context({})["git_summary"] is None

    def test_prompt_truncate(self):
        task = {"id": "T", "title": "T"}
        ctx = {"walkthrough": "A" * 5000, "git_summary": "S"}
        p = board_ops.build_refinement_prompt(task, "f", ctx, 1, "B")
        assert "truncated" in p

    def test_refine_not_found(self, temp_project):
        assert board_ops.refine_phase("9", "f", project_root=temp_project) is None

    def test_main_subcommands_minimal_final(self):
        with patch("board_ops.load_board", return_value={"items": [{"id": "T1"}]}):
            with (
                patch("sys.argv", ["ops", "current-task"]),
                patch("board_ops.get_current_task", return_value="T1"),
            ):
                board_ops.main()
            with (
                patch("sys.argv", ["ops", "active-agents"]),
                patch("board_ops.get_active_agents", return_value=[{"id": "A1"}]),
            ):
                board_ops.main()
            with patch("sys.argv", ["ops", "revert", "T1"]), patch("board_ops.revert_task"):
                board_ops.main()
            with (
                patch("sys.argv", ["ops", "create", "--title", "T"]),
                patch("board_ops.create_task"),
            ):
                board_ops.main()

    def test_mark_done_none(self):
        assert board_ops.mark_done(None) is False
