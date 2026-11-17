"""Consent "granted" and erasure "confirm" are read strictly, in JSON and in form encoding.

Both fields used to go through bool(), which reads the form value "false" as true: a consent
withdrawn from a form was stored as granted, and confirm=false sent from a form erased the account.
JSON must now carry true or false; a form must carry the field once, as "true" or "false" (any
letter case). Every other value is a 400 that names the field, and nothing is stored or erased.

The tests state the settings they need (the rate limit) and send their requests as the site's proxy
forwards them (X-Forwarded-Proto: https), so that they pass with DJANGO_DEBUG "True" or "False".
With DJANGO_DEBUG "False" a request without that header is answered 301 before it reaches a view.
"""

from unittest import mock
from urllib.parse import urlencode

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from core.models import AnalysisSession, ConsentRecord

CONSENT_URL = "/api/v1/privacy/consent/"
ERASE_URL = "/api/v1/privacy/erase/"
FORM = "application/x-www-form-urlencoded"

# JSON accepts only the booleans true and false.
JSON_REJECTED = [None, "", "true", "false", "True", "1", "0", 1, 0, 1.0, 0.0, "yes", "on", [True], [False], {}]
# A form accepts exactly one value, "true" or "false" in any letter case.
FORM_REJECTED = ["", "1", "0", "yes", "no", "on", "off", "t", "f", "true ", " false", "truthy",
                 ["true", "true"], ["true", "false"], ["false", "false"]]


def form(**fields):
    """URL-encode fields as an HTML form or `curl -d` sends them; a list value repeats the field."""
    return urlencode(fields, doseq=True)


def uploaded(content=b"true", name="true"):
    """A file sent under the name of a yes/no field. Its name and its content both say "true"."""
    return SimpleUploadedFile(name, content, content_type="text/plain")


