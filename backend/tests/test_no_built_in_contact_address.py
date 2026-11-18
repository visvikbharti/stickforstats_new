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


class TheScriptsUnderPaperTest(SimpleTestCase):
    """Three scripts that fetch from public archives for the paper's analyses carried the same address,
    one of them in the query string of every request. They read the same setting."""

    ROOT = Path(settings.BASE_DIR).parent
    HARVEST = "paper/retraction_backtest/code/harvest.py"
    GENES = "paper/replication/case_study_4/code/lookup_gene_ids.py"
    PILOT = "paper/replication/verification/pilot_data_availability.py"
    WRITTEN_IN = re.compile(
        r"mailto:[A-Za-z0-9._%+-]+@|User-Agent[^\n]*[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.|[&?\"']email=[A-Za-z0-9._%+-]+@|"
        r"CONTACT\w*\s*=\s*[\"'][A-Za-z0-9._%+-]+@")

    def _load(self, relative, value):
        """The module of a script, loaded with the setting at `value` (None: not set)."""
        import importlib.util

        spec = importlib.util.spec_from_file_location("script_under_test", self.ROOT / relative)
        module = importlib.util.module_from_spec(spec)
        with _environment(value):
            spec.loader.exec_module(module)
        return module

    def _constants_of_the_harvest_script(self, value):
        """Its block of constants, run by itself: the script imports packages the backend does not need."""
        source = (self.ROOT / self.HARVEST).read_text(encoding="utf-8")
        block = source[source.index('TOOL_NAME = "'):source.index("\n", source.index("USER_AGENT = "))]
        names = {"os": os, "re": re}
        with _environment(value):
            exec(block, names)   # noqa: S102  (the repository's own constants)
        return names

    def test_no_script_under_paper_has_an_address_written_into_a_request(self):
        found = []
        for path in sorted((self.ROOT / "paper").rglob("*.py")):
            for number, line in enumerate(path.read_text(encoding="utf-8", errors="replace").split("\n"), 1):
                if self.WRITTEN_IN.search(line):
                    found.append(f"{path.relative_to(self.ROOT).as_posix()}:{number}")
        self.assertEqual(found, [])

    def test_the_scan_finds_each_of_the_forms(self):
        for line in ('UA = {"User-Agent": "pilot/1.0 (research; mailto:someone@example.org)"}',
                     'TOOL = "&tool=pilot&email=someone@example.org"', 'CONTACT_EMAIL = "someone@example.org"',
                     '"User-Agent": "case-study/1.0 (someone@example.org)",'):
            self.assertTrue(self.WRITTEN_IN.search(line), line)
        for line in ('CONTACT_EMAIL = os.environ.get("STICKFORSTATS_CONTACT_EMAIL", "").strip()',
                     'USER_AGENT = f"{TOOL_NAME}/0.1 (+mailto:{CONTACT_EMAIL})" if CONTACT_EMAIL else f"{TOOL_NAME}/0.1"'):
            self.assertFalse(self.WRITTEN_IN.search(line), line)

    def test_the_gene_lookup_script(self):
        self.assertEqual(self._load(self.GENES, None).USER_AGENT, "stickforstats-case-study-4/1.0")
        self.assertEqual(self._load(self.GENES, " lab@example.org ").USER_AGENT, "stickforstats-case-study-4/1.0 (lab@example.org)")
        self.assertNotIn("@", self._load(self.GENES, "lab@example.org\r\nX-Other: 1").USER_AGENT)

    def test_the_data_availability_pilot(self):
        without = self._load(self.PILOT, None)
        self.assertEqual(without.UA, {"User-Agent": "stickforstats-pilot/1.0 (research)"})
        self.assertEqual(without.TOOL, "&tool=stickforstats-pilot")
        with_one = self._load(self.PILOT, "lab@example.org")
        self.assertEqual(with_one.UA, {"User-Agent": "stickforstats-pilot/1.0 (research; mailto:lab@example.org)"})
        self.assertEqual(with_one.TOOL, "&tool=stickforstats-pilot&email=lab%40example.org")
        self.assertEqual(self._load(self.PILOT, "not an address").TOOL, "&tool=stickforstats-pilot")

    def test_the_corpus_fetcher_of_the_manuscript_validation(self):
        # It carried another address, one at the site's own domain; a default address is a default address.
        corpus = "paper/replication/manuscript_validation/fetch_corpus.py"
        self.assertEqual(self._load(corpus, None).UA, {"User-Agent": "stickforstats-validation/2.0 (research)"})
        self.assertEqual(self._load(corpus, "lab@example.org").UA,
                         {"User-Agent": "stickforstats-validation/2.0 (research; mailto:lab@example.org)"})
        for not_one_address in ("lab at example.org", "lab@example.org\r\nX-Other: 1", "a@example.org, b@example.org"):
            self.assertEqual(self._load(corpus, not_one_address).UA, {"User-Agent": "stickforstats-validation/2.0 (research)"})

    def test_the_retraction_harvest_script(self):
        without = self._constants_of_the_harvest_script(None)
        self.assertEqual((without["CONTACT_EMAIL"], without["USER_AGENT"]), ("", "stickforstats_retraction_backtest/0.1"))
        with_one = self._constants_of_the_harvest_script("lab@example.org")
        self.assertEqual(with_one["USER_AGENT"], "stickforstats_retraction_backtest/0.1 (+mailto:lab@example.org)")
        self.assertEqual(self._constants_of_the_harvest_script("a@example.org, b@example.org")["CONTACT_EMAIL"], "")
        # the two requests to NCBI carry the address as a parameter only when there is one
        source = (self.ROOT / self.HARVEST).read_text(encoding="utf-8")
        self.assertNotIn('"email": CONTACT_EMAIL,', source)
        self.assertEqual(source.count('**({"email": CONTACT_EMAIL} if CONTACT_EMAIL else {}),'), 2)
