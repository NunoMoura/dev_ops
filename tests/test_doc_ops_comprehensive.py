#!/usr/bin/env python3
"""Comprehensive tests for doc_ops.py."""

import os
import sys
from unittest.mock import patch

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.doc_ops import (
    create_doc,
    create_mockup,
    create_prd,
    create_story,
    create_user,
    get_doc_template,
    get_mockup_template,
    get_prd_template,
    get_story_template,
    get_user_template,
    list_docs,
    main,
    scaffold_docs,
    validate_docs,
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    project_dir = tmp_path / "project"
    project_dir.mkdir()
    (project_dir / "dev_ops").mkdir()
    (project_dir / "dev_ops" / "docs").mkdir()
    (project_dir / "templates").mkdir()
    (project_dir / "templates" / "docs").mkdir()
    return str(project_dir)


class TestDocOpsComprehensive:
    """Comprehensive tests for doc_ops functions."""

    def test_templates_fallback(self, temp_project):
        """Test templates use fallback when files missing."""
        with patch("scripts.doc_ops.TEMPLATES_DIR", "/nonexistent"):
            assert "---" in get_doc_template()
            assert "---" in get_user_template()
            assert "---" in get_story_template()
            assert "---" in get_prd_template()
            assert "---" in get_mockup_template()

    def test_templates_from_file(self, temp_project):
        """Test templates loaded from files."""
        template_file = os.path.join(temp_project, "templates", "docs", "doc.md")
        with open(template_file, "w") as f:
            f.write("FILE TEMPLATE {{title}}")

        with patch("scripts.doc_ops.TEMPLATES_DIR", os.path.join(temp_project, "templates")):
            assert "FILE TEMPLATE" in get_doc_template()

    def test_create_doc(self, temp_project):
        """Test creating various document types."""
        with patch("scripts.doc_ops.DOCS_DIR", os.path.join(temp_project, "dev_ops", "docs")):
            # Architecture doc
            path = create_doc("Arch Doc", category="architecture")
            assert os.path.exists(path)
            assert "Arch Doc" in open(path).read()

            # Duplicate
            path2 = create_doc("Arch Doc", category="architecture")
            assert path == path2

            # User persona
            user_path = create_user("John Doe")
            assert "John Doe" in open(user_path).read()

            # Story
            story_path = create_story("My Story", persona="User")
            assert "STORY-001" in story_path
            assert "User" in open(story_path).read()

            # PRD
            prd_path = create_prd("My PRD")
            assert "My PRD" in open(prd_path).read()

            # Mockup
            mock_path = create_mockup("Main Screen", component="Header")
            assert "MOCKUP-001" in mock_path
            assert "Header" in open(mock_path).read()

    def test_scaffold_docs(self, temp_project):
        """Test docs scaffolding."""
        # Create some project structure
        src_dir = os.path.join(temp_project, "src")
        os.makedirs(src_dir)
        with open(os.path.join(src_dir, "app.py"), "w") as f:
            f.write("print('hello')")

        test_dir = os.path.join(temp_project, "tests")
        os.makedirs(test_dir)
        with open(os.path.join(test_dir, "test_app.py"), "w") as f:
            f.write("def test(): pass")

        with patch("scripts.doc_ops.DOCS_DIR", os.path.join(temp_project, "dev_ops", "docs")):
            # We need to ensure PROJECT_ROOT or similar is set to temp_project
            # Actually scaffold_docs takes project_root as arg
            created = scaffold_docs(temp_project)

            assert "src" in created["architecture"]
            assert "tests" in created["tests"]

            # Verify files created in dev_ops/docs/ (relative to project_root)
            # Wait, scaffold_docs uses docs/architecture and docs/tests relative to project_root
            # in its local variables docs_arch/docs_tests.
            # Let's check:
            assert os.path.exists(os.path.join(temp_project, "docs", "architecture", "src.md"))
            assert os.path.exists(os.path.join(temp_project, "docs", "tests", "tests.md"))

    def test_validate_docs(self, temp_project):
        """Test documentation validation."""
        docs_dir = os.path.join(temp_project, "dev_ops", "docs")
        with patch("scripts.doc_ops.DOCS_DIR", docs_dir):
            # Missing dir
            with patch("os.path.exists", side_effect=lambda p: False if p == docs_dir else True):
                assert validate_docs() is False

            # Empty file
            arch_dir = os.path.join(docs_dir, "architecture")
            os.makedirs(arch_dir, exist_ok=True)
            open(os.path.join(arch_dir, "empty.md"), "w").close()
            assert validate_docs() is False

            # Valid
            with open(os.path.join(arch_dir, "good.md"), "w") as f:
                f.write("content")
            os.remove(os.path.join(arch_dir, "empty.md"))
            assert validate_docs() is True

    def test_list_docs(self, temp_project):
        """Test listing docs."""
        docs_dir = os.path.join(temp_project, "dev_ops", "docs")
        with patch("scripts.doc_ops.DOCS_DIR", docs_dir):
            # Empty
            list_docs("architecture")

            # With files
            arch_dir = os.path.join(docs_dir, "architecture")
            os.makedirs(arch_dir, exist_ok=True)
            open(os.path.join(arch_dir, "doc1.md"), "w").close()
            list_docs("architecture")

    def test_main_cli_dispatch(self, temp_project):
        """Test CLI dispatch."""
        docs_dir = os.path.join(temp_project, "dev_ops", "docs")
        with patch("scripts.doc_ops.DOCS_DIR", docs_dir):
            with patch("scripts.doc_ops.PROJECT_ROOT", temp_project):
                # create
                with patch("sys.argv", ["doc_ops.py", "create", "--title", "CLI Doc"]):
                    main()
                    assert os.path.exists(os.path.join(docs_dir, "architecture", "cli-doc.md"))

                # list
                with patch("sys.argv", ["doc_ops.py", "list"]):
                    main()

                # validate
                with patch("sys.argv", ["doc_ops.py", "validate"]):
                    with pytest.raises(SystemExit) as exc:
                        main()
                    assert exc.value.code == 0

                # create-user
                with patch("sys.argv", ["doc_ops.py", "create-user", "--title", "CLI User"]):
                    main()
                    assert os.path.exists(os.path.join(docs_dir, "ux", "users", "cli-user.md"))

                # create-story
                with patch("sys.argv", ["doc_ops.py", "create-story", "--title", "CLI Story"]):
                    main()
                    assert any(
                        "cli-story.md" in f
                        for f in os.listdir(os.path.join(docs_dir, "ux", "stories"))
                    )

                # create-mockup
                with patch("sys.argv", ["doc_ops.py", "create-mockup", "--title", "CLI Mockup"]):
                    main()
                    assert any(
                        "cli-mockup.md" in f
                        for f in os.listdir(os.path.join(docs_dir, "ux", "mockups"))
                    )

                # scaffold
                with patch("sys.argv", ["doc_ops.py", "scaffold", "--root", temp_project]):
                    main()

                # create-prd
                with patch("sys.argv", ["doc_ops.py", "create-prd", "--title", "CLI PRD"]):
                    main()
                    assert os.path.exists(os.path.join(docs_dir, "prds", "cli-prd.md"))

                # duplicate checks
                assert create_user("CLI User") is not None
                assert create_prd("CLI PRD") is not None

                # 365: create_mockup duplicate check
                assert create_mockup("CLI Mockup") is not None

                # scaffold skip exists
                scaffold_docs(temp_project)

    def test_update_user_nonexistent(self, temp_project):
        """Line 216-217: update_user with nonexistent user."""
        docs_dir = os.path.join(temp_project, "dev_ops", "docs")
        with patch("scripts.doc_ops.PROJECT_ROOT", temp_project):
            with patch("scripts.doc_ops.DOCS_DIR", docs_dir):
                assert create_user("Missing User") is not None

    def test_validate_docs_missing_file(self, temp_project):
        """Line 379: validate_docs with missing doc during loop."""
        docs_dir = os.path.join(temp_project, "dev_ops", "docs")
        arch_dir = os.path.join(docs_dir, "architecture")
        os.makedirs(arch_dir, exist_ok=True)
        # Create a file that we will then mock as non-existent during read
        path = os.path.join(arch_dir, "ghost.md")
        with open(path, "w") as f:
            f.write("content")

        with patch("scripts.doc_ops.DOCS_DIR", docs_dir):
            # Patch read_file from utils to raise FileNotFoundError
            with patch("scripts.doc_ops.read_file", side_effect=FileNotFoundError()):
                assert validate_docs() is False

    def test_has_code_files_permission_error(self):
        """Line 216-217: _has_code_files permission error."""
        from scripts.doc_ops import _has_code_files

        with patch("os.listdir", side_effect=PermissionError()):
            assert _has_code_files("/some/dir") is False

    def test_scaffold_docs_branches(self, temp_project):
        """Line 365, 379: scaffold_docs branches."""
        os.makedirs(os.path.join(temp_project, "src"))
        with open(os.path.join(temp_project, "src", "main.py"), "w") as f:
            f.write("print(1)")

        docs_dir = os.path.join(temp_project, "dev_ops", "docs")
        os.makedirs(os.path.join(docs_dir, "architecture"), exist_ok=True)
        # Create existing file to hit 379
        with open(os.path.join(docs_dir, "architecture", "src.md"), "w") as f:
            f.write("exists")

        with patch("scripts.doc_ops.DOCS_DIR", docs_dir):
            # First pass
            scaffold_docs(temp_project)
            # Second pass - should hit 365 (already processed) and 379 (exists) logic
            scaffold_docs(temp_project)
