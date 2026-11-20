"""KNOWN_ISSUES.md says what the pages and the server do today.

Each entry of the file is compared with the code it describes, or with what the server answers. When one of
the defects is repaired, its test here fails, and the entry goes in the same commit.
"""
import json
import re
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from django.urls import Resolver404, resolve
from rest_framework.test import APITestCase

ROOT = Path(settings.BASE_DIR).parent
SRC = ROOT / "frontend/src"
FILE = ROOT / "KNOWN_ISSUES.md"
QUESTION_PAGE = SRC / "pages/SmartAnalysisPage.jsx"
QUESTION_BAR = SRC / "components/autonomous/NaturalLanguageBar.jsx"
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
NAVIGATION = SRC / "components/SimpleNavigation.jsx"
ROUTES = SRC / "routes/routeConfig.js"
CAUSAL_PAGE = SRC / "modules/CausalInferenceModule.jsx"
CAUSAL_GRAPH = SRC / "components/causal/DAGBuilder.jsx"
REGRESSION_MODULE = SRC / "components/statistical/RegressionCalculator.jsx"
REGRESSION_SERVICE = SRC / "services/RegressionAnalysisService.js"
GENOMICS_PAGE = SRC / "pages/GenomicsAnalysisPage.jsx"
ADVISOR_PANEL = SRC / "components/ai-advisor/AIAdvisorHub.jsx"
ADVISOR_HOOK = SRC / "components/ai-advisor/hooks/useAIAdvisor.js"
METHODS_WRITER = SRC / "components/ai-advisor/MethodsSectionGenerator.jsx"
ADVISOR_SERVICE = Path(settings.BASE_DIR) / "ai_advisor/services/ai_service.py"
QUESTIONS = Path(settings.BASE_DIR) / "core/services/autonomous_query_handler.py"
HUB_PROFILING = SRC / "components/statistical-analysis/data-profiling/DataProfiling.jsx"
HUB_UTILS = SRC / "components/statistical-analysis/utils/statisticalUtils.js"
LANDING = SRC / "components/Landing/ProfessionalLanding.jsx"
SQC_HELPER = SRC / "hooks/useSQCAnalysisAPI.js"
SQC_LESSONS = SRC / "components/sqc/education/lessons"
SQC_LESSON_HUB = SRC / "components/sqc/education/SQCEducationHub.jsx"
BUNDLE_PAGE = SRC / "components/manuscript/BundleVerifier.jsx"
OCR = Path(settings.BASE_DIR) / "core/manuscript/image_ocr.py"

ENTRIES = [
    "The question box answers no question: this version cannot read one",
    "The Guided Wizard runs no analysis",
    'Mean difference, confidence interval and effect size read "N/A"',
    "Normality is checked on the two samples, not on their differences",
    "The Friedman test leaves out a subject who has a value of 0",
    "The guidelines tell the reader to choose a test from a normality test",
    "The paired t-test shows no mean difference",
    "The debugger of a paired test says that it has no numeric data",
    'The result of every rank test is labelled "Normal approximation"',
    "A signed-rank result changes with the unit in which the data are typed",
    "Of the four rank tests, Guardian is asked about the Mann-Whitney test only",
    'The regression module ends every run with "performLinearRegression is not a function"',
    "A file of 150,000 rows replaces the Data Profiling module with the error screen",
    "A perfect rank correlation gets a p-value of 0, and the engine answers with the other rank correlation",
    'The "Measurement Column" menu of a control chart is empty',
    'In three lessons the button that asks the server ends in "is not a function"',
    "Every calculator asks for a project, and none can be made",
    'A gene with the same value in every sample is listed as "NS"',
    'A file with an empty cell is refused with "could not convert string to float"',
    "Analysing a graph replaces the page with the error screen, and two boxes of a result stay empty",
    "The advisor answers from fixed templates, and a key does not turn it on",
    "The report does not say that rows were left out",
    'A reported "p < .001" is printed as "0.0010"',
    "A figure image or a scanned PDF is not read",
    "A t-test is recomputed as Student's when its degrees of freedom are printed whole, whatever the sentence says",
    "A Mann-Whitney test with one very small group is exact up to 1,000 values in the other group, and approximate above",
    'The signed-rank route with `zero_method` "pratt" or "zsplit"',
    "The genomics routes report fold changes in the wrong direction when the two groups are not named",
    "The F test of a regression: a p-value of 0, and F = 0 with p = 1 for an exact fit",
    "A chi-square test of a 2 x 2 table gets two p-values on two routes",
    "The Friedman route reads `groups` as one list for each subject",
    "The e-mail address, the saved projects and the receipts are kept",
]
FOUR_QUESTIONS = ("Is weight different between the two groups?", "Is there a relationship between weight and height?",
                  "Can height predict weight?", "banana")
WEIGHT = [5.1, 4.8, 6.0, 5.5, 4.9, 5.7, 6.2, 5.0, 5.3, 5.8, 4.7, 6.1, 6.9, 7.4, 6.6, 7.8, 7.1, 6.8, 7.5, 7.0, 7.3, 6.7, 7.9, 7.2]
TWO_GROUPS_AND_TWO_COLUMNS = [{"group": "a" if i < 12 else "b", "weight": w, "height": 150 + 2.1 * i + (3 if i % 2 else -3)}
                              for i, w in enumerate(WEIGHT)]
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


