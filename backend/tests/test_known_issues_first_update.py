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
HUB_RANK_TESTS = SRC / "components/statistical-analysis/statistical-tests/NonParametricTests.jsx"
SQC_UPLOAD = SRC / "components/sqc/DataUploadStep.jsx"
SQC_CHART = SRC / "components/sqc/ChartConfigurationStep.jsx"
HUB_SERVICE = SRC / "components/statistical-analysis/utils/hubTestService.js"
DEBUGGER = SRC / "components/statistical-debugger/utils/debuggerEngine.js"
DEBUGGER_PANEL = SRC / "components/statistical-debugger/DebuggerPanel.jsx"
CI_PAGE = SRC / "components/confidence_intervals/ConfidenceIntervalsPage.jsx"
CI_DASHBOARD = SRC / "components/confidence_intervals/calculators/CalculatorDashboard.jsx"
CI_DIFFERENCES = SRC / "components/confidence_intervals/calculators/DifferenceCalculator.jsx"
VERIFY_REPORT = SRC / "components/manuscript/VerificationReport.jsx"
LINKER = Path(settings.BASE_DIR) / "core/manuscript/claim_data_linker.py"
RANK_TESTS = Path(settings.BASE_DIR) / "core/hp_nonparametric_comprehensive.py"
ENGINE = Path(settings.BASE_DIR) / "core/services/cascade_engine.py"
GENOMICS = Path(settings.BASE_DIR) / "core/services/genomics/differential_expression.py"
PINNED = Path(settings.BASE_DIR) / "requirements-pinned.txt"
CONSTRAINTS = Path(settings.BASE_DIR) / "image/constraints-live.txt"
QUESTIONS = Path(settings.BASE_DIR) / "core/services/autonomous_query_handler.py"

ENTRIES = [
    'Degrees of freedom and the confidence interval read "N/A"',
    "A Guardian confidence score although nothing was said about the design",
    'Two columns of categories get "Test execution failed"',
    "A Mann-Whitney test with one very small group is exact up to 1,000 values in the other group, and approximate above",
    'Mean difference, confidence interval and effect size read "N/A"',
    "Normality is checked on the two samples, not on their differences",
    "The guidelines tell the reader to choose a test from a normality test",
    "The paired t-test shows no mean difference",
    "The debugger of a paired test says that it has no numeric data",
    'The result of every rank test is labelled "Normal approximation"',
    "A signed-rank result changes with the unit in which the data are typed",
    "Of the four rank tests, Guardian is asked about the Mann-Whitney test only",
    'The "Measurement Column" menu of a control chart is empty',
    "Every calculator asks for a project, and none can be made",
    "The report does not say that rows were left out",
    'A reported "p < .001" is printed as "0.0010"',
    'The signed-rank route with `zero_method` "pratt" or "zsplit"',
    "The e-mail address, the saved projects and the receipts are kept",
]
BEFORE = [5.1, 6.3, 4.4, 8.0, 5.5, 7.7, 5.9, 6.6]
AFTER = [5.4, 6.0, 4.7, 8.3, 5.2, 8.1, 6.3, 6.5]
# seven pairs typed with one decimal: five values rise by 0.3 and two fall by 0.3
SEVEN_BEFORE = [5.1, 6.3, 7.2, 4.4, 8.0, 5.5, 6.1]
SEVEN_AFTER = [5.4, 6.0, 7.5, 4.7, 8.3, 5.2, 6.4]
# eight values against sixty, no value twice
EIGHT = [3.1, 14.2, 27.3, 41.4, 55.5, 62.6, 78.7, 91.8]
SIXTY = [round(1.37 * k + 0.05, 2) for k in range(1, 61)]
# eight low values, and eight lower ones, against the first values of one long series; no value twice
EIGHT_LOW = [3.1, 5.2, 9.3, 14.4, 21.5, 30.6, 47.7, 58.8]
EIGHT_LOWER = [1.1, 3.2, 6.3, 8.4, 12.5, 19.6, 27.7, 44.8]


