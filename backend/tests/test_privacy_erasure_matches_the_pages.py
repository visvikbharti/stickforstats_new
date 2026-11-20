"""Closing an account does what the two pages say it does, no less and no more.

frontend/src/pages/privacyErasure.js holds the lines that the confirmation dialog of Privacy settings
and the Privacy & data page show. The dialog said that the account's email address and "all your
personal data" would be permanently deleted. The erasure keeps the username, and the username of an
account is the email address it was registered with.

Each test below runs the erasure and checks one group of those lines against the database. A test
fails when the erasure stops doing what a line says, and also when it starts doing more (for
example when it clears the username): the lines are then changed in the same commit.
"""

from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from authentication.serializers import RegisterSerializer
from core.models import (
    AnalysisResult,
    AnalysisSession,
    ConsentRecord,
    Organization,
    OrganizationMembership,
    ReproducibilityReceipt,
    StatisticalAudit,
    UsageRecord,
)
from probability_distributions.models import DistributionProject

LINES = (Path(settings.BASE_DIR).parent / "frontend" / "src" / "pages" / "privacyErasure.js").read_text(encoding="utf-8")
EMAIL = "closing@example.invalid"


@override_settings(RATE_LIMIT_ENABLED=False)
class ClosingAnAccountTest(TestCase):
    def setUp(self):
        registration = RegisterSerializer(data={
            "email": EMAIL, "password": "not-a-real-pw-4821", "confirmPassword": "not-a-real-pw-4821",
            "firstName": "Ada", "lastName": "Lovelace", "acceptTerms": True})
        self.assertTrue(registration.is_valid(), registration.errors)
        self.user = registration.save()
        session = AnalysisSession.objects.create(user=self.user, name="a session", analysis_type="t_test")
        AnalysisResult.objects.create(analysis_session=session, analysis_type="t_test")
        ConsentRecord.objects.create(user=self.user, consent_type="analytics", granted=True)
        organization = Organization.objects.create(name="A lab", slug="a-lab")
        OrganizationMembership.objects.create(organization=organization, user=self.user)
        UsageRecord.objects.create(user=self.user, endpoint="/api/v1/x/", method="POST", status_code=200,
                                   client_ip="203.0.113.7", user_agent="a browser")
        StatisticalAudit.objects.create(test_type="t_test", field="biology", user_id=str(self.user.pk),
                                        source_ip="203.0.113.7")
        DistributionProject.objects.create(user=self.user, name="a saved project")
        ReproducibilityReceipt.objects.create(user=self.user, subject_hash="0" * 64, canonical_payload_hash="1" * 64,
                                              signature="not a signature", receipt_json={})
        client = APIClient()
        client.force_authenticate(user=self.user)
        self.response = client.post("/api/v1/privacy/erase/", {"confirm": True}, format="json",
                                    HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(self.response.status_code, 200, self.response.content)
        self.user.refresh_from_db()

    def test_what_is_deleted(self):
        for line in ("'Your analysis sessions and their results'", "'Your consent records'",
                     "'Your organization memberships'"):
            self.assertIn(line, LINES)
        self.assertEqual(AnalysisSession.objects.count(), 0)
        self.assertEqual(AnalysisResult.objects.count(), 0)
        self.assertEqual(ConsentRecord.objects.count(), 0)
        self.assertEqual(OrganizationMembership.objects.count(), 0)

    def test_what_is_anonymised(self):
        self.assertIn("'Your usage records: they are kept without your account, IP address and browser'", LINES)
        self.assertIn("'Your audit entries: they are kept without your account and IP address'", LINES)
        usage = UsageRecord.objects.get()
        self.assertEqual((usage.user, usage.client_ip, usage.user_agent), (None, None, "[erased]"))
        self.assertEqual((usage.endpoint, usage.status_code), ("/api/v1/x/", 200))       # the record itself is kept
        audit = StatisticalAudit.objects.get()
        self.assertEqual((audit.user_id, audit.source_ip), (None, None))
        self.assertEqual(audit.test_type, "t_test")

    def test_what_happens_to_the_account(self):
        self.assertIn("'Your name is cleared, your password is disabled and the account is deactivated'", LINES)
        self.assertEqual((self.user.first_name, self.user.last_name), ("", ""))
        self.assertFalse(self.user.has_usable_password())
        self.assertFalse(self.user.is_active)
        self.assertEqual(get_user_model().objects.filter(pk=self.user.pk).count(), 1)     # deactivated, not deleted

    def test_the_email_address_is_kept_as_the_username(self):
        self.assertIn("'Your email address stays in our database, because it is also your username.'", LINES)
        self.assertEqual(self.user.username, EMAIL)
        # The account's email field is overwritten. The address is in the row all the same.
        self.assertEqual(self.user.email, f"deleted_{self.user.pk}@erased.invalid")

    def test_saved_projects_and_receipts_stay_linked_to_the_deactivated_account(self):
        self.assertIn("'Saved projects and receipts are not deleted. They stay linked to the deactivated account.'", LINES)
        self.assertEqual(DistributionProject.objects.get().user_id, self.user.pk)
        self.assertEqual(ReproducibilityReceipt.objects.get().user_id, self.user.pk)

    def test_the_message_afterwards_says_the_same(self):
        self.assertIn("'Your email address is still stored as the username of the deactivated account, and saved ' +", LINES)
        self.assertNotIn("Your personal data has been erased", LINES)