@override_settings(RATE_LIMIT_ENABLED=False)
class ConsentGrantedIsReadStrictlyTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="consent@example.invalid",
                                                         email="consent@example.invalid", password="unused-pw-123")
        self.client.force_authenticate(user=self.user)
        self.client.defaults["HTTP_X_FORWARDED_PROTO"] = "https"

    def stored(self, consent_type):
        record = ConsentRecord.objects.filter(user=self.user, consent_type=consent_type).first()
        return None if record is None else record.granted

    def test_json_true_then_false_is_stored(self):
        r = self.client.post(CONSENT_URL, {"consent_type": "analytics", "granted": True}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIs(self.stored("analytics"), True)
        r = self.client.post(CONSENT_URL, {"consent_type": "analytics", "granted": False}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIs(self.stored("analytics"), False)

    def test_form_false_withdraws_a_granted_consent(self):
        self.client.post(CONSENT_URL, {"consent_type": "cookies", "granted": True}, format="json")
        self.assertIs(self.stored("cookies"), True)
        r = self.client.post(CONSENT_URL, form(consent_type="cookies", granted="false"), content_type=FORM)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIs(r.json()["granted"], False)
        self.assertIs(self.stored("cookies"), False)

    def test_form_true_and_false_in_any_letter_case(self):
        for raw, expected in (("true", True), ("false", False), ("TRUE", True), ("False", False)):
            with self.subTest(raw=raw):
                r = self.client.post(CONSENT_URL, form(consent_type="analytics", granted=raw), content_type=FORM)
                self.assertEqual(r.status_code, 200, r.content)
                self.assertIs(self.stored("analytics"), expected)

    def test_multipart_false_is_stored_as_false(self):
        r = self.client.post(CONSENT_URL, {"consent_type": "email_notifications", "granted": "false"},
                             format="multipart")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIs(self.stored("email_notifications"), False)

    def assert_refused(self, response):
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(response.json(), {"error": '"granted" must be true or false.'})
        self.assertIsNone(self.stored("third_party_sharing"))

    def test_json_values_other_than_true_or_false_are_refused(self):
        for value in JSON_REJECTED:
            with self.subTest(value=value):
                self.assert_refused(self.client.post(
                    CONSENT_URL, {"consent_type": "third_party_sharing", "granted": value}, format="json"))

    def test_form_values_other_than_one_true_or_false_are_refused(self):
        for value in FORM_REJECTED:
            with self.subTest(value=value):
                self.assert_refused(self.client.post(
                    CONSENT_URL, form(consent_type="third_party_sharing", granted=value), content_type=FORM))

    def test_a_file_uploaded_as_granted_is_refused(self):
        sends = {"a file alone": uploaded(), "a file after the text true": ["true", uploaded()],
                 "a file before the text true": [uploaded(), "true"], "an empty file": uploaded(b"")}
        for label, value in sends.items():
            with self.subTest(label):
                self.assert_refused(self.client.post(
                    CONSENT_URL, {"consent_type": "third_party_sharing", "granted": value}, format="multipart"))

    def test_a_file_uploaded_as_granted_does_not_withdraw_a_consent(self):
        self.client.post(CONSENT_URL, {"consent_type": "analytics", "granted": True}, format="json")
        r = self.client.post(CONSENT_URL, {"consent_type": "analytics", "granted": uploaded(b"false", "false")},
                             format="multipart")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIs(self.stored("analytics"), True)

    def test_missing_granted_is_refused(self):
        self.assert_refused(self.client.post(CONSENT_URL, {"consent_type": "third_party_sharing"}, format="json"))
        self.assert_refused(self.client.post(CONSENT_URL, form(consent_type="third_party_sharing"),
                                             content_type=FORM))

    def test_a_json_body_that_is_not_an_object_is_refused(self):
        for body in ([True], ["analytics", True], "analytics", 1, None):
            with self.subTest(body=body):
                r = self.client.post(CONSENT_URL, body, format="json")
                self.assertEqual(r.status_code, 400, r.content)
                self.assertEqual(ConsentRecord.objects.filter(user=self.user).count(), 0)


@override_settings(RATE_LIMIT_ENABLED=False)
class ErasureConfirmIsReadStrictlyTest(APITestCase):
    EMAIL = "erase@example.invalid"

    def setUp(self):
        self.user = get_user_model().objects.create_user(username=self.EMAIL, email=self.EMAIL,
                                                         password="unused-pw-123", first_name="Ada")
        AnalysisSession.objects.create(user=self.user, name="kept unless erased", analysis_type="t_test")
        self.client.force_authenticate(user=self.user)
        self.client.defaults["HTTP_X_FORWARDED_PROTO"] = "https"

    def assert_not_erased(self):
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertEqual(self.user.email, self.EMAIL)
        self.assertEqual(self.user.first_name, "Ada")
        self.assertEqual(AnalysisSession.objects.filter(user=self.user).count(), 1)

    def assert_erased(self, response):
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["status"], "erased")
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertNotEqual(self.user.email, self.EMAIL)
        self.assertEqual(AnalysisSession.objects.filter(user=self.user).count(), 0)

    def assert_refused(self, response):
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(response.json(), {"error": '"confirm" must be true or false.'})
        self.assert_not_erased()

    def test_json_true_erases(self):
        self.assert_erased(self.client.post(ERASE_URL, {"confirm": True}, format="json"))

    def test_form_true_erases(self):
        self.assert_erased(self.client.post(ERASE_URL, form(confirm="true"), content_type=FORM))

    def test_form_true_in_another_letter_case_erases(self):
        self.assert_erased(self.client.post(ERASE_URL, form(confirm="True"), content_type=FORM))

    def test_false_does_not_erase_in_either_encoding(self):
        sends = [
            ("json false", lambda: self.client.post(ERASE_URL, {"confirm": False}, format="json")),
            ("form false", lambda: self.client.post(ERASE_URL, form(confirm="false"), content_type=FORM)),
            ("form FALSE", lambda: self.client.post(ERASE_URL, form(confirm="FALSE"), content_type=FORM)),
            ("multipart false", lambda: self.client.post(ERASE_URL, {"confirm": "false"}, format="multipart")),
        ]
        for label, send in sends:
            with self.subTest(label):
                r = send()
                # the service's own refusal, unchanged
                self.assertEqual(r.status_code, 400, r.content)
                self.assertEqual(r.json()["error"], "Erasure requires explicit confirmation")
                self.assert_not_erased()

    def test_json_values_other_than_true_or_false_are_refused(self):
        for value in JSON_REJECTED:
            with self.subTest(value=value):
                self.assert_refused(self.client.post(ERASE_URL, {"confirm": value}, format="json"))

    def test_form_values_other_than_one_true_or_false_are_refused(self):
        for value in FORM_REJECTED:
            with self.subTest(value=value):
                self.assert_refused(self.client.post(ERASE_URL, form(confirm=value), content_type=FORM))

    def test_a_file_uploaded_as_confirm_does_not_erase(self):
        sends = {"a file alone": uploaded(), "a file after the text true": ["true", uploaded()],
                 "a file before the text true": [uploaded(), "true"], "an empty file": uploaded(b"")}
        for label, value in sends.items():
            with self.subTest(label):
                self.assert_refused(self.client.post(ERASE_URL, {"confirm": value}, format="multipart"))

    def test_missing_confirm_is_refused(self):
        self.assert_refused(self.client.post(ERASE_URL, {}, format="json"))
        self.assert_refused(self.client.post(ERASE_URL, "", content_type=FORM))

    def test_a_json_body_that_is_not_an_object_is_refused(self):
        for body in ([True], "true", 1, None):
            with self.subTest(body=body):
                self.assert_refused(self.client.post(ERASE_URL, body, format="json"))


# The limit is the test's own: two requests a minute, counted in a cache of its own, at a fixed time.
@override_settings(RATE_LIMIT_ENABLED=True, RATE_LIMIT_DEFAULT_ANONYMOUS=2, RATE_LIMIT_DEFAULT_AUTHENTICATED=2,
                   CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache",
                                       "LOCATION": "privacy-rate-limit-tests"}})
