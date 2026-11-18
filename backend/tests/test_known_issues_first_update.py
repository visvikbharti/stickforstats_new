"""KNOWN_ISSUES.md says what the page and the server do today.

Each entry of the file is compared with the code it describes. When one of the defects is repaired,
its test here fails, and the entry goes in the same commit.
"""
import json
import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

ROOT = Path(settings.BASE_DIR).parent
FILE = ROOT / "KNOWN_ISSUES.md"
RESULTS = ROOT / "frontend/src/components/autonomous/PlainEnglishResults.jsx"
SAVED = ROOT / "frontend/src/components/autonomous/__tests__/fixtures/questionPage.json"
ERASURE = ROOT / "frontend/src/pages/privacyErasure.js"


class KnownIssuesTest(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.text = FILE.read_text(encoding="utf-8")
        cls.page = RESULTS.read_text(encoding="utf-8")
        # what POST /api/v1/autonomous/query/ answers; tests/test_question_page_fixture.py keeps it true
        cls.answer = json.loads(SAVED.read_text(encoding="utf-8"))["answer"]

    def test_the_entries_of_the_file(self):
        self.assertEqual(re.findall(r"^### (.+)$", self.text, re.M), [
            'Degrees of freedom and the confidence interval read "N/A"',
            "A Guardian confidence score although nothing was said about the design",
            "The e-mail address is kept",
        ])
        for entry in self.text.split("\n### ")[1:]:
            for part in ("- **Where:**", "- **What happens:**", "- **Until it is fixed:**"):
                self.assertEqual(entry.count(part), 1, entry[:40])

    def test_the_page_looks_for_the_degrees_of_freedom_under_another_name(self):
        result = self.answer["cascade_result"]["result"]
        self.assertEqual(result["degrees_of_freedom"], 36.0)
        self.assertNotIn("df", result)
        self.assertNotIn("confidence_interval", result)
        self.assertIn("{ label: 'Degrees of Freedom', value: r.df != null ? r.df : 'N/A' },", self.page)
        self.assertIn("{ label: 'Confidence Interval', value: formatCI(r.confidence_interval) },", self.page)
        self.assertNotIn("r.degrees_of_freedom", self.page)
        self.assertIn("`cascade_result.result.degrees_of_freedom`", self.text)

    def test_a_score_is_shown_with_an_answer_to_a_request_that_declares_nothing(self):
        cascade = self.answer["cascade_result"]
        self.assertEqual(cascade["confidence_score"], 1.0)
        # the component shows whatever score it is given
        self.assertIn("const confidenceScore = cascadeResult?.confidence_score;", self.page)
        self.assertIn("if (score == null) return null;", self.page)
        # and the page's request holds the file (or the rows), the question, the mode and alpha
        service = (ROOT / "frontend/src/services/AutonomousService.js").read_text(encoding="utf-8")
        ask = service[service.index("export const queryAnalysis"):service.index("export const executeCascade")]
        self.assertEqual(re.findall(r"formData\.append\('(\w+)'", ask), ["file", "query", "mode", "alpha"])
        self.assertIn("const payload = { query, data: dataSource, mode, alpha };", ask)
        for declaration in ("unit_ids", "matched", "declared_independent", "outcome_type", "design"):
            self.assertNotIn(declaration, ask)

    def test_closing_an_account_keeps_the_address(self):
        erasure = ERASURE.read_text(encoding="utf-8")
        self.assertIn("Your email address stays in our database, because it is also your username.", erasure)
        self.assertIn("The e-mail address stays in the database, because it is also the username.", " ".join(self.text.split()))
