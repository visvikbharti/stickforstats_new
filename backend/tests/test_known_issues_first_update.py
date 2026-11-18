"""KNOWN_ISSUES.md says what the pages and the server do today.

Each entry of the file is compared with the code it describes, or with what the server answers. When one of
the defects is repaired, its test here fails, and the entry goes in the same commit.
"""
import json
import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase, override_settings
from django.urls import Resolver404, resolve
from rest_framework.test import APITestCase

ROOT = Path(settings.BASE_DIR).parent
SRC = ROOT / "frontend/src"
FILE = ROOT / "KNOWN_ISSUES.md"
RESULTS = SRC / "components/autonomous/PlainEnglishResults.jsx"
SAVED = SRC / "components/autonomous/__tests__/fixtures/questionPage.json"
ERASURE = SRC / "pages/privacyErasure.js"
T_TEST_PAGE = SRC / "modules/TTestRealBackend.jsx"
HUB_TESTS = SRC / "components/statistical-analysis/statistical-tests/StatisticalTests.jsx"
HUB_PARAMETRIC = SRC / "components/statistical-analysis/statistical-tests/ParametricTests.jsx"
SQC_UPLOAD = SRC / "components/sqc/DataUploadStep.jsx"
SQC_CHART = SRC / "components/sqc/ChartConfigurationStep.jsx"
CI_PAGE = SRC / "components/confidence_intervals/ConfidenceIntervalsPage.jsx"
CI_DASHBOARD = SRC / "components/confidence_intervals/calculators/CalculatorDashboard.jsx"
CI_DIFFERENCES = SRC / "components/confidence_intervals/calculators/DifferenceCalculator.jsx"
VERIFY_REPORT = SRC / "components/manuscript/VerificationReport.jsx"
LINKER = Path(settings.BASE_DIR) / "core/manuscript/claim_data_linker.py"

ENTRIES = [
    'Degrees of freedom and the confidence interval read "N/A"',
    "A Guardian confidence score although nothing was said about the design",
    'Two columns of categories get "Test execution failed"',
    'Mean difference, confidence interval and effect size read "N/A"',
    "Normality is checked on the two samples, not on their differences",
    "The guidelines tell the reader to choose a test from a normality test",
    'The "Measurement Column" menu of a control chart is empty',
    "Every calculator asks for a project, and none can be made",
    "The report does not say that rows were left out",
    'A reported "p < .001" is printed as "0.0010"',
    "A group that does not vary ends the check in a server error",
    "The e-mail address, the saved projects and the receipts are kept",
]
BEFORE = [5.1, 6.3, 4.4, 8.0, 5.5, 7.7, 5.9, 6.6]
AFTER = [5.4, 6.0, 4.7, 8.3, 5.2, 8.1, 6.3, 6.5]


def read(path):
    return path.read_text(encoding="utf-8")


def one_line(text):
    return " ".join(text.split())


