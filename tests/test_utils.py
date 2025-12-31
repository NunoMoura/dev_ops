#!/usr/bin/env python3
"""Tests for utils.py."""

import os
import sys
import tempfile

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from utils import (
    CommandError,
    get_next_id,
    read_file,
    run_command,
    sanitize_slug,
    write_file,
)
from utils import (
    FileExistsError as DevOpsFileExistsError,
)


class TestGetNextId:
    """Tests for get_next_id function."""

    def test_first_id_empty_directory(self):
        """Test that first ID is 001 when directory is empty."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = get_next_id("PLN", tmpdir)
            assert result == "PLN-001"

    def test_first_id_nonexistent_directory(self):
        """Test that first ID is 001 when directory doesn't exist."""
        result = get_next_id("PLN", "/nonexistent/path")
        assert result == "PLN-001"

    def test_increments_existing_ids(self):
        """Test that ID increments from existing files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create some files
            open(os.path.join(tmpdir, "PLN-001-first.md"), "w").close()
            open(os.path.join(tmpdir, "PLN-002-second.md"), "w").close()
            open(os.path.join(tmpdir, "PLN-003-third.md"), "w").close()

            result = get_next_id("PLN", tmpdir)
            assert result == "PLN-004"

    def test_handles_gaps_in_sequence(self):
        """Test that ID finds the max, even with gaps."""
        with tempfile.TemporaryDirectory() as tmpdir:
            open(os.path.join(tmpdir, "PLN-001-first.md"), "w").close()
            open(os.path.join(tmpdir, "PLN-005-fifth.md"), "w").close()

            result = get_next_id("PLN", tmpdir)
            assert result == "PLN-006"

    def test_different_prefixes(self):
        """Test different prefix types."""
        with tempfile.TemporaryDirectory() as tmpdir:
            open(os.path.join(tmpdir, "RES-003-research.md"), "w").close()

            result = get_next_id("RES", tmpdir)
            assert result == "RES-004"

            # Different prefix should start at 001
            result = get_next_id("BUG", tmpdir)
            assert result == "BUG-001"


class TestSanitizeSlug:
    """Tests for sanitize_slug function."""

    def test_basic_slug(self):
        """Test basic text to slug conversion."""
        assert sanitize_slug("Hello World") == "hello-world"

    def test_special_characters_removed(self):
        """Test that special characters are removed."""
        assert sanitize_slug("Hello, World!") == "hello-world"
        assert sanitize_slug("Test@#$%") == "test"

    def test_multiple_spaces(self):
        """Test that multiple spaces become single dashes."""
        assert sanitize_slug("hello    world") == "hello-world"

    def test_empty_string(self):
        """Test empty string returns 'untitled'."""
        assert sanitize_slug("") == "untitled"
        assert sanitize_slug("   ") == "untitled"

    def test_preserves_numbers(self):
        """Test that numbers are preserved."""
        assert sanitize_slug("test123") == "test123"
        assert sanitize_slug("123 456") == "123-456"

    def test_preserves_hyphens(self):
        """Test that hyphens are preserved."""
        assert sanitize_slug("already-has-hyphens") == "already-has-hyphens"


class TestReadWriteFile:
    """Tests for read_file and write_file functions."""

    def test_write_and_read(self):
        """Test writing and reading a file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.txt")
            write_file(path, "Hello, World!", quiet=True)

            content = read_file(path)
            assert content == "Hello, World!"

    def test_write_creates_directories(self):
        """Test that write_file creates parent directories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "nested", "deep", "test.txt")
            write_file(path, "content", quiet=True)

            assert os.path.exists(path)
            assert read_file(path) == "content"

    def test_write_fails_without_overwrite(self):
        """Test that write_file raises error if file exists."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "existing.txt")
            write_file(path, "first", quiet=True)

            with pytest.raises(DevOpsFileExistsError):
                write_file(path, "second", overwrite=False, quiet=True)

    def test_write_with_overwrite(self):
        """Test that write_file overwrites with flag."""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "existing.txt")
            write_file(path, "first", quiet=True)
            write_file(path, "second", overwrite=True, quiet=True)

            assert read_file(path) == "second"


class TestRunCommand:
    """Tests for run_command function."""

    def test_successful_command(self):
        """Test running a successful command."""
        result = run_command("echo hello")
        assert result == "hello"

    def test_failed_command_raises(self):
        """Test that failed command raises CommandError."""
        with pytest.raises(CommandError):
            run_command("exit 1")

    def test_failed_command_no_raise(self):
        """Test that failed command returns empty with raise_on_error=False."""
        result = run_command("exit 1", raise_on_error=False, quiet=True)
        assert result == ""

    def test_command_output(self):
        """Test command captures output."""
        result = run_command("echo -n 'test output'")
        assert "test output" in result
