"""backend/openapi.yaml does not say that the API is fully compliant with a standard.

Its description ended with "This API is fully compliant with:" and a list: FDA 21 CFR Part 11, GxP
guidelines, ISO 9001:2015, HIPAA (when configured). That is more than the project can show, and the
sentence is gone with its heading and its list.

The file is served by no route and shown on no page. One file loads it, backend/swagger-config.js,
a configuration for a Node server; nothing loads that file, and the backend has no Node package. It
is read in the repository.
"""
import subprocess
from pathlib import Path

import yaml
from django.conf import settings
from django.test import SimpleTestCase

BACKEND = Path(settings.BASE_DIR)
FILE = BACKEND / "openapi.yaml"


class TheSentenceIsGoneTest(SimpleTestCase):
    def setUp(self):
        self.text = FILE.read_text(encoding="utf-8")

    def test_the_file_does_not_say_fully_compliant(self):
        self.assertNotIn("fully compliant", self.text.lower())
        self.assertNotIn("## Compliance", self.text)
        for standard in ("GxP", "ISO 9001", "HIPAA"):
            self.assertNotIn(standard, self.text)

    def test_the_file_is_still_read_as_what_it_was(self):
        document = yaml.safe_load(self.text)
        self.assertEqual((document["openapi"], document["info"]["title"]), ("3.0.3", "StickForStats API"))
        description = document["info"]["description"]
        self.assertTrue(description.rstrip().endswith("- Enterprise users: Unlimited"), description[-200:])
        self.assertGreater(len(document["paths"]), 10)

    def test_nothing_serves_the_file(self):
        root = BACKEND.parent
        tracked = subprocess.run(["git", "-C", str(root), "ls-files"], capture_output=True, text=True)
        if tracked.returncode != 0:
            self.skipTest("the tree is not a git checkout here, so the tracked files cannot be listed")
        files = [name for name in tracked.stdout.splitlines() if name.endswith((".py", ".js", ".jsx", ".conf", ".yml", ".yaml", ".sh"))
                 or name.startswith("nginx/")]
        naming = sorted(name for name in files if "openapi.yaml" in (root / name).read_text(encoding="utf-8", errors="replace")
                        and not name.startswith("backend/tests/"))
        self.assertEqual(naming, ["backend/swagger-config.js"])
        loading = sorted(name for name in files if "swagger-config" in (root / name).read_text(encoding="utf-8", errors="replace")
                         and name != "backend/swagger-config.js" and not name.startswith("backend/tests/"))
        self.assertEqual(loading, [])
        self.assertFalse((BACKEND / "package.json").exists())
