"""The manuscript tools send no contact address unless whoever runs them sets one.

Two fetchers ask public archives (NCBI E-utilities, GEO) for files, and name themselves in the
User-Agent header as those archives ask. An address was written into both headers, so every
installation sent that one address with every request. The address is now the operator's setting,
STICKFORSTATS_CONTACT_EMAIL, and it is empty by default.
"""
import os
import re
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.test import SimpleTestCase

from core.manuscript import contact, data_fetcher, pmc_fetcher

SETTING = "STICKFORSTATS_CONTACT_EMAIL"


def _environment(value=None):
    """The environment with the setting at `value`, or without it."""
    env = {k: v for k, v in os.environ.items() if k != SETTING}
    if value is not None:
        env[SETTING] = value
    return mock.patch.dict(os.environ, env, clear=True)


class TheSettingTest(SimpleTestCase):
    def test_the_name_of_the_setting(self):
        self.assertEqual(contact.CONTACT_SETTING, SETTING)

    def test_without_the_setting_no_address_is_sent(self):
        for value in (None, "", "   "):
            with self.subTest(value=value), _environment(value):
                self.assertEqual(contact.contact_address(), "")
                self.assertEqual(contact.user_agent("client/1.0"), {"User-Agent": "client/1.0 (research)"})

    def test_the_operator_s_address_is_sent(self):
        with _environment(" lab@example.org "):
            self.assertEqual(contact.contact_address(), "lab@example.org")
            self.assertEqual(contact.user_agent("client/1.0"), {"User-Agent": "client/1.0 (research; mailto:lab@example.org)"})

    def test_a_value_that_is_not_one_address_is_not_sent(self):
        for value in ("lab at example.org", "lab@example.org\r\nX-Other: 1", "a@example.org, b@example.org",
                      "<lab@example.org>", "lab@example", "@example.org", "lab@", "mailto:lab@example.org"):
            with self.subTest(value=value), _environment(value):
                self.assertEqual(contact.contact_address(), "")
                self.assertNotIn("@", contact.user_agent("client/1.0")["User-Agent"])

    def test_the_setting_is_read_at_the_time_of_the_request(self):
        with _environment():
            first = contact.user_agent("client/1.0")
        with _environment("lab@example.org"):
            second = contact.user_agent("client/1.0")
        self.assertNotEqual(first, second)


class _Answer:
    """What urllib's urlopen returns, as far as the two fetchers read it."""
    headers = {"Content-Length": "0"}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self, *args):
        return b""


class TheTwoFetchersTest(SimpleTestCase):
    def _header_sent(self, call):
        with mock.patch("urllib.request.urlopen", return_value=_Answer()) as opened:
            call()
        request = opened.call_args[0][0]
        return request.get_header("User-agent")

    def test_neither_sends_an_address_by_default(self):
        with _environment():
            self.assertEqual(self._header_sent(lambda: data_fetcher._get("https://archive.example/file")),
                             "stickforstats-fetch/1.0 (research)")
            self.assertEqual(self._header_sent(lambda: pmc_fetcher._get("https://archive.example/file")),
                             "stickforstats-census/1.0 (research)")

    def test_both_send_the_operator_s_address_when_it_is_set(self):
        with _environment("lab@example.org"):
            self.assertEqual(self._header_sent(lambda: data_fetcher._get("https://archive.example/file")),
                             "stickforstats-fetch/1.0 (research; mailto:lab@example.org)")
            self.assertEqual(self._header_sent(lambda: pmc_fetcher._get("https://archive.example/file")),
                             "stickforstats-census/1.0 (research; mailto:lab@example.org)")


class NoAddressInTheSourceTest(SimpleTestCase):
    """No file of the backend writes an address into a request header."""

    IN_A_HEADER = re.compile(r"mailto:[A-Za-z0-9._%+-]+@|User-Agent[^\n]*[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.")

    def test_no_source_file_holds_an_address_in_a_header(self):
        backend = Path(settings.BASE_DIR)
        found = []
        for path in backend.rglob("*.py"):
            parts = set(path.relative_to(backend).parts)
            if parts & {"tests", "migrations", "staticfiles"} or any(p.startswith(".") or "venv" in p for p in parts):
                continue
            if path.name.startswith("test_") or path.name == "tests.py":
                continue
            if self.IN_A_HEADER.search(path.read_text(encoding="utf-8", errors="replace")):
                found.append(path.relative_to(backend).as_posix())
        self.assertEqual(found, [])

    def test_the_scan_finds_one(self):
        self.assertTrue(self.IN_A_HEADER.search('UA = {"User-Agent": "client/1.0 (research; mailto:someone@example.org)"}'))
        self.assertTrue(self.IN_A_HEADER.search('"User-Agent": "client/1.0 (someone@example.org)",'))
        self.assertFalse(self.IN_A_HEADER.search('return {"User-Agent": f"{client} (research; mailto:{address})"}'))
