#!/usr/bin/env python3
"""Comprehensive tests for health_check.py."""

import os
import sys
from unittest.mock import patch

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "payload", "scripts"))

from health_check import (
    check_directory_not_empty,
    check_import,
    check_path_exists,
    main,
    run_health_check,
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    project_dir = tmp_path / "project"
    project_dir.mkdir()
    (project_dir / ".dev_ops").mkdir()
    return str(project_dir)


class TestHealthCheckComprehensive:
    """Comprehensive tests for health_check functions."""

    def test_check_path_exists(self, temp_project):
        """Test check_path_exists."""
        # Exists
        path = os.path.join(temp_project, "exists.txt")
        open(path, "w").close()
        assert check_path_exists(path, "desc") is True

        # Not exists
        assert check_path_exists(os.path.join(temp_project, "no.txt"), "desc") is False

    def test_check_directory_not_empty(self, temp_project):
        """Test check_directory_not_empty."""
        # Not a dir
        assert check_directory_not_empty(os.path.join(temp_project, "no.txt"), "desc") is False

        # Empty dir
        d = os.path.join(temp_project, "empty")
        os.makedirs(d)
        assert check_directory_not_empty(d, "desc") is False

        # Not empty
        open(os.path.join(d, "file.txt"), "w").close()
        assert check_directory_not_empty(d, "desc") is True

    def test_check_import(self):
        """Test check_import."""
        assert check_import("os") is True
        assert check_import("nonexistent_module_xyz") is False

    def test_run_health_check_full_success(self, temp_project):
        """Test run_health_check with all passing."""
        # Mock everything to look like a perfect installation
        with (
            patch("health_check.check_path_exists", return_value=True),
            patch("health_check.check_directory_not_empty", return_value=True),
            patch("health_check.check_import", return_value=True),
            patch("os.path.isdir", return_value=True),
            patch("os.listdir", return_value=["rule1.md"]),
            patch("health_check.load_board", return_value={"columns": [1, 2, 3, 4, 5, 6]}),
        ):
            # We can mock os.getcwd for project_root
            with patch("os.getcwd", return_value=temp_project):
                assert run_health_check() == 0

    def test_run_health_check_failures(self, temp_project):
        """Test run_health_check with many failures."""
        with (
            patch("health_check.check_path_exists", return_value=False),
            patch("health_check.check_directory_not_empty", return_value=False),
            patch("health_check.check_import", return_value=False),
            patch("os.path.isdir", return_value=False),
            patch("health_check.load_board", side_effect=Exception("failed")),
        ):
            # Use different target project to trigger Check 7
            assert run_health_check(project_root="/target", verbose=True) == 1

    def test_run_health_check_board_mismatch(self, temp_project):
        """Test run_health_check with board column mismatch."""
        with (
            patch("health_check.check_path_exists", return_value=True),
            patch("health_check.check_directory_not_empty", return_value=True),
            patch("health_check.check_import", return_value=True),
            patch("os.path.isdir", return_value=True),
            patch("os.listdir", return_value=["r.md"]),
            patch("health_check.load_board", return_value={"columns": [1, 2, 3]}),
        ):
            assert run_health_check(project_root=temp_project) == 1

    def test_main_cli(self, temp_project):
        """Test main CLI dispatch."""
        with patch("sys.argv", ["health_check.py", "--project-root", temp_project, "-v"]):
            with patch("health_check.run_health_check", return_value=0) as mock_run:
                with pytest.raises(SystemExit) as exc:
                    main()
                assert exc.value.code == 0
                mock_run.assert_called_once_with(temp_project, True)

    def test_run_health_check_missing_script(self, temp_project):
        """Line 96: run_health_check with a missing script."""
        with (
            patch(
                "health_check.check_path_exists",
                side_effect=lambda p, d: False if "doc_ops.py" in p else True,
            ),
            patch("health_check.check_directory_not_empty", return_value=True),
            patch("health_check.check_import", return_value=True),
            patch("os.path.isdir", return_value=True),
            patch("os.listdir", return_value=["r.md"]),
            patch("health_check.load_board", return_value={"columns": [1, 2, 3, 4, 5, 6]}),
        ):
            assert run_health_check(project_root=temp_project) == 1

    def test_run_health_check_no_phase_rules(self, temp_project):
        """Line 109-110: run_health_check with no phase rules."""
        with (
            patch("health_check.check_path_exists", return_value=True),
            patch("health_check.check_directory_not_empty", return_value=True),
            patch("health_check.check_import", return_value=True),
            patch("os.path.isdir", return_value=True),
            patch("os.listdir", return_value=[]),  # No rules found
            patch("health_check.load_board", return_value={"columns": [1, 2, 3, 4, 5, 6]}),
        ):
            # This triggers warnings but returns 0 if no errors
            assert run_health_check(project_root=temp_project) == 0

    @patch("health_check.check_path_exists", return_value=True)
    @patch("health_check.check_directory_not_empty", return_value=True)
    @patch("health_check.check_import", return_value=True)
    @patch("os.path.isdir", return_value=True)
    @patch("os.listdir", return_value=["r.md"])
    @patch("health_check.load_board", return_value={"columns": [1, 2, 3, 4, 5, 6]})
    @patch("os.path.exists", return_value=True)  # For .agent and .dev_ops dir
    def test_run_health_check_target_project(
        self,
        mock_exists,
        mock_load,
        mock_listdir,
        mock_isdir,
        mock_import,
        mock_empty,
        mock_path,
        temp_project,
    ):
        """Line 169-170, 177-178: run_health_check target project details."""
        target = "/other_project"
        assert run_health_check(project_root=target) == 0