def series(n):
    return [round(0.097 * k + 0.013, 3) for k in range(1, n + 1)]


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

    def test_no_page_names_a_method_for_the_pairs_that_do_not_differ(self):
        naming = sorted(str(path.relative_to(SRC)) for path in SRC.rglob("*.js*")
                        if "__tests__" not in path.parts and "zero_method" in read(path))
        # the service sends "wilcox" unless it is handed another method, and nothing hands it one;
        # the panel that offers the three methods belongs to a workbench that no file imports
        self.assertEqual(naming, ["components/TestRecommender/TestSelectionPanel.jsx", "services/NonParametricTestsService.js"])
        self.assertIn("        zero_method: options.zero_method || 'wilcox',", read(SRC / "services/NonParametricTestsService.js"))
        importing = [str(path.relative_to(SRC)) for path in SRC.rglob("*.js*")
                     if path.name != "TestRecommenderWorkbench.jsx" and "TestRecommenderWorkbench" in read(path)]
        self.assertEqual(importing, [])
        self.assertIn("      runBackendTest(endpoints.nonparametric.wilcoxon, {\n        x: pairedData.sample1,\n"
                      "        y: pairedData.sample2,\n        alternative: 'two-sided'\n      });", read(HUB_RANK_TESTS))

    def test_the_debugger_under_a_rank_test_without_a_group_column(self):
        tab, panel, engine = read(HUB_RANK_TESTS), read(DEBUGGER_PANEL), read(DEBUGGER)
        # one panel for the four tests of the tab; it is handed the groups, and there are none without a group column
        self.assertEqual(tab.count("<DebuggerPanel"), 1)
        hand_over = tab[tab.index("<DebuggerPanel"):]
        self.assertIn("            data={{\n              groups: groupedData,\n", hand_over[:160])
        self.assertIn("    if (!selectedColumn || !groupColumn || !data) return {};\n", tab)
        # the signed-rank and the Friedman test take their columns from elsewhere
        self.assertIn("    if (!selectedColumn || !selectedColumn2 || !data) return null;\n", tab)
        self.assertIn("    } else if (testType === 'wilcoxon' && pairedData) {\n", tab)
        self.assertIn("    } else if (testType === 'friedman' && friedmanData) {\n", tab)
        self.assertIn("message: 'No numeric data available for analysis',", engine)
        # the number under "Effect Size" is shown with its sign, and the word is chosen from the signed number
        self.assertIn("{debugReport.powerAnalysis?.observedEffectSize?.toFixed(3) || 'N/A'}", panel)
        self.assertIn("? (debugReport.powerAnalysis.observedEffectSize < 0.2 ? 'Small'", panel)
        self.assertIn("  analysis.observedEffectSize = effectSize;\n", engine)
        self.assertIn('a negative effect size reads "Small" whatever its size', self.flat)

    def test_of_the_rank_tests_only_the_mann_whitney_test_gets_a_guardian_check(self):
        tab, engine = read(HUB_RANK_TESTS), read(DEBUGGER)
        check = tab[tab.index("      // Prepare data based on test type"):tab.index("        // Call Guardian service")]
        self.assertEqual(one_line(check), one_line("""
      // Prepare data based on test type
      let dataToCheck = null;
      let backendTestType = '';

      try {
        if (testType === 'mann-whitney') {
          if (Object.keys(groupedData).length !== 2) return;
          const groups = Object.values(groupedData);
          if (groups[0].length < 2 || groups[1].length < 2) return;
          dataToCheck = groupedData;
          backendTestType = 'mann_whitney';
        } else {
          // For other non-parametric tests, we'll add support later
          return;
        }
"""))
        self.assertEqual(tab.count("guardianService.checkAssumptions("), 1)
        # what the debugger then lists
        self.assertIn("if (!assumptions || Object.keys(assumptions).length === 0) {", engine)
        self.assertIn("message: 'No assumption checks were performed',", engine)
        self.assertEqual(tab.count("assumptions={guardianReport || {}}"), 2)

    def test_the_hub_gives_every_rank_test_the_same_label(self):
        tab, server = read(HUB_RANK_TESTS), read(RANK_TESTS)
        self.assertIn("label={result.exact_p_value ? 'Exact p-value' : 'Normal approximation'}", tab)
        self.assertIn("<strong>p-value {result.exact_p_value ? '(exact)' : '(normal approximation)'}</strong>", tab)
        # the server has the field and gives it no value anywhere
        self.assertIn("    exact_p_value: Optional[Decimal] = None\n", server)
        self.assertEqual(re.findall(r"\bexact_p_value\s*=[^=]", server), [])
        # where the server takes the exact distribution, and the approximation of the two other tests
        self.assertIn('        if not ties["has_ties"] and n1 < 20 and n2 < 20:\n            p_method = "exact"\n', server)
        self.assertIn("        if n_reduced < 25:\n            # Use exact p-value for small samples\n"
                      "            p_value = self._wilcoxon_exact_p(w_stat, n_reduced, alternative)\n", server)
        self.assertIn("p_value = self._to_decimal(stats.chi2.sf(float(h_stat), df))", server)
        self.assertIn("p_value = self._to_decimal(stats.chi2.sf(float(chi_f), k - 1))", server)
        self.assertIn("when both groups have fewer than 20 values and no value occurs twice, and the p-value of a "
                      "signed-rank test from the exact distribution of untied ranks when fewer than 25 pairs differ.", self.flat)

    def test_the_engine_and_the_genomics_analysis_name_the_approximation_above_a_thousand_values(self):
        from core.utils.mann_whitney_method import LARGEST_GROUP_LEFT_TO_SCIPY, mann_whitney_method

        self.assertEqual(LARGEST_GROUP_LEFT_TO_SCIPY, 1000)
        self.assertEqual([mann_whitney_method(8, 1000), mann_whitney_method(1000, 8), mann_whitney_method(8, 1001),
                          mann_whitney_method(1001, 8)], ["auto", "auto", "asymptotic", "asymptotic"])
        engine = read(ENGINE)
        self.assertEqual(engine.count("stats.mannwhitneyu("), 1)
        self.assertEqual(engine.count("method=mann_whitney_method("), 1)
        genomics = read(GENOMICS)
        self.assertEqual(genomics.count("stats.mannwhitneyu("), 1)
        self.assertIn("method=mann_whitney_method(len(group1), len(group2))", genomics)
        self.assertIn("cascade_result = self.cascade_engine.execute_with_cascade(data_for_test, selected_test, alpha=alpha)",
                      read(QUESTIONS))
        resolve("/api/v1/autonomous/cascade/")
        resolve("/api/v1/nonparametric/mann-whitney/")
        self.assertIn("The server asks for the normal approximation when the larger group has more than 1,000 values and "
                      "leaves the choice to SciPy otherwise; the answer does not say which was used.", self.flat)
        # the two versions of SciPy that the entry names
        self.assertIn("\nscipy==1.17.1\n", read(CONSTRAINTS))
        self.assertIn("\nscipy==1.11.3\n", read(PINNED))
        self.assertIn("with SciPy 1.17.1, the version in the image. With SciPy 1.11.3, the version that "
                      "`backend/requirements-pinned.txt` names,", self.flat)

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

    def test_the_hub_looks_for_the_mean_difference_under_a_name_the_paired_answer_does_not_have(self):
        self.assertIn("    meanDifference: num(hp.mean_diff),", read(HUB_SERVICE))
        self.assertIn("<TableCell align=\"right\">{fmt(pairedResult.sampleMean, 4)}</TableCell>", read(HUB_PARAMETRIC))
        result = self._t_test("paired")["high_precision_result"]
        self.assertNotIn("mean_diff", result)
        # the mean of the differences is there, under "mean", and it is the statistic times the standard error
        mean, se, t = (float(result[name]) for name in ("mean", "se", "t_statistic"))
        self.assertAlmostEqual(mean, sum(b - a for b, a in zip(BEFORE, AFTER)) / len(BEFORE), places=12)
        self.assertAlmostEqual(mean, t * se, places=12)

    def test_the_debugger_does_not_read_the_two_columns_it_is_handed(self):
        engine = read(DEBUGGER)
        extract = engine[engine.index("function extractNumericValues(data) {"):]
        extract = extract[:extract.index("\n}\n") + 3]
        for read_form in ("if (Array.isArray(data)) {", "if (data.values && Array.isArray(data.values)) {", "if (data.groups) {"):
            self.assertIn(read_form, extract)
        self.assertNotIn("values1", engine)
        self.assertIn("message: 'No numeric data available for analysis',", engine)
        # the paired result hands the debugger its two columns as values1 and values2
        hub = read(HUB_PARAMETRIC)
        panel = hub[hub.index('<DebuggerPanel\n            testType="paired_t_test"'):]
        self.assertIn("values1: pairs.first,\n              values2: pairs.second,", panel[:400])

    def test_the_signed_rank_route_with_a_named_method_for_the_pairs_that_do_not_differ(self):
        x, y = [3] * 9 + [1, 2, 3, 4, 5], [3] * 9 + [2, 4, 6, 8, 10]      # nine pairs that do not differ, five that rise

        def answer(**sent):
            response = self.client.post("/api/v1/nonparametric/wilcoxon/", {"x": x, "y": y, "alternative": "two-sided", **sent},
                                        format="json", HTTP_X_FORWARDED_PROTO="https")
            self.assertEqual(response.status_code, 200, response.content[:200])
            return response.json()["high_precision_result"]

        self.assertEqual(f"{float(answer(zero_method='pratt')['p_value']):.6f}", "0.000122")
        self.assertEqual(f"{float(answer(zero_method='zsplit')['p_value']):.4f}", "0.0419")
        for method in ("pratt", "zsplit"):
            self.assertEqual(answer(zero_method=method)["sample_sizes"], [14, 14])
        without_a_method = answer()
        self.assertEqual(without_a_method["sample_sizes"], [14, 5])
        self.assertEqual(float(without_a_method["p_value"]), 0.0625)       # 2 / 2 ** 5
        self.assertIn('the route returns 0.000122 with "pratt" and 0.0419 with "zsplit"; the five pairs that differ cannot give '
                      "less than 0.0625.", one_line(read(FILE)))
        self.assertIn("and the route returns 0.0625 for these data.", one_line(read(FILE)))

    def _rank_test(self, name, body):
        response = self.client.post(f"/api/v1/nonparametric/{name}/", body, format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content[:200])
        return response.json()["results"]

    def test_the_server_does_not_say_which_method_a_rank_test_used(self):
        from scipy import stats

        x, y = [1.2, 3.4, 2.2, 5.1, 4.8, 0.9], [2.9, 6.3, 7.7, 5.6, 8.4, 6.9, 9.1]          # no value twice
        mann_whitney = self._rank_test("mann-whitney", {"group1": x, "group2": y, "alternative": "two-sided",
                                                        "use_continuity": True, "calculate_effect_size": True})
        exact = float(stats.mannwhitneyu(x, y, alternative="two-sided", method="exact").pvalue)
        approximate = float(stats.mannwhitneyu(x, y, alternative="two-sided", method="asymptotic").pvalue)
        self.assertAlmostEqual(float(mann_whitney["p_value"]), exact, places=12)
        self.assertGreater(abs(exact - approximate), 0.001)
        signed_rank = self._rank_test("wilcoxon", {"x": BEFORE, "y": AFTER, "alternative": "two-sided"})
        self.assertEqual(signed_rank["sample_sizes"], [8, 8])                               # fewer than 25 pairs differ
        kruskal_wallis = self._rank_test("kruskal-wallis", {"groups": [x, y, [4.1, 9.9, 7.2, 3.3, 8.8]]})
        friedman = self._rank_test("friedman", {"measurements": [[1.1, 2.4, 3.2], [2.0, 2.9, 3.7], [1.5, 3.1, 2.8],
                                                                 [2.2, 2.6, 4.0], [1.9, 3.5, 3.3]]})
        for answer in (mann_whitney, signed_rank, kruskal_wallis, friedman):
            self.assertIn("p_value", answer)
            self.assertNotIn("exact_p_value", answer)

    def test_a_signed_rank_result_changes_with_the_unit(self):
        from itertools import product

        def p_value(x, y):
            return float(self._rank_test("wilcoxon", {"x": x, "y": y, "alternative": "two-sided"})["p_value"])

        differences = [b - a for a, b in zip(SEVEN_BEFORE, SEVEN_AFTER)]
        self.assertEqual(sorted(f"{d:+.1f}" for d in differences), ["+0.3"] * 5 + ["-0.3"] * 2)      # equal on paper
        self.assertGreater(len({abs(d) for d in differences}), 1)                                     # not in the machine
        as_typed = p_value(SEVEN_BEFORE, SEVEN_AFTER)
        in_tenths = p_value([round(10 * v) for v in SEVEN_BEFORE], [round(10 * v) for v in SEVEN_AFTER])
        self.assertEqual((f"{as_typed:.3f}", f"{in_tenths:.3f}"), ("0.156", "0.375"))
        # seven tied differences share the rank 4: the statistic is 4 times the number that fall, and every
        # pattern of signs is as likely as any other
        falls = [sum(signs) for signs in product((0, 1), repeat=7)]
        exact = min(1.0, 2 * min(sum(f <= 2 for f in falls), sum(f >= 2 for f in falls)) / len(falls))
        self.assertEqual(exact, 58 / 128)
        self.assertNotAlmostEqual(as_typed, exact, places=2)
        self.assertNotAlmostEqual(in_tenths, exact, places=2)
        text = one_line(read(FILE))
        self.assertIn("the route returns p = 0.156 for the data as typed and p = 0.375 for the same data in tenths.", text)
        self.assertIn("the exact value for these seven tied differences is 58/128 = 0.453.", text)
        self.assertEqual(f"{exact:.3f}", "0.453")

    def test_eight_values_against_many_are_counted_exactly_by_the_engine_and_approximated_by_the_route(self):
        from scipy import stats

        self.assertEqual(len(set(EIGHT + SIXTY)), 68)                                         # no value twice
        exact = float(stats.mannwhitneyu(EIGHT, SIXTY, alternative="two-sided", method="exact").pvalue)
        approximate = float(stats.mannwhitneyu(EIGHT, SIXTY, alternative="two-sided", method="asymptotic").pvalue)
        self.assertGreater(abs(exact - approximate), 1e-4)
        response = self.client.post("/api/v1/autonomous/cascade/", {"test": "mann_whitney_u", "data": {"group1": EIGHT, "group2": SIXTY}},
                                    format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content[:200])
        answer = response.json()
        self.assertEqual(answer["final_test"], "mann_whitney_u")
        self.assertAlmostEqual(answer["result"]["p_value"], exact, places=12)
        # the other route names the method itself: the normal approximation from 20 values in a group
        route = self._rank_test("mann-whitney", {"group1": EIGHT, "group2": SIXTY, "alternative": "two-sided"})
        self.assertAlmostEqual(float(route["p_value"]), approximate, places=12)
        self.assertIn("has a rule of its own, the approximation as soon as one group has 20 values or more, so the same data "
                      "can get two p-values on two pages.", one_line(read(FILE)))

    def test_one_value_more_in_the_large_group_changes_the_method_and_the_answer_does_not_say_so(self):
        from scipy import stats

        def both(small, n):
            many = series(n)
            self.assertEqual(len(set(small + many)), 8 + n)                                   # no value twice
            exact = float(stats.mannwhitneyu(small, many, alternative="two-sided", method="exact").pvalue)
            approximate = float(stats.mannwhitneyu(small, many, alternative="two-sided", method="asymptotic").pvalue)
            response = self.client.post("/api/v1/autonomous/cascade/",
                                        {"test": "mann_whitney_u", "data": {"group1": small, "group2": many}},
                                        format="json", HTTP_X_FORWARDED_PROTO="https")
            self.assertEqual(response.status_code, 200, response.content[:200])
            self.assertEqual(response.json()["final_test"], "mann_whitney_u")
            said = json.dumps(response.json()).lower()
            for word in ("exact", "asymptotic", "approximation", "method"):
                self.assertNotIn(word, said)
            return exact, approximate, response.json()["result"]["p_value"]

        text = one_line(read(FILE))
        exact, approximate, answered = both(EIGHT_LOW, 1000)
        self.assertAlmostEqual(answered, exact, places=12)
        self.assertEqual(f"{answered:.4f}", "0.0109")
        exact, approximate, answered = both(EIGHT_LOW, 1001)
        self.assertAlmostEqual(answered, approximate, places=12)
        self.assertEqual((f"{answered:.4f}", f"{exact:.4f}"), ("0.0128", "0.0108"))
        self.assertIn("Eight values against 1,000 got the exact p-value, 0.0109, in one example; with one value more in the "
                      "large group the answer was the approximation, 0.0128, where the exact value is 0.0108.", text)
        exact, approximate, answered = both(EIGHT_LOWER, 1001)
        self.assertAlmostEqual(answered, approximate, places=12)
        self.assertEqual((f"{answered:.5f}", f"{exact:.5f}"), ("0.00086", "0.00036"))
        self.assertIn("Far in the tail the two differ more: 0.00086 against an exact 0.00036 in another example.", text)

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
