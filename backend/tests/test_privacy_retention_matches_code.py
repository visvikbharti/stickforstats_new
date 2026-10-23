"""What the privacy statements say about retention must match what the code does.

/api/v1/privacy/info/ (shown on /privacy-settings) said uploaded datasets were kept for the
"Duration of account + 30 days" and API call logs for "365 days". Neither period is
implemented anywhere: most uploads are never stored, anonymous uploads have no account, and
nothing deletes logs or records on a schedule. These tests pin the corrected text, and tie the
two periods both privacy statements do state (a 1-hour result cache, 30-day backups) to the
values in the code, so changing either value makes them fail until the text is updated.
"""

import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from core.services.gdpr_service import GDPRService

BACKEND = Path(settings.BASE_DIR)
REPO = BACKEND.parent
PRIVACY_PAGE = REPO / "frontend" / "src" / "pages" / "PrivacyPolicyPage.jsx"


def _retention(purpose):
    info = GDPRService.get_data_processing_info()
    return next(p["retention"] for p in info["purposes"] if p["purpose"] == purpose)


class PrivacyInfoRetentionTest(SimpleTestCase):
    def test_no_retention_period_the_code_does_not_implement(self):
        info = GDPRService.get_data_processing_info()
        text = " ".join(p["retention"] for p in info["purposes"])
        self.assertNotIn("Duration of account", text)
        self.assertNotIn("365 days", text)

    def test_analysis_retention_states_what_is_kept(self):
        text = _retention("Statistical analysis services")
        self.assertIn("Not stored by most tools", text)
        self.assertIn("cached for up to 1 hour", text)
        self.assertIn("no files, no data values", text)
        self.assertIn("backups are kept 30 days", text)

    def test_log_retention_says_none_is_set(self):
        self.assertIn("No fixed retention period is set", _retention("Request and error logs"))

    def test_no_purpose_claims_analytics(self):
        # The Privacy & data page says no analytics are used; the notice must not say otherwise.
        purposes = [p["purpose"] for p in GDPRService.get_data_processing_info()["purposes"]]
        self.assertFalse([p for p in purposes if "analytics" in p.lower()], purposes)


class RetentionPeriodsMatchTheCodeTest(SimpleTestCase):
    def test_the_result_cache_lasts_one_hour(self):
        # The three cached views: t-test and ANOVA (views.py), regression (regression_views.py).
        timeouts = []
        for name in ("views.py", "regression_views.py"):
            source = (BACKEND / "api" / "v1" / name).read_text(encoding="utf-8")
            timeouts += [int(t) for t in re.findall(r"@cache_statistical_result\(timeout=(\d+)\)", source)]
        self.assertEqual(len(timeouts), 3, timeouts)
        self.assertEqual(set(timeouts), {3600}, "both privacy statements say the cache lasts up to 1 hour")

    def test_backups_are_kept_thirty_days(self):
        source = (REPO / "scripts" / "backup.sh").read_text(encoding="utf-8")
        self.assertRegex(source, r"RETENTION_DAYS=\$\{BACKUP_RETENTION_DAYS:-30\}")

    def test_the_session_cookie_lasts_fourteen_days(self):
        # The AI assistant's session cookie and record (api/v1/ai_advisor_views.py).
        self.assertEqual(settings.SESSION_COOKIE_AGE, 14 * 24 * 3600)
        self.assertIn("The cookie lasts 14 days", PRIVACY_PAGE.read_text(encoding="utf-8"))

    def test_the_privacy_page_states_the_same_periods(self):
        page = PRIVACY_PAGE.read_text(encoding="utf-8")
        self.assertIn("cache for up to one hour", page)
        self.assertRegex(page, r"backups\s+are kept for 30 days")
