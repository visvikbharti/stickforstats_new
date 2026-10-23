"""Saved reports and DOE designs can no longer be listed, read, edited or deleted anonymously.

The report routes (api/v1/report_views.py) and the DOE record routes (the viewsets in
doe_analysis/api/views.py and the record-backed views in doe_analysis/views.py) had no sign-in
and no owner check: an anonymous visitor could list every saved record, read it, change it and
delete it. No screen used them (the frontend's report and DOE clients call /api/reports/ and
/api/doe/, which were never routed), so they are no longer routed: api/v1/urls.py,
doe_analysis/api/urls.py.
"""

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.test import APIClient

from core.models import Analysis, AnalysisSession
from doe_analysis.models import ExperimentDesign, ModelAnalysis, OptimizationAnalysis

METHODS = ("get", "post", "put", "patch", "delete")


@override_settings(SECURE_SSL_REDIRECT=False)
class AnonymousCannotReachSavedRecordsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.report = Analysis.objects.create(name="Saved report", analysis_type="ttest", parameters={"p": 0.0123})
        owner = get_user_model().objects.create_user(
            username="owner@example.org", email="owner@example.org", password="not-used-here"
        )
        session = AnalysisSession.objects.create(user=owner, name="DOE", analysis_type="DOE")
        self.design = ExperimentDesign.objects.create(
            analysis_session=session, name="Saved design", design_type="FACTORIAL", num_factors=2, num_runs=4
        )
        self.model = ModelAnalysis.objects.create(
            experiment_design=self.design, response_name="Yield", name="Saved model", model_type="linear"
        )
        self.optimization = OptimizationAnalysis.objects.create(
            experiment_design=self.design,
            model_analysis=self.model,
            name="Saved optimization",
            optimization_type=OptimizationAnalysis._meta.get_field("optimization_type").choices[0][0],
        )

    def assert_every_method_404(self, path):
        for method in METHODS:
            response = getattr(self.client, method)(path, {"name": "changed"}, format="json")
            self.assertEqual(response.status_code, 404, f"{method.upper()} {path}")

    def test_reports_cannot_be_listed_read_edited_or_deleted(self):
        rid = self.report.id
        for path in (
            "/api/v1/reports/",
            "/api/v1/reports/generate/",
            f"/api/v1/reports/{rid}/",
            f"/api/v1/reports/{rid}/export/",
        ):
            self.assert_every_method_404(path)
        self.report.refresh_from_db()
        self.assertEqual(self.report.name, "Saved report")
        self.assertEqual(Analysis.objects.count(), 1)

    def test_doe_records_cannot_be_listed_read_edited_or_deleted(self):
        base = "/api/v1/doe-analysis/"
        d, m, o = self.design.id, self.model.id, self.optimization.id
        for path in (
            base,
            f"{base}experiment-designs/",
            f"{base}experiment-designs/{d}/",
            f"{base}experiment-designs/{d}/export_design/",
            f"{base}experiment-designs/{d}/upload_design_data/",
            f"{base}experiment-designs/generate_design/",
            f"{base}model-analyses/",
            f"{base}model-analyses/{m}/",
            f"{base}model-analyses/{m}/generate_report/",
            f"{base}model-analyses/run_analysis/",
            f"{base}optimization-analyses/",
            f"{base}optimization-analyses/{o}/",
            f"{base}optimization-analyses/{o}/generate_report/",
            f"{base}optimization-analyses/run_optimization/",
            f"{base}generate-design/",
            f"{base}analyze-experiment/",
            f"{base}optimize-response/",
            f"{base}generate-report/",
            f"{base}screening-analysis/",
        ):
            self.assert_every_method_404(path)
        for obj, name in ((self.design, "Saved design"), (self.model, "Saved model"), (self.optimization, "Saved optimization")):
            obj.refresh_from_db()
            self.assertEqual(obj.name, name)
        self.assertEqual(ExperimentDesign.objects.count(), 1)

    def test_the_static_doe_examples_still_answer(self):
        self.assertEqual(self.client.get("/api/v1/doe-analysis/examples/").status_code, 200)


class NoRouteLeadsToTheRemovedViewsTest(SimpleTestCase):
    """However a route might be spelled, none may resolve to the removed views."""

    REMOVED = {
        "api.v1.report_views": None,  # every view in the module
        "doe_analysis.api.views": None,
        "doe_analysis.views": {
            "GenerateDesignView",
            "AnalyzeExperimentView",
            "OptimizeResponseView",
            "GenerateReportView",
            "ScreeningAnalysisView",
        },
    }

    def test_no_route_resolves_to_a_removed_view(self):
        found = []

        def walk(patterns, prefix=""):
            for pattern in patterns:
                if isinstance(pattern, URLResolver):
                    walk(pattern.url_patterns, prefix + str(pattern.pattern))
                elif isinstance(pattern, URLPattern):
                    view = pattern.callback
                    target = getattr(view, "cls", None) or getattr(view, "view_class", None) or view
                    names = self.REMOVED.get(target.__module__, ())
                    if names is None or target.__name__ in names:
                        found.append(prefix + str(pattern.pattern))

        walk(get_resolver().url_patterns)
        self.assertEqual(found, [])