class BeyondTheRateLimitNothingChangesTest(APITestCase):
    EMAIL = "limited@example.invalid"

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        clock = mock.patch("core.middleware.rate_limit_middleware.time").start()
        self.addCleanup(mock.patch.stopall)
        clock.time.return_value = 1_800_000_000.0
        clock.strftime.return_value = "2027-01-15"
        self.user = get_user_model().objects.create_user(username=self.EMAIL, email=self.EMAIL,
                                                         password="unused-pw-123", first_name="Ada")
        AnalysisSession.objects.create(user=self.user, name="kept unless erased", analysis_type="t_test")
        self.client.force_authenticate(user=self.user)
        self.client.defaults["HTTP_X_FORWARDED_PROTO"] = "https"

    def assert_limited(self, response):
        self.assertEqual(response.status_code, 429, response.content)
        self.assertEqual(response.json()["error"], "Rate limit exceeded")

    def test_a_withdrawal_and_an_erasure_beyond_the_limit_are_answered_429_and_change_nothing(self):
        for consent_type in ("analytics", "cookies"):
            r = self.client.post(CONSENT_URL, {"consent_type": consent_type, "granted": True}, format="json")
            self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r["X-RateLimit-Remaining"], "0")

        self.assert_limited(self.client.post(CONSENT_URL, {"consent_type": "analytics", "granted": False}, format="json"))
        self.assertIs(ConsentRecord.objects.get(user=self.user, consent_type="analytics").granted, True)

        self.assert_limited(self.client.post(ERASE_URL, {"confirm": True}, format="json"))
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertEqual(self.user.email, self.EMAIL)
        self.assertEqual(AnalysisSession.objects.filter(user=self.user).count(), 1)
        self.assertEqual(ConsentRecord.objects.filter(user=self.user, granted=True).count(), 2)

    def test_without_the_limit_the_same_requests_go_through(self):
        with override_settings(RATE_LIMIT_ENABLED=False):
            for consent_type in ("analytics", "cookies"):
                self.client.post(CONSENT_URL, {"consent_type": consent_type, "granted": True}, format="json")
            r = self.client.post(CONSENT_URL, {"consent_type": "analytics", "granted": False}, format="json")
            self.assertEqual(r.status_code, 200, r.content)
            self.assertIs(ConsentRecord.objects.get(user=self.user, consent_type="analytics").granted, False)
