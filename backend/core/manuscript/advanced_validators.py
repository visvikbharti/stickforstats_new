"""
Advanced Manuscript-Level Statistical Validators
==================================================
Created: 2026-02-19
Author: StickForStats Development Team
Version: 1.0.0

Seven specialised validators that examine a parsed manuscript for statistical
quality issues beyond simple p-value consistency.  Each validator accepts the
full manuscript text (or its parsed sections) together with the list of
``StatisticalClaim`` objects extracted by ``claim_extractor.py``, and returns a
list of ``ValidatorFinding`` instances.

Validators
----------
1. StatisticalConsistencyValidator  -- p-value recomputation at manuscript level
2. MultipleTestingValidator         -- correction for multiple comparisons
3. EffectSizeCompletenessValidator  -- effect sizes & CIs for primary tests
4. PowerReportingValidator          -- power / sample-size justification
5. ReproducibilityValidator         -- software, data, pre-registration
6. MethodologicalAppropriatenessValidator -- design-vs-test cross-checks
7. ReportingCompletenessValidator   -- APA 7th edition completeness

Integration points:
    - backend/core/manuscript/claim_extractor.py   -- StatisticalClaim
    - backend/core/manuscript/consistency_validator.py -- ConsistencyValidator
    - backend/core/manuscript/parser.py            -- ParsedManuscript
    - backend/core/manuscript/manuscript_guardian.py -- ReviewFinding

Scientific Rigor: MAXIMUM
References: APA 7th Ed., JARS-Quant, Wicherts et al. (2016),
            Nuijten et al. (2016), Lakens (2013), Simmons et al. (2011)
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

from . import consistency_core

try:
    from scipy import stats as scipy_stats

    SCIPY_AVAILABLE = True
except ImportError:
    scipy_stats = None
    SCIPY_AVAILABLE = False

logger = logging.getLogger(__name__)


# ============================================================================
# Shared data class
# ============================================================================


@dataclass
class ValidatorFinding:
    """A single finding produced by one of the advanced validators.

    Attributes
    ----------
    validator : str
        The name of the validator that produced this finding.
    severity : str
        One of ``'blocking'``, ``'major'``, ``'moderate'``, ``'minor'``, or
        ``'positive'``.
    confidence : float
        Confidence in the finding, between 0.0 and 1.0.
    title : str
        Short summary suitable for a review checklist.
    description : str
        Longer explanation of the issue.
    evidence : str
        Quoted text from the manuscript that triggered this finding.
    recommendation : str
        Concrete suggestion for the author.
    section : str
        Section of the manuscript where the evidence was found.
    """

    validator: str
    severity: str
    confidence: float
    title: str
    description: str
    evidence: str
    recommendation: str
    section: str = ""


# ============================================================================
# 1. StatisticalConsistencyValidator
# ============================================================================


class StatisticalConsistencyValidator:
    """Manuscript-level statistical consistency checker.

    Extends the logic of ``ConsistencyValidator`` to operate on the full
    manuscript text.  For every extracted claim that reports a test statistic
    (t, F, chi-square) together with degrees of freedom and a p-value, this
    validator recomputes the expected p-value via ``scipy.stats`` and flags
    discrepancies.

    Severity mapping
    ~~~~~~~~~~~~~~~~
    * **blocking** -- the recomputed p differs from the reported p by more
      than 0.05 *and* the discrepancy changes the significance decision at
      alpha = 0.05 (a "gross error" in Nuijten et al., 2016).
    * **major** -- discrepancy > tolerance but decision unchanged.
    * **minor** -- discrepancy is within rounding tolerance (< tolerance)
      but not exact.
    * **positive** -- reported and computed p-values match within tolerance.

    Statistical rationale
    ~~~~~~~~~~~~~~~~~~~~~
    Nuijten et al. (2016) found that approximately 50 % of psychology papers
    contain at least one inconsistent p-value.  Automated recomputation is the
    most reliable method for detecting transcription errors.
    """

    VALIDATOR_NAME = "StatisticalConsistencyValidator"
    SUPPORTED_TYPES = {"t_statistic", "f_statistic", "chi_square", "z_statistic", "r_value"}

    def __init__(
        self,
        alpha: float = 0.05,
        tolerance: float = 0.005,
    ) -> None:
        self.alpha = alpha
        self.tolerance = tolerance

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(
        self,
        manuscript_text: str,
        claims: list,
        sections: Optional[Dict[str, str]] = None,
    ) -> List[ValidatorFinding]:
        """Return a list of findings for all verifiable claims.

        Parameters
        ----------
        manuscript_text : str
            Full text of the manuscript (used for evidence quoting).
        claims : list
            ``StatisticalClaim`` objects from ``claim_extractor``.
        sections : dict, optional
            Mapping of section name to section text.

        Returns
        -------
        List[ValidatorFinding]
        """
        findings: List[ValidatorFinding] = []

        if not SCIPY_AVAILABLE:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="minor",
                    confidence=1.0,
                    title="scipy not available for p-value recomputation",
                    description=(
                        "The scipy library is not installed. P-value consistency " "checks cannot be performed."
                    ),
                    evidence="",
                    recommendation="Install scipy to enable p-value recomputation.",
                )
            )
            return findings

        for claim in claims:
            claim_type = getattr(claim, "claim_type", "")
            if claim_type not in self.SUPPORTED_TYPES:
                continue

            finding = self._check_claim(claim, sections)
            if finding is not None:
                findings.append(finding)

        return findings

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _check_claim(
        self,
        claim,
        sections: Optional[Dict[str, str]],
    ) -> Optional[ValidatorFinding]:
        # Delegate the recompute + rounding/inequality classification to the
        # shared consistency core (the single source of truth, also used by the
        # Consistency-tab summary) so the two surfaces can never disagree.
        verdict = consistency_core.classify(
            getattr(claim, "claim_type", ""),
            getattr(claim, "statistic_value", None),
            getattr(claim, "statistic_raw", None),
            getattr(claim, "p_value", None),
            getattr(claim, "p_value_raw", None),
            getattr(claim, "p_comparison", "equals"),
            getattr(claim, "df", None),
            getattr(claim, "sample_size", None),
            alpha=self.alpha,
            tolerance=self.tolerance,
        )
        if not verdict.checkable:
            return None

        claim_type = getattr(claim, "claim_type", "")
        p_comp = getattr(claim, "p_comparison", "equals")
        p_value = getattr(claim, "p_value", None)
        raw_text = getattr(claim, "raw_text", "")
        location = getattr(claim, "location", "unknown")
        evidence = raw_text[:200] if raw_text else ""

        if verdict.is_consistent:
            return self._consistent_finding(claim_type, p_comp, p_value, verdict.computed_p, evidence, location)
        return self._inconsistent_finding(
            claim_type, p_comp, p_value, verdict.computed_p, verdict.discrepancy, evidence, location,
            gross=(verdict.severity == "gross_error"),
        )

    def _consistent_finding(self, claim_type, p_comp, p_value, computed_p, evidence, location):
        return ValidatorFinding(
            validator=self.VALIDATOR_NAME,
            severity="positive",
            confidence=0.95,
            title=f"Consistent {claim_type} result",
            description=(
                f"Reported p {_fmt_comp(p_comp)} {p_value}; recomputed "
                f"p = {computed_p:.4g}. Consistent once the reported rounding is accounted for."
            ),
            evidence=evidence,
            recommendation="No action required.",
            section=location,
        )

    def _inconsistent_finding(
        self, claim_type, p_comp, p_value, computed_p, discrepancy, evidence, location, gross
    ):
        if gross:
            return ValidatorFinding(
                validator=self.VALIDATOR_NAME,
                severity="blocking",
                confidence=0.95,
                title=f"Gross p-value inconsistency ({claim_type})",
                description=(
                    f"Reported p {_fmt_comp(p_comp)} {p_value} but recomputed "
                    f"p = {computed_p:.4g}: the reported and recomputed values fall "
                    f"on opposite sides of alpha = {self.alpha} -- a decision error."
                ),
                evidence=evidence,
                recommendation=(
                    "Verify the test statistic, degrees of freedom, and p-value; "
                    "correct whichever is in error."
                ),
                section=location,
            )
        return ValidatorFinding(
            validator=self.VALIDATOR_NAME,
            severity="major",
            confidence=0.85,
            title=f"P-value discrepancy ({claim_type})",
            description=(
                f"Reported p {_fmt_comp(p_comp)} {p_value} but recomputed "
                f"p = {computed_p:.4g} (discrepancy = {discrepancy:.4g}), beyond what "
                f"rounding explains, though the significance decision is unchanged."
            ),
            evidence=evidence,
            recommendation=(
                "Double-check the reported p-value and test statistic for "
                "rounding or transcription errors."
            ),
            section=location,
        )

    # NOTE: p-value recomputation + rounding/inequality classification now live
    # in consistency_core (shared with the Consistency-tab summary validator).


# ============================================================================
# 2. MultipleTestingValidator
# ============================================================================


class MultipleTestingValidator:
    """Detect unreported multiple testing without correction.

    Statistical rationale
    ~~~~~~~~~~~~~~~~~~~~~
    When multiple hypothesis tests are conducted simultaneously, the
    family-wise error rate (FWER) inflates.  For example, with 10 independent
    tests at alpha = .05 the probability of at least one Type I error is
    1 - (1 - .05)^10 = 0.40.  Corrections such as Bonferroni, Holm,
    Benjamini-Hochberg (FDR), or Sidak adjust the significance threshold to
    maintain FWER or FDR at nominal levels.

    Severity mapping
    ~~~~~~~~~~~~~~~~
    * **major** -- more than 3 distinct tests with no mention of correction.
    * **moderate** -- 3 tests with no mention of correction.
    * **positive** -- correction method explicitly mentioned.
    """

    VALIDATOR_NAME = "MultipleTestingValidator"

    # Keywords that indicate a correction was applied
    CORRECTION_KEYWORDS = re.compile(
        r"bonferroni|holm(?:\s*[-\u2013]\s*bonferroni)?|"
        r"(?:benjamini|BH)\s*[-\u2013]?\s*hochberg|"
        r"false\s+discovery\s+rate|FDR|"
        r"sidak|sid[aá]k|"
        r"tukey(?:\s*[-\u2013]\s*HSD)?|scheff[eé]|"
        r"dunn(?:ett)?|"
        r"family[\s-]?wise\s+error\s+rate|FWER|"
        r"multiple\s+(?:comparison|testing)\s+correction|"
        r"adjusted?\s+(?:p[\s-]?values?|alpha|significance)|"
        r"correction\s+for\s+multiple",
        re.IGNORECASE,
    )

    def validate(
        self,
        manuscript_text: str,
        claims: list,
        sections: Optional[Dict[str, str]] = None,
    ) -> List[ValidatorFinding]:
        """Scan for multiple testing issues.

        Parameters
        ----------
        manuscript_text : str
            Full manuscript text.
        claims : list
            ``StatisticalClaim`` objects.
        sections : dict, optional
            Section name -> text mapping.

        Returns
        -------
        List[ValidatorFinding]
        """
        findings: List[ValidatorFinding] = []

        # Count distinct p-value-bearing claims (each represents a test)
        test_claims = [c for c in claims if getattr(c, "p_value", None) is not None]
        n_tests = len(test_claims)

        # Search for correction keywords in methods (preferred) or full text
        search_text = ""
        if sections:
            search_text = sections.get("methods", "") + " " + sections.get("results", "")
        if not search_text.strip():
            search_text = manuscript_text

        correction_found = bool(self.CORRECTION_KEYWORDS.search(search_text))

        if correction_found:
            match = self.CORRECTION_KEYWORDS.search(search_text)
            evidence = _extract_context(search_text, match.start(), radius=120)
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.90,
                    title="Multiple testing correction reported",
                    description=(
                        f"The manuscript reports {n_tests} statistical test(s) and "
                        f"mentions a correction method for multiple comparisons."
                    ),
                    evidence=evidence,
                    recommendation="No action required.",
                    section="methods",
                )
            )
            return findings

        if n_tests > 3:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="major",
                    confidence=0.85,
                    title="Multiple tests without correction",
                    description=(
                        f"{n_tests} statistical tests were identified but no "
                        f"mention of a correction for multiple comparisons was "
                        f"found (e.g. Bonferroni, Holm, FDR). The family-wise "
                        f"error rate may be inflated."
                    ),
                    evidence=f"{n_tests} distinct tests detected",
                    recommendation=(
                        "Apply an appropriate correction for multiple comparisons "
                        "(e.g. Bonferroni, Holm, or Benjamini-Hochberg FDR) or "
                        "justify why no correction is necessary."
                    ),
                    section="methods",
                )
            )
        elif n_tests == 3:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="moderate",
                    confidence=0.70,
                    title="Possible multiple testing concern",
                    description=(
                        f"{n_tests} statistical tests were identified without a "
                        f"clear mention of a correction for multiple comparisons."
                    ),
                    evidence=f"{n_tests} distinct tests detected",
                    recommendation=(
                        "Consider whether a correction for multiple comparisons "
                        "is warranted, or explain why it is not necessary."
                    ),
                    section="methods",
                )
            )

        return findings


# ============================================================================
# 3. EffectSizeCompletenessValidator
# ============================================================================


class EffectSizeCompletenessValidator:
    """Check that primary tests report effect sizes and confidence intervals.

    Statistical rationale
    ~~~~~~~~~~~~~~~~~~~~~
    The APA 7th edition (and JARS-Quant) requires that effect sizes be
    reported for all primary outcomes.  Lakens (2013) demonstrated that effect
    sizes are essential for evaluating practical significance and for future
    meta-analyses.  Confidence intervals around effect sizes enable readers to
    evaluate precision of the estimate.

    Severity mapping
    ~~~~~~~~~~~~~~~~
    * **major** -- a primary test has no effect size reported within 500
      characters.
    * **moderate** -- an effect size is present but no CI accompanies it.
    * **positive** -- effect size reported with CI.
    """

    VALIDATOR_NAME = "EffectSizeCompletenessValidator"

    # Primary test types that should have accompanying effect sizes
    PRIMARY_TEST_TYPES = {
        "t_statistic",
        "f_statistic",
        "chi_square",
        "r_value",
    }

    # Patterns for effect size mentions (broad sweep)
    EFFECT_SIZE_PATTERN = re.compile(
        r"(?:[Cc]ohen'?s?\s*d\s*=)"
        r"|(?:\u03b7[\u00b2\u00322]p?\s*=)"
        r"|(?:[Pp]artial\s+\u03b7[\u00b2\u00322]\s*=)"
        r"|(?:eta[- ]?squared\s*=)"
        r"|(?:\u03c9[\u00b2\u00322]\s*=)"
        r"|(?:omega[- ]?squared\s*=)"
        r"|(?:[Hh]edges'?\s*g\s*=)"
        r"|(?:[Gg]lass'?s?\s*(?:\u0394|[Dd]elta)\s*=)"
        r"|(?:effect\s+size\s*[=:])"
        r"|(?:R[\u00b2\u00322]\s*=)"
        r"|(?:Cramer'?s?\s*V\s*=)"
        r"|(?:phi\s*=)"
        r"|(?:\u03c6\s*=)",
        re.IGNORECASE,
    )

    # CI pattern (broad)
    CI_PATTERN = re.compile(
        r"\d+%?\s*CI\s*[=:]?\s*[\[\(]\s*-?\d+\.?\d*\s*[,\u2013-]\s*-?\d+\.?\d*\s*[\]\)]",
        re.IGNORECASE,
    )

    SEARCH_RADIUS = 500  # characters around a claim to search

    def validate(
        self,
        manuscript_text: str,
        claims: list,
        sections: Optional[Dict[str, str]] = None,
    ) -> List[ValidatorFinding]:
        """Check effect size and CI completeness.

        Parameters
        ----------
        manuscript_text : str
            Full manuscript text.
        claims : list
            ``StatisticalClaim`` objects.
        sections : dict, optional
            Section name -> text mapping.

        Returns
        -------
        List[ValidatorFinding]
        """
        findings: List[ValidatorFinding] = []

        primary_claims = [
            c
            for c in claims
            if getattr(c, "claim_type", "") in self.PRIMARY_TEST_TYPES and getattr(c, "p_value", None) is not None
        ]

        if not primary_claims:
            return findings

        missing_es = 0
        missing_ci = 0
        present_both = 0

        for claim in primary_claims:
            pos = getattr(claim, "position", 0)
            raw_text = getattr(claim, "raw_text", "")
            location = getattr(claim, "location", "unknown")
            claim_type = getattr(claim, "claim_type", "")

            # Already extracted an effect size on the claim object?
            has_es_on_claim = getattr(claim, "effect_size_value", None) is not None
            has_ci_on_claim = getattr(claim, "confidence_interval", None) is not None

            # Also search nearby text in the manuscript
            start = max(0, pos - self.SEARCH_RADIUS)
            end = min(len(manuscript_text), pos + self.SEARCH_RADIUS)
            nearby_text = manuscript_text[start:end]

            has_es_nearby = bool(self.EFFECT_SIZE_PATTERN.search(nearby_text))
            has_ci_nearby = bool(self.CI_PATTERN.search(nearby_text))

            has_es = has_es_on_claim or has_es_nearby
            has_ci = has_ci_on_claim or has_ci_nearby

            evidence = raw_text[:200] if raw_text else ""

            if not has_es:
                missing_es += 1
                findings.append(
                    ValidatorFinding(
                        validator=self.VALIDATOR_NAME,
                        severity="major",
                        confidence=0.80,
                        title=f"Missing effect size for {claim_type}",
                        description=(
                            f"A {claim_type} result was reported without an "
                            f"accompanying effect size measure within "
                            f"{self.SEARCH_RADIUS} characters."
                        ),
                        evidence=evidence,
                        recommendation=(
                            "Report an appropriate effect size (e.g. Cohen's d "
                            "for t-tests, partial eta-squared for ANOVA, "
                            "Cramer's V for chi-square) as required by "
                            "APA 7th edition and JARS-Quant."
                        ),
                        section=location,
                    )
                )
            elif not has_ci:
                missing_ci += 1
                findings.append(
                    ValidatorFinding(
                        validator=self.VALIDATOR_NAME,
                        severity="moderate",
                        confidence=0.70,
                        title=f"Effect size without CI for {claim_type}",
                        description=(
                            f"An effect size was reported for this {claim_type} "
                            f"result, but no confidence interval around the "
                            f"effect size was found nearby."
                        ),
                        evidence=evidence,
                        recommendation=(
                            "Report a confidence interval around the effect size "
                            "to convey precision (APA 7th edition, Section 6.44)."
                        ),
                        section=location,
                    )
                )
            else:
                present_both += 1

        # Summary positive finding if everything is present
        if present_both > 0 and missing_es == 0 and missing_ci == 0:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.90,
                    title="Effect sizes and CIs reported for all primary tests",
                    description=(
                        f"All {present_both} primary test(s) include an effect " f"size with a confidence interval."
                    ),
                    evidence="",
                    recommendation="No action required.",
                )
            )
        elif present_both > 0:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.85,
                    title="Some effect sizes reported with CIs",
                    description=(
                        f"{present_both} of {len(primary_claims)} primary test(s) "
                        f"include effect sizes with confidence intervals."
                    ),
                    evidence="",
                    recommendation="Ensure all primary tests include effect sizes with CIs.",
                )
            )

        return findings


# ============================================================================
# 4. PowerReportingValidator
# ============================================================================


class PowerReportingValidator:
    """Check for power analysis or sample size justification.

    Statistical rationale
    ~~~~~~~~~~~~~~~~~~~~~
    An a-priori power analysis determines the sample size needed to detect
    an effect of a given size with adequate probability (conventionally
    power >= .80).  Without it, studies risk being underpowered, increasing
    the rate of false negatives and inflating effect size estimates of
    significant findings (the "winner's curse").

    Severity mapping
    ~~~~~~~~~~~~~~~~
    * **major** -- small N (< 30) with no power justification.
    * **moderate** -- no power analysis mentioned at all.
    * **positive** -- power analysis or sample-size justification present.
    """

    VALIDATOR_NAME = "PowerReportingValidator"

    POWER_KEYWORDS = re.compile(
        r"power\s+analysis|"
        r"a\s*priori\s+(?:power|sample\s+size)|"
        r"G\s*\*?\s*Power|GPower|"
        r"sample\s+size\s+(?:was\s+)?(?:determined|calculated|estimated|justified)|"
        r"(?:required|minimum|target)\s+sample\s+size|"
        r"power\s+(?:of|=|was)\s*\.?\s*[0-9]+|"
        r"(?:statistical|adequate|sufficient)\s+power|"
        r"power\s*(?:>=?|was\s+at\s+least)\s*\.?\s*80|"
        r"(?:1\s*-\s*\u03b2|1\s*-\s*beta)\s*=|"
        r"sample\s+size\s+justification|"
        r"sensitivity\s+(?:power\s+)?analysis",
        re.IGNORECASE,
    )

    # Pattern for small sample sizes
    SMALL_N_PATTERN = re.compile(
        r"(?<![A-Za-z])[Nn]\s*=\s*(\d+)",
    )

    SMALL_N_THRESHOLD = 30

    def validate(
        self,
        manuscript_text: str,
        claims: list,
        sections: Optional[Dict[str, str]] = None,
    ) -> List[ValidatorFinding]:
        """Check for power analysis reporting.

        Parameters
        ----------
        manuscript_text : str
            Full manuscript text.
        claims : list
            ``StatisticalClaim`` objects.
        sections : dict, optional
            Section name -> text mapping.

        Returns
        -------
        List[ValidatorFinding]
        """
        findings: List[ValidatorFinding] = []

        # Search methods section first, then full text
        search_text = ""
        if sections:
            search_text = sections.get("methods", "")
        if not search_text.strip():
            search_text = manuscript_text

        power_match = self.POWER_KEYWORDS.search(search_text)

        if power_match:
            evidence = _extract_context(search_text, power_match.start(), radius=150)
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.90,
                    title="Power analysis / sample size justification reported",
                    description=("The manuscript includes a power analysis or explicit " "sample-size justification."),
                    evidence=evidence,
                    recommendation="No action required.",
                    section="methods",
                )
            )
            return findings

        # No power analysis found -- check for small N
        smallest_n = self._find_smallest_n(claims, manuscript_text)

        if smallest_n is not None and smallest_n < self.SMALL_N_THRESHOLD:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="major",
                    confidence=0.85,
                    title="Small sample with no power justification",
                    description=(
                        f"The smallest sample size detected is N = {smallest_n} "
                        f"(below the threshold of {self.SMALL_N_THRESHOLD}), "
                        f"and no power analysis or sample-size justification "
                        f"was found. The study may be underpowered."
                    ),
                    evidence=f"N = {smallest_n}",
                    recommendation=(
                        "Report an a-priori power analysis (e.g. from G*Power) "
                        "specifying the expected effect size, desired power "
                        "(typically >= .80), and alpha level. Alternatively, "
                        "provide a post-hoc sensitivity analysis showing the "
                        "smallest detectable effect at the achieved sample size."
                    ),
                    section="methods",
                )
            )
        else:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="moderate",
                    confidence=0.75,
                    title="No power analysis or sample size justification",
                    description=(
                        "No mention of a power analysis, sample-size "
                        "justification, or sensitivity analysis was detected."
                    ),
                    evidence="",
                    recommendation=(
                        "Consider adding an a-priori power analysis or "
                        "sample-size justification. If a formal power analysis "
                        "was not conducted, provide a sensitivity analysis "
                        "showing the minimum detectable effect size."
                    ),
                    section="methods",
                )
            )

        return findings

    def _find_smallest_n(
        self,
        claims: list,
        manuscript_text: str,
    ) -> Optional[int]:
        """Find the smallest reported sample size from claims or text."""
        sample_sizes: List[int] = []

        # From claims
        for claim in claims:
            n = getattr(claim, "sample_size", None)
            if n is not None and n > 0:
                sample_sizes.append(n)
            groups = getattr(claim, "group_sizes", None)
            if groups:
                sample_sizes.extend(g for g in groups if g > 0)

        # From text patterns
        for m in self.SMALL_N_PATTERN.finditer(manuscript_text):
            try:
                val = int(m.group(1))
                if 2 <= val <= 10000:  # reasonable range
                    sample_sizes.append(val)
            except (ValueError, IndexError):
                pass

        return min(sample_sizes) if sample_sizes else None


# ============================================================================
# 5. ReproducibilityValidator
# ============================================================================


class ReproducibilityValidator:
    """Check for reproducibility-related reporting elements.

    Statistical rationale
    ~~~~~~~~~~~~~~~~~~~~~
    Computational reproducibility requires that readers can identify the
    exact software, version, and environment used for analyses.  Open-data
    and pre-registration further enhance transparency and reduce researcher
    degrees of freedom (Simmons, Nelson, & Simonsohn, 2011).

    Checks
    ------
    * Software name (R, SPSS, SAS, Python, Stata, JASP, jamovi, StickForStats)
    * Version number near software mention
    * Data availability statement
    * Pre-registration mention (OSF, AsPredicted, ClinicalTrials.gov)

    Severity mapping
    ~~~~~~~~~~~~~~~~
    * **moderate** -- no statistical software mentioned.
    * **minor** -- software mentioned but no version number, or missing
      data availability statement.
    * **positive** -- software with version, data availability, or
      pre-registration present.
    """

    VALIDATOR_NAME = "ReproducibilityValidator"

    SOFTWARE_PATTERN = re.compile(
        r"(?<![A-Za-z/])"
        r"(?:"
        r"(?:R|SPSS|SAS|Stata|JASP|jamovi|StickForStats|JMP|Minitab|"
        r"MATLAB|Prism|GraphPad|GenStat|LISREL|Mplus|HLM|EQS|AMOS)"
        r"(?:\s+(?:version|v\.?|V)\s*[\d.]+)?"
        r"|"
        r"(?:Python|python|NumPy|SciPy|statsmodels|pandas|scikit[\s-]learn)"
        r"(?:\s+(?:version|v\.?|V)?\s*[\d.]+)?"
        r")"
        r"(?![A-Za-z])",
    )

    VERSION_PATTERN = re.compile(
        r"(?:version|v\.?|V)\s*(\d+(?:\.\d+)+)",
        re.IGNORECASE,
    )

    DATA_AVAILABILITY_PATTERN = re.compile(
        r"data\s+(?:availability|sharing|access)\s+statement|"
        r"(?:data|dataset|code)\s+(?:are|is)\s+(?:available|accessible|deposited)|"
        r"(?:publicly|openly)\s+available\s+(?:data|at)|"
        r"(?:data|materials?)\s+(?:can\s+be\s+)?(?:obtained|accessed|downloaded)\s+(?:from|at)|"
        r"(?:available\s+(?:upon|on)\s+(?:reasonable\s+)?request)|"
        r"(?:supplementary\s+(?:data|materials?)\s+(?:are|is)\s+available)|"
        r"(?:open\s+(?:data|science|access)\s+framework)|"
        r"github\.com|zenodo\.org|figshare\.com|dryad|osf\.io",
        re.IGNORECASE,
    )

    PREREGISTRATION_PATTERN = re.compile(
        r"pre[\s-]?regist(?:ered|ration|ry)|"
        r"osf\.io|"
        r"AsPredicted|"
        r"ClinicalTrials\.gov|"
        r"PROSPERO|"
        r"registered\s+(?:report|protocol|at)",
        re.IGNORECASE,
    )

    def validate(
        self,
        manuscript_text: str,
        claims: list,
        sections: Optional[Dict[str, str]] = None,
    ) -> List[ValidatorFinding]:
        """Check for reproducibility elements.

        Parameters
        ----------
        manuscript_text : str
            Full manuscript text.
        claims : list
            ``StatisticalClaim`` objects (not used directly).
        sections : dict, optional
            Section name -> text mapping.

        Returns
        -------
        List[ValidatorFinding]
        """
        findings: List[ValidatorFinding] = []

        # --- Software ---
        methods_text = ""
        if sections:
            methods_text = sections.get("methods", "")

        # Search methods first, then full text
        sw_search = methods_text if methods_text.strip() else manuscript_text
        sw_matches = list(self.SOFTWARE_PATTERN.finditer(sw_search))

        if not sw_matches:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="moderate",
                    confidence=0.80,
                    title="No statistical software mentioned",
                    description=(
                        "No statistical software package was identified in the "
                        "manuscript. Readers cannot determine which tool was used "
                        "for the analyses."
                    ),
                    evidence="",
                    recommendation=(
                        "Report the statistical software used for all analyses "
                        '(e.g. "Analyses were conducted using R version 4.3.2 '
                        '(R Core Team, 2023)").'
                    ),
                    section="methods",
                )
            )
        else:
            # Check if version number is present near the software mention
            sw_text = sw_matches[0].group(0)
            sw_start = sw_matches[0].start()
            nearby = sw_search[sw_start : sw_start + 100]
            has_version = bool(self.VERSION_PATTERN.search(nearby))

            if has_version:
                evidence = _extract_context(sw_search, sw_start, radius=80)
                findings.append(
                    ValidatorFinding(
                        validator=self.VALIDATOR_NAME,
                        severity="positive",
                        confidence=0.90,
                        title="Statistical software with version reported",
                        description=(
                            f"Statistical software ({sw_text.strip()}) is " f"mentioned with a version number."
                        ),
                        evidence=evidence,
                        recommendation="No action required.",
                        section="methods",
                    )
                )
            else:
                evidence = _extract_context(sw_search, sw_start, radius=80)
                findings.append(
                    ValidatorFinding(
                        validator=self.VALIDATOR_NAME,
                        severity="minor",
                        confidence=0.75,
                        title="Software mentioned without version number",
                        description=(
                            f"Statistical software ({sw_text.strip()}) is "
                            f"mentioned but no version number was found nearby."
                        ),
                        evidence=evidence,
                        recommendation=(
                            "Include the software version number to ensure " "computational reproducibility."
                        ),
                        section="methods",
                    )
                )

        # --- Data availability ---
        da_match = self.DATA_AVAILABILITY_PATTERN.search(manuscript_text)
        if da_match:
            evidence = _extract_context(manuscript_text, da_match.start(), radius=120)
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.85,
                    title="Data availability statement present",
                    description=("The manuscript includes a data availability or data " "sharing statement."),
                    evidence=evidence,
                    recommendation="No action required.",
                )
            )
        else:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="minor",
                    confidence=0.70,
                    title="No data availability statement detected",
                    description=(
                        "No explicit data availability or data sharing statement "
                        "was found. Many journals now require this."
                    ),
                    evidence="",
                    recommendation=(
                        "Add a data availability statement indicating where the "
                        "data and analysis code can be accessed, or state that "
                        "data are available upon reasonable request."
                    ),
                )
            )

        # --- Pre-registration ---
        prereg_match = self.PREREGISTRATION_PATTERN.search(manuscript_text)
        if prereg_match:
            evidence = _extract_context(manuscript_text, prereg_match.start(), radius=120)
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.90,
                    title="Pre-registration or registered report mentioned",
                    description=(
                        "The manuscript references a pre-registration or " "registered report, enhancing transparency."
                    ),
                    evidence=evidence,
                    recommendation="No action required.",
                )
            )

        return findings


# ============================================================================
# 6. MethodologicalAppropriatenessValidator
# ============================================================================


class MethodologicalAppropriatenessValidator:
    """Adapter over the claim-level engine in ``appropriateness.py``.

    This class used to own five document-level co-occurrence checks -- booleans like
    ``has_repeated_measures and has_independent_t`` over concatenated Methods+Results text,
    each emitting a hardcoded ``confidence=0.80``. Executed against a textbook-correct
    manuscript (Experiment 1 repeated-measures + paired t; Experiment 2 between-subjects +
    independent t) it produced TWO "major" findings that contradicted each other, because
    nothing tied a design cue to the analysis it belonged to.

    The logic now lives in ``core.manuscript.appropriateness`` and is claim-level, so the
    verifier pipeline and this legacy pipeline share ONE implementation. The class survives so
    ``ALL_VALIDATORS``, ``_VALIDATOR_CATEGORY`` and the report shape are untouched -- it just
    stops owning rules.

    What changed for callers: findings are now per-CLAIM, so an empty ``claims`` list yields no
    findings. That is correct -- a claim-level rule has nothing to say about a document with no
    extracted claims -- and it is why the two tests that called ``validate(text, [])`` had to be
    rewritten to pass real claims.

    Retired outright rather than ported: the "non-normal data + parametric test" check, whose
    false-positive mode is unfixable at document scope (a paper correctly using Mann-Whitney for
    its skewed variable AND ANOVA for its normal one satisfies the conjunction and gets flagged
    for doing the right thing). ``assumption_reporting`` answers that question properly, per
    claim, with an interlock. Also retired: ``_find_smallest_n``, which swept every
    reported sample size across the whole manuscript and took the MINIMUM, so an "n = 12" aside flagged a
    500-subject study; the claim's own ``sample_size`` is used instead.
    """

    VALIDATOR_NAME = "MethodologicalAppropriatenessValidator"

    #: severity of a claim-level finding -> ValidatorFinding severity. Identity today; kept
    #: explicit so a future rule severity cannot silently become an unknown string.
    _SEVERITY_MAP = {"blocking": "blocking", "major": "major",
                     "moderate": "moderate", "minor": "minor"}

    #: EvidenceGrade -> the legacy ``confidence`` float, which ValidatorFinding requires.
    #:
    #: This is a LOSSY projection onto a field the legacy report shape demands, NOT a measured
    #: probability -- the whole point of the new engine is that a rule cannot assert its own
    #: confidence. The authoritative signal is the grade, which the adapter also writes into the
    #: description. Read these as "how the finding was established", not "how likely the paper is
    #: wrong": ARITHMETIC means the stated fact is a verified property of the reported numbers
    #: (a df that matches no reading of the reported n), so the finding itself is certain even
    #: though its importance is a judgement; DIRECT means a cue read from the claim's own
    #: sentence; SCOPED means the surrounding section.
    _GRADE_CONFIDENCE = {"arithmetic": 1.0, "direct": 0.75, "scoped": 0.5}

    def validate(
        self,
        manuscript_text: str,
        claims: list,
        sections: Optional[Dict[str, str]] = None,
    ) -> List[ValidatorFinding]:
        """Run the shared claim-level engine and adapt its findings to ValidatorFinding."""
        from .appropriateness import evaluate_claims

        methods_text = (sections or {}).get("methods", "") or ""
        findings: List[ValidatorFinding] = []
        for f in evaluate_claims(claims, manuscript_text=manuscript_text,
                                 methods_text=methods_text):
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity=self._SEVERITY_MAP.get(f.severity, "minor"),
                    confidence=self._GRADE_CONFIDENCE.get(f.grade.value, 0.5),
                    title=f.title,
                    description=f"{f.description} [evidence: {f.grade.value}; {f.citation}]",
                    evidence=f.evidence,
                    recommendation=f.recommendation,
                    section=f.section,
                )
            )
        return findings


# ============================================================================
# 7. ReportingCompletenessValidator
# ============================================================================


class ReportingCompletenessValidator:
    """Check APA 7th edition statistical reporting completeness.

    Statistical rationale
    ~~~~~~~~~~~~~~~~~~~~~
    APA 7th edition (Sections 6.36-6.52) and the JARS-Quant guidelines
    require that statistical results include: (a) the exact p-value (not
    just inequalities like "p < .05"), (b) degrees of freedom for t, F, and
    chi-square tests, (c) the test statistic value, (d) sample sizes per
    group, and (e) confidence intervals for key estimates.  Incomplete
    reporting hinders meta-analysis and replication efforts.

    Per-claim completeness checks
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    * Exact p-values (not just "p < .05")       -> minor if only inequalities
    * Degrees of freedom for t, F, chi2         -> moderate if missing
    * Test statistic value (not just p)          -> major if missing
    * Sample sizes per group                     -> moderate if missing
    * Confidence intervals for key estimates     -> minor if missing

    Severity mapping
    ~~~~~~~~~~~~~~~~
    * **major** -- test statistic missing entirely.
    * **moderate** -- df or group Ns missing.
    * **minor** -- only inequality p-values or missing CIs.
    * **positive** -- fully complete reporting for a claim.
    """

    VALIDATOR_NAME = "ReportingCompletenessValidator"

    # Test types that require df
    DF_REQUIRED_TYPES = {"t_statistic", "f_statistic", "chi_square"}

    # Inequality-only p-value (no exact value)
    P_INEQUALITY_ONLY = re.compile(
        r"p\s*[<>]\s*\.?\d+",
    )

    P_EXACT_VALUE = re.compile(
        r"p\s*=\s*\.?\d+",
    )

    # CI pattern (broad)
    CI_PATTERN = re.compile(
        r"\d+%?\s*CI\s*[=:]?\s*[\[\(]\s*-?\d+\.?\d*\s*[,\u2013-]\s*-?\d+\.?\d*\s*[\]\)]",
        re.IGNORECASE,
    )

    # Sample size per group pattern
    GROUP_N_PATTERN = re.compile(
        r"(?:n\s*=\s*\d+\s*(?:,|and|;)\s*n\s*=\s*\d+)|"
        r"(?:n\s*=\s*\d+\s+(?:per|each|in\s+each)\s+(?:group|condition|arm))|"
        r"(?:group\s*\d?\s*[:=]?\s*n\s*=\s*\d+)",
        re.IGNORECASE,
    )

    # A test statistic written in nearby text (t, F, chi-square, H, U, W, Z,
    # r, d, beta, eta-squared = value). Used so a statistic that sits next to
    # a bare p-value (e.g. "F = 1122.10, p = 1.34e-35", which the strict
    # df-requiring extractor patterns don't capture onto the p-value claim) is
    # NOT falsely reported as "test statistic missing" -- symmetric with the
    # existing nearby-text checks for sample size and confidence intervals.
    STAT_NEARBY_PATTERN = re.compile(
        r"(?<![A-Za-z])(?:t|F|H|U|W|Z|r|d|chi2|chi-square|χ²|χ2|"
        r"β|η²|η2)\s*(?:\([^)]*\))?\s*=\s*-?\d",
        re.IGNORECASE,
    )

    SEARCH_RADIUS = 500

    def validate(
        self,
        manuscript_text: str,
        claims: list,
        sections: Optional[Dict[str, str]] = None,
    ) -> List[ValidatorFinding]:
        """Check APA 7th reporting completeness per claim.

        Parameters
        ----------
        manuscript_text : str
            Full manuscript text.
        claims : list
            ``StatisticalClaim`` objects.
        sections : dict, optional
            Section name -> text mapping.

        Returns
        -------
        List[ValidatorFinding]
        """
        findings: List[ValidatorFinding] = []

        # Only check claims that report a p-value (actual statistical tests)
        test_claims = [c for c in claims if getattr(c, "p_value", None) is not None]

        if not test_claims:
            return findings

        full_complete = 0
        total_checked = 0

        for claim in test_claims:
            total_checked += 1
            claim_type = getattr(claim, "claim_type", "")
            raw_text = getattr(claim, "raw_text", "")
            location = getattr(claim, "location", "unknown")
            stat_value = getattr(claim, "statistic_value", None)
            getattr(claim, "p_value", None)
            p_comp = getattr(claim, "p_comparison", "equals")
            df = getattr(claim, "df", None)
            sample_size = getattr(claim, "sample_size", None)
            ci = getattr(claim, "confidence_interval", None)
            pos = getattr(claim, "position", 0)

            evidence = raw_text[:200] if raw_text else ""
            issues: List[str] = []
            max_severity = "positive"

            # --- Check: test statistic reported (look nearby too, so a
            #     statistic written next to a bare p-value is not falsely
            #     reported missing) ---
            has_stat = stat_value is not None
            if not has_stat:
                start = max(0, pos - self.SEARCH_RADIUS)
                end = min(len(manuscript_text), pos + self.SEARCH_RADIUS)
                if self.STAT_NEARBY_PATTERN.search(manuscript_text[start:end]):
                    has_stat = True
            if not has_stat:
                issues.append("test statistic missing")
                max_severity = _escalate(max_severity, "major")

            # --- Check: df for t, F, chi2 ---
            if claim_type in self.DF_REQUIRED_TYPES and df is None:
                issues.append("degrees of freedom missing")
                max_severity = _escalate(max_severity, "moderate")

            # --- Check: exact p-value ---
            if p_comp != "equals":
                issues.append("only inequality p-value reported (not exact)")
                max_severity = _escalate(max_severity, "minor")

            # --- Check: sample size per group ---
            has_sample_info = sample_size is not None
            if not has_sample_info:
                # Check nearby text for group Ns
                start = max(0, pos - self.SEARCH_RADIUS)
                end = min(len(manuscript_text), pos + self.SEARCH_RADIUS)
                nearby = manuscript_text[start:end]
                has_sample_info = bool(self.GROUP_N_PATTERN.search(nearby))
            if not has_sample_info:
                issues.append("sample size / group Ns not reported nearby")
                max_severity = _escalate(max_severity, "moderate")

            # --- Check: confidence interval ---
            has_ci = ci is not None
            if not has_ci:
                start = max(0, pos - self.SEARCH_RADIUS)
                end = min(len(manuscript_text), pos + self.SEARCH_RADIUS)
                nearby = manuscript_text[start:end]
                has_ci = bool(self.CI_PATTERN.search(nearby))
            if not has_ci:
                issues.append("no confidence interval reported nearby")
                max_severity = _escalate(max_severity, "minor")

            # --- Emit finding ---
            if not issues:
                full_complete += 1
            else:
                description_parts = [f"Reporting completeness issues for {claim_type} result:"]
                for issue in issues:
                    description_parts.append(f"  - {issue}")

                findings.append(
                    ValidatorFinding(
                        validator=self.VALIDATOR_NAME,
                        severity=max_severity,
                        confidence=0.80,
                        title=f"Incomplete reporting for {claim_type}",
                        description="\n".join(description_parts),
                        evidence=evidence,
                        recommendation=_completeness_recommendation(issues),
                        section=location,
                    )
                )

        # Positive summary if all claims are fully reported
        if full_complete == total_checked and total_checked > 0:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.90,
                    title="All statistical results fully reported",
                    description=(
                        f"All {total_checked} statistical claim(s) include test "
                        f"statistic, degrees of freedom, exact p-value, sample "
                        f"size, and confidence interval."
                    ),
                    evidence="",
                    recommendation="No action required.",
                )
            )
        elif full_complete > 0:
            findings.append(
                ValidatorFinding(
                    validator=self.VALIDATOR_NAME,
                    severity="positive",
                    confidence=0.80,
                    title="Some results fully reported",
                    description=(
                        f"{full_complete} of {total_checked} statistical claims "
                        f"meet full APA 7th edition reporting requirements."
                    ),
                    evidence="",
                    recommendation=("Ensure all statistical results meet APA 7th edition " "reporting standards."),
                )
            )

        return findings


# ============================================================================
# Module-level helpers
# ============================================================================

_SEVERITY_ORDER = {
    "positive": 0,
    "minor": 1,
    "moderate": 2,
    "major": 3,
    "blocking": 4,
}


def _escalate(current: str, candidate: str) -> str:
    """Return the more severe of two severity levels."""
    if _SEVERITY_ORDER.get(candidate, 0) > _SEVERITY_ORDER.get(current, 0):
        return candidate
    return current


def _fmt_comp(p_comp: str) -> str:
    """Format a p-value comparison string for display."""
    if p_comp == "less_than":
        return "<"
    if p_comp == "greater_than":
        return ">"
    return "="


def _extract_context(text: str, position: int, radius: int = 100) -> str:
    """Extract a snippet of text around a position for evidence quoting.

    Returns at most ``2 * radius`` characters centred on ``position``,
    with leading/trailing whitespace collapsed.
    """
    start = max(0, position - radius)
    end = min(len(text), position + radius)
    snippet = text[start:end].strip()
    # Collapse internal whitespace runs
    snippet = re.sub(r"\s+", " ", snippet)
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet


def _completeness_recommendation(issues: List[str]) -> str:
    """Generate a targeted recommendation based on missing reporting elements."""
    parts: List[str] = ["Improve reporting completeness:"]

    for issue in issues:
        if "test statistic missing" in issue:
            parts.append("- Report the test statistic value (e.g. t, F, chi-square) " "alongside the p-value.")
        elif "degrees of freedom" in issue:
            parts.append(
                "- Include degrees of freedom in parentheses after the test " "symbol, e.g. t(24) or F(2, 45)."
            )
        elif "inequality" in issue:
            parts.append(
                "- Report exact p-values (e.g. p = .034) rather than "
                "inequalities (p < .05), except for very small values "
                "where p < .001 is acceptable (APA 7th, Section 6.36)."
            )
        elif "sample size" in issue:
            parts.append("- Report per-group sample sizes near each test result.")
        elif "confidence interval" in issue:
            parts.append("- Include a confidence interval for the estimate of " "interest (APA 7th, Section 6.44).")

    return "\n".join(parts)


# ============================================================================
# Convenience: run all validators
# ============================================================================

ALL_VALIDATORS = [
    StatisticalConsistencyValidator,
    MultipleTestingValidator,
    EffectSizeCompletenessValidator,
    PowerReportingValidator,
    ReproducibilityValidator,
    MethodologicalAppropriatenessValidator,
    ReportingCompletenessValidator,
]


def run_all_validators(
    manuscript_text: str,
    claims: list,
    sections: Optional[Dict[str, str]] = None,
) -> List[ValidatorFinding]:
    """Run all seven advanced validators and return combined findings.

    This is a convenience function for use by ``ManuscriptGuardian`` or
    any other orchestrator that needs the full suite of checks.

    Parameters
    ----------
    manuscript_text : str
        Full manuscript text.
    claims : list
        ``StatisticalClaim`` objects from ``claim_extractor``.
    sections : dict, optional
        Mapping of section name to section text.

    Returns
    -------
    List[ValidatorFinding]
        Combined findings from all validators, ordered by severity
        (blocking first, positive last).
    """
    all_findings: List[ValidatorFinding] = []

    for validator_cls in ALL_VALIDATORS:
        try:
            validator = validator_cls()
            results = validator.validate(manuscript_text, claims, sections)
            all_findings.extend(results)
        except Exception as exc:
            logger.error(
                "Validator %s raised an exception: %s",
                validator_cls.__name__,
                exc,
            )
            all_findings.append(
                ValidatorFinding(
                    validator=validator_cls.__name__,
                    severity="minor",
                    confidence=1.0,
                    title=f"{validator_cls.__name__} encountered an error",
                    description=f"Internal error: {exc}",
                    evidence="",
                    recommendation="Report this issue to the development team.",
                )
            )

    # Sort: blocking -> major -> moderate -> minor -> positive
    all_findings.sort(
        key=lambda f: _SEVERITY_ORDER.get(f.severity, 0),
        reverse=True,
    )

    return all_findings
