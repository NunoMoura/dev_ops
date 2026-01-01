#!/usr/bin/env python3
"""Comprehensive tests for artifact_ops.py."""

import os
import sys
from unittest.mock import patch

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

from artifact_ops import (
    create_artifact,
    get_template,
    list_artifacts,
    main,
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    project_dir = tmp_path / "project"
    project_dir.mkdir()
    (project_dir / "dev_ops").mkdir()
    (project_dir / "dev_ops" / "artifacts").mkdir()
    return str(project_dir)


class TestArtifactOpsComprehensive:
    """Comprehensive tests for artifact_ops functions."""

    def test_get_template_fallback(self):
        """Test get_template fallback."""
        with patch("artifact_ops.TEMPLATES_DIR", "/nonexistent"):
            assert "plan" in get_template("plan")
            assert "bug" in get_template("bug")
            assert "# {{title}}" in get_template("unknown")

    def test_create_artifact_unknown(self):
        """Test create_artifact with unknown type."""
        with pytest.raises(SystemExit) as exc:
            create_artifact("unknown", "Title")
        assert exc.value.code == 1

    def test_create_artifact_success(self, temp_project):
        """Test successful artifact creation."""
        artifacts_dir = os.path.join(temp_project, "dev_ops", "artifacts")
        with patch("artifact_ops.ARTIFACTS_DIR", artifacts_dir):
            art_id = create_artifact("bug", "My Bug", priority="high", description="it broke")
            assert art_id == "BUG-001"

            bug_file = os.path.join(artifacts_dir, "bugs", "BUG-001-my-bug.md")
            assert os.path.exists(bug_file)
            content = open(bug_file).read()
            assert "BUG-001" in content
            assert "high" in content
            assert "it broke" in content

    def test_list_artifacts(self, temp_project):
        """Test listing artifacts."""
        artifacts_dir = os.path.join(temp_project, "dev_ops", "artifacts")
        with patch("artifact_ops.ARTIFACTS_DIR", artifacts_dir):
            # Unknown
            list_artifacts("unknown")

            # Missing dir
            list_artifacts("plan")

            # With files
            os.makedirs(os.path.join(artifacts_dir, "plans"))
            open(os.path.join(artifacts_dir, "plans", "PLN-001-test.md"), "w").close()
            list_artifacts("plan")

    def test_main_cli_dispatch(self, temp_project):
        """Test CLI dispatch."""
        artifacts_dir = os.path.join(temp_project, "dev_ops", "artifacts")
        with patch("artifact_ops.ARTIFACTS_DIR", artifacts_dir):
            # create
            with patch("sys.argv", ["artifact_ops.py", "create", "bug", "--title", "CLI Bug"]):
                main()
                assert os.path.exists(os.path.join(artifacts_dir, "bugs", "BUG-001-cli-bug.md"))

            # list
            with patch("sys.argv", ["artifact_ops.py", "list", "bug"]):
                main()
