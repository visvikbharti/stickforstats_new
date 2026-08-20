"""
Statistical Claim Extractor for Manuscript Analysis
====================================================
Created: 2026-02-19
Author: StickForStats Development Team
Version: 1.0.0

Extracts reported statistical claims (test statistics, p-values, confidence
intervals, effect sizes, sample sizes) from manuscript text using regex
patterns. Part of the journal integration manuscript review feature.

This module parses APA-style statistical reporting and produces structured
StatisticalClaim objects that can be verified against raw data for
reproducibility auditing.

Supported claim types:
- t-tests (independent, paired, one-sample)
- F-tests / ANOVA
- Chi-square tests
- Correlations (Pearson r, Spearman rho)
- z-tests
- Regression coefficients (beta, B, R-squared)
- Odds ratios and hazard ratios
- Standalone p-values, confidence intervals, effect sizes, sample sizes

Integration:
- backend/core/sqs_rules.py — 45 regex rules for SQS scoring
- backend/core/manuscript/parser.py — ParsedManuscript sections

Scientific Rigor: MAXIMUM
References: APA 7th Edition, JARS-Quant, Wicherts et al. (2016)
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# REGEX PATTERNS — APA-style statistical reporting
# =============================================================================

# t-test patterns
# Matches: t(24) = 2.45, p = .013; t(24)=2.45, p<.001
T_TEST_PATTERN = re.compile(
    r"t\s*\(\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(-?\d+\.?\d*)\s*[;,]?\s*[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)", re.IGNORECASE
)

# F-test patterns
# Matches: F(2, 45) = 3.67, p = .034
F_TEST_PATTERN = re.compile(
    r"F\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*[;,]?\s*[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)",
)

# Chi-square patterns
# Matches: chi2(2) = 5.99, p = .050; chi2(2, N = 100) = 8.4, p = .015
# Handles both Unicode superscript (squared) and ASCII "2"
CHI_SQUARE_PATTERN = re.compile(
    r"(?:\u03c7[\u00b2\u00322]|chi[- ]?square[d]?)\s*"
    r"\(\s*(\d+)(?:\s*,\s*[Nn]\s*=\s*(\d+))?\s*\)\s*=\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*[;,]?\s*[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)",
)

# Correlation patterns
# Matches: r = .45, p < .001; r(48) = .67, p = .002
CORRELATION_PATTERN = re.compile(
    r"(?<![A-Za-z])r\s*(?:\(\s*(\d+)\s*\)\s*)?=\s*(-?\.?\d+\.?\d*)\s*[;,]?\s*[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)",
)

# Spearman rho pattern
# Matches: rho = .52, p = .003; rho(30) = .41, p < .05
SPEARMAN_PATTERN = re.compile(
    r"(?:\u03c1|rho|r_s)\s*(?:\(\s*(\d+)\s*\)\s*)?=\s*(-?\.?\d+\.?\d*)\s*[;,]?\s*[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)",
    re.IGNORECASE,
)

# z-test pattern
# Matches: z = 2.58, p < .01; Z = -1.96, p = .050
Z_TEST_PATTERN = re.compile(
    r"(?<![A-Za-z])[zZ]\s*=\s*(-?\d+\.?\d*)\s*[;,]?\s*[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)",
)

# Regression: beta / B coefficient
# Matches: beta = 0.34, SE = 0.12, p = .005; B = -1.23, p < .001
BETA_PATTERN = re.compile(
    r"(?:\u03b2|[Bb]eta|(?<![A-Za-z])[Bb](?![A-Za-z]))\s*=\s*(-?\d+\.?\d*)"
    r"\s*(?:,\s*(?:SE|se)\s*=\s*(\d+\.?\d*))?\s*[;,]?\s*[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)",
)

# R-squared
# Matches: R2 = .34; R-squared = 0.28; Adjusted R2 = .31
R_SQUARED_PATTERN = re.compile(
    r"(?:[Aa]djusted\s+)?R[\u00b2\u00322]\s*=\s*\.?(\d+\.?\d*)",
)

# Odds ratio
# Matches: OR = 2.45, 95% CI [1.23, 4.56]; odds ratio = 1.82
OR_PATTERN = re.compile(
    r"(?:OR|[Oo]dds\s+[Rr]atio)\s*=\s*(\d+\.?\d*)"
    r"\s*(?:,?\s*(?:95%?\s*)?CI\s*[=:]?\s*[\[\(]\s*(\d+\.?\d*)\s*[,\u2013-]\s*(\d+\.?\d*)\s*[\]\)])?",
)

# Hazard ratio
# Matches: HR = 1.87, 95% CI [1.12, 3.14]; hazard ratio = 0.65
HR_PATTERN = re.compile(
    r"(?:HR|[Hh]azard\s+[Rr]atio)\s*=\s*(\d+\.?\d*)"
    r"\s*(?:,?\s*(?:95%?\s*)?CI\s*[=:]?\s*[\[\(]\s*(\d+\.?\d*)\s*[,\u2013-]\s*(\d+\.?\d*)\s*[\]\)])?",
)

# Confidence intervals (standalone)
# Matches: 95% CI [0.45, 0.89]; 90% CI = (1.2, 3.4)
CI_PATTERN = re.compile(
    r"(\d+)%?\s*CI\s*[=:]?\s*[\[\(]\s*(-?\d+\.?\d*)\s*[,\u2013-]\s*(-?\d+\.?\d*)\s*[\]\)]",
)

# Effect sizes
COHENS_D_PATTERN = re.compile(
    r"[Cc]ohen'?s?\s*d\s*=\s*(-?\d+\.?\d*)",
)

ETA_SQUARED_PATTERN = re.compile(
    r"(?:\u03b7[\u00b2\u00322]p?\s*=\s*\.?(\d+\.?\d*))"
    r"|(?:[Pp]artial\s+\u03b7[\u00b2\u00322]\s*=\s*\.?(\d+\.?\d*))"
    r"|(?:eta[- ]?squared\s*=\s*\.?(\d+\.?\d*))",
    re.IGNORECASE,
)

OMEGA_SQUARED_PATTERN = re.compile(
    r"(?:\u03c9[\u00b2\u00322]\s*=\s*\.?(\d+\.?\d*))" r"|(?:omega[- ]?squared\s*=\s*\.?(\d+\.?\d*))", re.IGNORECASE
)

HEDGES_G_PATTERN = re.compile(
    r"[Hh]edges'?\s*g\s*=\s*(-?\d+\.?\d*)",
)

GLASS_DELTA_PATTERN = re.compile(
    r"[Gg]lass'?s?\s*(?:\u0394|[Dd]elta)\s*=\s*(-?\d+\.?\d*)",
)

# Sample sizes
# Matches: N = 120; n = 45; sample size of 200; 150 participants
SAMPLE_SIZE_PATTERN = re.compile(
    r"(?<![A-Za-z])[Nn]\s*=\s*(\d+)" r"|sample\s+(?:size|of)\s*(?:=\s*|of\s+|was\s+)?(\d+)" r"|(\d+)\s+participants",
    re.IGNORECASE,
)

# Standalone p-value (not attached to a test statistic). The leading "." is
# captured INSIDE the group so "p = .1" and "p = 1" are distinguishable.
STANDALONE_P_PATTERN = re.compile(
    r"(?<![A-Za-z])[Pp]\s*([=<>])\s*(\.?\d+(?:\.\d+)?(?:[eE][-+−]?\d+)?)",
)

# Non-significant marker
NS_PATTERN = re.compile(r"(?<![A-Za-z])(?:ns|n\.s\.|non[- ]?significant)", re.IGNORECASE)

# Generic "named statistic = value" with an OPTIONAL (df), used to capture test
# statistics the strict df-requiring patterns miss (e.g. "F = 1122.10" without
# df) and tests that have no dedicated pattern (Kruskal-Wallis H, Mann-Whitney
# U, Shapiro-Wilk W). A nearby p-value is then merged on by _merge_claims.
# Matches are deduplicated against the strict-pattern claims by position.
GENERIC_STAT_PATTERN = re.compile(
    r"(?<![A-Za-z])(?P<name>chi-?square|χ²|χ2|t|F|H|U|W|Z)\s*"
    r"(?:\(\s*(?P<df>[^)]*?)\s*\))?\s*=\s*(?P<stat>-?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?))",
    re.IGNORECASE,
)

# A single-letter "statistic" immediately preceded by a STANDALONE effect-size
# letter ("d z" / "d_z" = Cohen's d_z; "g z" = Hedges') is an effect-size
# subscript, not a reported test statistic. The d/g must itself be a token
# boundary so real words ending in d/g ("observed z = ...") are not skipped.
_EFFECT_SIZE_PREFIX = re.compile(r"(?:[^A-Za-z]|^)[dgDG][ _]\Z")

# A "result break" between a statistic and a candidate p-value: sentence-ending
# punctuation followed by whitespace/end. A ";" is NOT a break (results are
# commonly written "F(1,31)=5.48; p=.02"); a "." inside a number ("0.14") is not
# a break (not followed by whitespace). The gap is whitespace-normalized before
# this test (so a soft line-wrap is not a break). Used to stop a generic
# statistic from borrowing a p-value across a sentence boundary.
_RESULT_BREAK = re.compile(r"[.!?](?:\s|$)")

# Superscript digits/signs -> ASCII, for "x 10^n" scientific notation.
_SUPERSCRIPT_MAP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺", "0123456789-+")

# "1.96 x 10^-11" / "1.96 x 10-11" / "1.96 × 10⁻¹¹" / "1.96 · 10^11"
_SCI_NOTATION_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*[×x✕⋅·]\s*10\s*"
    r"(?:\^\s*([+\-−]?\d+)"            # 10^-11 / 10^11
    r"|([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)"          # 10⁻¹¹  (unicode superscript)
    r"|\s*([+\-−]\s*\d+))"             # 10−11 / 10 - 11  (explicit sign)
)


def normalize_scientific_notation(text: str) -> str:
    """Convert 'mantissa x 10^exp' forms to canonical 'mantissa e exp'.

    Papers write very small/large numbers many ways -- ``1.96 x 10^-11``,
    ``1.96 x 10-11``, ``1.96 × 10⁻¹¹`` (unicode superscript), ``1.96 · 10^11``.
    The extractor's numeric patterns only understand e-notation, so without
    this a value like ``p = 1.96 x 10^-11`` is read as ``p = 1.96`` (an
    impossible p-value). Idempotent: canonical e-notation is left unchanged.
    """
    if not text:
        return text

    def _repl(m):
        mantissa = m.group(1)
        exp = m.group(2) or m.group(3) or m.group(4) or ""
        exp = exp.translate(_SUPERSCRIPT_MAP).replace("−", "-").replace(" ", "")
        if exp.startswith("+"):
            exp = exp[1:]
        return f"{mantissa}e{exp}"

    return _SCI_NOTATION_RE.sub(_repl, text)


# =============================================================================
# CLAIM TYPE CONSTANTS
# =============================================================================

CLAIM_TYPE_T = "t_statistic"
CLAIM_TYPE_F = "f_statistic"
CLAIM_TYPE_CHI2 = "chi_square"
CLAIM_TYPE_Z = "z_statistic"
CLAIM_TYPE_R = "r_value"
CLAIM_TYPE_BETA = "beta"
CLAIM_TYPE_OR = "odds_ratio"
CLAIM_TYPE_HR = "hazard_ratio"
CLAIM_TYPE_KW = "kruskal_wallis"   # H
CLAIM_TYPE_MW = "mann_whitney"     # U
CLAIM_TYPE_SW = "shapiro_wilk"     # W

VALID_CLAIM_TYPES = {
    CLAIM_TYPE_T,
    CLAIM_TYPE_F,
    CLAIM_TYPE_CHI2,
    CLAIM_TYPE_Z,
    CLAIM_TYPE_R,
    CLAIM_TYPE_BETA,
    CLAIM_TYPE_OR,
    CLAIM_TYPE_HR,
    CLAIM_TYPE_KW,
    CLAIM_TYPE_MW,
    CLAIM_TYPE_SW,
}


def is_test_claim(claim) -> bool:
    """True for a verifiable statistical-TEST claim (a recognized test type, or a reported test
    statistic). False for bare metadata fragments — a standalone sample size, confidence interval,
    effect size, or a p-value with no accompanying statistic — which are not independently
    verifiable and should not clutter the per-claim verdict list."""
    return (getattr(claim, "claim_type", "") in VALID_CLAIM_TYPES) or \
        (getattr(claim, "statistic_value", None) is not None)


P_COMPARISON_EQUALS = "equals"
P_COMPARISON_LESS = "less_than"
P_COMPARISON_GREATER = "greater_than"

# Maps a GENERIC_STAT_PATTERN name (lowercased) to (claim_type, test_name).
_GENERIC_STAT_MAP = {
    "t": (CLAIM_TYPE_T, "t-test"),
    "f": (CLAIM_TYPE_F, "F-test / ANOVA"),
    "z": (CLAIM_TYPE_Z, "z-test"),
    "h": (CLAIM_TYPE_KW, "Kruskal-Wallis H"),
    "u": (CLAIM_TYPE_MW, "Mann-Whitney U"),
    "w": (CLAIM_TYPE_SW, "Shapiro-Wilk W"),
    "chi-square": (CLAIM_TYPE_CHI2, "chi-square"),
    "chisquare": (CLAIM_TYPE_CHI2, "chi-square"),
    "χ²": (CLAIM_TYPE_CHI2, "chi-square"),
    "χ2": (CLAIM_TYPE_CHI2, "chi-square"),
}


# =============================================================================
# DATA CLASSES
# =============================================================================


@dataclass
class StatisticalClaim:
    """A single extracted statistical claim from manuscript text.

    Represents a reported test result with its associated statistics,
    p-value, effect size, confidence interval, and provenance metadata.
    """

    claim_id: str = ""
    claim_type: str = ""
    test_name: str = ""
    statistic_value: Optional[float] = None
    statistic_raw: Optional[str] = None  # exact reported string, e.g. "0.38" (for rounding precision)
    p_value: Optional[float] = None
    p_value_raw: Optional[str] = None  # exact reported string, e.g. ".049" or "0.71"
    p_comparison: str = P_COMPARISON_EQUALS
    df: Optional[tuple] = None
    confidence_interval: Optional[tuple] = None
    ci_level: float = 0.95
    effect_size_type: Optional[str] = None
    effect_size_value: Optional[float] = None
    sample_size: Optional[int] = None
    group_sizes: Optional[List[int]] = None
    raw_text: str = ""
    location: str = "unknown"
    position: int = 0
    # cross-reference provenance (Phase 0/1; populated by the bundle + reference layers).
    source_file: str = ""                       # the uploaded file this claim was extracted from
    cited_references: List[str] = field(default_factory=list)  # raw in-text refs in the claim's sentence
    resolved_reference: str = ""                # the cited reference that resolved to an artifact
    resolution_confidence: Optional[float] = None  # confidence of the reference->artifact resolution
    extraction_method: str = "text"             # text | ocr | vision — where the claim's text came from
    confidence: float = 0.5  # extraction COMPLETENESS (fields present); see _score_confidence
    # RESERVED (T06): extraction-CORRECTNESS confidence — how sure we are this is a real
    # claim (vs a regex false positive). None until the multi-leg extractor (regex + LLM +
    # table/vision) can cross-agree; do not conflate with `confidence` (completeness).
    extraction_confidence: Optional[float] = None

    def __post_init__(self) -> None:
        if self.claim_type and self.claim_type not in VALID_CLAIM_TYPES:
            logger.warning(
                "Unrecognized claim_type '%s' for claim %s",
                self.claim_type,
                self.claim_id,
            )


@dataclass
class ExtractionSummary:
    """Aggregate summary of all claims extracted from a manuscript."""

    total_claims: int = 0
    claims_by_type: Dict[str, int] = field(default_factory=dict)
    claims_with_p_values: int = 0
    claims_with_effect_sizes: int = 0
    claims_with_ci: int = 0
    claims_with_df: int = 0
    unique_test_types: List[str] = field(default_factory=list)
    extraction_warnings: List[str] = field(default_factory=list)
    # --- T06 extraction coverage (recall proxy; computed only when source text given) ---
    candidate_statistical_mentions: int = 0  # reported p-value mentions in the source text
    coverage: Optional[float] = None          # claims_with_p / candidate; None if not computed
    low_coverage: bool = False                # coverage below threshold -> may have missed claims


# =============================================================================
# HELPERS
# =============================================================================


# Design qualifiers a paper may state for a t-test. Order matters when scanning: "independent"
# contains the substring "dependent", so a bare "dependent" check would misfire on
# "independent-samples" (the same trap test_resolver documents).
_T_DESIGN_PATTERNS = (
    ("Welch's t-test", re.compile(r"welch", re.IGNORECASE)),
    ("independent t-test", re.compile(
        r"independent[\s-]*(?:samples?|groups?)?|two[\s-]*sample|unpaired|between[\s-]*(?:subjects?|groups?)",
        re.IGNORECASE)),
    ("paired t-test", re.compile(
        r"paired|\bdependent[\s-]*samples?|repeated[\s-]*measures|within[\s-]*subjects?|matched",
        re.IGNORECASE)),
    ("one-sample t-test", re.compile(r"one[\s-]*sample|single[\s-]*sample", re.IGNORECASE)),
)

#: characters either side of a t-statistic searched for a stated design qualifier.
T_DESIGN_CONTEXT = 250


# F-test / ANOVA designs. The non-one-way forms come FIRST: "one-way repeated-measures ANOVA"
# contains "one-way", so testing one-way first would wrongly report it as a simple one-way design.
_F_DESIGN_PATTERNS = (
    ("repeated-measures ANOVA", re.compile(
        r"repeated[\s-]*measures|within[\s-]*subjects?", re.IGNORECASE)),
    ("mixed ANOVA", re.compile(r"mixed[\s-]*(?:design|model|ANOVA|factorial)", re.IGNORECASE)),
    ("factorial ANOVA", re.compile(
        r"two[\s-]*way|three[\s-]*way|factorial|\d\s*[x×]\s*\d", re.IGNORECASE)),
    ("ANCOVA", re.compile(r"ANCOVA|analysis\s+of\s+covariance", re.IGNORECASE)),
    ("one-way ANOVA", re.compile(r"one[\s-]*way|one[\s-]*factor", re.IGNORECASE)),
)

# Chi-square variants. Which one it is does not change the assumption we require (Cochran's
# expected-count rule applies to both), but it does change what we may CALL it back to the author.
_CHI_DESIGN_PATTERNS = (
    ("chi-square goodness-of-fit test", re.compile(
        r"goodness[\s-]*of[\s-]*fit", re.IGNORECASE)),
    ("chi-square test of independence", re.compile(
        r"independence|association|contingency", re.IGNORECASE)),
)


def _design_from_context(text: str, start: int, end: int, patterns) -> str:
    """The design the PAPER states near this statistic, or "" if it states none.

    Returning "" is the honest outcome and makes ``test_resolver`` mark the resolution
    ambiguous. Never guess a design here: downstream consumers cannot tell a guess from a fact,
    and one of them (the assumption-disclosure audit) refuses to act on an ambiguous resolution
    precisely so that a guess can never become a finding about someone's paper.

    `patterns` is an ORDERED tuple of (name, regex); the first match wins, so callers must put
    the more specific designs first.
    """
    window = text[max(0, start - T_DESIGN_CONTEXT): end + T_DESIGN_CONTEXT]
    for name, pattern in patterns:
        if pattern.search(window):
            return name
    return ""


def _t_test_design_from_context(text: str, start: int, end: int) -> str:
    """The t-test design stated near this statistic, or "" (see :func:`_design_from_context`)."""
    return _design_from_context(text, start, end, _T_DESIGN_PATTERNS)


def _parse_p_comparison(symbol: str) -> str:
    """Convert a comparison symbol to a named constant."""
    if symbol == "<":
        return P_COMPARISON_LESS
    if symbol == ">":
        return P_COMPARISON_GREATER
    return P_COMPARISON_EQUALS


def _parse_p_value(raw: str) -> Optional[float]:
    """Parse a p-value string, handling optional leading zero.

    '.03' -> 0.03, '0.03' -> 0.03, '03' -> 0.03, '001' -> 0.001, '1' -> 1.0,
    '0' -> 0.0, '2.83e-91' -> 2.83e-91. A malformed token (e.g. the two-dot
    '.03.04', which the dot-capturing group can match) -> None, so the claim
    degrades to not-checkable instead of crashing the whole extract() call.

    The p-value capture groups now include the leading dot, so ".03" arrives
    intact and is distinguishable from the bare integer "1" (a real point
    p-value, e.g. ANCOVA p = 1) -- previously both collapsed to 0.1, flagging
    genuine "p = 1" reports as inconsistent.
    """
    raw = raw.strip().replace("−", "-")  # normalise Unicode minus in exponents (e.g. 2.83e−91)
    if raw.startswith("."):
        raw = "0" + raw  # ".03" -> "0.03"
    try:
        # Scientific notation or a decimal point present -> parse as-is.
        if "." in raw or "e" in raw or "E" in raw:
            return float(raw)
        # Bare integer token: "0"/"1" are real point p-values; any other bare digits
        # are a leading-zero-stripped fraction (e.g. "03" -> 0.03), never a true p>1.
        return float(raw) if raw in ("0", "1") else float(f"0.{raw}")
    except ValueError:
        return None


def _to_num(raw: str) -> float:
    """Parse a numeric statistic, tolerating thousands separators (e.g. '3,950.2')."""
    return float(raw.replace(",", "").replace("−", "-"))


def _safe_float(value: Optional[str]) -> Optional[float]:
    """Convert a string to float, returning None on failure."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


