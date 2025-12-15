import unittest
import os
import tempfile
from scripts.utils import sanitize_slug, get_next_id


class TestIdGen(unittest.TestCase):
    def test_sanitize_slug(self):
        self.assertEqual(sanitize_slug("Hello World"), "hello-world")
        self.assertEqual(sanitize_slug("Fix: The Login Bug!"), "fix-the-login-bug")
        self.assertEqual(sanitize_slug("  Spaces  "), "spaces")
        self.assertEqual(sanitize_slug(""), "untitled")
        self.assertEqual(sanitize_slug(None), "untitled")

    def test_get_next_id_empty_dir(self):
        with tempfile.TemporaryDirectory() as tmpdirname:
            # Empty dir
            next_id = get_next_id("TST", tmpdirname)
            self.assertEqual(next_id, "TST-001")

    def test_get_next_id_existing_files(self):
        with tempfile.TemporaryDirectory() as tmpdirname:
            # Create dummy files
            open(os.path.join(tmpdirname, "TST-001-foo.md"), "a").close()
            open(os.path.join(tmpdirname, "TST-002-bar.md"), "a").close()

            next_id = get_next_id("TST", tmpdirname)
            self.assertEqual(next_id, "TST-003")

    def test_get_next_id_mixed_files(self):
        with tempfile.TemporaryDirectory() as tmpdirname:
            # Create messy files
            open(os.path.join(tmpdirname, "TST-001.md"), "a").close()
            open(
                os.path.join(tmpdirname, "OTHER-005.md"), "a"
            ).close()  # Should be ignored
            open(os.path.join(tmpdirname, "TST-010-gap.md"), "a").close()

            # Next should be 11
            next_id = get_next_id("TST", tmpdirname)
            self.assertEqual(next_id, "TST-011")


if __name__ == "__main__":
    unittest.main()
