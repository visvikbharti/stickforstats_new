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
    r"t\s*\(\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(-?\d+\.?\d*)\s*,?\s*p\s*([=<>])\s*\.?(\d+\.?\d*)", re.IGNORECASE
)

# F-test patterns
# Matches: F(2, 45) = 3.67, p = .034
F_TEST_PATTERN = re.compile(
    r"F\s*\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(\d+\.?\d*)\s*,?\s*p\s*([=<>])\s*\.?(\d+\.?\d*)",
)

# Chi-square patterns
# Matches: chi2(2) = 5.99, p = .050; chi2(2, N = 100) = 8.4, p = .015
# Handles both Unicode superscript (squared) and ASCII "2"
CHI_SQUARE_PATTERN = re.compile(
    r"(?:\u03c7[\u00b2\u00322]|chi[- ]?square[d]?)\s*"
    r"\(\s*(\d+)(?:\s*,\s*[Nn]\s*=\s*(\d+))?\s*\)\s*=\s*(\d+\.?\d*)\s*,?\s*p\s*([=<>])\s*\.?(\d+\.?\d*)",
)

# Correlation patterns
# Matches: r = .45, p < .001; r(48) = .67, p = .002
CORRELATION_PATTERN = re.compile(
    r"(?<![A-Za-z])r\s*(?:\(\s*(\d+)\s*\)\s*)?=\s*(-?\.?\d+\.?\d*)\s*,?\s*p\s*([=<>])\s*\.?(\d+\.?\d*)",
)

# Spearman rho pattern
# Matches: rho = .52, p = .003; rho(30) = .41, p < .05
SPEARMAN_PATTERN = re.compile(
    r"(?:\u03c1|rho|r_s)\s*(?:\(\s*(\d+)\s*\)\s*)?=\s*(-?\.?\d+\.?\d*)\s*,?\s*p\s*([=<>])\s*\.?(\d+\.?\d*)",
    re.IGNORECASE,
)

# z-test pattern
# Matches: z = 2.58, p < .01; Z = -1.96, p = .050
Z_TEST_PATTERN = re.compile(
    r"(?<![A-Za-z])[zZ]\s*=\s*(-?\d+\.?\d*)\s*,?\s*p\s*([=<>])\s*\.?(\d+\.?\d*)",
)

# Regression: beta / B coefficient
# Matches: beta = 0.34, SE = 0.12, p = .005; B = -1.23, p < .001
BETA_PATTERN = re.compile(
    r"(?:\u03b2|[Bb]eta|(?<![A-Za-z])[Bb](?![A-Za-z]))\s*=\s*(-?\d+\.?\d*)"
    r"\s*(?:,\s*(?:SE|se)\s*=\s*(\d+\.?\d*))?\s*,?\s*p\s*([=<>])\s*\.?(\d+\.?\d*)",
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

# Standalone p-value (not attached to a test statistic)
STANDALONE_P_PATTERN = re.compile(
    r"(?<![A-Za-z])p\s*([=<>])\s*\.?(\d+\.?\d*)",
)

# Non-significant marker
NS_PATTERN = re.compile(r"(?<![A-Za-z])(?:ns|n\.s\.|non[- ]?significant)", re.IGNORECASE)

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

VALID_CLAIM_TYPES = {
    CLAIM_TYPE_T,
    CLAIM_TYPE_F,
    CLAIM_TYPE_CHI2,
    CLAIM_TYPE_Z,
    CLAIM_TYPE_R,
    CLAIM_TYPE_BETA,
    CLAIM_TYPE_OR,
    CLAIM_TYPE_HR,
}

P_COMPARISON_EQUALS = "equals"
P_COMPARISON_LESS = "less_than"
P_COMPARISON_GREATER = "greater_than"


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
    p_value: Optional[float] = None
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
    confidence: float = 0.5

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


# =============================================================================
# HELPERS
# =============================================================================


def _parse_p_comparison(symbol: str) -> str:
    """Convert a comparison symbol to a named constant."""
    if symbol == "<":
        return P_COMPARISON_LESS
    if symbol == ">":
        return P_COMPARISON_GREATER
    return P_COMPARISON_EQUALS


def _parse_p_value(raw: str) -> float:
    """Parse a p-value string, handling optional leading zero.

    '03' -> 0.03, '0.03' -> 0.03, '.03' -> 0.03, '001' -> 0.001.
    The regex groups already strip the leading dot in many cases, so we
    normalise here.
    """
    if "." in raw:
        return float(raw)
    # Raw digits only — treat as a decimal fraction (e.g. "03" -> 0.03)
    return float(f"0.{raw}")


def _safe_float(value: Optional[str]) -> Optional[float]:
    """Convert a string to float, returning None on failure."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


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

        # Standalone fragments — p-values, CIs, effect sizes, sample sizes
        standalone_p = self._extract_p_values(text, section)
        standalone_ci = self._extract_confidence_intervals(text, section)
        standalone_es = self._extract_effect_sizes(text, section)
        standalone_n = self._extract_sample_sizes(text, section)

        # Merge standalone fragments into the nearest primary claim
        claims = self._merge_claims(
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

    def summarize(self, claims: List[StatisticalClaim]) -> ExtractionSummary:
        """Produce an aggregate summary from a list of claims.

        Parameters
        ----------
        claims : List[StatisticalClaim]
            Claims as returned by :meth:`extract` or
            :meth:`extract_from_sections`.

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

        return ExtractionSummary(
            total_claims=len(claims),
            claims_by_type=by_type,
            claims_with_p_values=with_p,
            claims_with_effect_sizes=with_es,
            claims_with_ci=with_ci,
            claims_with_df=with_df,
            unique_test_types=sorted(test_types_seen),
            extraction_warnings=warnings_list,
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

            # Determine test name heuristic: fractional df -> Welch's
            if df_val != int(df_val):
                test_name = "Welch's t-test"
            else:
                test_name = "independent t-test"

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
                    p_value=p_val,
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
            df1 = int(m.group(1))
            df2_raw = float(m.group(2))
            df2 = int(df2_raw) if df2_raw == int(df2_raw) else df2_raw
            stat_val = float(m.group(3))
            p_comp = _parse_p_comparison(m.group(4))
            p_val = _parse_p_value(m.group(5))

            # Heuristic: df1 == 1 might be regression F-test
            test_name = "one-way ANOVA" if df1 > 1 else "F-test"

            claims.append(
                StatisticalClaim(
                    claim_type=CLAIM_TYPE_F,
                    test_name=test_name,
                    statistic_value=stat_val,
                    p_value=p_val,
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
            stat_val = float(m.group(3))
            p_comp = _parse_p_comparison(m.group(4))
            p_val = _parse_p_value(m.group(5))

            claim = StatisticalClaim(
                claim_type=CLAIM_TYPE_CHI2,
                test_name="chi-square test",
                statistic_value=stat_val,
                p_value=p_val,
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
                    p_value=p_val,
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
                    p_value=p_val,
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

        # --- Merge standalone p-values ---
        unmerged_p: List[StatisticalClaim] = []
        for frag in standalone_p:
            if _is_covered(frag):
                continue
            target = _nearest_primary(frag.position, primary)
            if target is not None and target.p_value is None:
                target.p_value = frag.p_value
                target.p_comparison = frag.p_comparison
                # Recalculate confidence now that we have p
                target.confidence = self._score_confidence(
                    has_statistic=(target.statistic_value is not None),
                    has_df=(target.df is not None),
                    has_p=True,
                )
            else:
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
