"""
Tests for core API endpoints.
Tests: health check, t-test, ANOVA, correlation, descriptive stats, SQS,
data import, OpenAPI schema, audit endpoints.
"""

import io
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


def get_auth_client(email="apitest@example.com", password="ApiTest123!@#"):
    """Helper: create a user, log in, and return an authenticated APIClient."""
    user = User.objects.create_user(
        username=email, email=email, password=password,
        first_name="Api", last_name="Tester",
    )
    client = APIClient()
    resp = client.post(
        "/api/auth/login/",
        {"username": email, "password": password},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return client, user


@override_settings(SECURE_SSL_REDIRECT=False)
class HealthCheckTests(TestCase):
    """Test the health check endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_health_check_returns_200(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_check_has_status(self):
        response = self.client.get("/api/v1/health/")
        self.assertIn("status", response.data)

    def test_health_check_no_auth_required(self):
        """Health check should be accessible without authentication."""
        response = self.client.get("/api/v1/health/")
        self.assertIn(response.status_code, [200, 301])


@override_settings(SECURE_SSL_REDIRECT=False)
class TTestEndpointTests(TestCase):
    """Test the t-test API endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_one_sample_ttest(self):
        payload = {
            "test_type": "one_sample",
            "data1": [2.3, 1.9, 2.5, 2.1, 2.7, 2.0, 2.4, 2.6, 2.2, 2.8],
            "parameters": {"mu": 2.0},
            "options": {
                "check_assumptions": False,
                "validate_results": False,
                "compare_standard": False,
            },
        }
        response = self.client.post("/api/v1/stats/ttest/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("high_precision_result", response.data)
        self.assertEqual(response.data["test_type"], "one_sample")

    def test_two_sample_ttest(self):
        payload = {
            "test_type": "two_sample",
            "data1": [2.3, 1.9, 2.5, 2.1, 2.7, 2.0, 2.4, 2.6, 2.2, 2.8],
            "data2": [3.1, 2.8, 3.3, 3.0, 3.5, 2.9, 3.2, 3.4, 2.7, 3.6],
            "parameters": {"equal_var": True},
            "options": {
                "check_assumptions": False,
                "validate_results": False,
                "compare_standard": False,
            },
        }
        response = self.client.post("/api/v1/stats/ttest/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("high_precision_result", response.data)

    def test_paired_ttest(self):
        payload = {
            "test_type": "paired",
            "data1": [2.3, 1.9, 2.5, 5.1, 2.7, 3.0, 2.4, 4.6, 2.2, 7.8],
            "data2": [4.5, 3.1, 6.7, 8.3, 1.9, 5.2, 3.6, 2.8, 6.4, 9.0],
            "options": {
                "check_assumptions": False,
                "validate_results": False,
                "compare_standard": False,
            },
        }
        response = self.client.post("/api/v1/stats/ttest/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ttest_invalid_input(self):
        response = self.client.post("/api/v1/stats/ttest/", {}, format="json")
        # Cache may return 200 with error body; check for error in response
        if response.status_code == status.HTTP_200_OK:
            self.assertIn("error", response.data)
        else:
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ttest_with_assumptions(self):
        payload = {
            "test_type": "one_sample",
            "data1": [2.3, 1.9, 2.5, 2.1, 2.7, 2.0, 2.4, 2.6, 2.2, 2.8],
            "parameters": {"mu": 2.0},
            "options": {
                "check_assumptions": True,
                "validate_results": False,
                "compare_standard": False,
            },
        }
        response = self.client.post("/api/v1/stats/ttest/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("assumptions", response.data)


@override_settings(SECURE_SSL_REDIRECT=False)
class TTestEqualVarianceFlagTests(TestCase):
    """
    The equal-variance flag must reach the calculator and change the answer.

    Regression: the view reads ``parameters["equal_var"]``, but every frontend
    caller sends a flat ``equal_variance``. DRF drops fields a serializer does
    not declare, so the flag vanished and the API always ran Student's pooled
    t-test -- while the UI announced "using Welch's t-test".

    Asserting 200 OK cannot catch that, which is why it survived. These assert
    the value of t and, decisively, of df: Student's df is n1+n2-2 = 11, while
    Welch-Satterthwaite gives ~7.09 for this data.
    """

    # Unequal n and unequal variances, so the two tests disagree loudly.
    DATA1 = [1, 2, 3, 4, 5]
    DATA2 = [10, 20, 30, 40, 50, 60, 70, 80]

    STUDENT_T = -3.7658490220
    STUDENT_DF = 11.0
    WELCH_T = -4.8336568362
    WELCH_DF = 7.0930927595

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _payload(self, **extra):
        return {
            "test_type": "two_sample",
            "data1": self.DATA1,
            "data2": self.DATA2,
            "options": {
                "check_assumptions": False,
                "validate_results": False,
                "compare_standard": False,
            },
            **extra,
        }

    def _run(self, **extra):
        response = self.client.post("/api/v1/stats/ttest/", self._payload(**extra), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        hp = response.data["high_precision_result"]
        return float(hp["t_statistic"]), float(hp["df"])

    def test_fixture_actually_separates_the_two_tests(self):
        """If Student and Welch ever agreed here, every assertion below would be vacuous."""
        self.assertNotAlmostEqual(self.STUDENT_T, self.WELCH_T, places=3)
        self.assertNotAlmostEqual(self.STUDENT_DF, self.WELCH_DF, places=3)

    def test_scipy_agrees_with_our_expected_values(self):
        """Pin the expected values to scipy rather than to a previous run of our own code."""
        from scipy import stats as scipy_stats

        student = scipy_stats.ttest_ind(self.DATA1, self.DATA2, equal_var=True)
        welch = scipy_stats.ttest_ind(self.DATA1, self.DATA2, equal_var=False)
        self.assertAlmostEqual(float(student.statistic), self.STUDENT_T, places=8)
        self.assertAlmostEqual(float(welch.statistic), self.WELCH_T, places=8)
        # df is the decisive discriminator, so pin it to scipy too rather than
        # only to our own calculator.
        self.assertAlmostEqual(float(student.df), self.STUDENT_DF, places=8)
        self.assertAlmostEqual(float(welch.df), self.WELCH_DF, places=8)

    def test_production_path_with_default_options_also_runs_welch(self):
        """
        Real callers omit `options` entirely, so `compare_standard` defaults to
        True and views.py re-reads the flag for the scipy comparison. The other
        tests switch those options off, so this is the only one that exercises
        the code path an actual request takes -- and it checks that the
        high-precision and standard-precision results agree on which test ran.
        """
        response = self.client.post(
            "/api/v1/stats/ttest/",
            {
                "test_type": "two_sample",
                "data1": self.DATA1,
                "data2": self.DATA2,
                "equal_variance": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertAlmostEqual(
            float(response.data["high_precision_result"]["t_statistic"]), self.WELCH_T, places=8
        )
        self.assertAlmostEqual(
            float(response.data["standard_precision_result"]["t_statistic"]), self.WELCH_T, places=8
        )

    def test_a_null_flag_is_tolerated_and_falls_back_to_students(self):
        """`null` meant "not supplied" before the field was declared; keep it that way."""
        t, df = self._run(equal_variance=None)
        self.assertAlmostEqual(t, self.STUDENT_T, places=8)
        self.assertAlmostEqual(df, self.STUDENT_DF, places=8)

    def test_a_malformed_flag_is_rejected_rather_than_silently_ignored(self):
        """Silently discarding this flag is precisely the bug being fixed."""
        response = self.client.post(
            "/api/v1/stats/ttest/", self._payload(equal_variance="maybe"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)

    def test_no_flag_runs_students_pooled_t(self):
        t, df = self._run()
        self.assertAlmostEqual(t, self.STUDENT_T, places=8)
        self.assertAlmostEqual(df, self.STUDENT_DF, places=8)

    def test_flat_equal_variance_false_runs_welch(self):
        """This is the exact payload TTestCompleteModule and DataPipeline send."""
        t, df = self._run(equal_variance=False)
        self.assertAlmostEqual(t, self.WELCH_T, places=8)
        self.assertAlmostEqual(df, self.WELCH_DF, places=8)

    def test_flat_equal_variance_true_runs_students(self):
        t, df = self._run(equal_variance=True)
        self.assertAlmostEqual(t, self.STUDENT_T, places=8)
        self.assertAlmostEqual(df, self.STUDENT_DF, places=8)

    def test_documented_nested_shape_still_runs_welch(self):
        t, df = self._run(parameters={"equal_var": False})
        self.assertAlmostEqual(t, self.WELCH_T, places=8)
        self.assertAlmostEqual(df, self.WELCH_DF, places=8)

    def test_explicit_nested_parameter_wins_over_the_flat_alias(self):
        t, _ = self._run(equal_variance=True, parameters={"equal_var": False})
        self.assertAlmostEqual(t, self.WELCH_T, places=8)

    def test_equal_var_flat_alias_is_also_accepted(self):
        t, _ = self._run(equal_var=False)
        self.assertAlmostEqual(t, self.WELCH_T, places=8)


@override_settings(SECURE_SSL_REDIRECT=False)
class DescriptiveStatsEndpointTests(TestCase):
    """Test the descriptive statistics endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_descriptive_stats_success(self):
        payload = {
            "data": [1.5, 2.3, 3.1, 4.7, 5.2, 6.8, 7.1, 8.9, 9.0, 10.2],
        }
        response = self.client.post("/api/v1/stats/descriptive/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_descriptive_stats_empty_data(self):
        payload = {"data": []}
        response = self.client.post("/api/v1/stats/descriptive/", payload, format="json")
        # Should return 400 or handle gracefully
        self.assertIn(response.status_code, [400, 422, 500])


@override_settings(SECURE_SSL_REDIRECT=False)
class CorrelationEndpointTests(TestCase):
    """Test the correlation endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_correlation_pearson(self):
        payload = {
            "x": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
            "y": [2.1, 3.9, 6.2, 7.8, 10.1, 12.0, 13.8, 16.1, 18.0, 20.2],
            "method": "pearson",
        }
        response = self.client.post("/api/v1/stats/correlation/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("high_precision_result", response.data)

    def test_correlation_invalid_data(self):
        payload = {"x": [1.0], "y": []}
        response = self.client.post("/api/v1/stats/correlation/", payload, format="json")
        self.assertIn(response.status_code, [400, 422])


@override_settings(SECURE_SSL_REDIRECT=False)
class SQSEndpointTests(TestCase):
    """Test the Statistical Quality Score endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_sqs_rules_list(self):
        response = self.client.get("/api/v1/sqs/rules/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sqs_categories(self):
        response = self.client.get("/api/v1/sqs/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sqs_fields(self):
        response = self.client.get("/api/v1/sqs/fields/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sqs_health(self):
        response = self.client.get("/api/v1/sqs/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sqs_analyze_text(self):
        payload = {
            "text": (
                "We performed a t-test and found a significant difference "
                "(t(28)=2.45, p=0.021, d=0.89). The ANOVA showed F(2,57)=3.12, "
                "p=0.052. Sample size was n=30 per group."
            ),
            "field": "psychology",
        }
        response = self.client.post("/api/v1/sqs/analyze-text/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


@override_settings(SECURE_SSL_REDIRECT=False)
class DataImportEndpointTests(TestCase):
    """Test the data import endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_csv_import_success(self):
        csv_content = "name,value\nA,1.5\nB,2.3\nC,3.1\n"
        csv_file = io.BytesIO(csv_content.encode("utf-8"))
        csv_file.name = "test_data.csv"
        response = self.client.post(
            "/api/v1/data/import/",
            {"file": csv_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("summary", response.data)
        self.assertEqual(response.data["summary"]["rows"], 3)
        self.assertEqual(response.data["summary"]["columns"], 2)

    def test_import_no_file(self):
        response = self.client.post("/api/v1/data/import/", {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_import_unsupported_format(self):
        fake_file = io.BytesIO(b"not a valid file")
        fake_file.name = "test.xyz"
        response = self.client.post(
            "/api/v1/data/import/",
            {"file": fake_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(SECURE_SSL_REDIRECT=False)
class OpenAPISchemaEndpointTests(TestCase):
    """Test the OpenAPI schema endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_schema_returns_200(self):
        response = self.client.get("/api/v1/schema/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_schema_has_openapi_version(self):
        response = self.client.get("/api/v1/schema/")
        self.assertIn("openapi", response.data)


@override_settings(SECURE_SSL_REDIRECT=False)
class AuditEndpointTests(TestCase):
    """Test the audit system endpoints."""

    def setUp(self):
        self.client, self.user = get_auth_client(
            email="audituser@example.com", password="AuditTest123!@#"
        )

    def test_audit_health(self):
        response = self.client.get("/api/v1/audit/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_audit_summary(self):
        response = self.client.get("/api/v1/audit/summary/")
        self.assertIn(response.status_code, [200, 403])


@override_settings(SECURE_SSL_REDIRECT=False)
class ANOVAEndpointTests(TestCase):
    """Test the ANOVA endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_one_way_anova(self):
        payload = {
            "anova_type": "one_way",
            "groups": [
                [4.5, 5.1, 4.8, 5.3, 4.9, 5.0, 4.7, 5.2],
                [3.2, 3.8, 3.5, 3.9, 3.3, 3.7, 3.6, 3.4],
                [6.1, 5.8, 6.3, 5.9, 6.0, 6.2, 5.7, 6.4],
            ],
            "options": {
                "check_assumptions": False,
                "validate_results": False,
                "compare_standard": False,
            },
        }
        response = self.client.post("/api/v1/stats/anova/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anova_missing_groups(self):
        response = self.client.post("/api/v1/stats/anova/", {}, format="json")
        # Cache may return 200 with error body; check for error in response
        if response.status_code == status.HTTP_200_OK:
            self.assertIn("error", response.data)
        else:
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(SECURE_SSL_REDIRECT=False)
class PowerAnalysisEndpointTests(TestCase):
    """Test power analysis endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_power_info(self):
        response = self.client.get("/api/v1/power/info/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_power_t_test(self):
        payload = {
            "effect_size": 0.5,
            "sample_size": 30,
            "alpha": 0.05,
        }
        response = self.client.post("/api/v1/power/t-test/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
