#!/usr/bin/env python3
"""Tests for template_ops.py."""

import os
import sys
import tempfile

import pytest

# Add scripts to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from template_ops import extract_template_from_workflow


class TestExtractTemplateFromWorkflow:
    """Tests for extract_template_from_workflow function."""

    def test_nonexistent_file_returns_empty(self):
        """Test that non-existent file returns empty string."""
        result = extract_template_from_workflow("/nonexistent/path.md")
        assert result == ""

    def test_file_without_template_section_returns_empty(self):
        """Test that file without ## Template section returns empty."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write("# Workflow\n\n## Steps\n\n1. Do something\n")
            f.flush()

            result = extract_template_from_workflow(f.name)
            assert result == ""

            os.unlink(f.name)

    def test_extracts_triple_backtick_markdown(self):
        """Test extraction from ```markdown blocks."""
        content = """# Workflow

## Template

```markdown
# Title

## Section
Content here
```

## Steps
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write(content)
            f.flush()

            result = extract_template_from_workflow(f.name)

            assert "# Title" in result
            assert "## Section" in result
            assert "Content here" in result

            os.unlink(f.name)

    def test_extracts_quad_backtick_text(self):
        """Test extraction from ````text blocks (for nested code)."""
        content = """# Workflow

## Template

````text
# Document

```python
def example():
    pass
```
````

## Other
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write(content)
            f.flush()

            result = extract_template_from_workflow(f.name)

            assert "# Document" in result
            assert "```python" in result
            assert "def example():" in result

            os.unlink(f.name)

    def test_extracts_raw_content(self):
        """Test extraction of raw content without wrapper."""
        content = """# Workflow

## Template

Raw template content here
With multiple lines

## Steps
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write(content)
            f.flush()

            result = extract_template_from_workflow(f.name)

            assert "Raw template content here" in result
            assert "With multiple lines" in result

            os.unlink(f.name)

    def test_template_at_end_of_file(self):
        """Test extraction when Template section is at end of file."""
        content = """# Workflow

## Steps

1. Do something

## Template

```markdown
# Final Template
```"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write(content)
            f.flush()

            result = extract_template_from_workflow(f.name)

            assert "# Final Template" in result

            os.unlink(f.name)