class KnownIssuesTest(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.text = read(FILE)
        cls.flat = one_line(cls.text)
        cls.page = read(RESULTS)
        # what POST /api/v1/autonomous/query/ answers; tests/test_question_page_fixture.py keeps it true
        cls.answer = json.loads(read(SAVED))["answer"]

    def test_the_entries_of_the_file(self):
        self.assertEqual(re.findall(r"^### (.+)$", self.text, re.M), ENTRIES)
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
        service = read(SRC / "services/AutonomousService.js")
        ask = service[service.index("export const queryAnalysis"):service.index("export const executeCascade")]
        self.assertEqual(re.findall(r"formData\.append\('(\w+)'", ask), ["file", "query", "mode", "alpha"])
        self.assertIn("const payload = { query, data: dataSource, mode, alpha };", ask)
        for declaration in ("unit_ids", "matched", "declared_independent", "outcome_type", "design"):
            self.assertNotIn(declaration, ask)

    def test_the_guidelines_of_the_hub(self):
        hub = read(HUB_TESTS)
        self.assertIn("<strong>Check Assumptions First:</strong> Use normality tests before parametric tests", hub)
        self.assertIn("<strong>Choose Appropriate Tests:</strong> Parametric tests for normal data, non-parametric for others", hub)
        self.assertIn('"Use normality tests before parametric tests" and "Parametric tests for normal data, '
                      'non-parametric for others"', self.flat)

    def test_the_control_chart_step_reads_the_column_types_in_another_form_than_the_upload_step_records(self):
        upload, chart = read(SQC_UPLOAD), read(SQC_CHART)
        # the upload step records a word for each column, for a file and for the example data
        self.assertIn("columnTypes[header] = 'numeric';", upload)
        self.assertIn("columnTypes[header] = 'categorical';", upload)
        self.assertIn("? 'numeric'\n                : 'categorical'", upload)
        self.assertNotIn("type: 'numeric'", upload)
        # the chart step looks for the word inside an object, finds none, and offers no numeric column
        self.assertIn("const columnType = dataset.columnTypes[header]?.type || 'unknown';", chart)
        self.assertIn("{numericColumns.map(column => (", chart)
        resolve("/api/v1/sqc-analysis/quick-control-chart/")

    def test_the_calculators_have_no_project_and_no_way_to_make_one(self):
        page, dashboard = read(CI_PAGE), read(CI_DASHBOARD)
        self.assertIn("const [projects, setProjects] = useState([]);", page)
        self.assertEqual(page.count("setProjects"), 1)                      # declared, and never called
        self.assertIn('<Route path="calculators" element={<CalculatorDashboard projects={projects} />} />', page)
        self.assertIn("Please select or create a project to start calculations.", dashboard)
        self.assertIn("disabled={!Array.isArray(projects) || projects.length === 0}", dashboard)
        # the address the "Differences" calculator posts to is not one the server has
        self.assertIn("axios.post('/api/confidence-intervals/calculate-difference/', requestData)", read(CI_DIFFERENCES))
        with self.assertRaises(Resolver404):
            resolve("/api/confidence-intervals/calculate-difference/")
        for part in ("mean", "proportion", "compare", "bootstrap"):
            resolve(f"/api/v1/confidence-intervals/calculate/{part}/")

    def test_the_report_of_the_manuscript_check(self):
        report = read(VERIFY_REPORT)
        # the server writes the note about rows into the claim's notes
        self.assertIn("left out of both columns; {len(complete)} complete rows were tested", read(LINKER))
        # the page reads a claim's notes in one place, and keeps those that speak of a conflict
        self.assertEqual(report.count("claim.notes"), 2)
        self.assertIn("return (claim.notes || []).some((n) => String(n).toLowerCase().includes('conflict'));", report)
        self.assertIn("const conflictNotes = (claim.notes || []).filter((n) =>\n"
                      "              String(n).toLowerCase().includes('conflict')", report)
        # and prints a p-value with four decimals, and 0 as "0"
        format_p = report[report.index("export function formatP(value)"):report.index("export function formatStat(value)")]
        self.assertIn("if (n === 0) return '0';", format_p)
        self.assertIn("if (n < 0.0001) return n.toExponential(2);", format_p)
        self.assertIn("return n.toFixed(4);", format_p)
        self.assertIn("<TableCell>{formatP(claim.claimed && claim.claimed.p_value)}</TableCell>", report)
        self.assertIn("<TableCell sx={{ fontWeight: 600 }}>Reported p</TableCell>", report)

    def test_the_hub_runs_the_test_when_the_check_fails(self):
        hub = read(HUB_PARAMETRIC)
        self.assertIn("        // Don't block test if Guardian service fails\n        setIsTestBlocked(false);", hub)
        self.assertIn("<strong>Guardian validation unavailable:</strong> {guardianError}", hub)

    def test_closing_an_account_keeps_the_address_the_projects_and_the_receipts(self):
        erasure = read(ERASURE)
        self.assertIn("Your email address stays in our database, because it is also your username.", erasure)
        self.assertIn("Saved projects and receipts are not deleted. They stay linked to the deactivated account.", erasure)
        self.assertEqual(erasure[erasure.index("export const ERASURE_KEEPS = ["):].split("];")[0].count("\n  "), 2)
        self.assertIn("the e-mail address stays in the database, because it is also the username, and saved projects and "
                      "receipts are not deleted and stay linked to the deactivated account.", self.flat)


@override_settings(RATE_LIMIT_ENABLED=False)
class WhatTheServerAnswersTest(APITestCase):
    def _t_test(self, test_type):
        body = {"data1": BEFORE, "test_type": test_type, "options": {"check_assumptions": True}}
        if test_type != "one_sample":
            body["data2"] = AFTER
        response = self.client.post("/api/v1/stats/ttest/", body, format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content[:200])
        return response.json()

    def test_two_columns_of_categories(self):
        rows = [{"treatment": t, "outcome": o} for t, o in (
            ("drug", "improved"), ("drug", "improved"), ("drug", "same"), ("drug", "improved"), ("placebo", "same"),
            ("placebo", "same"), ("placebo", "improved"), ("placebo", "same"), ("drug", "improved"), ("placebo", "same"),
            ("drug", "same"), ("placebo", "same"))]
        question = {"query": "Is the outcome related to the treatment?", "data": rows, "mode": "auto", "alpha": 0.05}
        response = self.client.post("/api/v1/autonomous/query/", question, format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content[:200])
        answer = response.json()
        self.assertEqual(answer["translation"]["summary"], "Test execution failed: could not convert string to float: 'drug'")
        self.assertIsNone(answer["cascade_result"])
        resolve("/api/v1/categorical/chi-square/independence/")

    def test_the_fields_the_t_test_page_reads(self):
        page = read(T_TEST_PAGE)
        for line in ("{results.mean_difference || 'N/A'}", "[{results.ci_lower || 'N/A'}, {results.ci_upper || 'N/A'}]",
                     "{results.effect_size || 'N/A'}"):
            self.assertIn(line, page)
        reads = ("mean_difference", "ci_lower", "ci_upper", "effect_size")
        for test_type in ("paired", "one_sample"):
            result = self._t_test(test_type)["high_precision_result"]
            self.assertEqual([name for name in reads if result.get(name) is not None], [], test_type)
            for shown in ("t_statistic", "df", "p_value", "se"):
                self.assertIsNotNone(result.get(shown), (test_type, shown))
        independent = self._t_test("two_sample")["high_precision_result"]
        self.assertEqual([name for name in reads if independent.get(name) is not None], list(reads))

    def test_the_paired_test_of_the_page_checks_each_sample(self):
        assumptions = self._t_test("paired")["assumptions"]
        self.assertEqual(sorted(assumptions), ["normality_data1", "normality_data2", "outliers_data1", "sample_size"])
        page = read(T_TEST_PAGE)
        self.assertIn("const norm1 = assumptions.normality_data1;", page)
        self.assertIn("const norm2 = assumptions.normality_data2;", page)

    def test_the_guardian_check_of_the_hub_looks_at_the_differences(self):
        from unittest import mock

        import numpy as np

        from core.guardian import guardian_core

        seen = []
        real = guardian_core.NormalityValidator.validate

        def spy(validator, arrays, *args, **kwargs):
            seen.append([np.asarray(a, dtype=float) for a in arrays])
            return real(validator, arrays, *args, **kwargs)

        with mock.patch.object(guardian_core.NormalityValidator, "validate", spy):
            guardian_core.GuardianCore().check(data=[np.array(BEFORE), np.array(AFTER)], test_type="t_test", design="paired")
        self.assertEqual(len(seen), 1)
        self.assertEqual(len(seen[0]), 1)
        np.testing.assert_allclose(seen[0][0], np.array(BEFORE) - np.array(AFTER))

    def test_a_group_that_does_not_vary(self):
        self.client.raise_request_exception = False
        for test_type, data in (("t_test", [[5.0, 5.0, 5.0, 5.0], [1.0, 2.0, 3.0, 4.5]]),
                                ("mann_whitney", [[1.0, 2.0, 3.0, 4.5], [5.0, 5.0, 5.0, 5.0]]),
                                ("anova", [[5.0, 5.0, 5.0, 5.0], [1.0, 2.0, 3.0, 4.5], [2.0, 2.5, 3.5, 9.0]])):
            with self.subTest(test_type=test_type):
                response = self.client.post("/api/guardian/check/", {"data": data, "test_type": test_type}, format="json",
                                            HTTP_X_FORWARDED_PROTO="https")
                self.assertEqual(response.status_code, 500)
                self.assertIn(b"Server Error (500)", response.content)
