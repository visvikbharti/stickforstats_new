"""A consent can be withdrawn, and a refusal is not stored as a consent.

`GDPRService.update_consent` wrote None into `granted_at` whenever `granted` was false, and the
column did not accept NULL. Every withdrawal, and every refusal recorded for the first time,
therefore failed with an IntegrityError: the endpoint answered 500 and the stored consent stayed
as it was. The page told the user "You can withdraw consent at any time".

The column now accepts NULL and has no default (migration 0017). A withdrawal keeps the time at
which consent was given. A record that a refusal creates has no grant time, and the data export
prints "never granted" for it: a "no" stored with a grant time would be a record of a consent
that nobody gave.
"""

import importlib
from datetime import datetime
from datetime import timezone as dt_timezone
from types import SimpleNamespace
from unittest import mock

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from core.models import ConsentRecord
from core.services.gdpr_service import GDPRService

CONSENT_URL = "/api/v1/privacy/consent/"
EXPORT_URL = "/api/v1/privacy/export/"


# The tests state the settings they need and send their requests as the site's proxy forwards them
# (X-Forwarded-Proto: https), so that they pass with DJANGO_DEBUG "True" or "False".
@override_settings(RATE_LIMIT_ENABLED=False)
class ConsentCanBeWithdrawnTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="withdraw@example.invalid",
                                                         email="withdraw@example.invalid", password="unused-pw-123")
        self.client.force_authenticate(user=self.user)
        self.client.defaults["HTTP_X_FORWARDED_PROTO"] = "https"

    def record(self, consent_type):
        return ConsentRecord.objects.filter(user=self.user, consent_type=consent_type).first()

    def post(self, consent_type, granted):
        return self.client.post(CONSENT_URL, {"consent_type": consent_type, "granted": granted}, format="json")

    def exported(self):
        response = self.client.get(EXPORT_URL)
        self.assertEqual(response.status_code, 200, response.content)
        return {entry["type"]: entry for entry in response.json()["consent_records"]}

    def test_a_granted_consent_is_withdrawn_and_the_time_it_was_given_stays_on_record(self):
        self.assertEqual(self.post("analytics", True).status_code, 200)
        given = self.record("analytics")
        self.assertIs(given.granted, True)
        self.assertIsNotNone(given.granted_at)
        self.assertIsNone(given.revoked_at)

        response = self.post("analytics", False)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIs(response.json()["granted"], False)
        withdrawn = self.record("analytics")
        self.assertIs(withdrawn.granted, False)
        self.assertIsNotNone(withdrawn.revoked_at)
        self.assertEqual(withdrawn.granted_at, given.granted_at)
        self.assertEqual(ConsentRecord.objects.filter(user=self.user, consent_type="analytics").count(), 1)

    def test_a_refusal_recorded_for_the_first_time_is_stored_without_a_grant_time(self):
        response = self.post("cookies", False)
        self.assertEqual(response.status_code, 200, response.content)
        record = self.record("cookies")
        self.assertIs(record.granted, False)
        self.assertIsNone(record.granted_at)
        self.assertIsNotNone(record.revoked_at)
        # refused again: still no grant time
        self.assertEqual(self.post("cookies", False).status_code, 200)
        self.assertIsNone(self.record("cookies").granted_at)

    def test_the_column_takes_no_grant_time_and_has_no_default(self):
        field = ConsentRecord._meta.get_field("granted_at")
        self.assertTrue(field.null)
        self.assertFalse(field.has_default())

    def test_consent_given_after_a_first_refusal_gets_its_grant_time(self):
        refused_at, given_at = (datetime(2026, 2, day, 9, 30, tzinfo=dt_timezone.utc) for day in (1, 2))
        with mock.patch("core.services.gdpr_service.timezone.now", return_value=refused_at):
            self.assertEqual(self.post("email_notifications", False).status_code, 200)
        with mock.patch("core.services.gdpr_service.timezone.now", return_value=given_at):
            self.assertEqual(self.post("email_notifications", True).status_code, 200)
        record = self.record("email_notifications")
        self.assertEqual((record.granted, record.granted_at, record.revoked_at), (True, given_at, None))

    def test_consent_given_again_after_a_withdrawal_is_no_longer_revoked_and_carries_the_new_time(self):
        times = [datetime(2026, 1, day, 12, 0, tzinfo=dt_timezone.utc) for day in (1, 2, 3)]
        stored = []
        for granted, when in zip((True, False, True), times):
            # update_consent reads the clock once for the record and once for its answer
            with mock.patch("core.services.gdpr_service.timezone.now", return_value=when):
                self.assertEqual(self.post("data_processing", granted).status_code, 200)
            record = self.record("data_processing")
            stored.append((record.granted, record.granted_at, record.revoked_at))
        self.assertEqual(stored, [(True, times[0], None), (False, times[0], times[1]), (True, times[2], None)])

    def test_the_status_shows_the_withdrawal_and_no_time_of_consent(self):
        self.post("analytics", True)
        self.post("analytics", False)
        shown = self.client.get(CONSENT_URL).json()["consents"]["analytics"]
        self.assertIs(shown["granted"], False)
        self.assertIsNone(shown["granted_at"])
        self.assertIsNotNone(shown["revoked_at"])

    def test_the_status_of_a_first_refusal_has_no_time_of_consent(self):
        self.post("cookies", False)
        shown = self.client.get(CONSENT_URL).json()["consents"]["cookies"]
        self.assertEqual((shown["granted"], shown["granted_at"]), (False, None))
        self.assertIsNotNone(shown["revoked_at"])

    def test_the_status_does_not_fail_on_a_granted_record_without_a_grant_time(self):
        # Not written by the service; a record edited by hand can look like this.
        ConsentRecord.objects.create(user=self.user, consent_type="analytics", granted=True, granted_at=None)
        response = self.client.get(CONSENT_URL)
        self.assertEqual(response.status_code, 200, response.content)
        shown = response.json()["consents"]["analytics"]
        self.assertEqual((shown["granted"], shown["granted_at"]), (True, None))

    def test_the_export_prints_never_granted_for_a_refusal_and_the_grant_time_otherwise(self):
        given_at, withdrawn_at = (datetime(2026, 3, day, 8, 0, tzinfo=dt_timezone.utc) for day in (1, 2))
        with mock.patch("core.services.gdpr_service.timezone.now", return_value=given_at):
            self.post("analytics", True)          # given, later withdrawn
            self.post("data_processing", True)    # given
        with mock.patch("core.services.gdpr_service.timezone.now", return_value=withdrawn_at):
            self.post("analytics", False)
            self.post("cookies", False)           # refused, never given
        exported = self.exported()
        self.assertEqual(set(exported), {"analytics", "data_processing", "cookies"})
        self.assertEqual(exported["cookies"]["granted_at"], "never granted")
        self.assertIs(exported["cookies"]["granted"], False)
        self.assertEqual(exported["cookies"]["revoked_at"], withdrawn_at.isoformat())
        self.assertEqual(exported["analytics"]["granted_at"], given_at.isoformat())
        self.assertEqual(exported["analytics"]["revoked_at"], withdrawn_at.isoformat())
        self.assertIs(exported["analytics"]["granted"], False)
        self.assertEqual(exported["data_processing"]["granted_at"], given_at.isoformat())
        self.assertIsNone(exported["data_processing"]["revoked_at"])

    def test_the_service_itself_stores_a_withdrawal(self):
        GDPRService.update_consent(self.user, "third_party_sharing", True)
        result = GDPRService.update_consent(self.user, "third_party_sharing", False)
        self.assertIs(result["granted"], False)
        self.assertIs(self.record("third_party_sharing").granted, False)


