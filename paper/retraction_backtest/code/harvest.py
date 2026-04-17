#!/usr/bin/env python3
"""
Retraction-backtest corpus harvester.

Builds the case/control manifest for the SQS retraction backtest described in
``paper/retraction_backtest/PROTOCOL.md`` and ``DATA_SOURCES.md``.

Pipeline (mirrors PROTOCOL.md inclusion/exclusion criteria verbatim):

    Step 1.  Clone / pull the Retraction Watch CSV from GitLab.
    Step 2.  Filter candidate cases:
                 - RetractionDate YEAR in [2010, 2023]
                 - OriginalPaperDate YEAR in [2010, 2023]
                 - OriginalPaperDOI present
                 - OriginalPaperPubMedID present
    Step 3.  Label each candidate via the PROTOCOL.md §9.1 regex codebook.
             ``Ambiguous`` rows are dropped from the pilot pool and logged.
    Step 4.  For each kept case, resolve DOI -> PMCID via NCBI E-utilities.
    Step 5.  For each PMCID, fetch license + retracted flag from PMC's
             OA Web Service (``oa.fcgi``). Keep only group-1 licenses
             (CC0 / CC-BY / CC-BY-SA / CC-BY-ND).
    Step 6.  Fetch MeSH major descriptors + canonical journal metadata via
             NCBI eFetch (PubMed db).
    Step 7.  Fetch full-text NXML from Europe PMC ``{PMCID}/fullTextXML``.
             Verify non-empty + XML-parseable. Gzip to
             ``data/full_text/{PMCID}.nxml.gz``.
    Step 8.  For each kept case, query Europe PMC for 2 matched non-retracted
             controls (same ISSN, PUB_YEAR case ±1, OPEN_ACCESS:Y,
             NOT PUB_TYPE:"Retracted Publication"). Rank candidates by Jaccard
             similarity on the case's top-5 MeSH major descriptors, ties
             broken by ascending PMID. Fetch each control's full text by the
             same procedure. If < 2 controls survive, drop the case.
    Step 9.  Emit ``data/manifest_v1.csv`` with the schema specified in the
             Data-Acquisition Engineer briefing.

Integrity rules (enforced):

  * Every response is cached under ``data/.cache/{sha256(url)}.json.gz``
    before parsing so the run is reproducible.
  * Rate limits: NCBI 3 req/s (no key); Europe PMC 3 req/s; Crossref polite
    pool via ``mailto=``. 429/5xx triggers exponential back-off via tenacity.
  * Full-text writes are atomic: fetch -> parse-verify -> gzip -> rename.
  * ``--self-check`` re-hashes every cache entry to detect tampering.
  * Every action appended to ``code/harvest_log.txt`` with ISO-8601 UTC
    timestamps.
  * No fabrication: a row reaches ``manifest_v1.csv`` only after its NXML
    has been fetched, parsed, and written to disk.

Deterministic tie-breaks:

  * Candidate cases sorted by (OriginalPaperDate ascending, then
    OriginalPaperDOI ascending).
  * Controls sorted by (Jaccard descending, then PMID ascending).
  * A single PRNG seed (20260417) governs any rare sampling fallback
    (currently unused but reserved for the full-scale run).

Usage::

    python harvest.py --pilot 20
    python harvest.py --limit 5                # quick smoke run
    python harvest.py --dry-run                # no writes, just log
    python harvest.py --self-check             # verify cache integrity

Exit code is 0 on success, 1 on any unrecoverable error (e.g. Retraction
Watch CSV unreachable). Row-level failures never crash the run; they are
logged as drops.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import gzip
import hashlib
import json
import logging
import random
import re
import shutil
import io
import subprocess
import sys
import tarfile
import time
import urllib.parse
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from xml.etree import ElementTree as ET

import requests
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# ---------------------------------------------------------------------------
# CONSTANTS — frozen for reproducibility of the pilot run.
# ---------------------------------------------------------------------------

TOOL_NAME = "stickforstats_retraction_backtest"
CONTACT_EMAIL = "vishalvikashbharti@gmail.com"
USER_AGENT = f"{TOOL_NAME}/0.1 (+mailto:{CONTACT_EMAIL})"

RW_REPO_URL = "https://gitlab.com/crossref/retraction-watch-data.git"
RW_CSV_RAW_URL = (
    "https://gitlab.com/crossref/retraction-watch-data/-/raw/main/retraction_watch.csv"
)
RW_CSV_FILENAME = "retraction_watch.csv"

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PMC_OA_FCGI = "https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi"
EPMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest"
CROSSREF_BASE = "https://api.crossref.org"

# PROTOCOL.md §7.2 inclusion window.
YEAR_MIN = 2010
YEAR_MAX = 2023

# PROTOCOL.md §7.2.2 / DATA_SOURCES.md §3. Group-1 licenses only.
# Normalised license strings (Europe PMC reports them lower-cased like
# "cc by", "cc0", "cc by-nc" ...; oa.fcgi reports "CC BY", "CC0", "CC BY-NC").
GROUP_1_LICENSES = {
    "cc0",
    "cc by",
    "cc-by",
    "cc by-sa",
    "cc-by-sa",
    "cc by-nd",
    "cc-by-nd",
    "public-domain",
    "us-government",
}

# PROTOCOL.md §9.1 STATISTICAL-CAUSE codebook verbatim.
# Substrings (case-insensitive) checked against the RW ``Reason`` column.
# Phrasings are aligned to the empirically observed Retraction Watch
# vocabulary (112 unique tokens verified 2026-04-17 against the CSV at
# HEAD commit; see HARVEST_NOTES.md §3).
STAT_REASON_CODES: Tuple[str, ...] = (
    "error in data",
    "error in analyses",
    "error in methods",
    "error in results and/or conclusions",
    "error in statistical analysis",
    "statistical error in analyses",
    "unreliable data",
    "unreliable results and/or conclusions",
    "duplication of data",
    "results not reproducible",
    "inappropriate statistical methods",
    # "+Falsification/Fabrication of Data" is stat-cause only when the
    # falsification concerns numerical values (§9.1 carve-out). We keep
    # the token but rely on the NON_STAT check having priority for
    # image-only cases (ambiguous-bucket logic in _label_statistical_reason).
    "falsification/fabrication of data",
    "concerns/issues about data",
    "concerns/issues about results and/or conclusions",
)

# PROTOCOL.md §9.1 keyword phrases (case-insensitive, whole manuscript text).
STAT_KEYWORD_PATTERNS: Tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"inappropriate statistical test",
        r"incorrect statistical analysis",
        r"error in statistical analysis",
        r"statistical error",
        r"inflated significance",
        r"sample size (?:too small|insufficient|inadequate)",
        r"unadjusted multiple comparisons",
        r"multiple testing not corrected",
        r"incorrect standard error",
        r"incorrect p[- ]?value",
        r"incorrect (?:test statistic|f statistic|t statistic|chi[- ]?square)",
        r"data duplication producing (?:spurious|false|artifactual)",
        r"error bars",
        r"incorrect normali[sz]ation",
        r"assumption (?:violated|not tested)",
        r"non[- ]?independent observations",
    )
)

# PROTOCOL.md §9.1 NON-STATISTICAL codes. Used for "pure non-stat"
# detection so we can carve out ambiguous rows (§9.1 ambiguous-bucket rule).
# Phrasings verified against the live RW CSV vocabulary (2026-04-17).
NON_STAT_REASON_CODES: Tuple[str, ...] = (
    "plagiarism",
    "plagiarism of/in article",
    "plagiarism of text",
    "euphemisms for plagiarism",
    "self-plagiarism",
    "authorship",
    "concerns/issues about authorship/affiliation",
    "false/forged authorship",
    "irb",
    "iacuc",
    "ethics",
    "ethical violations",
    "informed/patient consent",
    # Image / figure issues (phrased as "of/in Image" in RW vocabulary):
    "manipulation of images",
    "duplication of/in image",
    "concerns/issues about image",
    "falsification/fabrication of image",
    "error in image",
    "journal policy",
    "breach of policy by author",
    "copyright",
    "duplicate publication",
    "duplication of/in article",
    "euphemisms for duplication",
    "paper mill",
    "compromised peer review",
    "concerns/issues about peer review",
    "conflict of interest",
    "rogue editor",
    "criminal proceedings",
    "civil proceedings",
)

RANDOM_SEED = 20260417  # PROTOCOL.md §5.

# ---------------------------------------------------------------------------
# PATHS — resolved at runtime relative to this script.
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
STUDY_ROOT = SCRIPT_DIR.parent
DATA_DIR = STUDY_ROOT / "data"
CACHE_DIR = DATA_DIR / ".cache"
FULLTEXT_DIR = DATA_DIR / "full_text"
RW_LOCAL_DIR = DATA_DIR / "retraction-watch-data"
MANIFEST_PATH = DATA_DIR / "manifest_v1.csv"
LOG_PATH = SCRIPT_DIR / "harvest_log.txt"


# ---------------------------------------------------------------------------
# LOGGING
# ---------------------------------------------------------------------------


def _setup_logging(verbose: bool) -> logging.Logger:
    """Set up a dual logger: INFO-level stderr + append-only file log."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("harvest")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.handlers.clear()

    fmt = logging.Formatter(
        fmt="%(asctime)sZ %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    # UTC timestamps.
    logging.Formatter.converter = time.gmtime

    stderr_h = logging.StreamHandler(sys.stderr)
    stderr_h.setFormatter(fmt)
    stderr_h.setLevel(logging.INFO)
    logger.addHandler(stderr_h)

    file_h = logging.FileHandler(LOG_PATH, mode="a", encoding="utf-8")
    file_h.setFormatter(fmt)
    file_h.setLevel(logging.DEBUG if verbose else logging.INFO)
    logger.addHandler(file_h)

    return logger


# ---------------------------------------------------------------------------
# GENERIC HTTP / CACHING
# ---------------------------------------------------------------------------


@dataclass
class RateLimiter:
    """Simple fixed-interval rate limiter. Thread-unsafe (single-threaded run)."""

    min_interval_s: float
    _last: float = 0.0

    def wait(self) -> None:
        now = time.monotonic()
        delta = now - self._last
        if delta < self.min_interval_s:
            time.sleep(self.min_interval_s - delta)
        self._last = time.monotonic()


# Politeness: NCBI 3 req/s -> 0.34s; Europe PMC 3 req/s; Crossref polite.
RL_NCBI = RateLimiter(min_interval_s=0.34)
RL_EPMC = RateLimiter(min_interval_s=0.34)
RL_CROSSREF = RateLimiter(min_interval_s=0.10)


def _url_cache_path(url: str) -> Path:
    """Return the cache filename for a URL (sha256-keyed, gzipped JSON wrapper)."""
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{h}.json.gz"


def _cache_read(url: str) -> Optional[Dict[str, Any]]:
    p = _url_cache_path(url)
    if not p.exists():
        return None
    try:
        with gzip.open(p, "rt", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return None


def _cache_write(url: str, status: int, headers: Dict[str, str], body: str) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    p = _url_cache_path(url)
    payload = {
        "url": url,
        "status": status,
        "headers": {k.lower(): v for k, v in headers.items()},
        "body": body,
        "cached_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    tmp = p.with_suffix(p.suffix + ".tmp")
    with gzip.open(tmp, "wt", encoding="utf-8") as fh:
        json.dump(payload, fh)
    tmp.replace(p)


class HttpError(Exception):
    """Raised for non-retryable HTTP failures."""


class RetryableHttpError(Exception):
    """Raised for HTTP failures that should trigger a retry (429, 5xx)."""


@retry(
    reraise=True,
    retry=retry_if_exception_type(RetryableHttpError),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=30),
)
def _http_get_raw(url: str, timeout: int = 60) -> Tuple[int, Dict[str, str], str]:
    """Execute a GET with retry-on-429/5xx. Returns (status, headers, body)."""
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    if r.status_code in (429,) or 500 <= r.status_code < 600:
        raise RetryableHttpError(f"HTTP {r.status_code} on {url}")
    return r.status_code, dict(r.headers), r.text


@retry(
    reraise=True,
    retry=retry_if_exception_type(RetryableHttpError),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=30),
)
def _http_get_bytes(url: str, timeout: int = 180) -> Tuple[int, bytes]:
    """GET a binary resource with retry-on-429/5xx. Returns (status, bytes).

    Used for PMC OA bulk tarball downloads (which are up to ~10 MB each
    for articles with many figures). Longer default timeout than the
    text variant.
    """
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    if r.status_code in (429,) or 500 <= r.status_code < 600:
        raise RetryableHttpError(f"HTTP {r.status_code} on {url}")
    return r.status_code, r.content


def _https_from_ftp(url: str) -> str:
    """Rewrite an NCBI ``ftp://`` URL to the HTTPS mirror at the same path.

    NCBI serves the FTP tree over HTTPS at ``https://ftp.ncbi.nlm.nih.gov``
    (documented and stable). Using HTTPS lets us reuse the ``requests``-based
    retry/rate-limit machinery and avoids flaky FTP connections behind
    corporate proxies. Non-NCBI-FTP URLs are returned unchanged.
    """
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme == "ftp" and parsed.netloc.endswith("ncbi.nlm.nih.gov"):
        return urllib.parse.urlunsplit(("https", parsed.netloc, parsed.path, "", ""))
    return url


def cached_get(url: str, rate_limiter: RateLimiter, logger: logging.Logger) -> Dict[str, Any]:
    """GET ``url`` via the cache + rate limiter. Returns the cached payload."""
    cached = _cache_read(url)
    if cached is not None:
        return cached
    rate_limiter.wait()
    logger.debug("GET %s", url)
    status, headers, body = _http_get_raw(url)
    _cache_write(url, status, headers, body)
    return _cache_read(url) or {
        "url": url,
        "status": status,
        "headers": {k.lower(): v for k, v in headers.items()},
        "body": body,
    }


# ---------------------------------------------------------------------------
# STEP 1 — Retraction Watch CSV
# ---------------------------------------------------------------------------


def ensure_retraction_watch_csv(logger: logging.Logger, dry_run: bool) -> Path:
    """Ensure the Retraction Watch CSV is present locally. Returns its path."""
    RW_LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = RW_LOCAL_DIR / RW_CSV_FILENAME

    # Prefer git clone (daily updated, gives us README + LICENSE visibility).
    git_dir = RW_LOCAL_DIR / ".git"
    if git_dir.exists():
        logger.info("retraction-watch-data: existing clone -> git pull")
        if not dry_run:
            try:
                subprocess.run(
                    ["git", "-C", str(RW_LOCAL_DIR), "pull", "--ff-only"],
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=300,
                )
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
                logger.warning("git pull failed (%s); using existing CSV", exc)
    elif shutil.which("git") and not dry_run:
        logger.info("retraction-watch-data: git clone --depth=1 %s", RW_REPO_URL)
        try:
            subprocess.run(
                [
                    "git",
                    "clone",
                    "--depth=1",
                    RW_REPO_URL,
                    str(RW_LOCAL_DIR),
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=600,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            logger.warning("git clone failed (%s); falling back to raw CSV", exc)

    # Fallback: raw CSV download if the repo isn't present.
    if not csv_path.exists() and not dry_run:
        logger.info("retraction-watch-data: raw CSV download %s", RW_CSV_RAW_URL)
        r = requests.get(RW_CSV_RAW_URL, headers={"User-Agent": USER_AGENT}, timeout=300)
        r.raise_for_status()
        csv_path.write_bytes(r.content)

    if not csv_path.exists():
        raise HttpError(
            f"Retraction Watch CSV could not be fetched; expected at {csv_path}"
        )
    logger.info("retraction-watch-data: CSV at %s (%d bytes)", csv_path, csv_path.stat().st_size)
    return csv_path


# ---------------------------------------------------------------------------
# STEP 2 + 3 — filter + label cases
# ---------------------------------------------------------------------------


def _parse_rw_date(value: str) -> Optional[dt.date]:
    """Parse a Retraction Watch date cell. Returns None on failure."""
    if not value or value.lower() in {"unavailable", "n/a", "na", ""}:
        return None
    value = value.strip()
    # Observed formats: "4/28/2011 0:00", "2011-04-28", "4/28/2011"
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return dt.datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _label_statistical_reason(reason: str) -> str:
    """Apply PROTOCOL.md §9.1 codebook. Returns 'stat', 'nonstat', or 'ambiguous'."""
    if not reason:
        return "nonstat"
    low = reason.lower()
    has_stat = any(code in low for code in STAT_REASON_CODES) or any(
        p.search(reason) for p in STAT_KEYWORD_PATTERNS
    )
    has_nonstat = any(code in low for code in NON_STAT_REASON_CODES)
    if has_stat and has_nonstat:
        return "ambiguous"
    if has_stat:
        return "stat"
    return "nonstat"


@dataclass
class CaseCandidate:
    record_id: str  # RW Record ID
    doi: str
    pmid: str
    original_date: dt.date
    retraction_date: dt.date
    journal: str
    reason_raw: str
    label: str  # 'stat' | 'nonstat' | 'ambiguous'


def load_candidate_cases(
    csv_path: Path, logger: logging.Logger
) -> Tuple[List[CaseCandidate], Dict[str, int]]:
    """Load + filter + label retraction rows. Returns (kept, counts_by_reason)."""
    kept: List[CaseCandidate] = []
    reason_counts: Dict[str, int] = {"stat": 0, "nonstat": 0, "ambiguous": 0}
    total = 0
    window_fail = 0
    no_doi = 0
    no_pmid = 0

    # RW CSV has nested commas inside fields; it is RFC-4180 quoted, so
    # csv.DictReader handles it correctly.
    with open(csv_path, "r", encoding="utf-8", errors="replace", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            total += 1
            rdate = _parse_rw_date(row.get("RetractionDate", ""))
            odate = _parse_rw_date(row.get("OriginalPaperDate", ""))
            if not rdate or not odate:
                window_fail += 1
                continue
            if not (YEAR_MIN <= odate.year <= YEAR_MAX):
                window_fail += 1
                continue
            if not (YEAR_MIN <= rdate.year <= YEAR_MAX):
                window_fail += 1
                continue
            doi = (row.get("OriginalPaperDOI") or "").strip().lower()
            if not doi or doi == "unavailable":
                no_doi += 1
                continue
            # Strip URL prefix if present.
            doi = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", doi).strip()
            pmid = (row.get("OriginalPaperPubMedID") or "").strip()
            if not pmid or pmid in {"0", "unavailable"}:
                no_pmid += 1
                continue
            reason_raw = (row.get("Reason") or "").strip()
            label = _label_statistical_reason(reason_raw)
            reason_counts[label] += 1
            kept.append(
                CaseCandidate(
                    record_id=(row.get("Record ID") or "").strip(),
                    doi=doi,
                    pmid=pmid,
                    original_date=odate,
                    retraction_date=rdate,
                    journal=(row.get("Journal") or "").strip(),
                    reason_raw=reason_raw,
                    label=label,
                )
            )

    logger.info(
        "retraction-watch rows: total=%d; kept_after_window=%d "
        "(window_fail=%d no_doi=%d no_pmid=%d) | stat=%d nonstat=%d ambig=%d",
        total,
        len(kept),
        window_fail,
        no_doi,
        no_pmid,
        reason_counts["stat"],
        reason_counts["nonstat"],
        reason_counts["ambiguous"],
    )

    # Deterministic ordering: oldest retraction-notice first, then DOI ascending.
    # Per PROTOCOL.md §7.3: "Duplicate retraction of the same paper; keep the
    # first retraction notice only." We therefore dedupe by DOI keeping the
    # earliest RetractionDate.
    kept.sort(key=lambda c: (c.retraction_date, c.doi))
    deduped: List[CaseCandidate] = []
    seen_dois: set = set()
    for c in kept:
        if c.doi in seen_dois:
            continue
        seen_dois.add(c.doi)
        deduped.append(c)
    dup_drops = len(kept) - len(deduped)
    if dup_drops:
        logger.info("retraction-watch: dropped %d duplicate-DOI retractions", dup_drops)
    # Final harvest order: oldest original-paper-date first, DOI ascending.
    deduped.sort(key=lambda c: (c.original_date, c.doi))
    return deduped, reason_counts


# ---------------------------------------------------------------------------
# STEP 4 — DOI -> PMCID resolution (NCBI esearch against PMC)
# ---------------------------------------------------------------------------


def resolve_pmcid(doi: str, logger: logging.Logger) -> Optional[str]:
    """Return ``PMCnnnnnn`` for a given DOI, or None if PMC has no match."""
    params = {
        "db": "pmc",
        "term": f"{doi}[DOI]",
        "retmode": "json",
        "tool": TOOL_NAME,
        "email": CONTACT_EMAIL,
    }
    url = f"{NCBI_BASE}/esearch.fcgi?" + urllib.parse.urlencode(params)
    try:
        payload = cached_get(url, RL_NCBI, logger)
    except Exception as exc:  # noqa: BLE001  (logged + skipped)
        logger.warning("esearch failed for %s: %s", doi, exc)
        return None
    if payload.get("status") != 200:
        logger.debug("esearch non-200 for %s: %s", doi, payload.get("status"))
        return None
    try:
        data = json.loads(payload["body"])
    except json.JSONDecodeError:
        return None
    idlist = data.get("esearchresult", {}).get("idlist", [])
    if not idlist:
        return None
    if len(idlist) > 1:
        # Ambiguous DOI→PMCID: NCBI returned multiple hits. Refuse rather
        # than take the first — that was the bug that substituted an EFSA
        # regulatory document for case_0019's Heart retraction in pilot v1.
        # Critical reviewer report 2026-04-17, C1.
        logger.warning(
            "esearch returned %d PMCIDs for %s; refusing to pick one: %s",
            len(idlist),
            doi,
            idlist,
        )
        return None
    return f"PMC{idlist[0]}"


# ---------------------------------------------------------------------------
# STEP 5 — license + retracted flag via PMC oa.fcgi
# ---------------------------------------------------------------------------


@dataclass
class OALookup:
    pmcid: str
    license: Optional[str]
    retracted: Optional[str]
    tgz_ftp_href: Optional[str]


def lookup_oa_license(pmcid: str, logger: logging.Logger) -> Optional[OALookup]:
    """Query PMC's ``oa.fcgi`` for license + retracted flag. None on absence.

    Response shape (verified 2026-04-17 against PMC3084259):

        <OA>
          <records total-count="1">
            <record id="PMC..." license="CC BY" retracted="no">
              <link format="tgz" href="ftp://.../PMC....tar.gz" />
            </record>
          </records>
        </OA>
    """
    url = f"{PMC_OA_FCGI}?id={pmcid}"
    try:
        payload = cached_get(url, RL_NCBI, logger)
    except Exception as exc:  # noqa: BLE001
        logger.warning("oa.fcgi failed for %s: %s", pmcid, exc)
        return None
    if payload.get("status") != 200:
        return None
    try:
        root = ET.fromstring(payload["body"])
    except ET.ParseError:
        logger.warning("oa.fcgi XML parse failed for %s", pmcid)
        return None
    rec = root.find(".//record")
    if rec is None:
        # PMC explicitly emits <error>idIsNotOpenAccess</error> when the
        # article is in PMC but not in the OA subset.
        err = root.find(".//error")
        err_code = err.get("code") if err is not None else None
        logger.debug("oa.fcgi no-record for %s (error=%s)", pmcid, err_code)
        return OALookup(pmcid=pmcid, license=None, retracted=None, tgz_ftp_href=None)
    link = rec.find("./link[@format='tgz']")
    return OALookup(
        pmcid=rec.get("id", pmcid),
        license=rec.get("license"),
        retracted=rec.get("retracted"),
        tgz_ftp_href=link.get("href") if link is not None else None,
    )


def _is_group1(license_str: Optional[str]) -> bool:
    if not license_str:
        return False
    norm = re.sub(r"\s+", " ", license_str).strip().lower()
    # Handle variants: "cc by", "cc-by", "cc by 4.0", "cc by-nc" (exclude).
    if "nc" in norm.split():
        return False
    # Exclude any "CC BY-NC"/"CC BY-NC-SA"/"CC BY-NC-ND" spellings.
    if "by-nc" in norm or "by nc" in norm:
        return False
    # Strip trailing version tags.
    simplified = re.sub(r"\b\d+(?:\.\d+)?\b", "", norm).strip()
    return any(simplified.startswith(tag) or simplified == tag for tag in GROUP_1_LICENSES)


def _normalise_license(license_str: str) -> str:
    """Return a canonical dashed uppercase form, e.g. 'CC-BY'."""
    if not license_str:
        return ""
    tokens = re.sub(r"\s+", " ", license_str).strip().upper().replace(" ", "-")
    return tokens


# ---------------------------------------------------------------------------
# STEP 6 — MeSH + journal metadata via NCBI eFetch (PubMed)
# ---------------------------------------------------------------------------


@dataclass
class PubMedMeta:
    pmid: str
    issn: str
    journal: str
    year: Optional[int]
    mesh_major_top5: List[str]  # top 5 major descriptor names


def fetch_pubmed_meta(pmid: str, logger: logging.Logger) -> Optional[PubMedMeta]:
    """Fetch PubMed MeSH + journal metadata for a PMID."""
    params = {
        "db": "pubmed",
        "id": pmid,
        "retmode": "xml",
        "tool": TOOL_NAME,
        "email": CONTACT_EMAIL,
    }
    url = f"{NCBI_BASE}/efetch.fcgi?" + urllib.parse.urlencode(params)
    try:
        payload = cached_get(url, RL_NCBI, logger)
    except Exception as exc:  # noqa: BLE001
        logger.warning("efetch failed for PMID=%s: %s", pmid, exc)
        return None
    if payload.get("status") != 200:
        return None
    try:
        root = ET.fromstring(payload["body"])
    except ET.ParseError:
        logger.warning("efetch XML parse failed for PMID=%s", pmid)
        return None

    issn_el = root.find(".//Journal/ISSN")
    issn = issn_el.text.strip() if issn_el is not None and issn_el.text else ""
    journal_el = root.find(".//Journal/Title")
    journal = journal_el.text.strip() if journal_el is not None and journal_el.text else ""

    year = None
    y_el = root.find(".//Journal/JournalIssue/PubDate/Year")
    if y_el is not None and y_el.text and y_el.text.isdigit():
        year = int(y_el.text)
    else:
        md_el = root.find(".//Journal/JournalIssue/PubDate/MedlineDate")
        if md_el is not None and md_el.text:
            m = re.search(r"\b(20\d{2}|19\d{2})\b", md_el.text)
            if m:
                year = int(m.group(1))

    # Top-level major MeSH descriptors only (MajorTopicYN == 'Y' on the
    # DescriptorName element). Sub-headings ("qualifiers") marked major are
    # intentionally excluded per PROTOCOL.md §7.5 ("MeSH major topic"
    # semantics refer to the descriptor, not the qualifier).
    mesh_major: List[str] = []
    for mh in root.findall(".//MeshHeading"):
        desc = mh.find("DescriptorName")
        if desc is None or not desc.text:
            continue
        if desc.get("MajorTopicYN") == "Y":
            mesh_major.append(desc.text.strip())
    # Fallback: if zero majors (common for many PMC papers), use all
    # descriptors in order of appearance; this still supports Jaccard.
    if not mesh_major:
        for mh in root.findall(".//MeshHeading"):
            desc = mh.find("DescriptorName")
            if desc is not None and desc.text:
                mesh_major.append(desc.text.strip())

    return PubMedMeta(
        pmid=pmid,
        issn=issn,
        journal=journal,
        year=year,
        mesh_major_top5=mesh_major[:5],
    )


# ---------------------------------------------------------------------------
# STEP 7 — Full-text NXML fetch (Europe PMC)
# ---------------------------------------------------------------------------


def _extract_nxml_dois(xml_bytes: bytes) -> set:
    """Pull every DOI-flavoured `article-id` out of a JATS/NXML document.

    The back-check for critical-reviewer finding C1: the downloaded file
    must claim the same DOI as the manifest row that asked for it.
    Returns a set of lowercased DOI strings (possibly empty).
    """
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return set()
    dois: set = set()
    for aid in root.iter("article-id"):
        kind = (aid.get("pub-id-type") or "").lower()
        if kind == "doi" and aid.text:
            dois.add(aid.text.strip().lower())
    return dois


def fetch_pmc_oa_bulk(
    pmcid: str, tgz_href: str, logger: logging.Logger
) -> Optional[bytes]:
    """Download the PMC OA bulk tarball and return the first ``.nxml`` blob.

    Used as a secondary source when Europe PMC ``fullTextXML`` fails
    (HTTP error, empty body, or XML parse failure). The tarball URL is
    obtained from ``oa.fcgi`` and stored on the ``OALookup``; it looks
    like ``ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/XX/YY/PMC####.tar.gz``.

    We rewrite to the HTTPS mirror so we can reuse the standard
    retry/rate-limit machinery, stream the tarball into memory, and
    extract the first ``*.nxml`` or ``*.xml`` member. Tarballs carry
    figures/supplements that we do *not* need — only the NXML is kept.

    Returns the NXML bytes on success, ``None`` on any failure. Errors
    are logged but never raised; the caller stays in full control of
    attrition accounting.
    """
    url = _https_from_ftp(tgz_href)
    RL_NCBI.wait()
    logger.debug("pmc-oa-bulk: GET %s", url)
    try:
        status, body = _http_get_bytes(url)
    except requests.RequestException as exc:
        logger.warning("pmc-oa-bulk: %s network error: %s", pmcid, exc)
        return None
    except RetryableHttpError as exc:
        logger.warning("pmc-oa-bulk: %s giving up after retries: %s", pmcid, exc)
        return None
    if status != 200 or not body:
        logger.warning("pmc-oa-bulk: %s HTTP %s (len=%d)", pmcid, status, len(body or b""))
        return None

    try:
        with tarfile.open(fileobj=io.BytesIO(body), mode="r:gz") as tf:
            nxml_member = next(
                (
                    m for m in tf.getmembers()
                    if m.isfile() and m.name.lower().endswith((".nxml", ".xml"))
                ),
                None,
            )
            if nxml_member is None:
                logger.warning("pmc-oa-bulk: %s tarball has no .nxml/.xml member", pmcid)
                return None
            extracted = tf.extractfile(nxml_member)
            if extracted is None:
                logger.warning("pmc-oa-bulk: %s extractfile returned None", pmcid)
                return None
            nxml_bytes = extracted.read()
    except tarfile.TarError as exc:
        logger.warning("pmc-oa-bulk: %s tarball error: %s", pmcid, exc)
        return None

    try:
        ET.fromstring(nxml_bytes)
    except ET.ParseError as exc:
        logger.warning("pmc-oa-bulk: %s NXML parse failed: %s", pmcid, exc)
        return None

    return nxml_bytes


def fetch_fulltext_nxml(
    pmcid: str,
    logger: logging.Logger,
    dry_run: bool,
    expected_doi: Optional[str] = None,
    tgz_fallback_href: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """Fetch + gzip + atomically write ``{PMCID}.nxml.gz``. Returns (ok, path).

    When ``expected_doi`` is supplied, the fetched NXML must contain that
    DOI in an ``<article-id pub-id-type="doi">`` element or the file is
    rejected. Guards against the ambiguous-esearch substitution found by
    the critical reviewer (case_0019 → EFSA document).

    Full-text sources are tried in cascade:

      1. Europe PMC ``{PMCID}/fullTextXML`` (fast, single GET).
      2. PMC OA bulk tarball via ``tgz_fallback_href`` (from ``oa.fcgi``),
         used only when Europe PMC returns a non-200 / empty / unparseable
         response. Skipped if ``tgz_fallback_href`` is ``None``.

    DOI verification, parse verification, and atomic gzip write are the
    same regardless of which source supplied the bytes.
    """
    out_path = FULLTEXT_DIR / f"{pmcid}.nxml.gz"
    rel_path = out_path.relative_to(STUDY_ROOT).as_posix()
    expected_lc = (expected_doi or "").strip().lower() or None

    def _verify_cached() -> bool:
        if not (out_path.exists() and out_path.stat().st_size > 0):
            return False
        try:
            with gzip.open(out_path, "rb") as fh:
                content = fh.read()
            ET.fromstring(content)
        except (OSError, ET.ParseError):
            logger.info("fulltext: cached %s is corrupt; re-fetching", pmcid)
            out_path.unlink(missing_ok=True)
            return False
        if expected_lc is None:
            return True
        dois = _extract_nxml_dois(content)
        if expected_lc in dois:
            return True
        logger.warning(
            "fulltext: cached %s DOI mismatch (wanted %s, got %s); re-fetching",
            pmcid, expected_lc, sorted(dois) or "<none>",
        )
        out_path.unlink(missing_ok=True)
        return False

    if _verify_cached():
        return True, rel_path
    if dry_run:
        return False, None

    # ---- Primary source: Europe PMC fullTextXML ----
    nxml_bytes: Optional[bytes] = None
    source = "epmc"
    url = f"{EPMC_BASE}/{pmcid}/fullTextXML"
    RL_EPMC.wait()
    logger.debug("GET %s", url)
    try:
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=120)
    except requests.RequestException as exc:
        logger.warning("fulltext: %s EPMC network error: %s", pmcid, exc)
        r = None

    if r is not None:
        if r.status_code != 200 or not r.content:
            logger.warning(
                "fulltext: %s EPMC HTTP %s (len=%d)", pmcid, r.status_code, len(r.content or b"")
            )
        else:
            try:
                ET.fromstring(r.content)
                nxml_bytes = r.content
            except ET.ParseError as exc:
                logger.warning("fulltext: %s EPMC XML parse failed: %s", pmcid, exc)

    # ---- Fallback source: PMC OA bulk tarball ----
    if nxml_bytes is None and tgz_fallback_href:
        logger.info("fulltext: %s falling back to PMC OA bulk tarball", pmcid)
        fallback_bytes = fetch_pmc_oa_bulk(pmcid, tgz_fallback_href, logger)
        if fallback_bytes is not None:
            nxml_bytes = fallback_bytes
            source = "pmc_oa_bulk"

    if nxml_bytes is None:
        return False, None

    if expected_lc is not None:
        dois = _extract_nxml_dois(nxml_bytes)
        if expected_lc not in dois:
            logger.warning(
                "fulltext: %s DOI mismatch via %s (wanted %s, got %s); discarding",
                pmcid, source, expected_lc, sorted(dois) or "<none>",
            )
            return False, None

    FULLTEXT_DIR.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    with gzip.open(tmp, "wb") as fh:
        fh.write(nxml_bytes)
    tmp.replace(out_path)
    logger.info("fulltext: %s source=%s bytes=%d", pmcid, source, len(nxml_bytes))
    return True, rel_path


# ---------------------------------------------------------------------------
# STEP 8 — Matched controls
# ---------------------------------------------------------------------------


@dataclass
class EpmcHit:
    pmcid: str
    pmid: str
    doi: str
    pub_year: Optional[int]
    license: str
    journal_title: str
    mesh_major_top5: List[str] = field(default_factory=list)


def _epmc_extract_mesh(entry: Dict[str, Any]) -> List[str]:
    mhl = entry.get("meshHeadingList") or {}
    descriptors: List[str] = []
    for mh in mhl.get("meshHeading", []) if isinstance(mhl, dict) else []:
        name = mh.get("descriptorName")
        if not name:
            continue
        if mh.get("majorTopic_YN") == "Y":
            descriptors.append(name)
    if not descriptors:
        for mh in mhl.get("meshHeading", []) if isinstance(mhl, dict) else []:
            name = mh.get("descriptorName")
            if name:
                descriptors.append(name)
    return descriptors[:5]


def search_epmc_controls(
    issn: str, year: int, logger: logging.Logger, page_size: int = 50
) -> List[EpmcHit]:
    """Query Europe PMC for non-retracted OA candidates in a journal-year band."""
    # Europe PMC Lucene: explicit ±1 year band, OA, NOT retracted.
    y_lo = year - 1
    y_hi = year + 1
    query = (
        f'ISSN:"{issn}" AND PUB_YEAR:[{y_lo} TO {y_hi}] '
        f'AND OPEN_ACCESS:Y '
        f'AND NOT PUB_TYPE:"Retracted Publication" '
        f'AND NOT PUB_TYPE:"Retraction of Publication"'
    )
    params = {
        "query": query,
        "format": "json",
        "pageSize": str(page_size),
        "resultType": "core",
    }
    url = f"{EPMC_BASE}/search?" + urllib.parse.urlencode(params)
    try:
        payload = cached_get(url, RL_EPMC, logger)
    except Exception as exc:  # noqa: BLE001
        logger.warning("epmc-search failed for ISSN=%s year=%s: %s", issn, year, exc)
        return []
    if payload.get("status") != 200:
        return []
    try:
        body = json.loads(payload["body"])
    except json.JSONDecodeError:
        return []
    hits: List[EpmcHit] = []
    for r in body.get("resultList", {}).get("result", []):
        if not r.get("pmcid") or not r.get("pmid"):
            continue
        hits.append(
            EpmcHit(
                pmcid=r["pmcid"],
                pmid=str(r["pmid"]),
                doi=(r.get("doi") or "").lower(),
                pub_year=(int(r["pubYear"]) if str(r.get("pubYear", "")).isdigit() else None),
                license=(r.get("license") or ""),
                journal_title=(r.get("journalInfo") or {}).get("journal", {}).get("title", "")
                or (r.get("journalTitle") or ""),
                mesh_major_top5=_epmc_extract_mesh(r),
            )
        )
    return hits


def _jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    sa = {s.lower() for s in a if s}
    sb = {s.lower() for s in b if s}
    if not sa and not sb:
        return 0.0
    return len(sa & sb) / max(1, len(sa | sb))


# ---------------------------------------------------------------------------
# Manifest row builder
# ---------------------------------------------------------------------------


MANIFEST_COLUMNS = [
    "record_id",
    "class",
    "case_id",
    "doi",
    "pmid",
    "pmcid",
    "journal",
    "issn",
    "pub_year",
    "retraction_date",
    "retraction_reasons_raw",
    "retraction_is_statistical",
    "license",
    "oa_group",
    "mesh_top5",
    "full_text_local_path",
    "fetched_at",
    "harvester_version",
]


@dataclass
class ManifestRow:
    record_id: str
    class_: str
    case_id: Optional[str]
    doi: str
    pmid: Optional[str]
    pmcid: str
    journal: str
    issn: str
    pub_year: int
    retraction_date: Optional[str]
    retraction_reasons_raw: Optional[str]
    retraction_is_statistical: Optional[bool]
    license: str
    oa_group: int
    mesh_top5: str
    full_text_local_path: str
    fetched_at: str
    harvester_version: str

    def as_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "class": self.class_,
            "case_id": self.case_id or "",
            "doi": self.doi,
            "pmid": self.pmid or "",
            "pmcid": self.pmcid,
            "journal": self.journal,
            "issn": self.issn,
            "pub_year": self.pub_year,
            "retraction_date": self.retraction_date or "",
            "retraction_reasons_raw": self.retraction_reasons_raw or "",
            "retraction_is_statistical": (
                "" if self.retraction_is_statistical is None
                else str(self.retraction_is_statistical)
            ),
            "license": self.license,
            "oa_group": self.oa_group,
            "mesh_top5": self.mesh_top5,
            "full_text_local_path": self.full_text_local_path,
            "fetched_at": self.fetched_at,
            "harvester_version": self.harvester_version,
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _git_short_sha() -> str:
    """Short SHA of the harvester commit (falls back to 'uncommitted')."""
    try:
        out = subprocess.check_output(
            ["git", "-C", str(STUDY_ROOT), "rev-parse", "--short", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
            timeout=5,
        ).strip()
        # Detect a dirty working tree.
        dirty = subprocess.run(
            ["git", "-C", str(STUDY_ROOT), "diff", "--quiet"],
            timeout=5,
        ).returncode
        return f"{out}-dirty" if dirty else out
    except (subprocess.SubprocessError, OSError):
        return "uncommitted"


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# SELF-CHECK
# ---------------------------------------------------------------------------


def self_check(logger: logging.Logger) -> int:
    """Verify every cache entry: file-stem hash must match sha256 of its URL."""
    if not CACHE_DIR.exists():
        logger.info("self-check: cache directory does not exist; nothing to verify.")
        return 0
    ok = 0
    bad: List[str] = []
    for p in CACHE_DIR.glob("*.json.gz"):
        try:
            with gzip.open(p, "rt", encoding="utf-8") as fh:
                obj = json.load(fh)
        except (OSError, json.JSONDecodeError):
            bad.append(f"{p.name}: unreadable")
            continue
        url = obj.get("url", "")
        expected = hashlib.sha256(url.encode("utf-8")).hexdigest()
        if p.stem.split(".")[0] != expected:
            bad.append(f"{p.name}: URL-hash mismatch")
            continue
        ok += 1
    logger.info("self-check: %d entries verified, %d tampered", ok, len(bad))
    for b in bad:
        logger.warning("self-check: %s", b)
    return 0 if not bad else 2


# ---------------------------------------------------------------------------
# MAIN PIPELINE
# ---------------------------------------------------------------------------


def _terminal_summary(
    logger: logging.Logger,
    counts: Dict[str, int],
    elapsed_s: float,
    api_calls: int,
) -> None:
    logger.info(
        "SUMMARY | kept cases=%d controls=%d | dropped S2=%d S3=%d S4=%d "
        "S5=%d S6=%d S7=%d | total_rows=%d | api_calls=%d | elapsed=%.1fs",
        counts.get("kept_cases", 0),
        counts.get("kept_controls", 0),
        counts.get("drop_window", 0),
        counts.get("drop_label", 0),
        counts.get("drop_no_pmcid", 0),
        counts.get("drop_license", 0),
        counts.get("drop_fulltext", 0),
        counts.get("drop_no_controls", 0),
        counts.get("kept_cases", 0) + counts.get("kept_controls", 0),
        api_calls,
        elapsed_s,
    )
    # Emit machine-readable attrition for analyze.py (critical-reviewer M3).
    attrition_path = DATA_DIR / "harvest_attrition.json"
    attrition = {
        "_schema_version": 1,
        "_generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "n_retraction_watch_total": counts.get("rw_total", -1),
        "n_after_date_filter": counts.get("rw_kept_after_window", -1),
        "n_after_language": counts.get("rw_kept_after_window", -1),
        "n_after_stat_cause_label": counts.get("rw_candidates_stat", -1),
        "n_with_pmcid": max(
            counts.get("rw_candidates_stat", 0) - counts.get("drop_no_pmcid", 0),
            -1,
        )
        if counts.get("rw_candidates_stat", -1) >= 0
        else -1,
        "n_oa_license_pass": max(
            counts.get("rw_candidates_stat", 0)
            - counts.get("drop_no_pmcid", 0)
            - counts.get("drop_license", 0),
            -1,
        )
        if counts.get("rw_candidates_stat", -1) >= 0
        else -1,
        "n_parser_pass": counts.get("kept_cases", 0),
        "n_with_controls": counts.get("kept_cases", 0),
        "n_scored": counts.get("kept_cases", 0) + counts.get("kept_controls", 0),
        "n_in_analysis": counts.get("kept_cases", 0) + counts.get("kept_controls", 0),
    }
    attrition_path.write_text(json.dumps(attrition, indent=2) + "\n")
    logger.info("wrote %s", attrition_path)


def run_pilot(
    args: argparse.Namespace,
    logger: logging.Logger,
) -> int:
    started = time.monotonic()
    counts: Dict[str, int] = {
        "drop_window": 0,
        "drop_label": 0,
        "drop_no_pmcid": 0,
        "drop_license": 0,
        "drop_fulltext": 0,
        "drop_no_controls": 0,
        "kept_cases": 0,
        "kept_controls": 0,
    }
    api_calls_before = sum(1 for _ in CACHE_DIR.glob("*.json.gz")) if CACHE_DIR.exists() else 0

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    FULLTEXT_DIR.mkdir(parents=True, exist_ok=True)

    random.seed(RANDOM_SEED)
    harv_version = _git_short_sha()

    logger.info(
        "harvest starting | pilot=%s limit=%s resume=%s dry_run=%s version=%s",
        args.pilot,
        args.limit,
        args.resume,
        args.dry_run,
        harv_version,
    )

    # Step 1.
    csv_path = ensure_retraction_watch_csv(logger, args.dry_run)

    # Step 2 + 3.
    candidates, label_counts = load_candidate_cases(csv_path, logger)

    # Drop ambiguous and non-stat (pilot pool = stat-cause only).
    stat_only = [c for c in candidates if c.label == "stat"]
    counts["drop_label"] = len(candidates) - len(stat_only)
    logger.info(
        "candidates: total=%d stat=%d ambig=%d nonstat=%d",
        len(candidates),
        label_counts["stat"],
        label_counts["ambiguous"],
        label_counts["nonstat"],
    )

    manifest_rows: List[ManifestRow] = []
    cases_emitted = 0
    cap = args.pilot if args.pilot is not None else args.limit
    if cap is None:
        cap = 20  # default pilot size

    for cand in stat_only:
        if cases_emitted >= cap:
            break
        logger.info(
            "case-candidate | rw_id=%s doi=%s pmid=%s reason=%r",
            cand.record_id,
            cand.doi,
            cand.pmid,
            cand.reason_raw[:120],
        )

        # Step 4: DOI -> PMCID.
        pmcid = resolve_pmcid(cand.doi, logger)
        if not pmcid:
            counts["drop_no_pmcid"] += 1
            logger.info("DROP no_pmcid | doi=%s", cand.doi)
            continue
        # Global PMCID uniqueness (defence in depth vs RW duplicate DOIs
        # that might slip past the §7.3 dedupe — e.g. different DOI
        # spellings mapping to the same PMCID).
        if any(mr.pmcid == pmcid for mr in manifest_rows):
            counts["drop_no_pmcid"] += 1
            logger.info("DROP duplicate_pmcid | doi=%s pmcid=%s", cand.doi, pmcid)
            continue

        # Step 5: license gate.
        oa = lookup_oa_license(pmcid, logger)
        if oa is None or not _is_group1(oa.license):
            counts["drop_license"] += 1
            logger.info(
                "DROP license | pmcid=%s license=%s",
                pmcid,
                (oa.license if oa else None),
            )
            continue

        # Step 6: MeSH + journal.
        meta = fetch_pubmed_meta(cand.pmid, logger)
        if meta is None:
            counts["drop_license"] += 1  # account as metadata failure
            logger.info("DROP no_meta | pmid=%s", cand.pmid)
            continue

        # Step 7: full text (DOI-verified, EPMC -> PMC OA bulk cascade).
        ok, ft_path = fetch_fulltext_nxml(
            pmcid,
            logger,
            args.dry_run,
            expected_doi=cand.doi,
            tgz_fallback_href=oa.tgz_ftp_href,
        )
        if not ok or not ft_path:
            counts["drop_fulltext"] += 1
            logger.info("DROP fulltext | pmcid=%s", pmcid)
            continue

        case_id = f"case_{cases_emitted + 1:04d}"

        # Step 8: matched controls.
        if not meta.issn:
            counts["drop_no_controls"] += 1
            logger.info("DROP no_issn | pmid=%s", cand.pmid)
            continue
        controls = search_epmc_controls(meta.issn, cand.original_date.year, logger)
        # Filter candidates: group-1 license, not already used, different PMCID.
        used_pmcids = {mr.pmcid for mr in manifest_rows} | {pmcid}
        candidates_ranked: List[Tuple[float, int, EpmcHit]] = []
        for hit in controls:
            if hit.pmcid in used_pmcids:
                continue
            if not _is_group1(hit.license):
                continue
            jac = _jaccard(meta.mesh_major_top5, hit.mesh_major_top5)
            try:
                pmid_int = int(hit.pmid)
            except ValueError:
                pmid_int = 10**12
            # Negate jaccard so sort ascending -> highest jac first; PMID
            # ascending is the documented tie-break.
            candidates_ranked.append((-jac, pmid_int, hit))
        candidates_ranked.sort()

        selected_controls: List[Tuple[EpmcHit, str, PubMedMeta, float]] = []
        for _, _, hit in candidates_ranked:
            if len(selected_controls) >= 2:
                break
            # Re-verify license via oa.fcgi (Europe PMC license strings can
            # be stale / misspelled; oa.fcgi is authoritative).
            oa2 = lookup_oa_license(hit.pmcid, logger)
            if oa2 is None or not _is_group1(oa2.license):
                logger.debug(
                    "control-drop license: %s license=%s",
                    hit.pmcid,
                    (oa2.license if oa2 else None),
                )
                continue
            meta_c = fetch_pubmed_meta(hit.pmid, logger)
            if meta_c is None:
                continue
            ok_c, path_c = fetch_fulltext_nxml(
                hit.pmcid,
                logger,
                args.dry_run,
                expected_doi=hit.doi,
                tgz_fallback_href=oa2.tgz_ftp_href,
            )
            if not ok_c or not path_c:
                logger.debug("control-drop fulltext: %s", hit.pmcid)
                continue
            selected_controls.append((hit, _normalise_license(oa2.license), meta_c, path_c))

        if len(selected_controls) < 2:
            counts["drop_no_controls"] += 1
            logger.info(
                "DROP insufficient_controls | case=%s pmcid=%s found=%d",
                case_id,
                pmcid,
                len(selected_controls),
            )
            continue

        now_iso = _now_iso()
        # Emit the case row.
        manifest_rows.append(
            ManifestRow(
                record_id=case_id,
                class_="case",
                case_id=None,
                doi=cand.doi,
                pmid=cand.pmid,
                pmcid=pmcid,
                journal=meta.journal or cand.journal,
                issn=meta.issn,
                pub_year=meta.year or cand.original_date.year,
                retraction_date=cand.retraction_date.isoformat(),
                retraction_reasons_raw=cand.reason_raw,
                retraction_is_statistical=True,
                license=_normalise_license(oa.license or ""),
                oa_group=1,
                mesh_top5="|".join(meta.mesh_major_top5),
                full_text_local_path=ft_path,
                fetched_at=now_iso,
                harvester_version=harv_version,
            )
        )
        cases_emitted += 1
        counts["kept_cases"] += 1
        # Emit both control rows.
        for idx, (hit, lic_norm, meta_c, path_c) in enumerate(selected_controls, start=1):
            ctrl_id = f"ctrl_{(cases_emitted - 1) * 2 + idx:04d}"
            manifest_rows.append(
                ManifestRow(
                    record_id=ctrl_id,
                    class_="control",
                    case_id=case_id,
                    doi=hit.doi,
                    pmid=hit.pmid,
                    pmcid=hit.pmcid,
                    journal=meta_c.journal or hit.journal_title,
                    issn=meta_c.issn or meta.issn,
                    pub_year=meta_c.year or (hit.pub_year or 0),
                    retraction_date=None,
                    retraction_reasons_raw=None,
                    retraction_is_statistical=None,
                    license=lic_norm,
                    oa_group=1,
                    mesh_top5="|".join(meta_c.mesh_major_top5),
                    full_text_local_path=path_c,
                    fetched_at=now_iso,
                    harvester_version=harv_version,
                )
            )
            counts["kept_controls"] += 1

        logger.info(
            "KEEP case=%s pmcid=%s license=%s controls=%s",
            case_id,
            pmcid,
            _normalise_license(oa.license or ""),
            [c[0].pmcid for c in selected_controls],
        )

    # Step 9: emit manifest.
    if not args.dry_run:
        _write_manifest(manifest_rows, logger)

    api_calls_after = sum(1 for _ in CACHE_DIR.glob("*.json.gz")) if CACHE_DIR.exists() else 0
    _terminal_summary(
        logger,
        counts,
        elapsed_s=time.monotonic() - started,
        api_calls=api_calls_after - api_calls_before,
    )
    return 0


def _write_manifest(rows: List[ManifestRow], logger: logging.Logger) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = MANIFEST_PATH.with_suffix(".csv.tmp")
    with open(tmp, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=MANIFEST_COLUMNS)
        writer.writeheader()
        for r in rows:
            writer.writerow(r.as_dict())
    tmp.replace(MANIFEST_PATH)
    logger.info("manifest: wrote %d rows -> %s", len(rows), MANIFEST_PATH)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_argparser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=(
            "Harvest the SQS retraction-backtest corpus manifest. Reads the "
            "Retraction Watch CSV, resolves DOIs to PMCIDs, filters for "
            "commercial-reuse-permitted OA licenses, fetches full-text NXML, "
            "matches two controls per case, and writes data/manifest_v1.csv."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument(
        "--pilot",
        type=int,
        default=None,
        help="Cap the number of *cases* emitted to this many (20 default).",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Alias for --pilot; kept for ergonomic smoke tests.",
    )
    p.add_argument(
        "--resume",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Use cached responses where possible.",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not fetch full text or write manifest; only log what would happen.",
    )
    p.add_argument(
        "--self-check",
        action="store_true",
        help="Verify every cached response has a matching URL hash, then exit.",
    )
    p.add_argument(
        "--verbose",
        action="store_true",
        help="DEBUG-level logging.",
    )
    return p


def main(argv: Optional[List[str]] = None) -> int:
    args = build_argparser().parse_args(argv)
    logger = _setup_logging(args.verbose)
    logger.info("=" * 60)
    logger.info("harvest.py invoked with %s", vars(args))
    try:
        if args.self_check:
            return self_check(logger)
        return run_pilot(args, logger)
    except KeyboardInterrupt:
        logger.warning("interrupted by user")
        return 130
    except Exception as exc:  # noqa: BLE001
        logger.exception("fatal error: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