# three genes over eight samples: higher in the first four, alike in both halves, and one value everywhere
GENE_ROWS = [[20.1, 22.4, 19.8, 21.7, 10.3, 9.6, 11.1, 10.4], [5.2, 4.9, 5.4, 5.1, 5.0, 5.3, 4.8, 5.2], [7.0] * 8]
GENE_NAMES = ["gene_up", "gene_flat", "gene_const"]


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

    def test_the_entries_of_the_file(self):
        self.assertEqual(re.findall(r"^### (.+)$", self.text, re.M), ENTRIES)
        for entry in self.text.split("\n### ")[1:]:
            for part in ("- **Where:**", "- **What happens:**", "- **Until it is fixed:**"):
                self.assertEqual(entry.count(part), 1, entry[:40])

    def test_the_question_page_says_that_no_question_is_answered(self):
        from api.v1.autonomous_views import THE_QUESTION_IS_NOT_READ

        page = read(QUESTION_PAGE)
        # before a file is uploaded, in the place of the line that invited a question
        self.assertIn("'This version cannot read a question, so no question is answered here. Run the test you want on its own page.';", page)
        self.assertEqual(page.count("{NO_QUESTION_IS_READ}"), 1)
        self.assertNotIn("ask a question in plain English", page)
        # where the answer would be: what the server said
        self.assertIn("const said = typeof err === 'string' ? err : err?.error || err?.message;", page)
        self.assertIn("{error && !queryResult && (", page)
        self.assertNotIn(THE_QUESTION_IS_NOT_READ, page)
        self.assertIn(f'It answers every request with status 501 and one sentence: "{THE_QUESTION_IS_NOT_READ}" The page shows '
                      "that sentence where the answer would be, and says before a file is uploaded that no question is answered.",
                      self.flat)
        # the kind of question beside the box is found by the page and is not sent
        bar = read(QUESTION_BAR)
        self.assertIn("{ keywords: ['correlat', 'relationship'], label: 'Relationship', color: 'secondary' },", bar)
        service = read(SRC / "services/AutonomousService.js")
        ask = service[service.index("export const queryAnalysis"):service.index("export const executeCascade")]
        self.assertEqual(re.findall(r"formData\.append\('(\w+)'", ask), ["file", "query", "mode", "alpha"])
        self.assertIn("const payload = { query, data: dataSource, mode, alpha };", ask)
        self.assertNotIn("intent", ask)
        # what the entry says still describes a question as read, and the page it sends the reader to
        self.assertIn("ask a question in plain English", read(ROOT / "README.md"))
        self.assertIn("client.autonomous.query(", read(ROOT / "sdk/python/README.md"))
        self.assertIn("sfs_query(", read(ROOT / "sdk/r/README.md"))
        self.assertIn("'/statistical-analysis-tools'", read(ROUTES))

    def test_the_wizard_of_the_question_page_runs_nothing(self):
        page = read(QUESTION_PAGE)
        # what the wizard calls to run an analysis: a function with no statement in it
        self.assertIn("  const handleWizardRunAnalysis = useCallback((query, file) => {\n"
                      "    // This will be handled by NaturalLanguageBar indirectly\n"
                      "    // For now, set state so the query result flows through\n"
                      "  }, []);\n", page)
        self.assertIn("onRunAnalysis={handleWizardRunAnalysis}", page)
        wizard = read(SRC / "components/autonomous/GuidedWizard.jsx")
        self.assertIn("const result = await onRunAnalysis(query, dataFile);", wizard)
        # it asks nothing of the server itself
        self.assertNotIn("services/", wizard)
        self.assertNotIn("apiClient", wizard)
        said = one_line(wizard)
        for shown in ("The Guardian system will validate statistical assumptions before running the analysis.",
                      'No results yet. Go back to the Analysis step and click "Run Analysis".', "Run Analysis"):
            self.assertIn(shown, said)
        self.assertIn("Independent Samples t-test", wizard)
        self.assertIn('The next step, "Results", then says "No results yet. Go back to the Analysis step and click "Run Analysis"."',
                      self.flat)

    def test_the_regression_page_shows_no_f_test(self):
        page = read(SRC / "modules/CorrelationRegressionModuleReal.jsx")
        # the two numbers are read from the answer and shown nowhere
        self.assertEqual(page.count("fStatistic"), 1)
        self.assertEqual(page.count("fPValue"), 1)
        self.assertIn("fPValue: parseFloat(regression?.statistics?.f_p_value),", page)
        self.assertIn("err.response?.data?.error || err.message || 'Could not fit the model.'", page)
        self.assertIn("{ path: '/modules/correlation-regression', component: CorrelationRegressionModuleReal,", read(ROUTES))
        self.assertIn('The page does not show the F test. For an exact line it shows "Request failed with status code 500".', self.flat)

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
        resolve("/api/v1/autonomous/cascade/")
        resolve("/api/v1/nonparametric/mann-whitney/")
        # The question page no longer leads to this test: its route analyses nothing.
        entry = self.text.split("### A Mann-Whitney test with one very small group", 1)[1].split("\n### ", 1)[0]
        self.assertNotIn("question", entry)
        self.assertIn("- **Where:** `POST /api/v1/autonomous/cascade/` with the test `mann_whitney_u`, and a gene that", entry)
        self.assertIn("The server asks for the normal approximation when the larger group has more than 1,000 values and "
                      "leaves the choice to SciPy otherwise; the answer does not say which was used.", self.flat)
        # the two versions of SciPy that the entry names
        self.assertIn("\nscipy==1.17.1\n", read(CONSTRAINTS))
        self.assertIn("\nscipy==1.11.3\n", read(PINNED))
        self.assertIn("with SciPy 1.17.1, the version in the image. With SciPy 1.11.3, the version that "
                      "`backend/requirements-pinned.txt` names,", self.flat)

    def test_the_causal_page_has_no_link_and_reads_what_the_server_does_not_send(self):
        self.assertNotIn("/modules/causal-inference", re.findall(r"path:\s*'([^']+)'", read(NAVIGATION)))
        self.assertIn("{ path: '/modules/causal-inference', component: CausalInferenceModule,", read(ROUTES))
        page = read(CAUSAL_PAGE)
        self.assertIn("{dagAnalysis.adjustment_sets.map((set, i) => (", page)
        self.assertIn("{analysisResults.adjustment_sets.map((set, i) => (", read(CAUSAL_GRAPH))
        self.assertIn("{didResults.se?.toFixed(3)}", page)
        self.assertIn("{didResults.t_stat?.toFixed(2)}", page)
        for shown in ("{didResults.did_estimate?.toFixed(3)}", "{formatPValue(didResults.p_value)}",
                      "95% CI: [{didResults.ci_lower?.toFixed(3)}, {didResults.ci_upper?.toFixed(3)}]"):
            self.assertIn(shown, page)

    def test_the_regression_module_calls_methods_its_service_does_not_have(self):
        module, service = read(REGRESSION_MODULE), read(REGRESSION_SERVICE)
        called = sorted(set(re.findall(r"regressionService\.(\w+)\(", module)))
        self.assertEqual(called, ["makePrediction", "performElasticNetRegression", "performLassoRegression",
                                  "performLinearRegression", "performLogisticRegression", "performPolynomialRegression",
                                  "performRidgeRegression", "performRobustRegression"])
        defined = set(re.findall(r"^  (?:async )?(\w+)\(", service, re.M))
        self.assertEqual(set(called) & defined, set())
        self.assertLessEqual({"linearRegression", "polynomialRegression", "ridgeRegression", "robustRegression"}, defined)
        # the eight types of the menu, and what the module does with the error
        self.assertEqual(re.findall(r"^    (\w+): \{\n      name: '", module, re.M),
                         ["linear", "multiple", "polynomial", "logistic", "ridge", "lasso", "elasticnet", "robust"])
        self.assertIn("    } catch (err) {\n      setError(err.message);\n      setResults(null);", module)
        # the request of the service has no field `type`; and "Parse Data" asks the Guardian check
        request = service[service.index("const requestData = {"):service.index("const response = await api.post('/regression/', requestData);")]
        self.assertNotRegex(request, r"\btype\b")
        self.assertIn("const result = await GuardianService.checkAssumptions(\n          formattedData,\n          'regression',", module)

    def test_the_genomics_page_shows_the_error_of_the_server_and_a_chip_for_every_gene(self):
        page = read(GENOMICS_PAGE)
        self.assertIn("throw new Error(errData.error || 'Analysis failed');", page)
        self.assertIn("{formatPValue(gene.adjusted_p_value)}", page)
        self.assertIn('<Chip size="small" label="NS" variant="outlined" />', page)
        # the page names both groups in every request, and its menu of groups has the two fixed labels
        self.assertIn("group1_name: group1Name,\n          group2_name: group2Name,", page)
        self.assertEqual(re.findall(r'<MenuItem value="(\w+)">\{group\dName\}</MenuItem>', page), ["control", "treatment"])
        self.assertEqual(page.count("/genomics/"), 1)                        # one route; the volcano route is not called

    def test_the_advisor_panel_answers_from_templates_and_the_server_asks_for_what_the_sdk_refuses(self):
        panel = one_line(read(ADVISOR_PANEL))
        self.assertIn("<strong>AI service unavailable —</strong> showing offline template responses based on Guardian context. "
                      "Connect to the backend (set <code>ANTHROPIC_API_KEY</code> and restart the server) for live AI guidance.", panel)
        hook = read(ADVISOR_HOOK)
        self.assertIn("    if (response.status === 503) {\n      throw new Error('AI_UNAVAILABLE');", hook)
        self.assertIn("if (apiError.message === 'AI_UNAVAILABLE' || apiError.name === 'TypeError') {", hook)
        self.assertIn("const lowerMessage = message.toLowerCase();", hook)
        self.assertGreater(hook.count("lowerMessage.includes("), 5)
        self.assertIn("Based on your query, here are some things I can assist with:", hook)
        self.assertEqual(read(METHODS_WRITER).count("setGeneratedMethods(generateLocalMethods());"), 2)
        service = read(ADVISOR_SERVICE)
        self.assertIn('    DEFAULT_MODEL = "claude-sonnet-4-20250514"\n', service)
        self.assertIn("                model=self.DEFAULT_MODEL,\n                max_tokens=self.MAX_TOKENS,\n"
                      "                temperature=self.TEMPERATURE,\n", service)
        self.assertIn("\nanthropic==2.3.0\n", read(CONSTRAINTS))
        self.assertIn("(`temperature` is not an argument of `messages.create` in anthropic 2.3.0), and it names the model "
                      "`claude-sonnet-4-20250514`, which was retired on 15 June 2026.", self.flat)

    def test_the_installed_sdk_refuses_the_request_the_server_makes(self):
        import anthropic

        pinned = re.search(r"^anthropic==(\S+)$", read(CONSTRAINTS), re.M).group(1)
        if anthropic.__version__ != pinned:
            self.skipTest(f"anthropic {anthropic.__version__} is installed here; the image is built with {pinned}")
        # a made-up word in the place of a key: the call fails on its arguments, before anything is sent
        client = anthropic.Anthropic(api_key="not-a-key", max_retries=0, timeout=0.01)
        with self.assertRaisesRegex(TypeError, "unexpected keyword argument 'temperature'"):
            client.messages.create(model="claude-sonnet-4-20250514", max_tokens=16, temperature=0.3, system="x",
                                   messages=[{"role": "user", "content": "x"}])

    def test_the_profiling_module_hands_a_whole_column_to_one_call(self):
        utils = read(HUB_UTILS)
        histogram = utils[utils.index("export const createHistogramBins = (data, numBins = 20) => {"):]
        histogram = histogram[:histogram.index("\n};\n")]
        self.assertIn("  const min = Math.min(...data);\n  const max = Math.max(...data);\n", histogram)
        profiling = read(HUB_PROFILING)
        # every numeric column goes to that function, whatever its length, and no file is refused for its size
        self.assertIn("const numericData = columnData.filter(v => typeof v === 'number' && !isNaN(v));", profiling)
        self.assertIn("const histogramBins = createHistogramBins(numericData, 20);", profiling)
        self.assertNotIn("file.size", profiling)
        self.assertIn("<strong>Max File Size:</strong> 10MB (recommended for browser performance)", profiling)
        self.assertIn('"Max File Size: 10MB (recommended for browser performance)"', self.flat)
        self.assertIn("`Math.min(...data)` and `Math.max(...data)`", self.flat)
        # the landing page, which sends a visitor to this module, promises no size
        self.assertNotIn("observations supported", read(LANDING))

    def test_three_lessons_take_functions_their_helper_does_not_have(self):
        helper = read(SQC_HELPER)
        for name in ("quickControlChart", "quickAcceptanceSampling"):
            self.assertNotIn(name, helper)
            self.assertIn(f"`{name}`", self.flat)
        taken = {"Lesson02_VariablesControlCharts.jsx": "quickControlChart", "Lesson03_AttributesControlCharts.jsx": "quickControlChart",
                 "Lesson06_AcceptanceSampling.jsx": "quickAcceptanceSampling"}
        for lesson, name in taken.items():
            text = read(SQC_LESSONS / lesson)
            self.assertIn(f"const {{ {name} }} = useSQCAnalysisAPI();", text)
            self.assertIn(f"const response = await {name}({{", text)
            # the call stands in a try, and what is caught is what the box shows
            self.assertIn("setBackendError(error.message || 'Failed to connect to backend API');", text)
            self.assertIn(f"import {lesson[:-4]} from './lessons/{lesson[:-4]}';", read(SQC_LESSON_HUB))
        self.assertIn("<strong>Backend Error:</strong> {backendError}", read(SQC_LESSONS / "Lesson02_VariablesControlCharts.jsx"))
        self.assertIn("<strong>Backend Error:</strong> {backendError}", read(SQC_LESSONS / "Lesson03_AttributesControlCharts.jsx"))
        self.assertIn("📊 Perform Statistical Analysis", read(SQC_LESSONS / "Lesson02_VariablesControlCharts.jsx"))
        self.assertIn("Generate Optimal Plan with Backend API", read(SQC_LESSONS / "Lesson06_AcceptanceSampling.jsx"))
        # no other lesson of the hub takes anything from the helper
        others = [path.name for path in sorted(SQC_LESSONS.glob("Lesson*.jsx")) if "useSQCAnalysisAPI" in read(path)]
        self.assertEqual(others, sorted(taken))

    def test_the_image_of_the_server_holds_no_program_that_reads_a_picture(self):
        dockerfile = read(Path(settings.BASE_DIR) / "Dockerfile")
        self.assertNotIn("tesseract", dockerfile.lower())
        self.assertNotIn("poppler", dockerfile.lower())
        self.assertIn('return "", ["OCR unavailable: the tesseract binary / pytesseract is not installed."]', read(OCR))
        page = read(BUNDLE_PAGE)
        self.assertIn("or click to browse — manuscript, supplements, raw-data tables, and figure images", page)
        self.assertIn("PNG / JPEG / TIFF", page)
        # the table of the files is closed in a report, until it is clicked
        report = read(VERIFY_REPORT)
        self.assertIn("export function IngestionReport({ ingestion, defaultExpanded = false }) {", report)
        self.assertIn("<IngestionReport ingestion={report.ingestion} />", report)
        self.assertIn("{ingestion.n_image_files} image", report)

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

    def test_the_question_route_reads_no_question(self):
        import pandas as pd

        from api.v1.autonomous_views import THE_QUESTION_IS_NOT_READ
        from core.services import autonomous_query_handler as handler

        # The reader of questions is not loaded, and this is the line that fails.
        self.assertIs(handler.QUERY_PARSER_AVAILABLE, False)
        self.assertIn("    from ...ai_advisor.services.nlp_enhanced.query_parser import QueryParser\n", read(QUESTIONS))
        # What the route answered until this version, at the handler it called: four questions, one test.
        frame = pd.DataFrame(TWO_GROUPS_AND_TWO_COLUMNS)
        ran = [handler.AutonomousQueryHandler().handle_query(question, frame).cascade_result["final_test"]
               for question in FOUR_QUESTIONS]
        self.assertEqual(ran, ["independent_t"] * 4)
        text = " ".join(read(FILE).split())
        for question in FOUR_QUESTIONS[1::2]:
            self.assertIn(f'"{question}"', text)
        # What it answers now, to the page's request and to the request of the two clients.
        for body in ({"query": FOUR_QUESTIONS[1], "data": TWO_GROUPS_AND_TWO_COLUMNS, "mode": "plain_english", "alpha": 0.05},
                     {"question": FOUR_QUESTIONS[1], "data": TWO_GROUPS_AND_TWO_COLUMNS, "alpha": 0.05}):
            response = self.client.post("/api/v1/autonomous/query/", body, format="json", HTTP_X_FORWARDED_PROTO="https")
            self.assertEqual((response.status_code, response.json()), (501, {"error": THE_QUESTION_IS_NOT_READ}))
        self.assertIn(f'It answers every request with status 501 and one sentence: "{THE_QUESTION_IS_NOT_READ}"', text)
        self.assertIn('            "question": question,\n', read(ROOT / "sdk/python/src/stickforstats/autonomous.py"))
        self.assertIn("        question = question,\n", read(ROOT / "sdk/r/R/client.R"))
        self.assertIn("Those two clients send the question under the name `question`, which the route never read", text)

    def test_the_f_test_of_a_regression(self):
        from api.v1.regression_views import HighPrecisionRegressionView

        text = " ".join(read(FILE).split())
        url = "/api/v1/stats/regression/"

        def ask(kind, X, y):
            response = self.client.post(url, {"type": kind, "X": X, "y": y}, format="json", HTTP_X_FORWARDED_PROTO="https")
            return response.status_code, response.json()

        x = list(range(1, 13))
        # a p-value below 1e-16 is reported as 0
        status, answer = ask("simple_linear", x, [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1, 18.0, 20.2, 22.1, 23.9])
        self.assertEqual(status, 200)
        self.assertEqual(float(answer["statistics"]["f_p_value"]), 0.0)
        self.assertEqual(f'{float(answer["statistics"]["f_statistic"]):.1f}', "23212.0")
        self.assertEqual(f'{float(answer["p_values"]["X1"]):.1e}', "3.6e-18")
        self.assertIn("y = 2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1, 18.0, 20.2, 22.1, 23.9 the answer gives F = 23212.0 with "
                      "`f_p_value` 0, where the p-value is 3.6e-18.", text)
        # above that it loses digits
        status, answer = ask("simple_linear", x, [2.9, 3.1, 7.0, 7.2, 10.9, 11.3, 14.8, 15.1, 18.9, 19.2, 22.8, 23.1])
        self.assertEqual(status, 200)
        self.assertEqual((f'{float(answer["statistics"]["f_p_value"]):.8e}', f'{float(answer["p_values"]["X1"]):.8e}'),
                         ("2.23265900e-10", "2.23265894e-10"))
        self.assertIn("2.23265900e-10 was reported for 2.23265894e-10 in one example.", text)
        # an exact function of two predictors: one table is answered with F = 0 and p = 1, another with status 500
        rows = [[1, 2], [2, 1], [3, 5], [4, 3], [5, 8], [6, 2]]
        status, answer = ask("multiple_linear", rows, [1 + 2 * a - b for a, b in rows])
        self.assertEqual((status, answer["statistics"], answer["metrics"]["r_squared"]),
                         (200, {"f_statistic": "0.0", "f_p_value": "1.0"}, "1.0"))
        other = [[1, 2], [2, 1], [3, 4], [4, 3], [5, 6], [6, 2]]
        self.assertEqual(ask("multiple_linear", other, [1 + 2 * a - b for a, b in other]), (500, {"error": ""}))
        self.assertIn("the answer depends on how the arithmetic rounds. For a = 1, 2, ..., 6, b = 2, 1, 5, 3, 8, 2 and "
                      "y = 1 + 2a - b the answer says `f_statistic` 0 and `f_p_value` 1, with an R squared of 1; with "
                      "b = 2, 1, 4, 3, 6, 2 the same request is answered with status 500 and an empty message.", text)
        self.assertIn("a request of two rows are answered with status 500 and an empty message.", text)
        self.assertIn("It shows a dash for the standard error and the p-value of the intercept, which the server sends.", text)
        # what the page shows of that answer: five decimals of the standard errors, two of the AIC
        self.assertEqual([f'{float(answer["standard_errors"][name]):.5f}' for name in ("X1", "X2")], ["0.00000", "0.00000"])
        self.assertEqual(f'{float(answer["metrics"]["aic"]):.2f}', "-1339.50")
        self.assertIn("For an exact fit with two predictors it shows the same message in the second example, and standard "
                      "errors of 0.00000 and an AIC of -1339.50 in the first.", text)
        # the server sends the standard error and the p-value of the intercept
        self.assertIn("intercept", answer["standard_errors"])
        self.assertIn("intercept", answer["p_values"])
        # an exact line, a response that does not vary, two rows
        for X, y in (([1, 2, 3, 4, 5, 6], [3, 5, 7, 9, 11, 13]), ([1, 2, 3, 4, 5, 6], [4, 4, 4, 4, 4, 4]), ([1, 2], [3, 5])):
            self.assertEqual(ask("simple_linear", X, y), (500, {"error": ""}))
        # the routes the entry names lead to one view
        for path in ("/api/v1/regression/", "/api/v1/regression/linear/", "/api/v1/regression/multiple/", url):
            self.assertIs(resolve(path).func.view_class, HighPrecisionRegressionView)

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

    def _post(self, url, body):
        """Status and JSON body (None when the answer is not JSON) of a request whose failure is answered, not raised."""
        from rest_framework.test import APIClient

        response = APIClient(raise_request_exception=False).post(url, body, format="json", HTTP_X_FORWARDED_PROTO="https")
        try:
            return response.status_code, response.json()
        except ValueError:
            return response.status_code, None

    def test_the_graph_analysis_sends_an_object_and_the_difference_in_differences_other_names(self):
        status, answer = self._post("/api/v1/core/causal/dag/analyze/",
                                    {"edges": [["z", "t"], ["z", "y"], ["t", "y"]], "treatment": "t", "outcome": "y"})
        self.assertEqual(status, 200, answer)
        sets = answer["results"]["adjustment_sets"]
        self.assertIsInstance(sets, dict)
        self.assertIn("valid_adjustment_sets", sets)
        rows = [{"y": round(10.0 + 0.5 * unit + post + 1.6 * (unit < 4) * post + (0.1 if (unit + post) % 2 else -0.1), 2),
                 "treated": int(unit < 4), "post": post} for unit in range(8) for post in (0, 1)]
        status, answer = self._post("/api/v1/core/causal/did/", {"data": rows, "outcome": "y", "treatment": "treated", "post": "post"})
        self.assertEqual(status, 200, answer)
        for key in ("did_estimate", "std_error", "t_statistic", "p_value", "ci_lower", "ci_upper"):
            self.assertIsInstance(answer["results"][key], float, key)
        for key in ("se", "t_stat"):
            self.assertNotIn(key, answer["results"])
        text = one_line(read(FILE))
        self.assertIn("with a message that ends \"adjustment_sets.map is not a function\": the page reads the adjustment sets "
                      "as a list, and the server sends an object.", text)
        self.assertIn("the page looks for `se` and `t_stat`, and the server sends `std_error` and `t_statistic`.", text)
        self.assertIn("(the sets are under `results.adjustment_sets.valid_adjustment_sets`)", text)

    def test_the_regression_route_answers_a_direct_request_and_refuses_the_one_of_the_page(self):
        import numpy as np

        x = [1, 2, 3, 4, 5, 6, 7, 8]
        y = [7.9, 5.05, 12.1, 8.7, 14.95, 8.45, 12.95, 18.2]
        status, answer = self._post("/api/v1/regression/", {"type": "simple_linear", "X": x, "y": y})
        self.assertEqual(status, 200, answer)
        slope, intercept = np.polyfit(x, y, 1)
        self.assertAlmostEqual(float(answer["coefficients"]["X1"]), slope, places=9)
        self.assertAlmostEqual(float(answer["intercept"]), intercept, places=9)
        status, answer = self._post("/api/v1/regression/", {"data": {"X": x, "y": y, "feature_names": []}, "method": "linear",
                                                            "parameters": {"confidence_level": 0.95}, "options": {}})
        self.assertEqual(status, 400)
        self.assertEqual(list(answer), ["type"])
        # what "Parse Data" asks of the Guardian check for those eight rows
        status, answer = self._post("/api/guardian/check/", {"data": [x, y], "test_type": "regression", "alpha": 0.05})
        self.assertEqual(status, 200, answer)
        self.assertTrue(answer["can_proceed"])
        self.assertEqual(answer["violations"], [])
        text = one_line(read(FILE))
        self.assertIn("for each of its eight regression types and for a prediction; the service has them under other names. "
                      "The request the service would send is refused by the server as well, because it lacks the field `type`.", text)
        self.assertIn("(\"All assumptions satisfied. Safe to proceed with analysis.\" for eight rows of two columns)", text)
        self.assertIn('`POST /api/v1/regression/` with `{"type": "simple_linear", "X": [...], "y": [...]}` answers with the '
                      "coefficients.", text)

    def _genes_as_a_file(self, rows):
        head = "gene,ctrl_1,ctrl_2,ctrl_3,ctrl_4,treat_1,treat_2,treat_3,treat_4"
        return head + "\n" + "\n".join(name + "," + ",".join("" if v is None else str(v) for v in row)
                                       for name, row in zip(GENE_NAMES, rows))

    def _as_the_page_sends(self, rows):
        return {"csv_data": self._genes_as_a_file(rows), "sample_groups": ["control"] * 4 + ["treatment"] * 4,
                "group1_name": "control", "group2_name": "treatment", "alpha": 0.05, "input_scale": "linear"}

    def test_a_gene_that_does_not_vary_is_sent_without_a_test_and_without_a_word(self):
        status, answer = self._post("/api/v1/genomics/differential-expression/", self._as_the_page_sends(GENE_ROWS))
        self.assertEqual(status, 200, answer)
        gene = next(g for g in answer["gene_results"] if g["gene_name"] == "gene_const")
        self.assertIn(gene["test_used"], ("t_test", "welch_t_test"))
        self.assertEqual([gene["statistic"], gene["raw_p_value"], gene["adjusted_p_value"]], [None, None, None])
        self.assertEqual([gene["significant"], gene["test_failed"], gene["test_failure_reason"]], [False, False, ""])
        point = next(p for p in answer["volcano_data"] if p["gene"] == "gene_const")
        self.assertEqual((point["neg_log10_padj"], point["significant"]), (0, False))        # -log10(1) = 0
        self.assertEqual([key for key in answer["summary"] if "fail" in key or "not_" in key], [])
        self.assertEqual(answer["summary"]["n_genes"], 3)
        self.assertIn("The server sends it under the name of a t-test, without a statistic and without a p-value, and does not "
                      "say that the test failed.", one_line(read(FILE)))

    def test_a_file_with_an_empty_cell_is_refused_without_a_place(self):
        rows = [row[:] for row in GENE_ROWS]
        rows[1][2] = None
        status, answer = self._post("/api/v1/genomics/differential-expression/", self._as_the_page_sends(rows))
        self.assertEqual(status, 400)
        self.assertEqual(answer, {"error": "could not convert string to float: ''"})
        self.assertIn("the analysis stops with the message \"could not convert string to float: ''\".", one_line(read(FILE)))

    def test_what_a_caller_of_the_genomics_routes_meets(self):
        route, volcano = "/api/v1/genomics/differential-expression/", "/api/v1/genomics/volcano-plot/"
        treated = {"expression_matrix": GENE_ROWS, "gene_names": GENE_NAMES, "sample_groups": ["treated"] * 4 + ["untreated"] * 4}
        # no group named: the treated samples are the reference, under the name "control"
        status, answer = self._post(route, treated)
        gene = answer["gene_results"][0]
        self.assertEqual((status, gene["gene_name"], gene["mean_group1"], gene["mean_group2"]), (200, "gene_up", 21.0, 10.35))
        self.assertEqual(f"{gene['log2_fold_change']:.2f}", "-1.02")
        self.assertEqual((answer["summary"]["group1_name"], answer["summary"]["group2_name"]), ("control", "treatment"))
        status, answer = self._post(route, dict(treated, group1_name="untreated", group2_name="treated"))
        self.assertEqual(f"{answer['gene_results'][0]['log2_fold_change']:+.2f}", "+1.02")
        # three requests that are answered 500
        labels = ["control"] * 4 + ["treatment"] * 4
        with_a_gap = [row[:] for row in GENE_ROWS]
        with_a_gap[1][2] = None
        for body in ({"expression_matrix": with_a_gap, "gene_names": GENE_NAMES, "sample_groups": labels},
                     {"expression_matrix": GENE_ROWS[0], "gene_names": ["gene_up"], "sample_groups": labels},
                     {"expression_matrix": GENE_ROWS, "gene_names": GENE_NAMES}):
            self.assertEqual(self._post(route, body)[0], 500, list(body))
        # alpha
        status, answer = self._post(route, {"expression_matrix": GENE_ROWS, "gene_names": GENE_NAMES, "sample_groups": labels, "alpha": 5})
        self.assertEqual((status, answer["summary"]["alpha"]), (200, 0.05))
        # three groups
        status, answer = self._post(route, {"expression_matrix": GENE_ROWS, "gene_names": GENE_NAMES,
                                            "sample_groups": ["a", "a", "a", "b", "b", "b", "c", "c"]})
        self.assertEqual(status, 200)
        self.assertLessEqual({g["test_used"] for g in answer["gene_results"]}, {"anova", "kruskal_wallis"})
        self.assertEqual((answer["summary"]["n_samples"], answer["summary"]["n_group1"], answer["summary"]["n_group2"]), (8, 3, 3))
        # the volcano route: its threshold, and one group of samples
        small = {"expression_matrix": [[10.0, 10.2, 9.9, 10.1, 10.7, 10.8, 10.6, 10.75], GENE_ROWS[1]],
                 "gene_names": ["gene_small", "gene_flat"], "sample_groups": labels, "input_scale": "linear"}
        status, answer = self._post(volcano, small)
        point = answer["volcano_data"][0]
        self.assertEqual((status, answer["thresholds"]["log2fc_threshold"], point["gene"], point["significant"]), (200, 1.0, "gene_small", True))
        self.assertEqual(f"{point['log2fc']:.2f}", "0.09")
        status, answer = self._post(route, dict(small, log2fc_threshold=1.0))
        self.assertEqual([g["significant"] for g in answer["gene_results"]], [False, False])
        one_group = {"expression_matrix": GENE_ROWS, "gene_names": GENE_NAMES, "sample_groups": ["control"] * 8}
        self.assertEqual((self._post(route, one_group)[0], self._post(volcano, one_group)[0]), (400, 500))
        text = one_line(read(FILE))
        for sentence in (
                "is reported with a log2 fold change of -1.02, and the summary calls the two groups \"control\" and \"treatment\". "
                "With both groups named the same request gives +1.02.",
                "a missing value (`null`) in the matrix, one gene sent as a plain list of numbers, and a matrix without "
                "`sample_groups` are each answered with status 500.",
                "`alpha` is not checked (5 is accepted), and the summary reports 0.05 whatever was sent.",
                "Three groups of samples are compared by an analysis of variance and reported under the sizes of two groups.",
                "The volcano route reports a fold-change threshold of 1.0 and does not apply it (a gene with a log2 fold change of "
                "0.09 is marked significant), and it answers one group of samples with status 500 where the other route answers 400."):
            self.assertIn(sentence, text)

    def test_the_advisor_routes_without_a_key(self):
        import os
        from unittest import mock

        from ai_advisor.services import ai_service

        with mock.patch.dict(os.environ), mock.patch.object(ai_service, "_service_instance", None):
            os.environ.pop("ANTHROPIC_API_KEY", None)
            status, answer = self._post("/api/v1/ai-advisor/chat/", {"message": "How do I compare means between two groups?",
                                                                     "conversation_id": "known-issues-test"})
            self.assertEqual((status, answer["error_type"]), (503, "configuration"))
            for name, body in (("quick-recommend", {"research_question": "Do two groups differ?"}),
                               ("interpret", {"test_name": "t-test", "p_value": 0.03}),
                               ("methods-section", {"design": "Between-subjects", "tests_used": [{"name": "t-test", "purpose": "two groups"}]}),
                               ("assumption-guidance", {"test_name": "t-test", "assumption": "normality"})):
                status, answer = self._post(f"/api/v1/ai-advisor/{name}/", body)
                self.assertEqual(status, 500, name)
                self.assertTrue(answer["error"].startswith("AI Advisor is not available."), answer)
        text = one_line(read(FILE))
        self.assertIn("The server answers a question with status 503, and the panel then shows a text of its own under the line "
                      "\"AI service unavailable — showing offline template responses based on Guardian context.\"", text)
        self.assertIn("The routes `quick-recommend/`, `interpret/`, `methods-section/` and `assumption-guidance/` answer with "
                      "status 500 and the sentence \"AI Advisor is not available.\";", text)

    def _bundle(self, files):
        # the server of the test may hold the program; the image does not, and this is what it then answers
        with mock.patch("core.manuscript.image_ocr.tesseract_available", return_value=False):
            return self.client.post("/api/v1/verify/bundle/", {"files": files}, format="multipart", HTTP_X_FORWARDED_PROTO="https")

    def test_a_figure_in_a_bundle_is_skipped_and_the_report_is_made_without_it(self):
        manuscript = SimpleUploadedFile(
            "manuscript.txt", b"Results\n\nThe treatment group scored higher than the control group, t(28) = 2.10, p = .045.\n")
        figure = SimpleUploadedFile("figure.png", b"\x89PNG\r\n\x1a\n" + b"0" * 64)
        response = self._bundle([manuscript, figure])
        self.assertEqual(response.status_code, 200, response.content[:300])
        answer = response.json()
        ingestion = answer["ingestion"]
        self.assertEqual((ingestion["n_files"], ingestion["n_manuscript_files"], ingestion["n_image_files"], ingestion["ocr_used"]),
                         (2, 1, 0, False))
        listed = ingestion["files"][1]
        self.assertEqual((listed["name"], listed["kind"], listed["role"], listed["ok"]), ("figure.png", "image", "skipped", False))
        self.assertEqual(listed["error"], "no statistic could be extracted from the figure")
        self.assertEqual(listed["warnings"], ["OCR unavailable: the tesseract binary / pytesseract is not installed."])
        # the one claim of the report is the sentence of the text
        self.assertEqual(answer["n_claims"], 1)

    def test_a_scan_as_the_only_manuscript_is_refused(self):
        scan = SimpleUploadedFile("scan.pdf", b"%PDF-1.4\n%%EOF\n")
        response = self._bundle([scan])
        self.assertEqual(response.status_code, 400, response.content[:300])
        self.assertEqual(response.json()["error"],
                         "No manuscript text could be extracted from the bundle (no readable manuscript or OCR'able figure was found).")

    def _json(self, url, body):
        response = self.client.post(url, body, format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, (url, response.content[:200]))
        return response.json()

    def test_the_answers_advise_a_rank_test_after_their_normality_check(self):
        flat = one_line(read(FILE))
        skewed = [0.4, 0.5, 0.7, 0.9, 1.1, 1.4, 1.8, 2.6, 4.1, 7.5, 15.0, 41.0]
        even = [3.6, 3.9, 4.1, 4.2, 4.4, 4.5, 4.7, 4.8, 5.0, 5.3, 5.6, 6.0]
        third = [0.3, 0.6, 0.8, 1.0, 1.3, 1.7, 2.2, 3.0, 4.6, 8.0, 12.0, 30.0]
        check = {"options": {"check_assumptions": True}}
        t_test = self._json("/api/v1/stats/ttest/", dict(check, test_type="two_sample", data1=skewed, data2=even))["recommendations"]
        anova = self._json("/api/v1/stats/anova/", dict(check, anova_type="one_way", groups=[skewed, even, third]))["recommendations"]
        normality = self._json("/api/guardian/validate/normality/", {"data": skewed})
        self.assertIn("Data may not be normally distributed. Consider the Mann-Whitney U test.", t_test)
        self.assertIn("Normality assumption violated. Consider the Kruskal-Wallis test.", anova)
        self.assertEqual((normality["is_normal"], normality["details"]["recommendation"]),
                         (False, "Consider transformation (log, sqrt) or use non-parametric tests"))
        for said in ("Data may not be normally distributed. Consider the Mann-Whitney U test.",
                     "Normality assumption violated. Consider the Kruskal-Wallis test.",
                     "Consider transformation (log, sqrt) or use non-parametric tests"):
            self.assertIn(f'"{said}"', flat)
        # the advice follows from the check: two groups that pass it get none
        shifted = [value + 0.4 for value in even]
        passing = self._json("/api/v1/stats/ttest/", dict(check, test_type="two_sample", data1=even, data2=shifted))["recommendations"]
        self.assertEqual(passing, [])
        self.assertIn("`POST /api/v1/stats/ttest/`, `POST /api/v1/stats/anova/` and `POST /api/guardian/validate/normality/`", flat)

    def test_a_perfect_rank_correlation(self):
        import math

        flat = one_line(read(FILE))
        five = ([1, 2, 3, 4, 5], [1.0, 1.2, 1.9, 4.5, 20.0])
        eight = (list(range(1, 9)), [0.5, 0.6, 0.9, 1.5, 2.8, 5.0, 9.7, 30.0])

        def route(rows, method):
            result = self._json("/api/v1/stats/correlation/", {"x": rows[0], "y": rows[1], "method": method})["high_precision_result"]
            return float(result["correlation_coefficient"]), float(result["p_value"])

        def engine(rows, test):
            answer = self._json("/api/v1/autonomous/cascade/", {"test": test, "data": {"x": rows[0], "y": rows[1]}})
            return answer["final_test"], answer["result"]["p_value"]

        for rows in (five, eight):
            exact = 2 / math.factorial(len(rows[0]))
            self.assertEqual(route(rows, "spearman"), (1.0, 0.0))
            coefficient, p_value = route(rows, "kendall")
            self.assertAlmostEqual(coefficient, 1.0, places=12)
            self.assertAlmostEqual(p_value, exact, places=15)
        self.assertEqual((f"{2 / math.factorial(5):.4f}", f"{2 / math.factorial(8):.7f}"), ("0.0167", "0.0000496"))
        self.assertIn("The exact p-value of five such rows is 0.0167, and of eight 0.0000496;", flat)
        # the engine answers a request for one rank correlation with the other
        final, p_value = engine(five, "spearman")
        self.assertEqual(final, "kendall")
        self.assertAlmostEqual(p_value, 2 / 120, places=15)
        final, p_value = engine(five, "kendall")
        self.assertEqual((final, f"{p_value:.1e}"), ("spearman", "1.4e-24"))
        self.assertEqual(engine(eight, "kendall"), ("spearman", 0.0))
        self.assertIn('a request for `spearman` came back with Kendall\'s test (`final_test` "kendall", p = 0.0167), and a request for '
                      "`kendall` with Spearman's (p = 1.4e-24).", flat)
        # what the tab prints for a p-value of 0
        self.assertIn("const BELOW_EPSILON = '< 2.2e-16';", read(SRC / "utils/formatStats.js"))
        self.assertIn("  if (p === 0) return BELOW_EPSILON;", read(SRC / "utils/formatStats.js"))
        tab = read(SRC / "components/statistical-analysis/statistical-tests/CorrelationTests.jsx")
        self.assertIn("{formatPValue(pairwiseCorrelation.pValue)}", tab)
        self.assertIn("const CORRELATION_URL = '/v1/stats/correlation/';", read(SRC / "components/statistical-analysis/utils/hubTestService.js"))
        self.assertIn('the tab prints a p-value of 0 as "< 2.2e-16"', flat)

    def test_the_t_test_the_manuscript_check_recomputes(self):
        from api.v1 import verify_views
        from scipy import stats

        flat = one_line(read(FILE))
        for throttle in verify_views.VERIFY_THROTTLES:          # 30 requests an hour without a sign-in
            patcher = mock.patch.object(throttle, "allow_request", return_value=True)
            patcher.start()
            self.addCleanup(patcher.stop)
        first = [11.1, 8.72, 10.65, 8.8, 11.07, 8.44, 9.29, 9.39]
        second = [-0.63, 17.12, 2.69, 4.16, 8.61, 16.47, 7.12, 23.93, 11.85, 10.27, 14.69, 11.21, 5.65, 8.7, 13.0, 21.46, 13.58, 14.85,
                  -1.43, 10.39]
        before = [49.7, 67.6, 65.9, 51.2, 55.3, 49.3, 42.7, 50.2, 46.2, 53.2, 56.8, 48.0]
        after = [53.4, 67.9, 67.9, 53.5, 54.5, 52.2, 45.8, 54.8, 48.1, 56.1, 59.8, 47.5]

        def long_table(one, other, names):
            return "group,value\n" + "".join(f"{names[0]},{v}\n" for v in one) + "".join(f"{names[1]},{v}\n" for v in other)

        def checked(sentence, table):
            text = f"Methods. Two groups were compared. Results. The groups differed ({sentence})."
            response = self.client.post("/api/v1/verify/analyze/", {"text": text, "data": SimpleUploadedFile("data.csv", table.encode())},
                                        format="multipart", HTTP_X_FORWARDED_PROTO="https")
            self.assertEqual(response.status_code, 200, response.content[:300])
            claims = response.json()["claims"]
            self.assertEqual(len(claims), 1, sentence)
            return claims[0]["verdict"], claims[0]["recomputed"]["test"], claims[0]["recomputed"]["p_value"], claims[0]["assumptions"]["violations"]

        welch, student = stats.ttest_ind(first, second, equal_var=False), stats.ttest_ind(first, second, equal_var=True)
        two_groups = long_table(first, second, ("control", "treated"))
        whole = f"Welch's t-test, t({round(welch.df)}) = {welch.statistic:.2f}, p = {welch.pvalue:.3f}"
        self.assertEqual(whole, "Welch's t-test, t(21) = -0.65, p = 0.522")
        verdict, test, p_value, violations = checked(whole, two_groups)
        self.assertEqual((verdict, test, f"{p_value:.3f}"), ("ASSUMPTION_VIOLATED", "independent_t", "0.679"))
        self.assertAlmostEqual(p_value, student.pvalue, places=12)
        decimal = f"Welch's t-test, t({welch.df:.2f}) = {welch.statistic:.2f}, p = {welch.pvalue:.3f}"
        self.assertIn("t(21.38)", decimal)
        verdict, test, p_value, violations = checked(decimal, two_groups)
        self.assertEqual((verdict, test), ("ASSUMPTION_VIOLATED", "welch_t"))
        self.assertAlmostEqual(p_value, welch.pvalue, places=12)
        self.assertEqual(len(violations), 1)
        self.assertTrue(violations[0].startswith("Variance homogeneity violated"), violations)
        paired = stats.ttest_rel(before, after)
        sentence = f"a paired t-test, t({len(before) - 1}) = {paired.statistic:.2f}, p = {paired.pvalue:.3f}"
        self.assertEqual(sentence, "a paired t-test, t(11) = -4.41, p = 0.001")
        verdict, test, p_value, violations = checked(sentence, long_table(before, after, ("before", "after")))
        self.assertEqual((test, f"{p_value:.3f}"), ("independent_t", "0.485"))
        self.assertAlmostEqual(p_value, stats.ttest_ind(before, after).pvalue, places=12)
        verdict, test, p_value, violations = checked(sentence, "before,after\n" + "".join(f"{u},{v}\n" for u, v in zip(before, after)))
        self.assertEqual((verdict, test, p_value), ("INSUFFICIENT_DATA", "independent_t", None))
        for said in ('For two groups of 8 and 20 values, "Welch\'s t-test, t(21) = -0.65, p = 0.522" was recomputed as Student\'s t-test, p = 0.679.',
                     'For 12 pairs, "a paired t-test, t(11) = -4.41, p = 0.001" was recomputed as Student\'s t-test of two groups, p = 0.485,',
                     'was not recomputed from a table with one column for each occasion ("INSUFFICIENT_DATA")',
                     'the same two groups with "t(21.38)" were recomputed as Welch\'s t-test and got the verdict "ASSUMPTION_VIOLATED" for '
                     '"Variance homogeneity violated"'):
            self.assertIn(said, flat)
        self.assertEqual((len(first), len(second), len(before)), (8, 20, 12))

    def test_a_two_by_two_table_on_two_routes(self):
        from scipy import stats

        flat = one_line(read(FILE))
        table = [[12, 9], [7, 15]]
        plain, corrected = (stats.chi2_contingency(table, correction=value)[1] for value in (False, True))
        self.assertEqual((f"{plain:.4f}", f"{corrected:.4f}"), ("0.0946", "0.1724"))
        self.assertIn("For the table 12, 9 / 7, 15 the first answers p = 0.0946 and the second p = 0.1724.", flat)
        url = "/api/v1/categorical/chi-square/independence/"
        asked = self._json(url, {"contingency_table": table})["results"]
        self.assertAlmostEqual(float(asked["p_value"]), plain, places=12)
        self.assertIs(asked["yates_correction"], False)
        with_it = self._json(url, {"contingency_table": table, "yates_correction": True})["results"]
        self.assertAlmostEqual(float(with_it["p_value"]), corrected, places=12)
        self.assertIs(with_it["yates_correction"], True)
        engine = self._json("/api/v1/autonomous/cascade/", {"test": "chi_square_independence", "data": {"table": table}})
        self.assertEqual(engine["final_test"], "chi_square_independence")
        self.assertAlmostEqual(engine["result"]["p_value"], corrected, places=12)
        whole_answer = json.dumps(engine).lower()
        for word in ("yates", "correction", "continuity"):
            self.assertNotIn(word, whole_answer)
        # the tab of the hub asks the first route, sends no word on the correction and shows none
        service = read(SRC / "components/statistical-analysis/utils/hubTestService.js")
        self.assertIn("contingency_table: contingencyTable,", service)
        self.assertEqual(service.count("yates_correction"), 1)
        self.assertIn("yatesCorrection: hp.yates_correction ?? null,", service)
        tab = read(SRC / "components/statistical-analysis/statistical-tests/CategoricalTests.jsx").lower()
        for word in ("yates", "continuity", "correction"):
            self.assertNotIn(word, tab)

    def test_the_friedman_page_leaves_out_a_subject_with_a_value_of_zero(self):
        from scipy import stats

        flat = one_line(read(FILE))
        # the line of the page that reads a 0 as a missing value, and the one that then leaves the subject out
        page = read(SRC / "modules/NonParametricTestsRealProfessional.jsx")
        self.assertIn("            const block = dataGroups.map(g => g.values[i] || null).filter(v => v !== null);\n"
                      "            if (block.length === dataGroups.length) {\n              blockedData.push(block);", page)
        for words in ("left out", "omitted", "excluded", "dropped", "skipped"):
            self.assertNotIn(words, page.lower())
        # the test that types the values into the page and reads its request: the same values as here
        confirmed = read(SRC / "modules/__tests__/NonParametricFriedman.aValueOfZero.test.jsx")
        conditions = [[3, 0, 5, 4, 6, 2, 7, 1], [5, 2, 6, 6, 7, 4, 9, 3], [8, 4, 9, 7, 9, 6, 12, 5]]
        for name, values in zip(("Self Study", "Online Course", "In-Person"), conditions):
            self.assertIn(f"  '{name}': {values},", confirmed)
        self.assertIn("  expect(rows).toHaveLength(7);\n  expect(rows).toEqual(ROWS.filter((_, subject) => subject !== 1));", confirmed)
        self.assertIn("`frontend/src/modules/__tests__/NonParametricFriedman.aValueOfZero.test.jsx`", flat)
        # what the route answers for the seven rows the page sends, and for the eight that were typed
        eight = [list(row) for row in zip(*conditions)]
        seven = [row for subject, row in enumerate(eight) if subject != 1]
        url = "/api/v1/nonparametric/friedman/"
        sent, typed = (self._json(url, {"measurements": rows, "condition_names": ["Self Study", "Online Course", "In-Person"]})["results"]
                       for rows in (seven, eight))
        self.assertEqual((sent["sample_sizes"], typed["sample_sizes"]), ([7, 3], [8, 3]))
        self.assertAlmostEqual(float(sent["p_value"]), stats.friedmanchisquare(*[list(column) for column in zip(*seven)]).pvalue, places=12)
        self.assertAlmostEqual(float(typed["p_value"]), stats.friedmanchisquare(*conditions).pvalue, places=12)
        self.assertEqual((f"{float(sent['p_value']):.5f}", f"{float(typed['p_value']):.5f}"), ("0.00091", "0.00034"))
        self.assertIn("were sent as seven rows: the answer is the test of the seven, p = 0.00091, where the test of all eight gives "
                      "p = 0.00034.", flat)
        # the hub keeps a 0: it drops what is no number, and a 0 is one
        hub = read(SRC / "components/statistical-analysis/statistical-tests/NonParametricTests.jsx")
        self.assertIn("      return data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));", hub)

    def test_the_friedman_route_reads_groups_as_subjects(self):
        from scipy import stats

        flat = one_line(read(FILE))
        conditions = [[5.1, 6.3, 4.4, 8.0, 5.5, 7.7], [6.0, 7.1, 5.9, 8.4, 6.9, 8.8], [7.9, 8.2, 7.7, 10.1, 8.0, 10.4]]
        subjects = [list(row) for row in zip(*conditions)]
        url = "/api/v1/nonparametric/friedman/"
        right = self._json(url, {"measurements": subjects})["results"]
        self.assertAlmostEqual(float(right["p_value"]), stats.friedmanchisquare(*conditions).pvalue, places=12)
        self.assertEqual(right["sample_sizes"], [6, 3])
        other = self._json(url, {"groups": conditions})["results"]
        self.assertAlmostEqual(float(other["p_value"]), stats.friedmanchisquare(*subjects).pvalue, places=12)
        self.assertEqual(other["sample_sizes"], [3, 6])
        self.assertEqual((f"{float(right['p_value']):.4f}", f"{float(other['p_value']):.4f}"), ("0.0025", "0.0121"))
        self.assertIn("three conditions measured on six subjects were answered with p = 0.0121 and `sample_sizes` [3, 6], where the test "
                      "of the three conditions gives p = 0.0025 and `sample_sizes` [6, 3].", flat)
        # the Kruskal-Wallis route reads the same name as one list for each group
        kruskal = self._json("/api/v1/nonparametric/kruskal-wallis/", {"groups": conditions})["results"]
        self.assertAlmostEqual(float(kruskal["p_value"]), stats.kruskal(*conditions).pvalue, places=12)
        # the two pages that run the test send one row for each subject, under `measurements`
        hub = read(SRC / "components/statistical-analysis/statistical-tests/NonParametricTests.jsx")
        self.assertIn("      runBackendTest(endpoints.nonparametric.friedman, {\n        measurements: subjectMajor,", hub)
        module = read(SRC / "services/NonParametricTestsService.js")
        self.assertIn("      const requestData = {\n        measurements: data,", module)
        sent = [name for name in ("components/statistical-analysis/statistical-tests/NonParametricTests.jsx", "services/NonParametricTestsService.js",
                                  "modules/NonParametricTestsRealProfessional.jsx")
                if "friedman" in read(SRC / name).lower() and "groups:" in read(SRC / name).split("friedman")[-1][:400]]
        self.assertEqual(sent, [])

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
