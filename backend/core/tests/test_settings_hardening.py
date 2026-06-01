"""
Tests for production configuration hardening (beta checklist §2).

These pin the runtime config invariants so they can't silently regress:
  * under the test runner, TESTING is True and ALLOWED_HOSTS still contains
    'testserver' (so the Django test client works);
  * rate limiting is disabled under tests (so the throttle doesn't 429 the suite).

The SECRET_KEY fail-closed-when-serving guard is exercised out-of-process in the
review notes (it depends on sys.argv/loaded modules at import time and cannot be
re-triggered cleanly in an already-imported settings module); these tests cover
the parts that are safely assertable in-process.
"""

from __future__ import annotations

from django.conf import settings
from django.test import SimpleTestCase


class TestConfigHardening(SimpleTestCase):
    def test_running_under_testing_flag(self):
        self.assertTrue(settings.TESTING)

    def test_testserver_allowed_under_testing(self):
        self.assertIn("testserver", settings.ALLOWED_HOSTS)

    def test_rate_limiting_disabled_under_testing(self):
        self.assertFalse(settings.RATE_LIMIT_ENABLED)

    def test_secret_key_present(self):
        # Tests always have a key (real or ephemeral); it must be non-empty.
        self.assertTrue(settings.SECRET_KEY)
