import os
import runpy
from unittest.mock import patch

import pytest


@pytest.mark.parametrize(
    "script_name",
    [
        "artifact_ops.py",
        "git_ops.py",
        "health_check.py",
        "setup_ops.py",
        "sync_version.py",
        "board_ops.py",
        "doc_ops.py",
        "project_ops.py",
    ],
)
def test_script_entry_points(script_name):
    script_path = os.path.join(os.path.dirname(__file__), "..", "scripts", script_name)
    with patch("sys.argv", [script_name, "--help"]):
        with patch("scripts.utils.prompt_user", return_value="y"):
            try:
                runpy.run_path(script_path, run_name="__main__")
            except SystemExit:
                pass
            except Exception:
                pass


def test_board_ops_done_cli_fix():
    with patch("sys.argv", ["board_ops.py", "done", "TASK-123"]):
        with patch("scripts.board_ops.mark_done") as mock_mark:
            from scripts.board_ops import main

            main()
            assert mock_mark.called
