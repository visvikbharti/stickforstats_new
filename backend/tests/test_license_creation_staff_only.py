"""Only staff can create a site licence.

SiteLicenseCreateView allowed any signed-in user (IsAuthenticated), and anyone can register,
so with the password gate gone anyone could create a licence for any institution and domain.
It now needs is_staff (IsAdminUser); docs/API_DOCUMENTATION.md says so.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import SiteLicense

URL = "/api/v1/licensing/create/"
BODY = {"institution_name": "Test U", "tier": "department", "admin_email": "a@testu.edu", "domain": "testu.edu"}


@override_settings(SECURE_SSL_REDIRECT=False)
class LicenceCreationStaffOnlyTest(TestCase):
    def client_for(self, is_staff):
        user = get_user_model().objects.create_user(
            username=f"user-{is_staff}@example.org", email=f"user-{is_staff}@example.org",
            password="unused-here", is_staff=is_staff,
        )
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_anonymous_visitors_get_401(self):
        self.assertEqual(APIClient().post(URL, BODY, format="json").status_code, 401)
        self.assertEqual(SiteLicense.objects.count(), 0)

    def test_signed_in_users_who_are_not_staff_get_403(self):
        self.assertEqual(self.client_for(is_staff=False).post(URL, BODY, format="json").status_code, 403)
        self.assertEqual(SiteLicense.objects.count(), 0)

    def test_staff_can_create_one(self):
        response = self.client_for(is_staff=True).post(URL, BODY, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(SiteLicense.objects.count(), 1)
