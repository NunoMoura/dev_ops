#!/usr/bin/env python3
"""Tests for project_ops.py."""

import json
import os
import sys
import tempfile
from unittest.mock import patch

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "installer"))

from project_ops import _check_triggers, detect_stack, get_file_content


class TestGetFileContent:
    """Tests for get_file_content function."""

    def test_reads_existing_file(self):
        """Test reading an existing file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("test content")
            f.flush()

            content = get_file_content(f.name)
            assert content == "test content"

            os.unlink(f.name)

    def test_returns_empty_for_nonexistent(self):
        """Test returns empty string for non-existent file."""
        content = get_file_content("/nonexistent/path/file.txt")
        assert content == ""


class TestCheckTriggers:
    """Tests for _check_triggers function."""

    def test_file_exists_trigger(self):
        """Test trigger matches when file exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = os.path.join(tmpdir, "requirements.txt")
            open(test_file, "w").close()

            result = _check_triggers(tmpdir, ["requirements.txt"])
            assert result is True

    def test_file_not_exists_trigger(self):
        """Test trigger doesn't match when file doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _check_triggers(tmpdir, ["nonexistent.txt"])
            assert result is False

    def test_content_search_match(self):
        """Test content search matches."""
        with tempfile.TemporaryDirectory() as tmpdir:
            pkg_json = os.path.join(tmpdir, "package.json")
            with open(pkg_json, "w") as f:
                json.dump({"dependencies": {"react": "^18.0.0"}}, f)

            result = _check_triggers(tmpdir, ["package.json"], content_search="react")
            assert result is True

    def test_content_search_no_match(self):
        """Test content search doesn't match when content missing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            pkg_json = os.path.join(tmpdir, "package.json")
            with open(pkg_json, "w") as f:
                json.dump({"dependencies": {"vue": "^3.0.0"}}, f)

            result = _check_triggers(tmpdir, ["package.json"], content_search="react")
            assert result is False

    def test_glob_pattern_match(self):
        """Test glob patterns match files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            py_file = os.path.join(tmpdir, "main.py")
            open(py_file, "w").close()

            result = _check_triggers(tmpdir, ["**/*.py"])
            assert result is True

    def test_check_triggers_exception(self):
        """Line 165-166: _check_triggers with glob Exception."""
        from project_ops import _check_triggers

        with patch("glob.glob", side_effect=Exception("Glob error")):
            # Should catch and return False or continue
            assert _check_triggers(".", ["*"]) is False


class TestDetectStack:
    """Tests for detect_stack function."""

    def test_empty_project(self):
        """Test detection on empty project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            stack = detect_stack(tmpdir)
            assert len(stack) == 0

    def test_detect_python(self):
        """Test Python detection via requirements.txt."""
        with tempfile.TemporaryDirectory() as tmpdir:
            req_file = os.path.join(tmpdir, "requirements.txt")
            with open(req_file, "w") as f:
                f.write("pytest\nrequests\n")

            stack = detect_stack(tmpdir)
            python_rules = [s for s in stack if s["name"] == "python.md"]

            assert len(python_rules) == 1
            assert python_rules[0]["category"] == "Language"
            assert python_rules[0]["replacements"]["[extension]"] == "py"

    def test_detect_typescript(self):
        """Test TypeScript detection via tsconfig.json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tsconfig = os.path.join(tmpdir, "tsconfig.json")
            with open(tsconfig, "w") as f:
                json.dump({"compilerOptions": {}}, f)

            stack = detect_stack(tmpdir)
            ts_rules = [s for s in stack if s["name"] == "typescript.md"]

            assert len(ts_rules) == 1
            assert ts_rules[0]["category"] == "Language"

    def test_detect_ruff_linter(self):
        """Test Ruff linter detection."""
        with tempfile.TemporaryDirectory() as tmpdir:
            pyproject = os.path.join(tmpdir, "pyproject.toml")
            with open(pyproject, "w") as f:
                f.write("[tool.ruff]\nline-length = 100\n")

            stack = detect_stack(tmpdir)
            ruff_rules = [s for s in stack if s["name"] == "ruff.md"]

            assert len(ruff_rules) == 1
            assert ruff_rules[0]["category"] == "Linter"

    def test_detect_docker(self):
        """Test Docker detection (not currently implemented in STACK_RULES)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a Dockerfile
            dockerfile = os.path.join(tmpdir, "Dockerfile")
            with open(dockerfile, "w") as f:
                f.write("FROM node:18\n")

            stack = detect_stack(tmpdir)
            docker_rules = [s for s in stack if s["name"] == "docker.md"]

            # Docker detection not currently in STACK_RULES
            assert len(docker_rules) == 0

    def test_detect_react(self):
        """Test React library detection."""
        with tempfile.TemporaryDirectory() as tmpdir:
            pkg_json = os.path.join(tmpdir, "package.json")
            with open(pkg_json, "w") as f:
                json.dump({"dependencies": {"react": "^18.0.0", "react-dom": "^18.0.0"}}, f)

            stack = detect_stack(tmpdir)
            react_rules = [s for s in stack if s["name"] == "react.md"]

            assert len(react_rules) == 1
            assert react_rules[0]["category"] == "Library"

    def test_multiple_detections(self):
        """Test detecting multiple technologies at once."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create Python project with ruff
            pyproject = os.path.join(tmpdir, "pyproject.toml")
            with open(pyproject, "w") as f:
                f.write("[tool.ruff]\nline-length = 100\n")

            # Add requirements.txt
            req_file = os.path.join(tmpdir, "requirements.txt")
            with open(req_file, "w") as f:
                f.write("fastapi\nuvicorn\n")

            stack = detect_stack(tmpdir)

            # Should detect Python, ruff, and fastapi
            names = [s["name"] for s in stack]
            assert "python.md" in names
            assert "ruff.md" in names
            assert "fastapi.md" in names
