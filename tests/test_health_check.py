#!/usr/bin/env python3
"""Tests for health_check.py."""

import os
import sys
import tempfile

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

from health_check import (
    check_directory_not_empty,
    check_path_exists,
    run_health_check,
)


class TestCheckPathExists:
    """Tests for check_path_exists function."""

    def test_existing_file(self, capsys):
        """Test detection of existing file."""
        with tempfile.NamedTemporaryFile(delete=False) as f:
            result = check_path_exists(f.name, "test file")
            assert result is True

            captured = capsys.readouterr()
            assert "✅" in captured.out
            os.unlink(f.name)

    def test_nonexistent_file(self, capsys):
        """Test detection of non-existent file."""
        result = check_path_exists("/nonexistent/path", "missing file")
        assert result is False

        captured = capsys.readouterr()
        assert "❌" in captured.out


class TestCheckDirectoryNotEmpty:
    """Tests for check_directory_not_empty function."""

    def test_empty_directory(self, capsys):
        """Test detection of empty directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = check_directory_not_empty(tmpdir, "empty dir")
            assert result is False

            captured = capsys.readouterr()
            assert "⚠️" in captured.out or "empty" in captured.out.lower()

    def test_non_empty_directory(self, capsys):
        """Test detection of non-empty directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a file in the directory
            open(os.path.join(tmpdir, "file.txt"), "w").close()

            result = check_directory_not_empty(tmpdir, "non-empty dir")
            assert result is True

            captured = capsys.readouterr()
            assert "✅" in captured.out

    def test_nonexistent_directory(self, capsys):
        """Test detection of non-existent directory."""
        result = check_directory_not_empty("/nonexistent/dir", "missing dir")
        assert result is False

        captured = capsys.readouterr()
        assert "❌" in captured.out


class TestRunHealthCheck:
    """Tests for run_health_check function."""

    def test_runs_without_error(self, capsys):
        """Test that health check runs without exceptions."""
        # Run from framework root
        framework_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # Should not raise
        result = run_health_check(framework_root)

        # Result should be 0 or 1
        assert result in [0, 1]

        captured = capsys.readouterr()
        assert "Health Check" in captured.out

    def test_outputs_summary(self, capsys):
        """Test that health check outputs a summary."""
        framework_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        run_health_check(framework_root)

        captured = capsys.readouterr()
        # Should have some kind of conclusion
        assert "✅" in captured.out or "❌" in captured.out or "⚠️" in captured.out
