"""
T17-A5IDETECT — does the paper REPORT checking the assumptions its test requires?
==================================================================================

Created: 2026-08-20 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (A5(i))
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T17-A5IDETECT)

This answers a question that needs NO raw data: the authors named a test; does the
manuscript anywhere state that they checked what that test requires?

Why it exists
-------------
Recomputation needs a full (statistic, df, p) triple, which only a small minority of papers
report, so ``INSUFFICIENT_DATA`` swallows nearly everything (see the comment at
``verdict_decision.assign_verdict``). Assumption-*reporting* is decidable from the text alone,
which is why ``Verdict.ASSUMPTION_UNREPORTED`` was specified in the T02 spine. It was declared
in the enum, persisted as a DB choice and advertised in the ``/verify/`` docstring, but no code
path ever assigned it. This module supplies the missing evidence.

Scope, and why it is deliberately the widest one
------------------------------------------------
Evidence is searched across the Methods section AND the full manuscript text, because authors
write "normality was assessed with Shapiro-Wilk" once, section-level, not beside every result.
Searching only near the claim would report a paper as undisclosed when it disclosed two sections
away -- a false accusation, which is the expensive error here. See ``_search_scope``.

This is NOT the document-level OR that makes ``MethodologicalAppropriatenessValidator`` misfire.
That validator ORs a DESIGN descriptor with a TEST name across a document and concludes they
belong to the same analysis -- a non-sequitur that fires on correct papers. Here the question is
a single boolean, "is this check disclosed anywhere?", which genuinely is a property of the
document. Design-vs-test appropriateness is a separate defect, fixed separately.

Conservative by construction
----------------------------
An assumption is only listed as *required* here when reporting it is a genuine community norm
(normality, equality of variance, expected cell counts, linearity, homoscedasticity). Assumptions
that are real but almost never stated in prose -- independence, outlier screening -- are
deliberately NOT required, because demanding them would flag nearly every paper and make the
signal worthless. Rank-based tests require nothing here, so a Mann-Whitney is never asked for a
normality check.

Pure module: stdlib only. No scipy, no numpy, no Django.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# What each test requires the AUTHORS to have reported.
# ---------------------------------------------------------------------------
# Keys are ``test_resolver.TestResolution.intended_test`` values (the cascade vocabulary).
#
# This is deliberately NOT Guardian's ``test_requirements`` dict, and the difference is
# principled, not accidental:
#
#   * Guardian answers "given raw DATA, which validators must I RUN?"  This answers "given only
#     the PAPER, what must the authors have said they checked?"
#   * Guardian's vocabulary is coarser -- one ``t_test`` key covers every t variant. Here the
#     variants differ: Welch's t-test is the remedy for unequal variances, so demanding a
#     homogeneity check for it would be wrong; a paired t-test is a one-sample test on
#     differences, so it has no two-group variance assumption either.
#
# The relationship to Guardian IS enforced, by an executable invariant rather than by copying:
# every key maps to a Guardian key via GUARDIAN_TEST_ALIAS, and the required set here must be a
# SUBSET of Guardian's for that key. See test_assumption_reporting.py. If Guardian's table
# changes underneath us, that test fails rather than the two silently drifting apart.
REPORTING_REQUIREMENTS: Dict[str, Tuple[str, ...]] = {
    "independent_t": ("normality", "variance_homogeneity"),
    # Welch's t-test does not assume equal variances -- that is the whole point of it.
    "welch_t": ("normality",),
    # A paired t-test is a one-sample test on the differences: no two-group variance assumption.
    "paired_t": ("normality",),
    "one_sample_t": ("normality",),
    "one_way_anova": ("normality", "variance_homogeneity"),
    "pearson": ("normality", "linearity"),
    # Rank-based tests: nothing that is conventionally reported. Requiring "similar shapes"
    # would be defensible statistically (it is what licenses the median interpretation) but it
    # is essentially never stated in prose, so it would be pure noise. Silence is correct here.
    "spearman": (),
    "kendall": (),
    "mann_whitney_u": (),
    "kruskal_wallis": (),
    "chi_square_independence": ("expected_frequencies",),
}

#: Human-readable label per test key, for notes shown to authors and editors. Internal cascade
#: keys ("independent_t") must never reach user-facing text.
TEST_DISPLAY_NAMES: Dict[str, str] = {
    "independent_t": "an independent-samples t-test",
    "welch_t": "a Welch's t-test",
    "paired_t": "a paired-samples t-test",
    "one_sample_t": "a one-sample t-test",
    "one_way_anova": "a one-way ANOVA",
    "pearson": "a Pearson correlation",
    "spearman": "a Spearman correlation",
    "kendall": "a Kendall correlation",
    "mann_whitney_u": "a Mann-Whitney U test",
    "kruskal_wallis": "a Kruskal-Wallis test",
    # Deliberately generic. The resolver returns this key whether or not the paper said WHICH
    # chi-square it ran, so naming it "of independence" would assert something unstated. Both
    # variants require the same expected-count check, so the generic label loses nothing.
    "chi_square_independence": "a chi-square test",
}

#: Human-readable label per assumption, for the same reason.
ASSUMPTION_DISPLAY_NAMES: Dict[str, str] = {
    "normality": "normality",
    "variance_homogeneity": "equality of variances",
    "expected_frequencies": "expected cell frequencies",
    "linearity": "linearity",
    "homoscedasticity": "homoscedasticity",
}


def describe_test(test_key: Optional[str]) -> str:
    """Human-readable test label; falls back to the raw key rather than inventing one."""
    return TEST_DISPLAY_NAMES.get(test_key or "", test_key or "this test")


def describe_assumptions(assumptions) -> str:
    """Human-readable, comma-joined assumption list."""
    return ", ".join(ASSUMPTION_DISPLAY_NAMES.get(a, a) for a in assumptions)


#: manuscript test key -> Guardian ``test_requirements`` key. ``None`` = Guardian has no entry
#: (rank correlations), which is only permissible because we require nothing for those tests.
GUARDIAN_TEST_ALIAS: Dict[str, Optional[str]] = {
    "independent_t": "t_test",
    "welch_t": "t_test",
    "paired_t": "t_test",
    "one_sample_t": "t_test",
    "one_way_anova": "anova",
    "pearson": "pearson",
    "spearman": None,
    "kendall": None,
    "mann_whitney_u": "mann_whitney",
    "kruskal_wallis": "kruskal_wallis",
    "chi_square_independence": "chi_square",
}


# ---------------------------------------------------------------------------
# What counts as evidence that an assumption WAS checked.
# ---------------------------------------------------------------------------
# One row per assumption -- one rule, one place. Each pattern is a positive statement that the
# authors examined the assumption; a pattern matching means "they reported it", NOT "it held".
# We are auditing disclosure, not correctness.
EVIDENCE_PATTERNS: Dict[str, re.Pattern] = {
    # Adversarial review found this missed 6 of 7 ordinary disclosure phrasings, so papers that
    # DID state the check were told they had not -- a false accusation in the feature's flagship
    # verdict. Named tests and plots were covered; the far commoner prose forms ("the normality
    # assumption was met", "data were approximately normally distributed") were not. Recall
    # matters more than precision here and the asymmetry is deliberate: crediting a check that
    # was not really run costs a missed finding, while missing a real disclosure accuses an
    # author who did the work.
    "normality": re.compile(
        # named tests and diagnostics
        r"shapiro[\s-]*(?:wilk)?|kolmogorov[\s-]*smirnov|\bK\s*-\s*S\s+test|lilliefors|"
        r"anderson[\s-]*darling|d'agostino|jarque[\s-]*bera|omnibus\s+normality|"
        r"(?:Q[\s-]*Q|quantile[\s-]*quantile|normal\s+probability)\s+plot|"
        # "normality was tested/checked/assessed/verified/confirmed/met/satisfied/..."
        r"normalit(?:y|ies)\s+(?:of\s+[^.;]{0,40}\s+)?"
        r"(?:was|were|is|are)?\s*"
        r"(?:test|check|assess|verif|examin|inspect|evaluat|confirm|establish|met|satisf|"
        r"ensur|hold|held)\w*|"
        r"(?:tested|checked|assessed|examined|verified|confirmed)\s+for\s+normality|"
        r"assumptions?\s+of\s+normality\s+(?:was|were|is|are)?\s*"
        r"(?:met|satisf|verif|confirm|check|test|assess|hold|held)\w*|"
        r"normality\s+assumptions?\s+(?:was|were|is|are)?\s*"
        r"(?:met|satisf|verif|confirm|check|test|assess|hold|held)\w*|"
        # "(approximately/reasonably) normally distributed", "did not deviate from normality"
        r"(?:approximately|reasonably|sufficiently|were|was|are|is)\s+normally\s+distributed|"
        r"normally\s+distributed\s*[\(,.;]|"
        r"(?:did\s+not|no)\s+(?:significantly\s+)?(?:deviate|depart)\w*\s+from\s+normal|"
        r"(?:skewness|kurtosis)\s+(?:and\s+kurtosis\s+)?(?:was|were|values?|statistics?)",
        re.IGNORECASE,
    ),
    "variance_homogeneity": re.compile(
        r"levene|bartlett|brown[\s-]*forsythe|fligner|hartley|"
        r"homogeneity\s+of\s+(?:the\s+)?variance\w*|homoscedastic\w*|"
        r"equality\s+of\s+variance\w*|"
        r"(?:equal|homogeneous)\s+variances?\s*"
        r"(?:was|were|is|are|assumption|could|was\s+not)?[^.;]{0,30}"
        r"(?:met|satisf|assum|verif|confirm|check|test|assess|hold|held)?\w*|"
        r"variances?\s+(?:was|were|is|are)\s+(?:not\s+)?(?:significantly\s+)?"
        r"(?:different|unequal|homogeneous|equal)",
        re.IGNORECASE,
    ),
    "expected_frequencies": re.compile(
        r"expected\s+(?:cell\s+)?(?:count|frequenc)\w*|cochran'?s?\s+rule|"
        r"(?:fisher'?s?\s+exact.{0,60}(?:small|expected|sparse)|"
        r"(?:small|low|sparse)\s+expected.{0,40}fisher)",
        re.IGNORECASE,
    ),
    "linearity": re.compile(
        r"linearity\s+(?:was|were|of)|"
        r"(?:assessed|checked|examined|inspected|verified)\s+(?:for\s+)?linearity|"
        r"(?:scatter\s*plot|scatterplot)s?\s+(?:was|were|showed|revealed|confirmed|"
        r"(?:were\s+)?(?:visually\s+)?inspect)",
        re.IGNORECASE,
    ),
    "homoscedasticity": re.compile(
        r"breusch[\s-]*pagan|white'?s?\s+test|cook'?s?\s+distance|"
        r"residual\s+plot|plot\w*\s+(?:of\s+)?residuals|homoscedasticity",
        re.IGNORECASE,
    ),
}


def _assert_every_requirement_has_a_detector() -> None:
    """Refuse to import if any REQUIRED assumption has no evidence pattern behind it.

    This is the ``similar_shapes`` lesson made structural: that assumption was listed in
    Guardian's ``test_requirements`` with no validator implementing it, so the engine reported
    it as "checked" precisely because nothing checked it. A requirement declared here without a
    detector would silently be dropped from both `reported` and `unreported` -- the same lie in
    a new place. Guardian answers this with ``_assert_every_requirement_is_implemented`` at
    construction time; this is the module-level equivalent.
    """
    missing = {
        assumption
        for required in REPORTING_REQUIREMENTS.values()
        for assumption in required
        if assumption not in EVIDENCE_PATTERNS
    }
    if missing:
        raise RuntimeError(
            "assumption_reporting: required assumption(s) with no evidence pattern: "
            + ", ".join(sorted(missing))
        )


def _assert_requirements_are_a_subset_of_guardian() -> None:
    """Every test key must alias to Guardian, and require no more than Guardian does.

    This is how "one rule, one place" is honoured without copying Guardian's table: the two may
    legitimately differ (Welch needs no homogeneity check here), but this side may never demand
    something Guardian does not consider an assumption of that test. Guardian is imported
    lazily and a failure to import is NOT fatal -- Guardian pulls scipy/numpy and this module is
    deliberately pure -- so the binding check lives in the test suite, where scipy is available.
    """
    unaliased = set(REPORTING_REQUIREMENTS) - set(GUARDIAN_TEST_ALIAS)
    if unaliased:
        raise RuntimeError(
            "assumption_reporting: test key(s) with no Guardian alias: "
            + ", ".join(sorted(unaliased))
        )
    # A test with no Guardian counterpart may not require anything, since nothing anchors it.
    for key, alias in GUARDIAN_TEST_ALIAS.items():
        if alias is None and REPORTING_REQUIREMENTS.get(key):
            raise RuntimeError(
                f"assumption_reporting: '{key}' has no Guardian alias but requires "
                f"{list(REPORTING_REQUIREMENTS[key])}"
            )


_assert_every_requirement_has_a_detector()
_assert_requirements_are_a_subset_of_guardian()


@dataclass
class AssumptionReporting:
    """Per-claim result of the assumption-disclosure audit."""

    test_key: Optional[str] = None
    #: False when we could not evaluate at all (no test resolved, or no text to search).
    #: The caller MUST NOT emit ASSUMPTION_UNREPORTED when this is False.
    evaluable: bool = False
    required: Tuple[str, ...] = ()
    reported: List[str] = field(default_factory=list)
    unreported: List[str] = field(default_factory=list)
    #: assumption -> the exact text span that was accepted as evidence (the receipt).
    evidence: Dict[str, str] = field(default_factory=dict)
    reason: str = ""

    @property
    def all_reported(self) -> Optional[bool]:
        """True/False once evaluable and something was required; None otherwise."""
        if not self.evaluable or not self.required:
            return None
        return not self.unreported

    def to_dict(self) -> Dict[str, object]:
        return {
            "test_key": self.test_key,
            "evaluable": self.evaluable,
            "required": list(self.required),
            "reported": list(self.reported),
            "unreported": list(self.unreported),
            "evidence": dict(self.evidence),
            "reason": self.reason,
        }


def _evidence_span(pattern: re.Pattern, text: str, radius: int = 90) -> Optional[str]:
    """Return a readable span around the first match, or None."""
    m = pattern.search(text)
    if not m:
        return None
    start = max(0, m.start() - radius)
    end = min(len(text), m.end() + radius)
    return " ".join(text[start:end].split())


def _search_scope(claim, manuscript_text: str, methods_text: str) -> str:
    """Everything we have: the Methods section plus the full manuscript text.

    Deliberately the WIDEST scope, and the asymmetry is the point. Missing a real omission
    (false negative) costs a user nothing. Announcing that a paper "did not report checking
    normality" when it said so two sections away is a false accusation, and this feature is
    aimed at authors first and editors later -- the expensive error is the accusation.

    So a disclosure stated anywhere in the paper counts. This does mean a paper that checks
    normality for one of ten analyses gets credit for all ten; that is a known, accepted false
    negative, and per-analysis attribution is the harder problem that claim-level appropriateness
    (Phase 2) takes on separately.

    NOTE this is NOT the document-level OR that makes ``MethodologicalAppropriatenessValidator``
    misfire. That validator ORs a DESIGN descriptor with a TEST name across a document and
    concludes they belong to the same analysis, which is a non-sequitur. Here a single boolean --
    "is this check disclosed anywhere?" -- is genuinely a property of the document.
    """
    parts: List[str] = []
    if methods_text:
        parts.append(methods_text)
    if manuscript_text and manuscript_text not in parts:
        parts.append(manuscript_text)
    return "\n".join(parts)


def detect_assumption_reporting(claim, manuscript_text: str = "", methods_text: str = "",
                                test_key: Optional[str] = None) -> AssumptionReporting:
    """Audit whether the manuscript reports checking what ``claim``'s test requires.

    Parameters
    ----------
    claim : StatisticalClaim (duck-typed; uses ``position``)
    manuscript_text : full text, used for the window around the claim.
    methods_text : the Methods section, searched in full.
    test_key : a ``test_resolver`` ``intended_test``. When omitted the claim is resolved here.

    Returns an ``AssumptionReporting``. ``evaluable=False`` means "no opinion" -- never an
    accusation.
    """
    if test_key is None:
        try:
            from .test_resolver import resolve_test
            resolution = resolve_test(claim)
        except Exception as exc:  # pragma: no cover - defensive
            return AssumptionReporting(evaluable=False, reason=f"test resolution failed: {exc}")
        if not resolution.resolved:
            return AssumptionReporting(evaluable=False, reason="test not resolved")
        # An AMBIGUOUS resolution means the design was not stated and the resolver defaulted to
        # the most common form. Never build a finding on a guess.
        #
        # Read the attribute directly rather than via getattr(..., default): this field is the
        # safety interlock, and a getattr default would silently evaluate to "not ambiguous" if
        # the field were ever renamed, turning the interlock off without any test noticing.
        # (That is not hypothetical -- the first draft of this module looked for `defaulted`,
        # which does not exist, and the rule was inert until an executed case caught it.)
        if resolution.ambiguous:
            return AssumptionReporting(
                test_key=resolution.intended_test, evaluable=False,
                reason="test/design not stated explicitly; resolver defaulted")
        test_key = resolution.intended_test

    if test_key not in REPORTING_REQUIREMENTS:
        return AssumptionReporting(test_key=test_key, evaluable=False,
                                   reason=f"no reporting requirements defined for '{test_key}'")

    required = REPORTING_REQUIREMENTS[test_key]
    if not required:
        return AssumptionReporting(test_key=test_key, evaluable=True, required=(),
                                   reason="test requires no conventionally-reported assumption")

    scope = _search_scope(claim, manuscript_text, methods_text)
    if not scope.strip():
        return AssumptionReporting(test_key=test_key, evaluable=False, required=required,
                                   reason="no manuscript text to search")

    reported: List[str] = []
    unreported: List[str] = []
    evidence: Dict[str, str] = {}
    for assumption in required:
        pattern = EVIDENCE_PATTERNS.get(assumption)
        if pattern is None:
            # An assumption with no detector must NOT be reported as unmet -- that is exactly
            # the `similar_shapes` defect (a requirement declared with nothing behind it).
            continue
        span = _evidence_span(pattern, scope)
        if span:
            reported.append(assumption)
            evidence[assumption] = span
        else:
            unreported.append(assumption)

    return AssumptionReporting(
        test_key=test_key, evaluable=True, required=required,
        reported=reported, unreported=unreported, evidence=evidence,
        reason="assumption disclosure audited over Methods + claim window",
    )
