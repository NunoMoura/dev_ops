# sys.path handled by conftest.py
import os
from unittest.mock import patch

import pytest
from artifact_ops import (
    create_artifact,
    get_template,
    list_artifacts,
    main,
)

# temp_project fixture handled by conftest.py


class TestArtifactOpsComprehensive:
    """Comprehensive tests for artifact_ops functions."""

    def test_get_template_fallback(self, temp_project):
        """Test get_template fallback."""
        os.chdir(temp_project)
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
        os.chdir(temp_project)
        art_id = create_artifact("bug", "My Bug", priority="high", description="it broke")
        assert art_id == "BUG-001"

        artifacts_dir = os.path.join(temp_project, ".dev_ops", ".tmp", "artifacts")
        bug_file = os.path.join(artifacts_dir, "BUG-001-my-bug.md")
        assert os.path.exists(bug_file)
        content = open(bug_file).read()
        assert "BUG-001" in content
        assert "high" in content
        assert "it broke" in content

    def test_list_artifacts(self, temp_project):
        """Test listing artifacts."""
        os.chdir(temp_project)
        # Unknown
        list_artifacts("unknown")

        # Missing dir
        list_artifacts("plan")

        # With files
        artifacts_dir = os.path.join(temp_project, ".dev_ops", ".tmp", "artifacts")
        os.makedirs(artifacts_dir, exist_ok=True)
        open(os.path.join(artifacts_dir, "PLN-001-test.md"), "w").close()
        list_artifacts("plan")

    def test_main_cli_dispatch(self, temp_project):
        """Test CLI dispatch."""
        os.chdir(temp_project)
        # create
        with patch("sys.argv", ["artifact_ops.py", "create", "bug", "--title", "CLI Bug"]):
            main()
            artifacts_dir = os.path.join(temp_project, ".dev_ops", ".tmp", "artifacts")
            assert os.path.exists(os.path.join(artifacts_dir, "BUG-001-cli-bug.md"))

        # list
        with patch("sys.argv", ["artifact_ops.py", "list", "bug"]):
            main()
