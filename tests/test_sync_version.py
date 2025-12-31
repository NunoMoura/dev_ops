#!/usr/bin/env python3
"""Tests for sync_version.py."""

import json
from unittest.mock import MagicMock, patch

from scripts.sync_version import check_sync, get_versions


def test_get_versions_all_present(tmp_path):
    """Test getting versions when all files are present."""
    root = tmp_path
    (root / "extension").mkdir()

    (root / "pyproject.toml").write_text('version = "1.2.3"')
    (root / "extension" / "package.json").write_text(json.dumps({"version": "1.2.3"}))
    (root / "__init__.py").write_text('__version__ = "1.2.3"')

    with patch("scripts.sync_version.Path") as mock_path:
        mock_path.return_value.parent.parent = root
        # Mocking exists() and read_text() on Path objects returned by /
        # This is tricky because Path(/) returns a new object.
        # Better to mock the whole module's file access if possible, or use pyfakefs.
        # But we'll try mocking Path's return values.

        # Actually, let's just use real files since we have tmp_path!
        # But sync_version uses Path(__file__).parent.parent which is hard to control.

    # Second attempt: patch Path directly in the module
    with patch("scripts.sync_version.Path") as mock_p:
        mock_p.return_value.__truediv__.side_effect = lambda x: root / x
        # Wait, sync_version does root / "extension" / "package.json"
        # So we need to mock recursively.

    # Third attempt: Just mock get_versions for check_sync,
    # and mock the file reads for get_versions.
    pass


@patch("scripts.sync_version.Path")
def test_get_versions_successful(mock_path_class, tmp_path):
    """Test get_versions with mocked filesystem."""
    root = tmp_path
    mock_path_class.return_value.parent.parent = root

    # Create the files
    (root / "pyproject.toml").write_text('version = "1.0.0"')
    (root / "extension").mkdir()
    (root / "extension" / "package.json").write_text('{"version": "1.0.0"}')
    (root / "__init__.py").write_text('__version__ = "1.0.0"')

    # We need to ensure that when sync_version calls Path() it gets our mocked root
    # But it calls Path(__file__) which we can patch.

    with patch("scripts.sync_version.Path") as mock_p:
        # Mock Path(__file__)
        mock_instance = MagicMock()
        mock_instance.parent.parent = root
        mock_p.return_value = mock_instance

        versions = get_versions()
        assert versions["pyproject.toml"] == "1.0.0"
        assert versions["extension/package.json"] == "1.0.0"
        assert versions["__init__.py"] == "1.0.0"


def test_check_sync_match():
    """Test check_sync when versions match."""
    with patch("scripts.sync_version.get_versions") as mock_get:
        mock_get.return_value = {"a": "1.0", "b": "1.0"}
        assert check_sync() == 0


def test_check_sync_mismatch():
    """Test check_sync when versions mismatch."""
    with patch("scripts.sync_version.get_versions") as mock_get:
        mock_get.return_value = {"a": "1.0", "b": "1.1"}
        assert check_sync() == 1
