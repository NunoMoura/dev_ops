import os
import sys
import tempfile

import pytest

# Add relevant paths to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(root_dir, "payload", "scripts"))
sys.path.insert(0, os.path.join(root_dir, "installer"))


@pytest.fixture
def temp_project():
    """Create a temporary project directory for testing.

    This creates a .dev_ops directory to match the new framework structure.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        dev_ops_dir = os.path.join(tmpdir, ".dev_ops")
        os.makedirs(dev_ops_dir)

        yield tmpdir
