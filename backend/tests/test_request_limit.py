"""
The limit of requests for one address.

The limiter (core/middleware/rate_limit_middleware.py) keeps one counter for each address and each
minute of the clock. A visitor of the web interface is counted against the anonymous limit whether
signed in or not, because the interface signs in with a token and the limiter runs before the token
is read. Everybody behind one address shares the counter.

The limit was 20 requests a minute. One visitor who worked fast met it alone, and a room of people
behind one address met it at once. It is 600.

A request that comes with a session (a browser that is signed in to the admin pages) is counted in
the same counter of its address and had a limit of its own, 60: such a visitor was refused where one
without a session was answered. It is 600 as well.

The tests that count requests use a small limit of their own and hold the limiter's clock still:
the limiter counts by the minute of the clock, and a test that crossed a minute would count wrongly.
"""

from pathlib import Path
from unittest import mock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

URL = "/api/v1/privacy/info/"            # open to everybody, and counted
OWN_CACHE = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "request-limit-tests"}}
A_FIXED_TIME = 1_800_000_000.0           # the first second of a minute of the clock


class TheNumberTest(SimpleTestCase):
    def test_the_limit_for_one_address_is_600_requests_a_minute(self):
        self.assertEqual(settings.RATE_LIMIT_DEFAULT_ANONYMOUS, 600)

    def test_a_request_with_a_session_has_the_same_limit(self):
        self.assertEqual(settings.RATE_LIMIT_DEFAULT_AUTHENTICATED, 600)

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


class TheClockHeldStill:
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


class WithTheClockHeldStill(TheClockHeldStill, SimpleTestCase):
    pass


@override_settings(RATE_LIMIT_ENABLED=True, SECURE_SSL_REDIRECT=False, CACHES=OWN_CACHE)
class ARequestWithASessionTest(TheClockHeldStill, TestCase):
    """A browser that is signed in to the admin pages sends its session with every request. The limiter
    reads the session, and counts the request in the counter of its address."""

    def with_a_session(self, address="203.0.113.7"):
        client = APIClient()
        client.force_login(get_user_model().objects.get_or_create(username="session@example.invalid")[0])
        return client.get(URL, HTTP_X_FORWARDED_FOR=address, HTTP_X_FORWARDED_PROTO="https")

    def test_it_is_told_the_limit_of_a_request_without_one(self):
        without, with_one = self.get("198.51.100.9"), self.with_a_session("203.0.113.7")
        self.assertEqual((without.status_code, with_one.status_code), (200, 200))
        self.assertEqual((without["X-RateLimit-Limit"], with_one["X-RateLimit-Limit"]), ("600", "600"))

    def test_the_sixty_first_request_of_a_minute_is_answered_with_a_session_and_without(self):
        # 60 requests from one address; the next one with a session was the first one refused
        for _ in range(60):
            self.assertEqual(self.get().status_code, 200)
        with_one = self.with_a_session()
        self.assertEqual((with_one.status_code, with_one["X-RateLimit-Remaining"]), (200, "539"))
        self.assertEqual(self.get().status_code, 200)

    @override_settings(RATE_LIMIT_DEFAULT_ANONYMOUS=3, RATE_LIMIT_DEFAULT_AUTHENTICATED=5)
    def test_the_limiter_reads_the_session(self):
        # two different numbers, to see which of the two a request is given
        self.assertEqual((self.get()["X-RateLimit-Limit"], self.with_a_session()["X-RateLimit-Limit"]), ("3", "5"))

    @override_settings(RATE_LIMIT_DEFAULT_ANONYMOUS=3, RATE_LIMIT_DEFAULT_AUTHENTICATED=3)
    def test_the_two_kinds_of_request_share_the_counter_of_their_address(self):
        self.assertEqual([self.get()["X-RateLimit-Remaining"], self.with_a_session()["X-RateLimit-Remaining"],
                          self.get()["X-RateLimit-Remaining"]], ["2", "1", "0"])
        self.assertEqual((self.with_a_session().status_code, self.get().status_code), (429, 429))


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
