import unittest
import os
import glob
import re
from scripts.template_ops import extract_template_from_workflow


# Paths
tests_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(tests_dir)
workflows_dir = os.path.join(project_root, "workflows")
rules_dir = os.path.join(project_root, "rules")


class TestIntegrity(unittest.TestCase):
    def test_workflows_have_templates(self):
        """Verify all workflows have extractable templates."""
        workflow_files = glob.glob(os.path.join(workflows_dir, "*.md"))
        self.assertTrue(len(workflow_files) > 0, "No workflow files found!")

        for wf_path in workflow_files:
            # Skip bootstrap.md and test.md as they might not have templates in the same way?
            # Actually, check if they *should* have templates. All creation workflows should.
            # We can just try check if extraction returns non-empty string for key workflows.
            filename = os.path.basename(wf_path)

            # List of workflows that definitely need templates
            required_templates = [
                "report_bug.md",
                "create_adr.md",
                "research.md",
                "create_plan.md",
                "add_task.md",
            ]

            if filename in required_templates:
                try:
                    content = extract_template_from_workflow(wf_path)
                    self.assertTrue(
                        content and len(content) > 10,
                        f"Template extraction failed or empty for {filename}",
                    )
                except Exception as e:
                    self.fail(f"Failed to extract template from {filename}: {str(e)}")

    def test_file_rules_have_globs(self):
        """Verify file_*.md rules have 'globs' frontmatter."""
        rule_files = glob.glob(os.path.join(rules_dir, "file_*.md"))
        self.assertTrue(len(rule_files) > 0, "No file rules found!")

        for rule_path in rule_files:
            with open(rule_path, "r") as f:
                content = f.read()

            # Simple check for globs: "..."
            match = re.search(r'globs: "(.*)"', content)
            self.assertTrue(
                match, f"{os.path.basename(rule_path)} missing 'globs' frontmatter"
            )
            self.assertTrue(
                len(match.group(1)) > 0,
                f"{os.path.basename(rule_path)} has empty globs",
            )


if __name__ == "__main__":
    unittest.main()
