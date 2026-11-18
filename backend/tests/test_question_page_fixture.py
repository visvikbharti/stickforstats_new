"""The question page is tested with what the server sends.

frontend/src/components/autonomous/__tests__/fixtures/questionPage.json holds a small data file, a question,
and the answers of the two endpoints the page calls for them. The page's Jest tests render those answers. This
test sends the same file and question to the endpoints and compares, so that the saved answers stay the
endpoints' answers. (The page's earlier tests used answers written by hand, in shapes the server never sent:
the page crashed on the server's own.)
"""

import json
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

FIXTURE = (Path(settings.BASE_DIR).parent / "frontend" / "src" / "components" / "autonomous" / "__tests__"
           / "fixtures" / "questionPage.json")


@override_settings(RATE_LIMIT_ENABLED=False, SECURE_SSL_REDIRECT=False)
class TheSavedAnswersAreTheEndpointsAnswersTest(SimpleTestCase):
    def setUp(self):
        self.saved = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def _upload(self):
        return SimpleUploadedFile("doses.csv", self.saved["csv"].encode(), content_type="text/csv")

    def _compare(self, saved, sent, path=""):
        if isinstance(saved, dict):
            self.assertIsInstance(sent, dict, path)
            self.assertEqual(sorted(saved), sorted(sent), f"the fields under {path or 'the answer'} differ")
            for key in saved:
                self._compare(saved[key], sent[key], f"{path}.{key}")
        elif isinstance(saved, list):
            self.assertIsInstance(sent, list, path)
            self.assertEqual(len(saved), len(sent), path)
            for index, (a, b) in enumerate(zip(saved, sent)):
                self._compare(a, b, f"{path}[{index}]")
        elif isinstance(saved, float):
            self.assertAlmostEqual(saved, sent, delta=max(1e-9, 1e-9 * abs(saved)), msg=path)
        else:
            self.assertEqual(saved, sent, path)

    def test_the_profile(self):
        response = APIClient().post("/api/v1/autonomous/profile/", {"file": self._upload()}, format="multipart")
        self.assertEqual(response.status_code, 200, response.content[:300])
        self._compare(self.saved["profile"], response.json())

    def test_the_answer(self):
        response = APIClient().post("/api/v1/autonomous/query/", {
            "file": self._upload(), "query": self.saved["question"], "mode": "plain_english", "alpha": "0.05"}, format="multipart")
        self.assertEqual(response.status_code, 200, response.content[:300])
        self._compare(self.saved["answer"], response.json())

    def test_the_two_shapes_the_page_has_to_read(self):
        # variables keyed by name, and the interpretation of the effect size as an object
        self.assertEqual(sorted(self.saved["profile"]["variables"]), ["dose", "response"])
        self.assertEqual(sorted(self.saved["profile"]["variables"]["dose"])[:4], ["has_outliers", "is_normal", "mean", "median"])
        self.assertEqual(self.saved["answer"]["translation"]["effect_size_interpretation"],
                         {"category": "very strong", "label": "Very strong"})
