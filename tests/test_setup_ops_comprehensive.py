#!/usr/bin/env python3
"""Comprehensive tests for setup_ops.py bootstrap and initialization."""

import json
import os
import subprocess
import sys
from unittest.mock import MagicMock, patch

import pytest

# Add installer to path (setup_ops is here)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "installer"))

from setup_ops import (
    bootstrap,
    convert_frontmatter_for_cursor,
    detect_ide,
    get_all_rules,
    get_core_rules,
    get_ide_paths,
    init_board,
    install_extension,
    install_rules,
    main,
)


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    return str(tmp_path)


class TestExtension:
    """Test install_extension."""

    def test_install_success(self, temp_project):
        """Test successful installation."""
        # Create a fake .vsix file
        ext_dir = os.path.join(temp_project, "extension")
        os.makedirs(ext_dir)
        vsix_path = os.path.join(ext_dir, "dev-ops-kanban-1.0.0.vsix")
        open(vsix_path, "w").close()

        with patch("glob.glob", return_value=[vsix_path]):
            with patch("subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(returncode=0, stdout="")
                install_extension(temp_project)
                assert mock_run.called

    def test_install_no_vsix(self, temp_project):
        """Test when no vsix is found."""
        with patch("glob.glob", return_value=[]):
            install_extension(temp_project)
            # Should just print warning


class TestGetIdePaths:
    """Test get_ide_paths."""

    def test_paths_antigravity(self, temp_project):
        """Test paths for antigravity."""
        paths = get_ide_paths(temp_project, "antigravity")
        assert ".agent" in paths[0]
        assert "rules" in paths[1]
        assert "workflows" in paths[2]
        assert paths[3] == ".md"

    def test_paths_cursor(self, temp_project):
        """Test paths for cursor."""
        paths = get_ide_paths(temp_project, "cursor")
        assert ".cursor" in paths[0]
        assert ".cursor/rules" in paths[1]
        assert ".cursor/commands" in paths[2]
        assert paths[3] == ".mdc"


class TestConvertCursor:
    """Test convert_frontmatter_for_cursor."""

    def test_convert_build_rule(self):
        """Test converting a build phase rule."""
        content = """---
phase: build
activation_mode: Always On
globs: ["*.py"]
description: Build logic
---
Body content"""
        converted = convert_frontmatter_for_cursor(content)
        assert "alwaysApply: true" in converted
        assert 'globs: ["*.py"]' in converted
        assert (
            "description: Build logic - Apply when implementing code and writing tests" in converted
        )
        assert "Body content" in converted

    def test_convert_no_frontmatter(self):
        """Test with no frontmatter."""
        content = "No frontmatter here"
        assert convert_frontmatter_for_cursor(content) == content


class TestDetectIDEComprehensive:
    """Test detect_ide with various binaries and versions."""

    def test_detect_cursor(self):
        """Test detecting cursor."""
        with patch.dict("os.environ", {}, clear=True):
            with patch("shutil.which", side_effect=lambda x: True if x == "cursor" else None):
                with patch("subprocess.run") as mock_run:
                    mock_run.return_value = MagicMock(returncode=0, stdout="1.0.0")
                    assert detect_ide() == "cursor"

    def test_detect_antigravity(self):
        """Test detecting antigravity via code binary."""
        with patch.dict("os.environ", {}, clear=True):
            with patch("shutil.which", side_effect=lambda x: True if x == "code" else None):
                with patch("subprocess.run") as mock_run:
                    mock_run.return_value = MagicMock(returncode=0, stdout="antigravity 1.0.0")
                    assert detect_ide() == "antigravity"


class TestInitBoard:
    """Test init_board function."""

    def test_init_creates_board(self, temp_project):
        """Test that init creates board file."""
        init_board(temp_project)
        board_file = os.path.join(temp_project, ".dev_ops", "board.json")
        assert os.path.exists(board_file)

    def test_init_board_structure(self, temp_project):
        """Test initialized board has correct structure."""
        init_board(temp_project)
        board_file = os.path.join(temp_project, ".dev_ops", "board.json")
        with open(board_file) as f:
            board = json.load(f)
        assert "columns" in board
        assert "items" in board

    def test_init_has_default_columns(self, temp_project):
        """Test that default columns are created."""
        init_board(temp_project)
        board_file = os.path.join(temp_project, ".dev_ops", "board.json")
        with open(board_file) as f:
            board = json.load(f)
        column_names = [c["name"] for c in board["columns"]]
        # Actual names in board_ops: Backlog, Understand, Plan, Build, Verify, Done
        expected = ["Backlog", "Understand", "Plan", "Build", "Verify", "Done"]
        assert all(name in column_names for name in expected)

    def test_init_empty_items(self, temp_project):
        """Test that items list is initially empty."""
        init_board(temp_project)
        board_file = os.path.join(temp_project, ".dev_ops", "board.json")
        with open(board_file) as f:
            board = json.load(f)
        assert isinstance(board["items"], list)
        assert len(board["items"]) == 0


class TestGetCoreRules:
    """Test get_core_rules function."""

    def test_get_core_rules_basic(self, temp_project):
        """Test retrieving core rules."""
        # rules_src is payload/rules
        rules_src = os.path.join(temp_project, "payload", "rules")
        os.makedirs(os.path.join(rules_src, "development_phases"))
        open(os.path.join(rules_src, "dev_ops_guide.md"), "w").close()
        open(os.path.join(rules_src, "development_phases", "1_backlog.md"), "w").close()

        rules = get_core_rules(rules_src)
        assert len(rules) == 2
        paths = [r["path"] if "path" in r else r["src"] for r in rules]
        assert any("dev_ops_guide.md" in p for p in paths)
        assert any("1_backlog.md" in p for p in paths)


class TestGetAllRules:
    """Test get_all_rules function."""

    def test_get_all_rules_combines(self, temp_project):
        """Test that get_all_rules returns core rules."""
        repo_root = temp_project
        core_src = os.path.join(repo_root, "payload", "rules")
        templates_rules_src = os.path.join(repo_root, "payload", "templates", "rules")

        os.makedirs(os.path.join(core_src, "development_phases"), exist_ok=True)
        with open(os.path.join(core_src, "dev_ops_guide.md"), "w") as f:
            f.write("Guide content")

        os.makedirs(templates_rules_src, exist_ok=True)

        # get_all_rules now only returns core rules
        rules = get_all_rules(core_src, templates_rules_src, temp_project)
        assert len(rules) >= 1
        srcs = [r["src"] for r in rules]
        assert any("dev_ops_guide.md" in s for s in srcs)


class TestDetectIDE:
    """Test detect_ide function."""

    def test_detect_antigravity(self):
        """Test detecting antigravity editor."""
        with patch.dict("os.environ", {}, clear=True):
            with patch("shutil.which", side_effect=lambda x: True if x == "code" else None):
                with patch("subprocess.run") as mock_run:
                    mock_run.return_value = MagicMock(returncode=0, stdout="antigravity 1.0.0")
                    assert detect_ide() == "antigravity"

    def test_detect_no_ide(self):
        """Test fallback when no IDE detected."""
        with patch("shutil.which", return_value=None):
            with patch.dict("os.environ", {}, clear=True):
                assert detect_ide() == "antigravity"


class TestInstallRules:
    """Test install_rules function."""

    def test_install_rules_basic(self, temp_project):
        """Test installing rules to destination."""
        dest = os.path.join(temp_project, "installed_rules")
        rules = [
            {"name": "rule1.md", "src": os.path.join(temp_project, "rule1.md"), "category": "Core"}
        ]
        os.makedirs(temp_project, exist_ok=True)
        with open(rules[0]["src"], "w") as f:
            f.write("Rule content")

        with patch("setup_ops.get_file_content", return_value="Rule content"):
            install_rules(rules, dest, ide="antigravity")

        expected_path = os.path.join(dest, "rule1.md")
        assert os.path.exists(expected_path)
        # Core rules now get a footer comment appended
        content = open(expected_path).read()
        assert "Rule content" in content
        assert "dev-ops-customized" in content  # Footer comment added


class TestSetupIntegration:
    """Integration style tests for setup flow."""

    def test_complete_init_flow(self, temp_project):
        """Test full initialization sequence."""
        with patch("setup_ops.install_extension"):
            init_board(temp_project)
            assert os.path.exists(os.path.join(temp_project, ".dev_ops", "board.json"))


class TestBootstrap:
    """Test the bootstrap function."""

    def test_bootstrap_full(self, temp_project):
        """Test bootstrap function which ties everything together."""
        # Setup source directories (NEW STRUCTURE)
        repo_root = temp_project

        # New structure: payload/scripts, payload/rules, payload/templates, payload/workflows
        payload_dir = os.path.join(repo_root, "payload")

        scripts_src = os.path.join(payload_dir, "scripts")
        rules_src = os.path.join(payload_dir, "rules")
        templates_rules_src = os.path.join(payload_dir, "templates", "rules")
        workflows_src = os.path.join(payload_dir, "workflows")

        installer_dir = os.path.join(repo_root, "installer")
        os.makedirs(installer_dir)

        os.makedirs(scripts_src)
        os.makedirs(os.path.join(rules_src, "development_phases"))
        os.makedirs(templates_rules_src)
        os.makedirs(workflows_src)

        open(os.path.join(workflows_src, "test.md"), "w").close()
        open(os.path.join(rules_src, "dev_ops_guide.md"), "w").close()
        for i in range(1, 6):
            open(os.path.join(rules_src, "development_phases", f"{i}_test.md"), "w").close()

        # Create dummy setup_ops.py in installer
        with open(os.path.join(installer_dir, "setup_ops.py"), "w") as f:
            f.write("# dummy")

        with patch("setup_ops.get_ide_paths") as mock_paths:
            mock_paths.return_value = (
                os.path.join(temp_project, ".agent"),
                os.path.join(temp_project, ".agent", "rules"),
                os.path.join(temp_project, ".agent", "workflows"),
                ".md",
            )

            with (
                patch("setup_ops.install_extension"),
                patch("setup_ops.prompt_user", return_value="y"),
                patch("setup_ops.install_rules"),
            ):
                with patch("setup_ops.__file__", os.path.join(installer_dir, "setup_ops.py")):
                    with patch("subprocess.run"):
                        bootstrap(temp_project)

                assert os.path.exists(os.path.join(temp_project, ".dev_ops", "board.json"))

    def test_main_cli(self, temp_project):
        """Test main CLI entry point."""
        # Main uses --target
        with patch("sys.argv", ["setup_ops.py", "--target", temp_project]):
            with patch("setup_ops.bootstrap") as mock_bootstrap:
                main()
                mock_bootstrap.assert_called_once_with(
                    temp_project, ide_override=None, github_workflows=False
                )


class TestSetupOpsEdgeCases:
    """Extra tests for uncovered lines in setup_ops.py."""

    def test_install_extension_already_installed(self, temp_project):
        """Line 32-33: Extension already installed."""
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0, stdout="dev-ops")
            install_extension(temp_project)
            assert mock_run.called

    def test_install_extension_fail(self, temp_project):
        """Line 53-54: Subprocess failure."""
        ext_dir = os.path.join(temp_project, "extension")
        os.makedirs(ext_dir)
        vsix_path = os.path.join(ext_dir, "dev-ops-1.0.0.vsix")
        open(vsix_path, "w").close()

        with patch("glob.glob", return_value=[vsix_path]):
            with patch("subprocess.run") as mock_run:
                # First call is --list-extensions, second is install
                mock_run.side_effect = [
                    MagicMock(returncode=0, stdout=""),
                    subprocess.CalledProcessError(1, "code"),
                ]
                import subprocess as sp

                with patch("setup_ops.subprocess.CalledProcessError", sp.CalledProcessError):
                    install_extension(temp_project)

    def test_detect_ide_cursor_fail(self):
        """Line 123-124: Cursor version check failure."""
        with patch.dict("os.environ", {}, clear=True):
            with patch("shutil.which", side_effect=lambda x: True if x == "cursor" else None):
                with patch("subprocess.run", side_effect=Exception("Fail")):
                    assert detect_ide() == "antigravity"

    def test_detect_ide_vscode_variant(self):
        """Line 137-140: VS Code variant (not antigravity) and exception."""
        # 1. Generic VS Code (137-138)
        with patch.dict("os.environ", {}, clear=True):
            with patch("shutil.which", side_effect=lambda x: True if x == "code" else None):
                with patch("subprocess.run") as mock_run:
                    mock_run.return_value = MagicMock(returncode=0, stdout="vscode 1.0.0")
                    assert detect_ide() == "antigravity"

        # 2. Exception (139-140)
        with patch.dict("os.environ", {}, clear=True):
            with patch("shutil.which", side_effect=lambda x: True if x == "code" else None):
                with patch("subprocess.run", side_effect=Exception("Fail")):
                    assert detect_ide() == "antigravity"

    def test_convert_frontmatter_fallbacks(self):
        """Line 217, 219-220: Description fallback."""
        # Line 217: Phase but no description
        content = "---\nphase: build\n---\nBody"
        converted = convert_frontmatter_for_cursor(content)
        assert "description: Build phase rule" in converted

        # Line 219-220: No phase but description
        content = "---\ndescription: My Rule\n---\nBody"
        converted = convert_frontmatter_for_cursor(content)
        assert "description: My Rule" in converted

    def test_install_rules_edge_cases(self, temp_project):
        """Line 328, 334-335, 343, 352: Various edge cases in install_rules."""
        dest = os.path.join(temp_project, "dest")

        # 328: cat_dir (Language -> languages)
        rules = [
            {
                "name": "py.md",
                "src": os.path.join(temp_project, "py.md"),
                "category": "Language",
                "replacements": {"A": "B"},
            }
        ]
        with open(rules[0]["src"], "w") as f:
            f.write("A content")

        # 343: replacements
        # 352: cursor extension rename
        install_rules(rules, dest, ide="cursor")
        rule_path = os.path.join(dest, "languages", "py.mdc")
        assert os.path.exists(rule_path)
        # Note: replacements dict in rule is no longer used by install_rules
        # Content should be original (A content) not replaced
        content = open(rule_path).read()
        assert "A content" in content

        # 334-335: missing source
        rules_missing = [{"name": "missing.md", "src": "/non/existent", "category": "Core"}]
        install_rules(rules_missing, dest)

    def test_bootstrap_docs_move_new(self, temp_project):
        """Line 443-444: bootstrap creates .dev_ops/docs structure."""
        target = os.path.join(temp_project, "target_new_docs")
        os.makedirs(os.path.join(target, "docs"))
        with open(os.path.join(target, "docs", "doc1.md"), "w") as f:
            f.write("data")

        repo = os.path.join(temp_project, "repo_docs")
        payload_dir = os.path.join(repo, "payload")
        installer_dir = os.path.join(repo, "installer")

        os.makedirs(os.path.join(payload_dir, "scripts"))
        os.makedirs(os.path.join(payload_dir, "rules", "development_phases"))
        os.makedirs(os.path.join(payload_dir, "templates", "rules"))
        os.makedirs(os.path.join(payload_dir, "templates", "docs"))
        os.makedirs(os.path.join(payload_dir, "workflows"))
        os.makedirs(installer_dir)

        with patch("setup_ops.__file__", os.path.join(installer_dir, "setup_ops.py")):
            with patch("setup_ops.prompt_user", return_value="y"):
                with patch("subprocess.run"):
                    with patch(
                        "project_ops.scaffold_architecture", return_value={"created": 0, "skipped": 0}
                    ):
                        bootstrap(target)
                        # Bootstrap creates .dev_ops/docs structure
                        assert os.path.exists(os.path.join(target, ".dev_ops", "docs"))

    def test_bootstrap_doc_move_merge(self, temp_project):
        """Line 425-426, 429-446: Doc move/merge."""
        target = os.path.join(temp_project, "target")
        os.makedirs(os.path.join(target, "docs"))
        with open(os.path.join(target, "docs", "old.md"), "w") as f:
            f.write("old")

        # Setup source mocks
        repo = os.path.join(temp_project, "repo")
        payload_dir = os.path.join(repo, "payload")
        installer_dir = os.path.join(repo, "installer")

        os.makedirs(os.path.join(payload_dir, "scripts"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "rules", "development_phases"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "rules"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "docs"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "workflows"), exist_ok=True)
        os.makedirs(installer_dir)

        with patch("setup_ops.__file__", os.path.join(installer_dir, "setup_ops.py")):
            with patch("setup_ops.prompt_user", side_effect=["y", "y", "y", "y"]):
                with patch("subprocess.run"):
                    with patch(
                        "project_ops.scaffold_architecture", return_value={"created": 0, "skipped": 0}
                    ):
                        os.makedirs(os.path.join(target, "dev_ops", "docs"), exist_ok=True)
                        bootstrap(target)
                        # Bootstrap creates .dev_ops/docs structure
                        assert os.path.exists(os.path.join(target, ".dev_ops", "docs"))

    def test_bootstrap_prd_found(self, temp_project):
        """Line 461-462, 464, 474: PRD found logic."""
        target = os.path.join(temp_project, "target_prd")
        os.makedirs(target)
        with open(os.path.join(target, "prd.md"), "w") as f:
            f.write("exists")

        repo = os.path.join(temp_project, "repo")
        payload_dir = os.path.join(repo, "payload")
        installer_dir = os.path.join(repo, "installer")

        os.makedirs(os.path.join(payload_dir, "scripts"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "rules", "development_phases"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "rules"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "docs"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "workflows"), exist_ok=True)
        os.makedirs(installer_dir)

        with patch("setup_ops.__file__", os.path.join(installer_dir, "setup_ops.py")):
            with patch("setup_ops.prompt_user", return_value="y"):
                with patch("subprocess.run"):
                    with patch(
                        "project_ops.scaffold_architecture", return_value={"created": 0, "skipped": 0}
                    ):
                        bootstrap(target)
                        assert open(os.path.join(target, "prd.md")).read() == "exists"

    def test_bootstrap_pr_triage_overwrite(self, temp_project):
        """Line 522-534: PR triage installation patterns (requires github_workflows=True)."""
        repo = os.path.join(temp_project, "repo")

        payload_dir = os.path.join(repo, "payload")
        installer_dir = os.path.join(repo, "installer")
        github_src = os.path.join(payload_dir, "github", "workflows")
        os.makedirs(os.path.join(payload_dir, "scripts"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "rules", "development_phases"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "rules"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "docs"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "workflows"), exist_ok=True)
        os.makedirs(github_src, exist_ok=True)
        os.makedirs(installer_dir)

        # Create source triage file in payload/github/workflows/
        triage_src = os.path.join(github_src, "pr_triage.yml")
        with open(triage_src, "w") as f:
            f.write("triage")

        # Case 1: Don't overwrite
        target1 = os.path.join(temp_project, "target_pr1")
        triage_dest1 = os.path.join(target1, ".github", "workflows", "pr_triage.yml")
        os.makedirs(os.path.dirname(triage_dest1), exist_ok=True)
        with open(triage_dest1, "w") as f:
            f.write("old-triage")

        with patch("setup_ops.__file__", os.path.join(installer_dir, "setup_ops.py")):
            with patch("setup_ops.prompt_user", side_effect=["y", "n", "1"]):
                with patch("subprocess.run"):
                    with patch(
                        "project_ops.scaffold_architecture", return_value={"created": 0, "skipped": 0}
                    ):
                        bootstrap(target1, github_workflows=True)
                        assert open(triage_dest1).read() == "old-triage"

        # Case 2: Overwrite
        target2 = os.path.join(temp_project, "target_pr2")
        triage_dest2 = os.path.join(target2, ".github", "workflows", "pr_triage.yml")
        os.makedirs(os.path.dirname(triage_dest2), exist_ok=True)
        with open(triage_dest2, "w") as f:
            f.write("old-triage")

        with patch("setup_ops.__file__", os.path.join(installer_dir, "setup_ops.py")):
            with patch("setup_ops.prompt_user", side_effect=["y", "y", "1"]):
                with patch("subprocess.run"):
                    with patch(
                        "project_ops.scaffold_architecture", return_value={"created": 0, "skipped": 0}
                    ):
                        bootstrap(target2, github_workflows=True)
                        assert open(triage_dest2).read() == "triage"

    def test_bootstrap_pr_triage_new(self, temp_project):
        """Line 533-534: PR triage initial install (requires github_workflows=True)."""
        repo = os.path.join(temp_project, "repo_triage_new")

        payload_dir = os.path.join(repo, "payload")
        installer_dir = os.path.join(repo, "installer")
        github_src = os.path.join(payload_dir, "github", "workflows")
        os.makedirs(os.path.join(payload_dir, "scripts"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "rules", "development_phases"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "rules"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "templates", "docs"), exist_ok=True)
        os.makedirs(os.path.join(payload_dir, "workflows"), exist_ok=True)
        os.makedirs(github_src, exist_ok=True)
        os.makedirs(installer_dir)

        # Create source triage file
        triage_src = os.path.join(github_src, "pr_triage.yml")
        with open(triage_src, "w") as f:
            f.write("new-triage")

        target = os.path.join(temp_project, "target_triage_new")

        with patch("setup_ops.__file__", os.path.join(installer_dir, "setup_ops.py")):
            with patch("setup_ops.prompt_user", return_value="y"):
                with patch("subprocess.run"):
                    with patch(
                        "project_ops.scaffold_architecture", return_value={"created": 0, "skipped": 0}
                    ):
                        bootstrap(target, github_workflows=True)
                        triage_dest = os.path.join(target, ".github", "workflows", "pr_triage.yml")
                        assert os.path.exists(triage_dest)
                        assert open(triage_dest).read() == "new-triage"
