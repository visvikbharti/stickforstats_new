"""Site licence keys stay out of the logs.

A licence key (SFS-INST-...) is the credential for that institution's usage statistics and
report: any signed-in user who has it can read them. It was written to the logs two ways:
- create_license logged it at INFO ("Site license created: SFS-INST-... for ...");
- /api/v1/licensing/usage/<key>/ and /report/<key>/ carried it in the URL, which nginx's access
  log and the application's request log record on every call.
The key now goes in the X-License-Key header, and the log line names the licence by its id.
SiteLicense.__str__ also returned the key; nothing logs it today, but str() is what logs,
tracebacks and admin pages show of an object, so it no longer contains the key either.
"""

import logging

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import SiteLicense
from core.services.site_license_service import SiteLicenseService

LOGGERS = ("", "django", "stickforstats")  # root, and the two configured not to propagate


class Capture(logging.Handler):
    def __init__(self):
        super().__init__(logging.DEBUG)
        self.messages = []

    def emit(self, record):
        self.messages.append(record.getMessage())


@override_settings(SECURE_SSL_REDIRECT=False)
class LicenseKeyNotLoggedTest(TestCase):
    def setUp(self):
        self.capture = Capture()
        for name in LOGGERS:
            logger = logging.getLogger(name)
            old_level = logger.level
            logger.addHandler(self.capture)
            logger.setLevel(logging.DEBUG)
            self.addCleanup(logger.setLevel, old_level)
            self.addCleanup(logger.removeHandler, self.capture)
        user = get_user_model().objects.create_user(
            username="admin@testu.edu", email="admin@testu.edu", password="unused-here"
        )
        self.client = APIClient()
        self.client.force_authenticate(user)

    def logged(self):
        return "\n".join(self.capture.messages)

    def create(self):
        return SiteLicenseService.create_license(
            institution_name="Test U", tier_id="department", admin_email="admin@testu.edu", domain="testu.edu"
        )["license_key"]

    def test_creating_a_licence_logs_the_event_but_not_the_key(self):
        response = self.client.post(
            "/api/v1/licensing/create/",
            {"institution_name": "Test U", "tier": "department", "admin_email": "a@testu.edu", "domain": "testu.edu"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        key = response.json()["license_key"]
        self.assertTrue(key.startswith("SFS-INST-"))
        self.assertIn("Site license created", self.logged())
        self.assertNotIn(key, self.logged())
        self.assertNotIn(key[len("SFS-INST-"):], self.logged())

    def test_usage_and_report_take_the_key_in_a_header_and_log_no_key(self):
        key = self.create()
        self.capture.messages.clear()
        for path in ("/api/v1/licensing/usage/", "/api/v1/licensing/report/"):
            response = self.client.get(path, HTTP_X_LICENSE_KEY=key)
            self.assertEqual(response.status_code, 200, path)
            self.assertIn(f"GET {path} 200", self.logged())  # the request log did record the call
        self.assertNotIn(key, self.logged())

    def test_the_url_no_longer_takes_the_key(self):
        key = self.create()
        for path in (f"/api/v1/licensing/usage/{key}/", f"/api/v1/licensing/report/{key}/"):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_a_missing_header_gets_a_400_that_names_it(self):
        for path in ("/api/v1/licensing/usage/", "/api/v1/licensing/report/"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 400, path)
            self.assertIn("X-License-Key", response.json()["error"])

    def test_str_does_not_contain_the_key(self):
        key = self.create()
        text = str(SiteLicense.objects.get(license_key=key))
        self.assertIn("Test U", text)
        self.assertNotIn(key[len("SFS-INST-"):], text)
