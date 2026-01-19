import os
import shutil
import sys
import tempfile
import unittest


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from payload.scripts.doc_ops import (
    deps,
    get_dependencies,
    get_frontmatter,
    reverse_deps,
    scope,
    search_docs,
)


class TestDocNavRLM(unittest.TestCase):
    def setUp(self):
        # Create a temp directory for project root
        self.test_dir = tempfile.mkdtemp()
        self.project_root = self.test_dir
        self.dev_ops_dir = os.path.join(self.project_root, ".dev_ops")
        self.arch_dir = os.path.join(self.dev_ops_dir, "docs", "architecture")
        os.makedirs(self.arch_dir, exist_ok=True)

        # Create dummy structure
        # core.md -> depends on utils.md
        # api.md -> depends on core.md
        # app.md -> depends on api.md

        self.create_doc("utils.md", title="Utils", path="src/utils")
        self.create_doc("core.md", title="Core", path="src/core", dependencies=["utils.md"])
        self.create_doc("api.md", title="API", path="src/api", dependencies=["core.md"])
        self.create_doc("app.md", title="App", path="src/app", dependencies=["api.md"])
        self.create_doc("ui.md", title="User Interface", path="src/ui", dependencies=["api.md"])

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def create_doc(self, filename, title, path, dependencies=None):
        content = f"""---
title: "{title}"
path: "{path}"
status: "draft"
---

# {title}

## Overview

Description of {title}.

## Dependencies

| Component | Reason |
|-----------|--------|
"""
        if dependencies:
            for dep in dependencies:
                content += f"| [{dep}]({dep}) | Uses logic |\n"

        with open(os.path.join(self.arch_dir, filename), "w") as f:
            f.write(content)

    def test_get_frontmatter(self):
        doc_path = os.path.join(self.arch_dir, "core.md")
        fm = get_frontmatter(doc_path)
        self.assertEqual(fm.get("title"), "Core")
        self.assertEqual(fm.get("path"), "src/core")

    def test_get_dependencies(self):
        doc_path = os.path.join(self.arch_dir, "core.md")
        deps_list = get_dependencies(doc_path)
        self.assertIn("utils.md", deps_list)
        self.assertEqual(len(deps_list), 1)

    def test_search_docs(self):
        # Search by title
        matches = search_docs("Core", project_root=self.project_root)
        self.assertGreaterEqual(len(matches), 1)
        # Core.md should be first because of title match (score 3) vs content match (score 1)
        self.assertEqual(matches[0]["doc_path"], "core.md")

        # Search by path content
        matches = search_docs("api", project_root=self.project_root)
        # Should find api.md (title match) and app.md/ui.md (dependency match if searched full content,
        # but here we search title/path/content of doc itself)
        # api.md title="API" -> match
        # app.md deps on api, but does it contain "api"? Yes in dependency table.
        found_docs = [m["doc_path"] for m in matches]
        self.assertIn("api.md", found_docs)

    def test_deps_transitive(self):
        # app -> api -> core -> utils
        doc_path = os.path.join(self.arch_dir, "app.md")
        all_deps = deps(doc_path, project_root=self.project_root)
        self.assertIn("api.md", all_deps)
        self.assertIn("core.md", all_deps)
        self.assertIn("utils.md", all_deps)

    def test_reverse_deps(self):
        # Who depends on api.md? app.md and ui.md
        doc_path = os.path.join(self.arch_dir, "api.md")
        rdeps = reverse_deps(doc_path, project_root=self.project_root)
        self.assertIn("app.md", rdeps)
        self.assertIn("ui.md", rdeps)
        self.assertNotIn("core.md", rdeps)

    def test_scope(self):
        # Scope for "App"
        result = scope("App", project_root=self.project_root)

        # Should find app.md
        self.assertIn("app.md", result["matched_docs"])

        # Should include code path for app
        self.assertIn("src/app", result["code_paths"])

        # Should return transitive deps: api, core, utils
        self.assertIn("api.md", result["transitive_deps"])
        self.assertIn("core.md", result["transitive_deps"])

        # Should include code paths for deps
        self.assertIn("src/api", result["code_paths"])
        self.assertIn("src/core", result["code_paths"])


if __name__ == "__main__":
    unittest.main()
