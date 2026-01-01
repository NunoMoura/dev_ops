#!/usr/bin/env python3
"""Tests for sync_version.py."""

import json
import os
import sys
from unittest.mock import MagicMock, patch

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dev_ops", "scripts"))

from sync_version import check_sync, get_versions


def test_get_versions_all_present(tmp_path):
    """Test getting versions when all files are present."""
    root = tmp_path
    (root / "extension").mkdir()

    (root / "pyproject.toml").write_text('version = "1.2.3"')
    (root / "extension" / "package.json").write_text(json.dumps({"version": "1.2.3"}))
    (root / "__init__.py").write_text('__version__ = "1.2.3"')

    with patch("sync_version.Path") as mock_path_class:
        # Mock the instance returned by Path(__file__)
        mock_instance = MagicMock()
        mock_path_class.return_value = mock_instance
        mock_instance.parent.parent = root

        # Mock / operator to return real Path objects
        mock_instance.parent.parent.__truediv__.side_effect = lambda x: root / x

        # Since we can't easily make MagicMock behave like a Path fully for read_text,
        # we rely on the fact that the code does:
        # root = Path(__file__).parent.parent
        # toml = (root / "pyproject.toml").read_text()
        # If root / "..." returns a REAL Path object (from tmp_path), read_text works!

        # However, getting `root` from mock property access `parent.parent`.
        # mock_instance.parent.parent IS a MagicMock by default.
        # We set it to `root` (real Path) in line 28?
        # No, `root` is a PosixPath.
        # `mock_instance.parent.parent = root` assigns the real Path object to the attribute.
        # So `root / "file"` invokes Path.__truediv__.
        # This SHOULD work without side_effect magic if we assign options.

        # But `Path(__file__)` returns `mock_instance`.
        # `mock_instance.parent` -> Mock.
        # `mock_instance.parent.parent` -> assigned `root`.
        # Code: `root_dir = Path(__file__).parent.parent`

        versions = get_versions()
        assert versions["pyproject.toml"] == "1.2.3"
        assert versions["extension/package.json"] == "1.2.3"
        assert versions["__init__.py"] == "1.2.3"


@patch("sync_version.Path")
def test_get_versions_successful(mock_path_class, tmp_path):
    """Test get_versions with mocked filesystem."""
    root = tmp_path

    # Create the files
    (root / "pyproject.toml").write_text('version = "1.0.0"')
    (root / "extension").mkdir()
    (root / "extension" / "package.json").write_text('{"version": "1.0.0"}')
    (root / "__init__.py").write_text('__version__ = "1.0.0"')

    # Mock Path hierarchy
    mock_instance = MagicMock()
    mock_path_class.return_value = mock_instance
    mock_instance.parent.parent = root

    versions = get_versions()
    assert versions["pyproject.toml"] == "1.0.0"
    assert versions["extension/package.json"] == "1.0.0"
    assert versions["__init__.py"] == "1.0.0"


def test_check_sync_match():
    """Test check_sync when versions match."""
    with patch("sync_version.get_versions") as mock_get:
        mock_get.return_value = {"a": "1.0", "b": "1.0"}
        assert check_sync() == 0


def test_check_sync_mismatch():
    """Test check_sync when versions mismatch."""
    with patch("sync_version.get_versions") as mock_get:
        mock_get.return_value = {"a": "1.0", "b": "1.1"}
        assert check_sync() == 1
