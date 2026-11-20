"""
The limit of requests for one address.

The limiter (core/middleware/rate_limit_middleware.py) keeps one counter for each address and each
minute of the clock. A visitor of the web interface is counted against the anonymous limit whether
signed in or not, because the interface signs in with a token and the limiter runs before the token
is read. Everybody behind one address shares the counter.

The limit was 20 requests a minute. One visitor who worked fast met it alone, and a room of people
behind one address met it at once. It is 600.

The tests that count requests use a small limit of their own and hold the limiter's clock still:
the limiter counts by the minute of the clock, and a test that crossed a minute would count wrongly.
"""

from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

URL = "/api/v1/privacy/info/"            # open to everybody, and counted
OWN_CACHE = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "request-limit-tests"}}
A_FIXED_TIME = 1_800_000_000.0           # the first second of a minute of the clock


class TheNumberTest(SimpleTestCase):
    def test_the_limit_for_one_address_is_600_requests_a_minute(self):
        self.assertEqual(settings.RATE_LIMIT_DEFAULT_ANONYMOUS, 600)

    def test_it_is_off_while_the_tests_run_and_on_for_a_server_that_is_not_in_debug_mode(self):
        self.assertIs(settings.RATE_LIMIT_ENABLED, False)
        source = (Path(settings.BASE_DIR) / "stickforstats" / "settings.py").read_text(encoding="utf-8")
        self.assertIn("RATE_LIMIT_ENABLED = (not TESTING) and (\n    not DEBUG or", source)

    def test_the_deploy_document_states_the_number_of_the_settings(self):
        document = (Path(settings.BASE_DIR).parent / "DEPLOY.md").read_text(encoding="utf-8")
        limit = settings.RATE_LIMIT_DEFAULT_ANONYMOUS
        self.assertEqual(document.count(f"The backend allows {limit} API requests a minute per IP"), 2)
        self.assertEqual(document.count(f'"X-RateLimit-Limit: {limit}"'), 1)
        self.assertNotIn("allows 20 API requests", document)
        self.assertNotIn("X-RateLimit-Limit: 20", document)


class WithTheClockHeldStill(SimpleTestCase):
    """A cache of the test's own, emptied before and after, and the limiter's clock at a fixed time."""

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.clock = mock.patch("core.middleware.rate_limit_middleware.time").start()
        self.addCleanup(mock.patch.stopall)
        self.clock.time.return_value = A_FIXED_TIME
        self.clock.strftime.return_value = "2027-01-15"

    def get(self, address="203.0.113.7", url=URL):
        return APIClient().get(url, HTTP_X_FORWARDED_FOR=address, HTTP_X_FORWARDED_PROTO="https")


@override_settings(RATE_LIMIT_ENABLED=True, SECURE_SSL_REDIRECT=False, CACHES=OWN_CACHE)
class TheLimiterUsesTheNumberTest(WithTheClockHeldStill):
    def test_an_answer_names_the_limit_of_the_settings(self):
        response = self.get()
        self.assertEqual(response.status_code, 200, response.content[:200])
        self.assertEqual((response["X-RateLimit-Limit"], response["X-RateLimit-Remaining"]), ("600", "599"))

    def test_the_twenty_first_request_of_a_minute_is_answered(self):
        # the request that used to be the first one refused
        for _ in range(20):
            self.assertEqual(self.get().status_code, 200)
        response = self.get()
        self.assertEqual((response.status_code, response["X-RateLimit-Remaining"]), (200, "579"))


@override_settings(RATE_LIMIT_ENABLED=True, RATE_LIMIT_DEFAULT_ANONYMOUS=3, SECURE_SSL_REDIRECT=False, CACHES=OWN_CACHE)
class CountingTest(WithTheClockHeldStill):
    """With a limit of three, the test's own."""

    def test_the_request_after_the_last_allowed_one_is_refused(self):
        left = [self.get()["X-RateLimit-Remaining"] for _ in range(3)]
        self.assertEqual(left, ["2", "1", "0"])
        refused = self.get()
        self.assertEqual(refused.status_code, 429)
        self.assertEqual(refused.json()["error"], "Rate limit exceeded")
        self.assertEqual(refused.json()["detail"], "You have exceeded the rate limit of 3 requests per minute.")
        self.assertEqual((refused["X-RateLimit-Limit"], refused["X-RateLimit-Remaining"]), ("3", "0"))

    def test_everybody_behind_one_address_shares_the_count_and_another_address_has_its_own(self):
        for _ in range(3):
            self.assertEqual(self.get("203.0.113.7").status_code, 200)
        self.assertEqual(self.get("203.0.113.7").status_code, 429)
        self.assertEqual(self.get("198.51.100.9").status_code, 200)

    def test_the_next_minute_of_the_clock_starts_a_new_count(self):
        for _ in range(3):
            self.get()
        self.assertEqual(self.get().status_code, 429)
        self.clock.time.return_value = A_FIXED_TIME + 60
        response = self.get()
        self.assertEqual((response.status_code, response["X-RateLimit-Remaining"]), (200, "2"))

    def test_the_health_check_is_not_counted(self):
        for _ in range(5):
            response = self.get(url="/api/v1/health/")
            self.assertNotEqual(response.status_code, 429)
            self.assertNotIn("X-RateLimit-Limit", response)
        self.assertEqual(self.get()["X-RateLimit-Remaining"], "2")
