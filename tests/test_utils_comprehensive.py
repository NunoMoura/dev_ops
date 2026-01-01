#!/usr/bin/env python3
"""Comprehensive tests for utils.py helper functions."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

from unittest.mock import MagicMock, patch

import pytest
from utils import (
    DevOpsError,
    get_next_id,
    prompt_user,
    read_file,
    run_command,
    sanitize_slug,
    write_file,
)


@pytest.fixture
def temp_dir(tmp_path):
    return str(tmp_path)


class TestSanitizeSlug:
    """Test sanitize_slug function."""

    def test_basic_sanitization(self):
        """Test basic slug sanitization."""
        assert sanitize_slug("Hello World") == "hello-world"

    def test_special_characters(self):
        """Test removing special characters."""
        result = sanitize_slug("Test@#$%^&*()Task!")
        assert "@" not in result
        assert "#" not in result
        assert "!" not in result

    def test_spaces_removed(self):
        """Test spaces are removed."""
        assert " " not in sanitize_slug("multi word task")

    def test_lowercase(self):
        """Test conversion to lowercase."""
        result = sanitize_slug("UPPERCASE")
        assert result.islower()

    def test_dashes(self):
        """Test handling of dashes."""
        result = sanitize_slug("task-with-dashes")
        # Dashes usually converted or removed
        assert "task" in result


class TestGetNextId:
    """Test get_next_id function."""

    def test_first_id(self, temp_dir):
        """Test generating first ID."""
        next_id = get_next_id("TST", temp_dir)
        assert next_id == "TST-001"

    def test_sequential_ids(self, temp_dir):
        """Test sequential ID generation."""
        # Create existing files
        os.makedirs(temp_dir, exist_ok=True)
        open(os.path.join(temp_dir, "TST-001-first.md"), "w").close()
        open(os.path.join(temp_dir, "TST-002-second.md"), "w").close()

        next_id = get_next_id("TST", temp_dir)
        assert next_id == "TST-003"

    def test_non_sequential_ids(self, temp_dir):
        """Test ID generation with gaps."""
        os.makedirs(temp_dir, exist_ok=True)
        open(os.path.join(temp_dir, "TST-001-first.md"), "w").close()
        open(os.path.join(temp_dir, "TST-005-fifth.md"), "w").close()

        next_id = get_next_id("TST", temp_dir)
        # Should find highest and increment
        assert next_id == "TST-006"


class TestFileOperations:
    """Test file read/write utilities."""

    def test_write_read_roundtrip(self, temp_dir):
        """Test writing and reading file."""
        filepath = os.path.join(temp_dir, "test.txt")
        content = "Test content\\nLine 2"

        write_file(filepath, content)
        read_content = read_file(filepath)

        assert read_content == content

    def test_write_creates_directory(self, temp_dir):
        """Test write_file creates parent directories."""
        filepath = os.path.join(temp_dir, "subdir", "nested", "file.txt")

        write_file(filepath, "content")

        assert os.path.exists(filepath)

    def test_read_nonexistent(self, temp_dir):
        """Test reading nonexistent file."""
        filepath = os.path.join(temp_dir, "nonexistent.txt")

        with pytest.raises(FileNotFoundError):
            read_file(filepath)


class TestPromptUser:
    """Test prompt_user function."""

    @patch("builtins.input")
    def test_prompt_with_input(self, mock_input):
        """Test prompting user for input."""
        mock_input.return_value = "user response"
        # BATCH_MODE is usually set in tests
        with patch.dict("os.environ", {"BATCH_MODE": "true"}):
            result = prompt_user("Enter value")
            assert result == "user response"

    def test_prompt_headless(self):
        """Test prompt in headless mode."""
        with patch.dict("os.environ", {"HEADLESS": "true"}):
            assert prompt_user("Q", default="D") == "D"
            assert prompt_user("Q") == "TODO_FILL_ME"

    @patch("builtins.input")
    def test_prompt_tty_fail(self, mock_input):
        """Test prompt when tty fails."""
        with patch("sys.stdin.isatty", return_value=False):
            with patch.dict("os.environ", {}, clear=True):
                # Mocking open("/dev/tty") to fail
                with patch("builtins.open", side_effect=OSError()):
                    assert prompt_user("Q", default="D") == "D"

    @patch("builtins.input")
    def test_prompt_tty_success(self, mock_input):
        """Line 60: prompt_user TTY success."""
        mock_input.return_value = "yes"
        with patch("sys.stdin.isatty", return_value=True):
            with patch.dict("os.environ", {}, clear=True):
                assert prompt_user("Q") == "yes"

    def test_prompt_tty_read_success(self):
        """Line 63-66: prompt_user TTY read success."""
        mock_tty = MagicMock()
        mock_tty.readline.return_value = "tty-res\n"
        mock_tty.__enter__.return_value = mock_tty
        with patch("sys.stdin.isatty", return_value=False):
            with patch.dict("os.environ", {}, clear=True):
                with patch("builtins.open", return_value=mock_tty):
                    assert prompt_user("Q") == "tty-res"

    @patch("builtins.input")
    def test_prompt_generic_exception(self, mock_input):
        """Line 69-70: prompt_user generic exception."""
        mock_input.side_effect = EOFError()
        # Ensure BATCH_MODE is NOT set to hit the try-except block
        with patch.dict("os.environ", {"BATCH_MODE": ""}, clear=True):
            with patch("sys.stdin.isatty", return_value=True):
                assert prompt_user("Q", default="fallback") == "fallback"


@patch("subprocess.run")
class TestRunCommand:
    """Test run_command function."""

    def test_successful_command(self, mock_run):
        """Test running successful command."""
        mock_run.return_value = MagicMock(returncode=0, stdout="output", stderr="")
        assert run_command("echo hello") == "output"

    def test_command_failure(self, mock_run):
        """Test command failure scenarios."""
        from subprocess import CalledProcessError

        mock_run.side_effect = CalledProcessError(1, "cmd", stderr="error")

        # Raise on error
        from utils import CommandError

        with pytest.raises(CommandError):
            run_command("bad-cmd")

        # Quiet failure
        assert run_command("bad-cmd", raise_on_error=False, quiet=True) == ""

    def test_command_failure_verbose(self, mock_run):
        """Line 204-205: run_command verbose failure."""
        from subprocess import CalledProcessError

        mock_run.side_effect = CalledProcessError(1, "cmd", stderr="error details")
        with patch("builtins.print") as mock_print:
            assert run_command("bad-cmd", raise_on_error=False, quiet=False) == ""
            mock_print.assert_any_call("Error running command: bad-cmd")
            mock_print.assert_any_call("error details")


class TestDevOpsError:
    """Test custom exception."""

    def test_error_creation(self):
        """Test creating DevOpsError."""
        error = DevOpsError("Test error message")
        assert str(error) == "Test error message"

    def test_error_raised(self):
        """Test raising DevOpsError."""
        with pytest.raises(DevOpsError):
            raise DevOpsError("Error occurred")