# Coverage denominator (T06): reported p-value mentions. Every NHST result typically
# reports one p-value, so counting "p < / = / > <number>" tokens is a recall proxy.
_PVALUE_MENTION_RE = re.compile(r"\bp\s*[<>=]\s*\.?\d", re.IGNORECASE)


def count_statistical_mentions(text: str) -> int:
    """Number of reported p-value mentions in ``text`` — the coverage denominator.

    A recall proxy (claims_with_p / p-mentions), pending the multi-leg extractor's
    cross-agreement coverage. Imperfect (misses results reported without a p-value,
    over/under-counts edge phrasings) but it gives an honest denominator so low recall
    can never silently masquerade as a clean paper (plan §1/§5).
    """
    if not text:
        return 0
    return len(_PVALUE_MENTION_RE.findall(text))


# =============================================================================
# MAIN EXTRACTOR CLASS
# =============================================================================


class StatisticalClaimExtractor:
    """Extract statistical claims from manuscript text.

    Usage::

        extractor = StatisticalClaimExtractor()
        claims = extractor.extract(results_text, section='results')
        summary = extractor.summarize(claims)

    Integration with manuscript parser::

        from backend.core.manuscript.parser import parse_manuscript
        parsed = parse_manuscript(raw_text)
        claims = extractor.extract_from_sections(parsed.sections)
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(self, text: str, section: str = "unknown") -> List[StatisticalClaim]:
        """Extract all statistical claims from *text*.

        Parameters
        ----------
        text : str
            Raw manuscript text (may contain Unicode statistical symbols).
        section : str
            Section label (e.g. 'results', 'methods') for provenance.

        Returns
        -------
        List[StatisticalClaim]
            Ordered list of claims with auto-assigned IDs.
        """
        if not text or not text.strip():
            logger.debug("Empty text passed to extract(); returning [].")
            return []

        # Canonicalize "1.96 x 10^-11" scientific notation to "1.96e-11" so the
        # numeric patterns capture the real value (otherwise a tiny p-value is
        # read as an impossible >1 value). Idempotent + applied to all sections.
        text = normalize_scientific_notation(text)

        logger.info(
            "Extracting statistical claims from section '%s' (%d chars)",
            section,
            len(text),
        )

        claims: List[StatisticalClaim] = []

        # Run each specialised extractor
        claims.extend(self._extract_t_tests(text, section))
        claims.extend(self._extract_f_tests(text, section))
        claims.extend(self._extract_chi_square(text, section))
        claims.extend(self._extract_correlations(text, section))
        claims.extend(self._extract_z_tests(text, section))
        claims.extend(self._extract_regression(text, section))
        claims.extend(self._extract_odds_ratios(text, section))

        # Generic statistics the strict (df-requiring) patterns miss — e.g.
        # "F = 1122.10" without df, or Kruskal-Wallis H / Mann-Whitney U /
        # Shapiro-Wilk W which have no dedicated pattern. Deduplicated against
        # the strict-pattern claims above so fully-specified results are not
        # double-counted; a nearby p-value is merged on below.
        claims.extend(self._extract_generic_stats(text, section, claims))

        # Standalone fragments — p-values, CIs, effect sizes, sample sizes
        standalone_p = self._extract_p_values(text, section)
        standalone_ci = self._extract_confidence_intervals(text, section)
        standalone_es = self._extract_effect_sizes(text, section)
        standalone_n = self._extract_sample_sizes(text, section)

        # Merge standalone fragments into the nearest primary claim
        claims = self._merge_claims(
            text,
            claims,
            standalone_p,
            standalone_ci,
            standalone_es,
            standalone_n,
        )

        # Sort by position in text
        claims.sort(key=lambda c: c.position)

        # Assign sequential IDs
        claims = self._assign_ids(claims)

        logger.info("Extracted %d claims from section '%s'.", len(claims), section)
        return claims

    def extract_from_sections(
        self,
        sections: List,
    ) -> List[StatisticalClaim]:
        """Extract claims from multiple ParsedManuscript sections.

        Parameters
        ----------
        sections : list
            Each element is expected to have ``.name`` (str) and
            ``.text`` (str) attributes, as produced by
            ``backend.core.manuscript.parser.parse_manuscript``.

        Returns
        -------
        List[StatisticalClaim]
            All claims across all sections, with unique sequential IDs.
        """
        all_claims: List[StatisticalClaim] = []

        for sec in sections:
            name = getattr(sec, "name", "unknown")
            text = getattr(sec, "text", "")
            if not text:
                continue
            sec_claims = self.extract(text, section=name)
            all_claims.extend(sec_claims)

        # Re-assign IDs across the full manuscript
        all_claims = self._assign_ids(all_claims)

        logger.info(
            "Extracted %d total claims across %d sections.",
            len(all_claims),
            len(sections),
        )
        return all_claims

    def summarize(
        self,
        claims: List[StatisticalClaim],
        full_text: Optional[str] = None,
        coverage_threshold: float = 0.6,
    ) -> ExtractionSummary:
        """Produce an aggregate summary from a list of claims.

        Parameters
        ----------
        claims : List[StatisticalClaim]
            Claims as returned by :meth:`extract` or :meth:`extract_from_sections`.
        full_text : str, optional
            The source manuscript text. When supplied, an extraction-coverage proxy is
            computed (claims_with_p / reported-p-value-mentions) so low recall cannot
            silently read as a clean paper (T06). When omitted, coverage is left ``None``.
        coverage_threshold : float
            Below this, ``low_coverage`` is set and a warning is emitted.

        Returns
        -------
        ExtractionSummary
        """
        warnings_list: List[str] = []

        # Counts by type
        by_type: Dict[str, int] = {}
        with_p = 0
        with_es = 0
        with_ci = 0
        with_df = 0
        test_types_seen: set = set()

        for c in claims:
            by_type[c.claim_type] = by_type.get(c.claim_type, 0) + 1
            if c.p_value is not None:
                with_p += 1
            if c.effect_size_value is not None:
                with_es += 1
            if c.confidence_interval is not None:
                with_ci += 1
            if c.df is not None:
                with_df += 1
            if c.test_name:
                test_types_seen.add(c.test_name)

        # Heuristic warnings
        if claims and with_es == 0:
            warnings_list.append(
                "No effect sizes detected. APA 7th edition and JARS-Quant "
                "guidelines recommend reporting effect sizes for all analyses."
            )
        if claims and with_ci == 0:
            warnings_list.append(
                "No confidence intervals detected. Reporting CIs is strongly " "recommended for transparency."
            )
        if claims and with_df < len(claims) * 0.5:
            warnings_list.append(
                "Fewer than half of the claims include degrees of freedom. "
                "Consider reporting df with all test statistics."
            )

        # --- Extraction coverage (T06): a recall proxy that stops low recall from
        # masquerading as a clean paper. Only computed when the source text is supplied. ---
        candidate = count_statistical_mentions(full_text) if full_text else 0
        coverage: Optional[float] = None
        low_coverage = False
        if candidate > 0:
            coverage = min(1.0, with_p / candidate)
            low_coverage = coverage < coverage_threshold
            if low_coverage:
                warnings_list.append(
                    f"Low extraction coverage: captured {with_p} of ~{candidate} reported "
                    f"p-value mentions ({coverage:.0%}). The analysis may have missed claims; "
                    f"treat an absence of flagged issues with caution."
                )

        return ExtractionSummary(
            total_claims=len(claims),
            claims_by_type=by_type,
            claims_with_p_values=with_p,
            claims_with_effect_sizes=with_es,
            claims_with_ci=with_ci,
            claims_with_df=with_df,
            unique_test_types=sorted(test_types_seen),
            extraction_warnings=warnings_list,
            candidate_statistical_mentions=candidate,
            coverage=coverage,
            low_coverage=low_coverage,
        )

    # ------------------------------------------------------------------
    # Internal extractors
    # ------------------------------------------------------------------

    def _extract_t_tests(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract t-test claims: t(df) = value, p = value."""
        claims: List[StatisticalClaim] = []
        for m in T_TEST_PATTERN.finditer(text):
            df_val = float(m.group(1))
            stat_val = float(m.group(2))
            p_comp = _parse_p_comparison(m.group(3))
            p_val = _parse_p_value(m.group(4))

            # Name the test from what the PAPER says, not from a guess.
            #
            # A fractional df is a genuine statistical signature -- the Welch-Satterthwaite
            # correction produces one -- so it is a legitimate inference. An INTEGER df is not:
            # it is equally consistent with an independent, paired or one-sample t-test. This
            # used to default to "independent t-test", and `test_resolver` then reported that as
            # "independent-samples t-test (from test_name)" with ambiguous=False -- laundering a
            # heuristic guess into a design the authors never stated, one module downstream.
            # Leaving it empty makes the resolver flag the design as not stated, which is true.
            if df_val != int(df_val):
                test_name = "Welch's t-test"
            else:
                test_name = _t_test_design_from_context(text, m.start(), m.end())

            confidence = self._score_confidence(
                has_statistic=True,
                has_df=True,
                has_p=True,
            )
            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_T,
                    test_name=test_name,
                    statistic_value=stat_val,
                    statistic_raw=m.group(2),
                    p_value=p_val,
                    p_value_raw=m.group(4),
                    p_comparison=p_comp,
                    df=(int(df_val) if df_val == int(df_val) else df_val,),
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=confidence,
                )
            )
        return claims

    def _extract_f_tests(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract F-test claims: F(df1, df2) = value, p = value."""
        claims: List[StatisticalClaim] = []
        for m in F_TEST_PATTERN.finditer(text):
            df1_raw = float(m.group(1))
            df1 = int(df1_raw) if df1_raw == int(df1_raw) else df1_raw
            df2_raw = float(m.group(2))
            df2 = int(df2_raw) if df2_raw == int(df2_raw) else df2_raw
            stat_val = _to_num(m.group(3))
            p_comp = _parse_p_comparison(m.group(4))
            p_val = _parse_p_value(m.group(5))

            # Name the ANOVA from what the PAPER says, not from df1.
            #
            # This used to be `"one-way ANOVA" if df1 > 1 else "F-test"`, which OVERWROTE an
            # explicit "two-way factorial ANOVA" or "repeated-measures ANOVA" with the literal
            # string "one-way ANOVA". `test_resolver` then read that back as a stated design
            # (ambiguous=False), so the guard for non-one-way designs was unreachable and the
            # assumption-disclosure audit told authors their "one-way ANOVA" was undisclosed when
            # they had written something else. df1 does not identify a design: df1 > 1 is equally
            # consistent with one-way, factorial and repeated-measures.
            test_name = _design_from_context(text, m.start(), m.end(), _F_DESIGN_PATTERNS)

            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_F,
                    test_name=test_name,
                    statistic_value=stat_val,
                    statistic_raw=m.group(3),
                    p_value=p_val,
                    p_value_raw=m.group(5),
                    p_comparison=p_comp,
                    df=(df1, df2),
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=self._score_confidence(
                        has_statistic=True,
                        has_df=True,
                        has_p=True,
                    ),
                )
            )
        return claims

    def _extract_chi_square(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract chi-square claims: chi2(df) = value, p = value."""
        claims: List[StatisticalClaim] = []
        for m in CHI_SQUARE_PATTERN.finditer(text):
            df_val = int(m.group(1))
            n_val = int(m.group(2)) if m.group(2) else None
            stat_val = _to_num(m.group(3))
            p_comp = _parse_p_comparison(m.group(4))
            p_val = _parse_p_value(m.group(5))

            claim = StatisticalClaim(
                claim_type=CLAIM_TYPE_CHI2,
                # which chi-square the paper says it ran; "" when unstated. Both variants
                # require the same expected-count check, so this affects the LABEL and the
                # re-run path, not the assumption.
                test_name=_design_from_context(text, m.start(), m.end(), _CHI_DESIGN_PATTERNS),
                statistic_value=stat_val,
                statistic_raw=m.group(3),
                p_value=p_val,
                p_value_raw=m.group(5),
                p_comparison=p_comp,
                df=(df_val,),
                raw_text=m.group(0),
                location=section,
                position=m.start(),
                confidence=self._score_confidence(
                    has_statistic=True,
                    has_df=True,
                    has_p=True,
                ),
            )
            if n_val is not None:
                claim.sample_size = n_val
            claims.append(claim)
        return claims

    def _extract_correlations(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract correlation claims: r = value, p = value; rho = value."""
        claims: List[StatisticalClaim] = []

        # Pearson r
        for m in CORRELATION_PATTERN.finditer(text):
            df_val = int(m.group(1)) if m.group(1) else None
            r_val = float(m.group(2))
            p_comp = _parse_p_comparison(m.group(3))
            p_val = _parse_p_value(m.group(4))

            has_df = df_val is not None
            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_R,
                    test_name="Pearson correlation",
                    statistic_value=r_val,
                    statistic_raw=m.group(2),
                    p_value=p_val,
                    p_value_raw=m.group(4),
                    p_comparison=p_comp,
                    df=(df_val,) if has_df else None,
                    effect_size_type="r",
                    effect_size_value=abs(r_val),
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=self._score_confidence(
                        has_statistic=True,
                        has_df=has_df,
                        has_p=True,
                    ),
                )
            )

        # Spearman rho
        for m in SPEARMAN_PATTERN.finditer(text):
            df_val = int(m.group(1)) if m.group(1) else None
            rho_val = float(m.group(2))
            p_comp = _parse_p_comparison(m.group(3))
            p_val = _parse_p_value(m.group(4))

            has_df = df_val is not None
            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_R,
                    test_name="Spearman correlation",
                    statistic_value=rho_val,
                    statistic_raw=m.group(2),
                    p_value=p_val,
                    p_value_raw=m.group(4),
                    p_comparison=p_comp,
                    df=(df_val,) if has_df else None,
                    effect_size_type="rho",
                    effect_size_value=abs(rho_val),
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=self._score_confidence(
                        has_statistic=True,
                        has_df=has_df,
                        has_p=True,
                    ),
                )
            )
        return claims

    def _extract_z_tests(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract z-test claims: z = value, p = value."""
        claims: List[StatisticalClaim] = []
        for m in Z_TEST_PATTERN.finditer(text):
            stat_val = float(m.group(1))
            p_comp = _parse_p_comparison(m.group(2))
            p_val = _parse_p_value(m.group(3))

            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_Z,
                    test_name="z-test",
                    statistic_value=stat_val,
                    statistic_raw=m.group(1),
                    p_value=p_val,
                    p_value_raw=m.group(3),
                    p_comparison=p_comp,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=self._score_confidence(
                        has_statistic=True,
                        has_df=False,
                        has_p=True,
                    ),
                )
            )
        return claims

    def _extract_regression(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract regression claims: beta, B, R-squared."""
        claims: List[StatisticalClaim] = []

        # Beta / B coefficients
        for m in BETA_PATTERN.finditer(text):
            coef_val = float(m.group(1))
            # SE is optional (group 2)
            p_comp = _parse_p_comparison(m.group(3))
            p_val = _parse_p_value(m.group(4))

            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_BETA,
                    test_name="regression coefficient",
                    statistic_value=coef_val,
                    p_value=p_val,
                    p_comparison=p_comp,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=self._score_confidence(
                        has_statistic=True,
                        has_df=False,
                        has_p=True,
                    ),
                )
            )

        # R-squared (standalone, no p-value attached)
        for m in R_SQUARED_PATTERN.finditer(text):
            r2_val = float(m.group(1))
            # Normalise values like "34" that should be 0.34
            if r2_val > 1.0:
                r2_val = r2_val / 100.0

            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_BETA,
                    test_name="R-squared",
                    effect_size_type="R\u00b2",
                    effect_size_value=r2_val,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=self._score_confidence(
                        has_statistic=False,
                        has_df=False,
                        has_p=False,
                    ),
                )
            )
        return claims

    def _extract_odds_ratios(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract odds ratios and hazard ratios with optional CIs."""
        claims: List[StatisticalClaim] = []

        # Odds ratios
        for m in OR_PATTERN.finditer(text):
            or_val = float(m.group(1))
            ci_lo = _safe_float(m.group(2))
            ci_hi = _safe_float(m.group(3))

            claim = StatisticalClaim(
                claim_type=CLAIM_TYPE_OR,
                test_name="odds ratio",
                statistic_value=or_val,
                effect_size_type="OR",
                effect_size_value=or_val,
                raw_text=m.group(0),
                location=section,
                position=m.start(),
                confidence=self._score_confidence(
                    has_statistic=True,
                    has_df=False,
                    has_p=False,
                    has_ci=(ci_lo is not None),
                ),
            )
            if ci_lo is not None and ci_hi is not None:
                claim.confidence_interval = (ci_lo, ci_hi)
                claim.ci_level = 0.95
            claims.append(claim)

        # Hazard ratios
        for m in HR_PATTERN.finditer(text):
            hr_val = float(m.group(1))
            ci_lo = _safe_float(m.group(2))
            ci_hi = _safe_float(m.group(3))

            claim = StatisticalClaim(
                claim_type=CLAIM_TYPE_HR,
                test_name="hazard ratio",
                statistic_value=hr_val,
                effect_size_type="HR",
                effect_size_value=hr_val,
                raw_text=m.group(0),
                location=section,
                position=m.start(),
                confidence=self._score_confidence(
                    has_statistic=True,
                    has_df=False,
                    has_p=False,
                    has_ci=(ci_lo is not None),
                ),
            )
            if ci_lo is not None and ci_hi is not None:
                claim.confidence_interval = (ci_lo, ci_hi)
                claim.ci_level = 0.95
            claims.append(claim)

        return claims

    def _extract_generic_stats(
        self,
        text: str,
        section: str,
        existing: List["StatisticalClaim"],
    ) -> List["StatisticalClaim"]:
        """Extract named statistics the strict patterns miss (no df required).

        Captures ``F = 1122.10``, ``H = 36.59``, ``W = 0.793``, ``U = 41``,
        ``t = 2.1``, ``Z = 1.96``, ``chi-square = 8.4``, etc. as primary
        claims (``statistic_value`` set, ``p_value`` left for the merge step).
        Skips any match whose position is already covered by a strict-pattern
        claim, so fully-specified results (``F(2,45)=3.67, p=.03``) are not
        double-counted and keep their df.
        """
        covered = set()
        for c in existing:
            for pos in range(c.position, c.position + len(c.raw_text)):
                covered.add(pos)

        claims: List[StatisticalClaim] = []
        for m in GENERIC_STAT_PATTERN.finditer(text):
            if m.start() in covered:
                continue
            name = m.group("name").lower().replace(" ", "")
            mapped = _GENERIC_STAT_MAP.get(name)
            if mapped is None:
                continue
            # Skip an effect-size subscript ("d z" / "d_z" Cohen's, "g z" Hedges')
            # masquerading as a test statistic.
            if _EFFECT_SIZE_PREFIX.search(text[max(0, m.start() - 3):m.start()]):
                continue
            claim_type, test_name = mapped
            try:
                stat_val = _to_num(m.group("stat"))
            except (TypeError, ValueError):
                continue

            # Parse an optional df group: "2, 45" -> (2, 45); "58" -> (58,).
            df = None
            df_raw = m.group("df")
            if df_raw:
                nums = re.findall(r"-?\d+\.?\d*", df_raw)
                if not nums:
                    # A df-group with no number is function/variable notation,
                    # e.g. "Z(Y)" or "F(model)" -- not a reported test statistic.
                    continue
                parsed = [int(float(n)) if float(n) == int(float(n)) else float(n) for n in nums]
                df = tuple(parsed)

            claims.append(
                StatisticalClaim(
                    claim_type=claim_type,
                    test_name=test_name,
                    statistic_value=stat_val,
                    statistic_raw=m.group("stat"),
                    p_value=None,
                    df=df,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=self._score_confidence(
                        has_statistic=True,
                        has_df=(df is not None),
                        has_p=False,
                    ),
                )
            )
        return claims

    # ------------------------------------------------------------------
    # Standalone fragment extractors
    # ------------------------------------------------------------------

    def _extract_p_values(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract standalone p-values not already captured by test patterns.

        These are later merged into the nearest primary claim by
        :meth:`_merge_claims`.
        """
        claims: List[StatisticalClaim] = []

        # Already-matched spans (from primary extractors) are handled by
        # _merge_claims deduplication, so we capture all here.
        for m in STANDALONE_P_PATTERN.finditer(text):
            p_comp = _parse_p_comparison(m.group(1))
            p_val = _parse_p_value(m.group(2))

            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    p_value=p_val,
                    p_value_raw=m.group(2),
                    p_comparison=p_comp,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.4,
                )
            )

        # Non-significant markers
        for m in NS_PATTERN.finditer(text):
            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    p_value=None,
                    p_comparison=P_COMPARISON_GREATER,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.3,
                )
            )

        return claims

    def _extract_confidence_intervals(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract standalone confidence intervals."""
        claims: List[StatisticalClaim] = []
        for m in CI_PATTERN.finditer(text):
            ci_level = int(m.group(1)) / 100.0
            ci_lo = float(m.group(2))
            ci_hi = float(m.group(3))

            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    confidence_interval=(ci_lo, ci_hi),
                    ci_level=ci_level,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.4,
                )
            )
        return claims

    def _extract_effect_sizes(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract standalone effect size reports."""
        claims: List[StatisticalClaim] = []

        # Cohen's d
        for m in COHENS_D_PATTERN.finditer(text):
            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    effect_size_type="Cohen's d",
                    effect_size_value=float(m.group(1)),
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.5,
                )
            )

        # Eta-squared / partial eta-squared
        for m in ETA_SQUARED_PATTERN.finditer(text):
            val = m.group(1) or m.group(2) or m.group(3)
            if val is None:
                continue
            es_val = float(val)
            if es_val > 1.0:
                es_val = es_val / 100.0
            label = "partial eta-squared" if m.group(2) else "eta-squared"
            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    effect_size_type=label,
                    effect_size_value=es_val,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.5,
                )
            )

        # Omega-squared
        for m in OMEGA_SQUARED_PATTERN.finditer(text):
            val = m.group(1) or m.group(2)
            if val is None:
                continue
            es_val = float(val)
            if es_val > 1.0:
                es_val = es_val / 100.0
            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    effect_size_type="omega-squared",
                    effect_size_value=es_val,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.5,
                )
            )

        # Hedges' g
        for m in HEDGES_G_PATTERN.finditer(text):
            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    effect_size_type="Hedges' g",
                    effect_size_value=float(m.group(1)),
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.5,
                )
            )

        # Glass's delta
        for m in GLASS_DELTA_PATTERN.finditer(text):
            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    effect_size_type="Glass's delta",
                    effect_size_value=float(m.group(1)),
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.5,
                )
            )

        return claims

    def _extract_sample_sizes(
        self,
        text: str,
        section: str,
    ) -> List[StatisticalClaim]:
        """Extract sample size reports: N = value, n = value, participants."""
        claims: List[StatisticalClaim] = []
        for m in SAMPLE_SIZE_PATTERN.finditer(text):
            n_str = m.group(1) or m.group(2) or m.group(3)
            if n_str is None:
                continue
            n_val = int(n_str)
            # Ignore implausibly small values that are likely df or group labels
            if n_val < 2:
                continue

            claims.append(
                StatisticalClaim(
                    claim_type="",
                    test_name="",
                    sample_size=n_val,
                    raw_text=m.group(0),
                    location=section,
                    position=m.start(),
                    confidence=0.4,
                )
            )
        return claims

    # ------------------------------------------------------------------
    # Merging and post-processing
    # ------------------------------------------------------------------

    def _merge_claims(
        self,
        text: str,
        primary: List[StatisticalClaim],
        standalone_p: List[StatisticalClaim],
        standalone_ci: List[StatisticalClaim],
        standalone_es: List[StatisticalClaim],
        standalone_n: List[StatisticalClaim],
    ) -> List[StatisticalClaim]:
        """Associate standalone p-values, CIs, effect sizes, and sample sizes
        with the nearest primary claim (by character position).

        Standalone items that are already captured by a primary claim (i.e.
        their position falls within the raw_text span of that claim) are
        dropped. Remaining standalone items that cannot be associated with
        any primary claim within a proximity window are kept as independent
        claims.

        p-values use a STRICTER, scoped rule (see the p-merge block): they only
        attach to the closest PRECEDING statistic, within a tight window, with no
        sentence/paragraph break between -- because a mis-attached p-value is
        recomputed against the wrong statistic and produces a false internal
        inconsistency (the dominant false positive in the meta-research census,
        2026-06). CIs/effect-sizes/sample-sizes keep the looser proximity rule:
        they are descriptive metadata, not recomputed, so a near-miss is benign.
        """
        PROXIMITY_CHARS = 300  # max distance to associate fragments

        def _primary_spans(claims: List[StatisticalClaim]):
            """Return set of character ranges covered by primary claims."""
            spans = set()
            for c in claims:
                for pos in range(c.position, c.position + len(c.raw_text)):
                    spans.add(pos)
            return spans

        covered = _primary_spans(primary)

        def _is_covered(fragment: StatisticalClaim) -> bool:
            return fragment.position in covered

        def _nearest_primary(
            position: int,
            candidates: List[StatisticalClaim],
        ) -> Optional[StatisticalClaim]:
            if not candidates:
                return None
            best = min(candidates, key=lambda c: abs(c.position - position))
            if abs(best.position - position) <= PROXIMITY_CHARS:
                return best
            return None

        # --- Merge standalone p-values (scoped) ---
        # A p-value belongs to a statistic only when it is part of the SAME
        # reported result: it must FOLLOW the statistic, lie within a tight
        # window, and not be separated by a sentence/paragraph break. This stops
        # the dominant census false positive, where a generic statistic
        # ("F = 5.48", no p in its own text) borrowed a p-value from a
        # neighbouring, unrelated claim and was then flagged as inconsistent.
        # Max chars between the statistic's end and the p-value. Calibrated on
        # the 2026-06 corpus: across 400 papers, every legitimate generic-stat
        # p-merge had a gap <= 33 chars (median 1, p99 33); 40 covers them with
        # margin while rejecting a p-value borrowed across intervening prose.
        MERGE_WINDOW = 40
        unmerged_p: List[StatisticalClaim] = []
        for frag in sorted(standalone_p, key=lambda c: c.position):
            if _is_covered(frag) or frag.p_value is None:
                # A None p-value is a malformed token (see _parse_p_value);
                # never attach it -- that would just blank an existing claim's p.
                continue
            p_start = frag.position
            p_end = frag.position + len(frag.raw_text)
            # Closest primary (still missing a p) whose span ends at or before
            # the p-value -- i.e. the statistic that immediately precedes it.
            befores = [
                c for c in primary
                if c.p_value is None and (c.position + len(c.raw_text)) <= p_start
            ]
            target = max(befores, key=lambda c: c.position + len(c.raw_text)) if befores else None
            attached = False
            if target is not None:
                stat_end = target.position + len(target.raw_text)
                # Collapse whitespace before the break test: a soft line-wrap
                # ("stat\n(p = ...)", common in PDF-extracted text) is NOT a
                # sentence/paragraph break, so it must not block a legitimate
                # same-clause merge. Sentence punctuation still breaks.
                between = re.sub(r"\s+", " ", text[stat_end:p_start]) if text else ""
                if (p_start - stat_end) <= MERGE_WINDOW and not _RESULT_BREAK.search(between):
                    target.p_value = frag.p_value
                    target.p_value_raw = frag.p_value_raw
                    target.p_comparison = frag.p_comparison
                    # Provenance: extend raw_text to span through the merged
                    # p-value so the p is visibly part of the claim (and is not
                    # later mistaken for a mis-paired p-value).
                    if text:
                        target.raw_text = text[target.position:p_end]
                    target.confidence = self._score_confidence(
                        has_statistic=(target.statistic_value is not None),
                        has_df=(target.df is not None),
                        has_p=True,
                    )
                    attached = True
            if not attached:
                unmerged_p.append(frag)

        # --- Merge standalone CIs ---
        unmerged_ci: List[StatisticalClaim] = []
        for frag in standalone_ci:
            if _is_covered(frag):
                continue
            target = _nearest_primary(frag.position, primary)
            if target is not None and target.confidence_interval is None:
                target.confidence_interval = frag.confidence_interval
                target.ci_level = frag.ci_level
            else:
                unmerged_ci.append(frag)

        # --- Merge standalone effect sizes ---
        unmerged_es: List[StatisticalClaim] = []
        for frag in standalone_es:
            if _is_covered(frag):
                continue
            target = _nearest_primary(frag.position, primary)
            if target is not None and target.effect_size_value is None:
                target.effect_size_type = frag.effect_size_type
                target.effect_size_value = frag.effect_size_value
            else:
                unmerged_es.append(frag)

        # --- Merge standalone sample sizes ---
        unmerged_n: List[StatisticalClaim] = []
        for frag in standalone_n:
            if _is_covered(frag):
                continue
            target = _nearest_primary(frag.position, primary)
            if target is not None and target.sample_size is None:
                target.sample_size = frag.sample_size
            else:
                unmerged_n.append(frag)

        # Combine primary with any truly orphaned standalone claims
        all_claims = primary + unmerged_p + unmerged_ci + unmerged_es + unmerged_n
        return all_claims

    def _assign_ids(
        self,
        claims: List[StatisticalClaim],
    ) -> List[StatisticalClaim]:
        """Assign sequential IDs (C001, C002, ...) to claims."""
        for idx, claim in enumerate(claims, start=1):
            claim.claim_id = f"C{idx:03d}"
        return claims

    # ------------------------------------------------------------------
    # Confidence scoring
    # ------------------------------------------------------------------

    @staticmethod
    def _score_confidence(
        has_statistic: bool = False,
        has_df: bool = False,
        has_p: bool = False,
        has_ci: bool = False,
    ) -> float:
        """Compute extraction confidence based on completeness.

        Scoring rubric:
        - Full match (statistic + df + p)     -> 0.95
        - Partial (statistic + p, no df)      -> 0.75
        - Statistic + CI (no p)               -> 0.70
        - Statistic only                      -> 0.50
        - p-value only                        -> 0.40
        """
        if has_statistic and has_df and has_p:
            score = 0.95
        elif has_statistic and has_p:
            score = 0.75
        elif has_statistic and has_ci:
            score = 0.70
        elif has_statistic:
            score = 0.50
        elif has_p:
            score = 0.40
        else:
            score = 0.30

        # Bonus for CI alongside a test statistic
        if has_ci and has_statistic:
            score = min(1.0, score + 0.03)

        return round(score, 2)
