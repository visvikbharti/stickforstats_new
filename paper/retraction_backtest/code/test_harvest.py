"""Tests for the PMC OA bulk fallback added to harvest.py.

Scope is narrow — just the new fallback path and its invariants. The
primary Europe PMC path and the rest of the pipeline are exercised by
a real end-to-end run logged at `code/harvest_log.txt`.

Run with:
    cd paper/retraction_backtest/code
    python -m unittest test_harvest -v
"""
from __future__ import annotations

import gzip
import io
import logging
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import harvest

# Minimal JATS/NXML that parses and advertises a DOI.
_NXML_TEMPLATE = (
    b'<?xml version="1.0"?>'
    b'<article>'
    b'<front><article-meta>'
    b'<article-id pub-id-type="doi">%b</article-id>'
    b'</article-meta></front>'
    b"<body><sec><title>Results</title><p>t(10) = 2.50, p = .03.</p></sec></body>"
    b"</article>"
)


def _make_tarball(nxml_bytes: bytes, member_name: str = "PMC9999999.nxml") -> bytes:
    """Build an in-memory gzipped tar containing a single NXML member."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        info = tarfile.TarInfo(name=member_name)
        info.size = len(nxml_bytes)
        tf.addfile(info, io.BytesIO(nxml_bytes))
    return buf.getvalue()


class TestFtpRewrite(unittest.TestCase):
    def test_ncbi_ftp_rewritten_to_https(self):
        ftp = "ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/fa/38/PMC3168916.tar.gz"
        self.assertEqual(
            harvest._https_from_ftp(ftp),
            "https://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/fa/38/PMC3168916.tar.gz",
        )

    def test_non_ncbi_url_unchanged(self):
        url = "https://europepmc.org/articles/PMC3168916/fulltext.xml"
        self.assertEqual(harvest._https_from_ftp(url), url)

    def test_non_ftp_ncbi_url_unchanged(self):
        url = "https://ftp.ncbi.nlm.nih.gov/pub/pmc/readme.txt"
        self.assertEqual(harvest._https_from_ftp(url), url)


class TestFetchPmcOaBulk(unittest.TestCase):
    def setUp(self):
        self.logger = logging.getLogger("test_harvest")
        self.pmcid = "PMC9999999"
        self.doi = "10.1234/test.doi"
        self.tgz_href = (
            "ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/99/99/PMC9999999.tar.gz"
        )

    def test_returns_nxml_bytes_on_success(self):
        nxml = _NXML_TEMPLATE % self.doi.encode()
        tarball = _make_tarball(nxml)

        with patch.object(harvest, "_http_get_bytes", return_value=(200, tarball)):
            result = harvest.fetch_pmc_oa_bulk(self.pmcid, self.tgz_href, self.logger)

        self.assertIsNotNone(result)
        self.assertIn(self.doi.encode(), result)
        # DOI extraction should succeed on the returned bytes.
        self.assertIn(self.doi, harvest._extract_nxml_dois(result))

    def test_http_error_returns_none(self):
        with patch.object(harvest, "_http_get_bytes", return_value=(404, b"")):
            result = harvest.fetch_pmc_oa_bulk(self.pmcid, self.tgz_href, self.logger)
        self.assertIsNone(result)

    def test_empty_body_returns_none(self):
        with patch.object(harvest, "_http_get_bytes", return_value=(200, b"")):
            result = harvest.fetch_pmc_oa_bulk(self.pmcid, self.tgz_href, self.logger)
        self.assertIsNone(result)

    def test_corrupt_tarball_returns_none(self):
        with patch.object(harvest, "_http_get_bytes", return_value=(200, b"not a tarball")):
            result = harvest.fetch_pmc_oa_bulk(self.pmcid, self.tgz_href, self.logger)
        self.assertIsNone(result)

    def test_tarball_without_nxml_returns_none(self):
        # Tarball that only contains a PDF / image — no .nxml / .xml member.
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tf:
            info = tarfile.TarInfo(name="figure1.png")
            info.size = 4
            tf.addfile(info, io.BytesIO(b"\x89PNG"))
        with patch.object(harvest, "_http_get_bytes", return_value=(200, buf.getvalue())):
            result = harvest.fetch_pmc_oa_bulk(self.pmcid, self.tgz_href, self.logger)
        self.assertIsNone(result)

    def test_unparseable_nxml_returns_none(self):
        tarball = _make_tarball(b"<broken xml")
        with patch.object(harvest, "_http_get_bytes", return_value=(200, tarball)):
            result = harvest.fetch_pmc_oa_bulk(self.pmcid, self.tgz_href, self.logger)
        self.assertIsNone(result)


class TestFetchFulltextCascade(unittest.TestCase):
    """Cascade: EPMC fails → PMC OA bulk succeeds → NXML is written,
    atomic, DOI-verified, with source tagged in logs."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.fulltext_dir = Path(self.tmp.name) / "full_text"
        # Redirect FULLTEXT_DIR + STUDY_ROOT so atomic writes land in the tmp dir.
        self._fulltext_patch = patch.object(harvest, "FULLTEXT_DIR", self.fulltext_dir)
        self._study_patch = patch.object(harvest, "STUDY_ROOT", Path(self.tmp.name))
        self._fulltext_patch.start()
        self._study_patch.start()
        self.addCleanup(self._fulltext_patch.stop)
        self.addCleanup(self._study_patch.stop)

        self.logger = logging.getLogger("test_harvest_cascade")
        self.pmcid = "PMC9999998"
        self.doi = "10.5555/cascade.doi"
        self.tgz_href = (
            "ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/99/98/PMC9999998.tar.gz"
        )

    def _make_response(self, status: int, content: bytes):
        class _Resp:
            def __init__(self):
                self.status_code = status
                self.content = content

        return _Resp()

    def test_epmc_404_triggers_pmc_oa_bulk_fallback(self):
        nxml = _NXML_TEMPLATE % self.doi.encode()
        tarball = _make_tarball(nxml)

        with patch.object(harvest.requests, "get", return_value=self._make_response(404, b"")):
            with patch.object(harvest, "_http_get_bytes", return_value=(200, tarball)):
                ok, path = harvest.fetch_fulltext_nxml(
                    self.pmcid,
                    self.logger,
                    dry_run=False,
                    expected_doi=self.doi,
                    tgz_fallback_href=self.tgz_href,
                )

        self.assertTrue(ok)
        self.assertIsNotNone(path)
        out = self.fulltext_dir / f"{self.pmcid}.nxml.gz"
        self.assertTrue(out.exists())
        with gzip.open(out, "rb") as fh:
            written = fh.read()
        self.assertIn(self.doi.encode(), written)

    def test_epmc_parse_error_triggers_fallback(self):
        nxml = _NXML_TEMPLATE % self.doi.encode()
        tarball = _make_tarball(nxml)

        with patch.object(
            harvest.requests, "get",
            return_value=self._make_response(200, b"<not-xml>"),
        ):
            with patch.object(harvest, "_http_get_bytes", return_value=(200, tarball)):
                ok, path = harvest.fetch_fulltext_nxml(
                    self.pmcid,
                    self.logger,
                    dry_run=False,
                    expected_doi=self.doi,
                    tgz_fallback_href=self.tgz_href,
                )

        self.assertTrue(ok)
        self.assertIsNotNone(path)

    def test_both_sources_fail_returns_false(self):
        with patch.object(harvest.requests, "get", return_value=self._make_response(404, b"")):
            with patch.object(harvest, "_http_get_bytes", return_value=(404, b"")):
                ok, path = harvest.fetch_fulltext_nxml(
                    self.pmcid,
                    self.logger,
                    dry_run=False,
                    expected_doi=self.doi,
                    tgz_fallback_href=self.tgz_href,
                )

        self.assertFalse(ok)
        self.assertIsNone(path)
        self.assertFalse((self.fulltext_dir / f"{self.pmcid}.nxml.gz").exists())

    def test_fallback_doi_mismatch_discards(self):
        """Fallback NXML with a WRONG DOI must NOT be written (case_0019
        defence carries through to the fallback path)."""
        wrong_doi = "10.9999/wrong.doi"
        nxml = _NXML_TEMPLATE % wrong_doi.encode()
        tarball = _make_tarball(nxml)

        with patch.object(harvest.requests, "get", return_value=self._make_response(404, b"")):
            with patch.object(harvest, "_http_get_bytes", return_value=(200, tarball)):
                ok, path = harvest.fetch_fulltext_nxml(
                    self.pmcid,
                    self.logger,
                    dry_run=False,
                    expected_doi=self.doi,
                    tgz_fallback_href=self.tgz_href,
                )

        self.assertFalse(ok)
        self.assertIsNone(path)
        self.assertFalse((self.fulltext_dir / f"{self.pmcid}.nxml.gz").exists())

    def test_no_fallback_href_keeps_old_behaviour(self):
        """When tgz_fallback_href is None, a failed EPMC yields (False, None)
        with no tarball attempted — the behaviour before this change."""
        with patch.object(harvest.requests, "get", return_value=self._make_response(404, b"")):
            with patch.object(harvest, "_http_get_bytes") as mock_bytes:
                ok, path = harvest.fetch_fulltext_nxml(
                    self.pmcid,
                    self.logger,
                    dry_run=False,
                    expected_doi=self.doi,
                    tgz_fallback_href=None,
                )

        self.assertFalse(ok)
        self.assertIsNone(path)
        mock_bytes.assert_not_called()


if __name__ == "__main__":
    unittest.main()
