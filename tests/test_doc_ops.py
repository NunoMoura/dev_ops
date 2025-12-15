#!/usr/bin/env python3
"""Tests for doc_ops.py document operations."""

import unittest
import os
import tempfile
import shutil
import sys

# Add scripts to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts import doc_ops


class TestDocOps(unittest.TestCase):
    """Tests for document operations."""

    def setUp(self):
        """Create temporary directory for test docs."""
        self.test_dir = tempfile.mkdtemp()
        self.original_docs_dir = doc_ops.DOCS_DIR
        doc_ops.DOCS_DIR = self.test_dir

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.test_dir, ignore_errors=True)
        doc_ops.DOCS_DIR = self.original_docs_dir

    def test_get_default_template_adr(self):
        """Test ADR template generation."""
        template = doc_ops.get_default_template("adr")
        self.assertIn("{{id}}", template)
        self.assertIn("{{title}}", template)
        self.assertIn("Status", template)
        self.assertIn("Context", template)
        self.assertIn("Decision", template)

    def test_get_default_template_bug(self):
        """Test Bug template generation."""
        template = doc_ops.get_default_template("bug")
        self.assertIn("{{id}}", template)
        self.assertIn("Priority", template)
        self.assertIn("Status", template)
        self.assertIn("Description", template)

    def test_get_default_template_plan(self):
        """Test Plan template generation."""
        template = doc_ops.get_default_template("plan")
        self.assertIn("{{id}}", template)
        self.assertIn("Goal", template)
        self.assertIn("Proposed Changes", template)

    def test_get_default_template_research(self):
        """Test Research template generation."""
        template = doc_ops.get_default_template("research")
        self.assertIn("{{id}}", template)
        self.assertIn("Question", template)
        self.assertIn("Findings", template)

    def test_extract_template_no_file(self):
        """Test extract_template with non-existent file."""
        result = doc_ops.extract_template("/nonexistent/path.md")
        self.assertEqual(result, "")

    def test_extract_template_with_markdown_block(self):
        """Test extract_template with markdown code block."""
        content = """# Workflow

## Template

```markdown
Template Content Here
```
"""
        tmp_file = os.path.join(self.test_dir, "test_workflow.md")
        with open(tmp_file, "w") as f:
            f.write(content)

        result = doc_ops.extract_template(tmp_file)
        self.assertEqual(result.strip(), "Template Content Here")


class TestDocOpsListDocs(unittest.TestCase):
    """Tests for list_docs functionality."""

    def setUp(self):
        """Create temporary directory with test docs."""
        self.test_dir = tempfile.mkdtemp()
        self.original_docs_dir = doc_ops.DOCS_DIR
        doc_ops.DOCS_DIR = self.test_dir

        # Create bug directory with test files
        bug_dir = os.path.join(self.test_dir, "bugs")
        os.makedirs(bug_dir)
        open(os.path.join(bug_dir, "BUG-001-test.md"), "w").close()
        open(os.path.join(bug_dir, "BUG-002-another.md"), "w").close()

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.test_dir, ignore_errors=True)
        doc_ops.DOCS_DIR = self.original_docs_dir

    def test_list_docs_unknown_type(self):
        """Test list_docs with unknown document type."""
        # Should not raise, just print message
        doc_ops.list_docs("unknown_type")


if __name__ == "__main__":
    unittest.main()
