"""A consent can be withdrawn.

`GDPRService.update_consent` wrote None into `granted_at` whenever `granted` was false, and the
column does not accept NULL. Every withdrawal, and every refusal recorded for the first time,
therefore failed with an IntegrityError: the endpoint answered 500 and the stored consent stayed
as it was. The page told the user "You can withdraw consent at any time".
"""

from datetime import datetime
from datetime import timezone as dt_timezone
from unittest import mock

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from core.models import ConsentRecord
from core.services.gdpr_service import GDPRService

CONSENT_URL = "/api/v1/privacy/consent/"


class ConsentCanBeWithdrawnTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="withdraw@example.invalid",
                                                         email="withdraw@example.invalid", password="unused-pw-123")
        self.client.force_authenticate(user=self.user)

    def record(self, consent_type):
        return ConsentRecord.objects.filter(user=self.user, consent_type=consent_type).first()

    def post(self, consent_type, granted):
        return self.client.post(CONSENT_URL, {"consent_type": consent_type, "granted": granted}, format="json")

    def test_a_granted_consent_is_withdrawn_and_the_time_it_was_given_stays_on_record(self):
        self.assertEqual(self.post("analytics", True).status_code, 200)
        given = self.record("analytics")
        self.assertIs(given.granted, True)
        self.assertIsNone(given.revoked_at)

        response = self.post("analytics", False)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIs(response.json()["granted"], False)
        withdrawn = self.record("analytics")
        self.assertIs(withdrawn.granted, False)
        self.assertIsNotNone(withdrawn.revoked_at)
        self.assertEqual(withdrawn.granted_at, given.granted_at)
        self.assertEqual(ConsentRecord.objects.filter(user=self.user, consent_type="analytics").count(), 1)

    def test_a_refusal_recorded_for_the_first_time_is_stored(self):
        response = self.post("cookies", False)
        self.assertEqual(response.status_code, 200, response.content)
        record = self.record("cookies")
        self.assertIs(record.granted, False)
        self.assertIsNotNone(record.revoked_at)

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

    def test_the_service_itself_stores_a_withdrawal(self):
        GDPRService.update_consent(self.user, "third_party_sharing", True)
        result = GDPRService.update_consent(self.user, "third_party_sharing", False)
        self.assertIs(result["granted"], False)
        self.assertIs(self.record("third_party_sharing").granted, False)
