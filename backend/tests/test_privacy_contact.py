"""The privacy information names no officer and gives no address the project does not own.

/api/v1/privacy/info/ returned "data_protection_officer": "dpo@stickforstats.org", and the privacy
settings page showed it as a mail link. Nobody holds that role, and stickforstats.org is not the
project's domain (the site is stickforstats.com): mail sent there reaches nobody here.
"""

import json
import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from core.services.gdpr_service import GDPRService

PAGE = Path(settings.BASE_DIR).parent / "frontend" / "src" / "pages" / "PrivacyDashboardPage.jsx"
ADDRESS = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")
OWN_DOMAIN = "stickforstats.com"


def addresses_elsewhere(text):
    """E-mail addresses in `text` that are not on the project's own domain."""
    return sorted({a for a in ADDRESS.findall(text) if a.rsplit("@", 1)[1].lower() != OWN_DOMAIN})


class TheAddressCheckItselfTest(SimpleTestCase):
    def test_it_finds_an_address_on_another_domain_and_passes_one_on_the_own_domain(self):
        self.assertEqual(addresses_elsewhere("write to dpo@stickforstats.org or a.b@mail.example.co.uk"),
                         ["a.b@mail.example.co.uk", "dpo@stickforstats.org"])
        self.assertEqual(addresses_elsewhere("write to someone@stickforstats.com"), [])
        self.assertEqual(addresses_elsewhere("someone@STICKFORSTATS.COM"), [])
        self.assertEqual(addresses_elsewhere("someone@stickforstats.com.example.org"), ["someone@stickforstats.com.example.org"])


@override_settings(RATE_LIMIT_ENABLED=False)
class PrivacyInfoNamesNoOfficerTest(APITestCase):
    def setUp(self):
        self.client.defaults["HTTP_X_FORWARDED_PROTO"] = "https"

    def test_the_response_has_no_officer_field_and_no_address_outside_the_own_domain(self):
        response = self.client.get("/api/v1/privacy/info/")
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertNotIn("data_protection_officer", body)
        text = json.dumps(body)
        self.assertEqual(addresses_elsewhere(text), [])
        self.assertNotIn("stickforstats.org", text)
        self.assertNotRegex(text, r"(?i)data protection officer|\bDPO\b")

    def test_the_service_answer_is_the_same(self):
        text = json.dumps(GDPRService.get_data_processing_info())
        self.assertEqual(addresses_elsewhere(text), [])
        self.assertNotIn("stickforstats.org", text)


class PrivacySettingsPageNamesNoOfficerTest(SimpleTestCase):
    def test_the_page_source_has_no_officer_no_mail_link_and_no_address_outside_the_own_domain(self):
        source = PAGE.read_text(encoding="utf-8")
        self.assertNotIn("mailto:", source)
        self.assertNotIn("data_protection_officer", source)
        self.assertNotRegex(source, r"(?i)data protection officer|\bDPO\b")
        self.assertEqual(addresses_elsewhere(source), [])
        self.assertNotIn("stickforstats.org", source)