class GoingBackDoesNotInventGrantTimesTest(TestCase):
    """Migration 0017 backwards: the earlier column needs a grant time for every record."""

    def setUp(self):
        migration = importlib.import_module("core.migrations.0017_consentrecord_granted_at_nullable")
        self.reverse = lambda: migration.refuse_to_invent_grant_times(django_apps, SimpleNamespace(connection=connection))
        self.user = get_user_model().objects.create_user(username="back@example.invalid",
                                                         email="back@example.invalid", password="unused-pw-123")

    def test_it_goes_back_when_every_record_has_a_grant_time(self):
        self.reverse()                                     # no records at all
        GDPRService.update_consent(self.user, "analytics", True)
        GDPRService.update_consent(self.user, "cookies", True)
        GDPRService.update_consent(self.user, "cookies", False)   # withdrawn: the grant time is kept
        self.reverse()
        self.assertEqual(ConsentRecord.objects.filter(granted_at__isnull=True).count(), 0)

    def test_it_stops_and_counts_the_refusals_that_have_no_grant_time(self):
        GDPRService.update_consent(self.user, "analytics", True)
        GDPRService.update_consent(self.user, "cookies", False)
        GDPRService.update_consent(self.user, "email_notifications", False)
        with self.assertRaisesRegex(RuntimeError, r"^2 consent record\(s\) hold a refusal and no grant time"):
            self.reverse()
        # nothing was written and nothing was removed
        self.assertEqual(ConsentRecord.objects.count(), 3)
        self.assertEqual(ConsentRecord.objects.filter(granted_at__isnull=True).count(), 2)
