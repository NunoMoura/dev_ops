#!/usr/bin/env python3
"""Tests for doc_ops.py."""

import os
import tempfile
import pytest

# Add scripts to path
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from doc_ops import DOC_TYPES, get_default_template


class TestDocTypes:
    """Test document type configuration."""

    def test_prefix_consistency(self):
        """Test that prefixes match expected format."""
        expected = {
            "adr": "ADR",
            "bug": "BUG",
            "plan": "PLAN",
            "research": "RESEARCH",
        }
        for doc_type, expected_prefix in expected.items():
            assert DOC_TYPES[doc_type]["prefix"] == expected_prefix, (
                f"Prefix mismatch for {doc_type}: expected {expected_prefix}"
            )

    def test_all_types_have_dir(self):
        """Test that all document types have a directory configured."""
        for doc_type, config in DOC_TYPES.items():
            assert "dir" in config, f"Missing dir for {doc_type}"
            assert "prefix" in config, f"Missing prefix for {doc_type}"


class TestTemplates:
    """Test template loading."""

    def test_get_default_template_plan(self):
        """Test loading plan template."""
        template = get_default_template("plan")
        assert "{{id}}" in template or "PLAN" in template
        assert "{{title}}" in template or "title" in template.lower()

    def test_get_default_template_research(self):
        """Test loading research template."""
        template = get_default_template("research")
        assert "{{id}}" in template or "RESEARCH" in template

    def test_get_default_template_adr(self):
        """Test loading ADR template."""
        template = get_default_template("adr")
        assert "{{id}}" in template or "ADR" in template

    def test_get_default_template_bug(self):
        """Test loading bug template."""
        template = get_default_template("bug")
        assert "{{id}}" in template or "BUG" in template
