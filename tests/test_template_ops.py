import unittest
import os
import tempfile
from scripts.shared_utils.template_ops import extract_template_from_workflow


class TestTemplateOps(unittest.TestCase):
    def test_extract_simple_wrapper(self):
        # Case 1: ```markdown wrapper
        content = """
# Workflow

## Template

```markdown
Template Content
```
"""
        with tempfile.NamedTemporaryFile(mode="w+", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            extracted = extract_template_from_workflow(tmp_path)
            self.assertEqual(extracted.strip(), "Template Content")
        finally:
            os.remove(tmp_path)

    def test_extract_text_wrapper(self):
        # Case 2: ````text wrapper (Our new standard)
        content = """
# Workflow

## Template

````text
Template Content with equal backticks inside
```yaml
foo: bar
```
````
"""
        with tempfile.NamedTemporaryFile(mode="w+", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            extracted = extract_template_from_workflow(tmp_path)
            expected = (
                "Template Content with equal backticks inside\n```yaml\nfoo: bar\n```"
            )
            self.assertEqual(extracted.strip(), expected)
        finally:
            os.remove(tmp_path)

    def test_extract_no_wrapper(self):
        # Case 3: No wrapper (Should return raw content under ## Template)
        content = """
# Workflow

## Template

Raw Content
"""
        with tempfile.NamedTemporaryFile(mode="w+", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            extracted = extract_template_from_workflow(tmp_path)
            # The function usually only extracts if it finds the section.
            # If no code block, it might return the whole section text.
            # Let's see implementation. It currently assumes code block wrapper is optional?
            # Looking at template_ops.py in previous turns:
            # It extracts everything after "## Template".
            # Then it checks for wrapper regex. If match, unwraps. If not, returns raw.
            self.assertEqual(extracted.strip(), "Raw Content")
        finally:
            os.remove(tmp_path)


if __name__ == "__main__":
    unittest.main()
