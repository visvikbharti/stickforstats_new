"""
Claim-level appropriateness rules (Phase 2, increment 1).
==========================================================

Created: 2026-08-20 IST

Replaces the document-level co-occurrence checks in
``advanced_validators.MethodologicalAppropriatenessValidator``, which computed things like
``has_repeated_measures and has_independent_t`` over the concatenated Methods+Results text and
emitted ``severity="major", confidence=0.80``. Executed against a textbook-correct manuscript --
Experiment 1 repeated-measures analysed with a paired t-test, Experiment 2 between-subjects
analysed with an independent t-test -- it produced TWO "major" findings that contradict each
other, because it never checks that the design cue and the test name belong to the SAME analysis.

A paper is not one design. It is a sequence of analyses, and a cue in Experiment 1 says nothing
about a claim in Experiment 2. Modelling that properly (episode segmentation) is discourse
parsing with no ground truth, and it is the part of this work that can stall. So increment 1
carries only rules that are **claim-local** -- they read the claim's own fields and need no
notion of which experiment it belongs to -- and establishes the structure the later rules plug
into.

Structure, and why it is shaped this way
----------------------------------------
``Rule`` has **no confidence field**, and ``Fires`` takes **no confidence argument**. A rule
author cannot hardcode 0.80 because there is nowhere to put it. The wrong thing is
unrepresentable rather than merely discouraged -- which is the only mechanism that has actually
held on this project. What a finding carries instead is an ``EvidenceGrade`` describing HOW the
finding was established, attached by the evaluator, never by the rule.

Import-time invariants refuse to load a malformed rule table, following the pattern in
``assumption_reporting`` and Guardian's ``_assert_every_requirement_is_implemented``.

Pure module: stdlib only.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Dict, FrozenSet, List, Optional, Tuple


class EvidenceGrade(str, Enum):
    """How a finding was established. Ordered weakest to strongest."""

    #: derived by arithmetic from numbers the claim itself reports (df, n). Not an inference.
    ARITHMETIC = "arithmetic"
    #: read from the claim's own sentence or its immediate window.
    DIRECT = "direct"
    #: read from the surrounding section, scoped to this analysis.
    SCOPED = "scoped"


#: A rule may not emit below this grade. Increment 1 has no sub-SCOPED sources, but the floor is
#: enforced now so a later rule cannot quietly lower it.
MIN_EMIT_GRADE = EvidenceGrade.SCOPED

_GRADE_ORDER = {EvidenceGrade.SCOPED: 0, EvidenceGrade.DIRECT: 1, EvidenceGrade.ARITHMETIC: 2}


@dataclass(frozen=True)
class Fires:
    """The rule fired. Carries its own receipt and nothing resembling a confidence."""

    evidence: str
    detail: str
    grade: EvidenceGrade


@dataclass(frozen=True)
class Silent:
    """The rule declined to fire, with a reason recorded for the audit trail."""

    reason: str


#: Rules return one of these. There is deliberately no third "maybe" state: a rule that cannot
#: decide must say Silent(reason), which is a decision.
Outcome = object


@dataclass(frozen=True)
class Rule:
    rule_id: str
    #: ``test_resolver`` intended_test keys this rule applies to. Empty = any resolved test.
    applies_to: FrozenSet[str]
    #: claim attributes that must be present and non-None, or the rule is not run at all.
    requires: FrozenSet[str]
    predicate: Callable
    severity: str
    title: str
    recommendation: str
    #: methodological reference. Non-optional: a rule that cannot cite a source for why the
    #: practice is wrong has no business telling an author their paper is wrong.
    citation: str


@dataclass
class ClaimFinding:
    rule_id: str
    severity: str
    title: str
    description: str
    evidence: str
    recommendation: str
    citation: str
    grade: EvidenceGrade
    claim_id: str = ""
    section: str = "methods"

    def to_dict(self) -> Dict[str, object]:
        return {
            "rule_id": self.rule_id,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "evidence": self.evidence,
            "recommendation": self.recommendation,
            "citation": self.citation,
            "grade": self.grade.value,
            "claim_id": self.claim_id,
            "section": self.section,
        }


# ---------------------------------------------------------------------------
# Rule 1 — small n + parametric test whose assumption checks are undisclosed
# ---------------------------------------------------------------------------

#: Below this, the central limit theorem is not a defence and normality matters.
SMALL_N_THRESHOLD = 20

#: Tests for which small-sample normality is a live concern.
PARAMETRIC_TESTS = frozenset({
    "independent_t", "welch_t", "paired_t", "one_sample_t", "one_way_anova", "pearson",
})


def _small_n_parametric_undisclosed(claim, ctx) -> Outcome:
    n = getattr(claim, "sample_size", None)
    if n is None or n <= 0:
        return Silent("no sample size reported for this claim")
    if n >= SMALL_N_THRESHOLD:
        return Silent(f"n={n} is not small")

    reporting = ctx.get("assumption_reporting")
    if reporting is None or not getattr(reporting, "evaluable", False):
        return Silent("assumption disclosure could not be evaluated for this claim")
    if "normality" not in getattr(reporting, "required", ()):  # e.g. a rank test
        return Silent("this test does not require a normality check")
    if "normality" not in reporting.unreported:
        return Silent("a normality check is reported")

    return Fires(
        evidence=f"n = {n} reported with this claim",
        detail=(f"This claim reports n = {n}, below {SMALL_N_THRESHOLD}, and the manuscript does "
                f"not report checking normality. With a sample this small the central limit "
                f"theorem does not rescue a parametric test, so the normality assumption is "
                f"doing real work and its check should be stated."),
        grade=EvidenceGrade.ARITHMETIC,
    )


# ---------------------------------------------------------------------------
# Rule 2 — reported df contradicts the reported sample size
# ---------------------------------------------------------------------------


def plausible_df_readings(test_key: str, n: int, df: Tuple) -> List[int]:
    """Every df the reported n could legitimately imply, under every reading of n.

    ``sample_size`` is whatever number the extractor found nearest the claim, and papers write
    both "N = 60" (total) and "n = 20 per group". Assuming one reading manufactures a false
    contradiction on a correct paper, so BOTH are enumerated and the rule fires only when the
    reported df matches none of them. That asymmetry is deliberate: a missed contradiction costs
    nothing, a false one accuses an author.
    """
    readings: List[int] = []
    if test_key in ("independent_t", "welch_t"):
        readings += [n - 2, 2 * n - 2]          # n as total, n as per-group
    elif test_key in ("paired_t", "one_sample_t"):
        readings += [n - 1, 2 * n - 1]          # n as pairs, or as total observations
    elif test_key == "pearson":
        readings += [n - 2]
    elif test_key == "one_way_anova" and df and len(df) == 2:
        k = int(df[0]) + 1                      # df1 = k - 1
        readings += [n - k, n * k - k]          # between-subjects: total / per-group
        readings += [(k - 1) * (n - 1)]         # repeated-measures reading
    return [r for r in readings if r > 0]


def _df_contradicts_reported_n(claim, ctx) -> Outcome:
    n = getattr(claim, "sample_size", None)
    df = getattr(claim, "df", None)
    test_key = ctx.get("test_key")
    if n is None or n <= 0:
        return Silent("no sample size reported for this claim")
    if not df:
        return Silent("no degrees of freedom reported")
    if ctx.get("test_ambiguous"):
        return Silent("the design is not stated, so no df is predictable")

    readings = plausible_df_readings(test_key, n, df)
    if not readings:
        return Silent(f"df is not predictable from n for {test_key}")

    reported = int(df[-1])                       # the error df (df2 for F, df for t/r)
    if reported in readings:
        return Silent(f"reported df={reported} is consistent with n={n}")

    return Fires(
        evidence=f"reported df = {reported} with n = {n}",
        detail=(f"The reported degrees of freedom ({reported}) are not consistent with the "
                f"reported sample size (n = {n}) under any standard reading of n for this test "
                f"— neither as a total nor as a per-group count. Expected one of "
                f"{sorted(set(readings))}. Either the sample size, the degrees of freedom, or "
                f"the test described is not what was actually run."),
        grade=EvidenceGrade.ARITHMETIC,
    )


# ---------------------------------------------------------------------------
# Rule 3 — Pearson correlation on data the same sentence calls ordinal
# ---------------------------------------------------------------------------

_ORDINAL_CUE = re.compile(
    r"ordinal|Likert|rank(?:ed|ing)?\s+(?:data|scale|score)|"
    r"\d+\s*-\s*point\s+(?:scale|item)",
    re.IGNORECASE,
)


def _pearson_on_ordinal(claim, ctx) -> Outcome:
    """Fires only on an ordinal cue in the claim's OWN sentence.

    The document-level version of this check fired on
    "We used Spearman rho. Unlike Pearson correlation, rho does not assume interval
    measurement." -- a Discussion sentence EXPLAINING the correct choice. Requiring the cue and
    the claim to share a sentence is what makes the check mean anything.
    """
    sentence = (ctx.get("sentence") or "").strip()
    if not sentence:
        return Silent("no sentence context available for this claim")
    match = _ORDINAL_CUE.search(sentence)
    if not match:
        return Silent("no ordinal cue in this claim's own sentence")
    return Fires(
        evidence=sentence[max(0, match.start() - 60):match.end() + 60].strip(),
        detail=("This correlation is reported in a sentence that describes the measure as "
                "ordinal (e.g. a Likert or ranked scale). Pearson's r assumes interval-level "
                "measurement and linearity; on ordinal data Spearman's rho or Kendall's tau is "
                "the standard choice."),
        grade=EvidenceGrade.DIRECT,
    )


RULES: Tuple[Rule, ...] = (
    Rule(
        rule_id="SMALL_N_PARAMETRIC_UNDISCLOSED",
        applies_to=PARAMETRIC_TESTS,
        requires=frozenset({"sample_size"}),
        predicate=_small_n_parametric_undisclosed,
        severity="moderate",
        title="Small sample, parametric test, no normality check reported",
        recommendation=("State how normality was assessed (Shapiro-Wilk, a Q-Q plot), or use a "
                        "rank-based test. With n below 20 this assumption is load-bearing."),
        citation="Ghasemi & Zahediasl (2012), Int J Endocrinol Metab 10(2):486-9",
    ),
    Rule(
        rule_id="PEARSON_ON_ORDINAL",
        applies_to=frozenset({"pearson"}),
        requires=frozenset(),
        predicate=_pearson_on_ordinal,
        severity="moderate",
        title="Pearson correlation on a measure the text calls ordinal",
        recommendation=("Use Spearman's rho or Kendall's tau for ordinal measures, or state why "
                        "interval-level measurement is defensible here."),
        citation="Norman (2010), Adv Health Sci Educ 15(5):625-32",
    ),
    Rule(
        rule_id="DF_CONTRADICTS_REPORTED_N",
        applies_to=frozenset(),
        requires=frozenset({"sample_size", "df"}),
        predicate=_df_contradicts_reported_n,
        severity="major",
        title="Reported degrees of freedom are inconsistent with the reported sample size",
        recommendation=("Check the sample size, the degrees of freedom and the test named in "
                        "the text against one another; one of the three does not match."),
        citation="Bakker & Wicherts (2011), Behav Res Methods 43(3):666-78",
    ),
)


# ---------------------------------------------------------------------------
# Import-time invariants
# ---------------------------------------------------------------------------


def _assert_rule_table_is_well_formed() -> None:
    """Refuse to import a malformed rule table.

    Mirrors ``assumption_reporting._assert_every_requirement_has_a_detector`` and Guardian's
    ``_assert_every_requirement_is_implemented``: the structural guarantee is enforced at import,
    not by reviewer attention.
    """
    seen = set()
    for rule in RULES:
        if rule.rule_id in seen:
            raise RuntimeError(f"appropriateness: duplicate rule_id {rule.rule_id!r}")
        seen.add(rule.rule_id)
        if not rule.citation.strip():
            raise RuntimeError(f"appropriateness: rule {rule.rule_id!r} has no citation")
        if not callable(rule.predicate):
            raise RuntimeError(f"appropriateness: rule {rule.rule_id!r} has no predicate")
        if rule.severity not in ("blocking", "major", "moderate", "minor"):
            raise RuntimeError(
                f"appropriateness: rule {rule.rule_id!r} has severity {rule.severity!r}")


def _assert_no_rule_can_carry_a_confidence() -> None:
    """A rule must not be able to assert its own confidence.

    The validator this replaces emitted a hardcoded ``confidence=0.80`` on every finding -- a
    number with nothing behind it, on a claim about someone's paper. Neither ``Rule`` nor
    ``Fires`` has a confidence field, so that is now a construction error rather than a habit
    to be policed in review. This asserts the shape has not been quietly reintroduced.
    """
    for cls in (Rule, Fires):
        names = {f.name for f in cls.__dataclass_fields__.values()}
        if "confidence" in names:
            raise RuntimeError(
                f"appropriateness: {cls.__name__} must not carry a confidence field; findings "
                f"carry an EvidenceGrade describing HOW they were established")


_assert_rule_table_is_well_formed()
_assert_no_rule_can_carry_a_confidence()


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------


def _sentence_of(text: str, position: int) -> str:
    """The sentence containing `position` — the tightest honest scope for a textual cue."""
    if not text:
        return ""
    start = text.rfind(".", 0, position) + 1
    end = text.find(".", position)
    return text[start:len(text) if end == -1 else end + 1].strip()


def evaluate_claim(claim, test_key: Optional[str], *, test_ambiguous: bool = False,
                   assumption_reporting=None, sentence: str = "") -> List[ClaimFinding]:
    """Run every applicable rule against ONE claim. Never raises.

    A rule is skipped when its ``requires`` fields are absent, so an under-populated claim yields
    silence rather than garbage. A rule that raises produces an explicit engine-error finding --
    never a silent pass, and never the ``severity="minor"`` downgrade that
    ``run_all_validators`` applies to a crashing validator.
    """
    findings: List[ClaimFinding] = []
    ctx = {
        "test_key": test_key,
        "test_ambiguous": test_ambiguous,
        "assumption_reporting": assumption_reporting,
        "sentence": sentence,
    }

    for rule in RULES:
        if rule.applies_to and test_key not in rule.applies_to:
            continue
        if any(getattr(claim, f, None) is None for f in rule.requires):
            continue
        try:
            outcome = rule.predicate(claim, ctx)
        except Exception as exc:  # fail CLOSED and loudly
            findings.append(ClaimFinding(
                rule_id=rule.rule_id, severity="minor",
                title=f"Rule {rule.rule_id} could not be evaluated",
                description=f"The rule raised {type(exc).__name__}: {exc}",
                evidence="", recommendation="This is a tool error, not a finding about the paper.",
                citation=rule.citation, grade=EvidenceGrade.ARITHMETIC,
                claim_id=getattr(claim, "claim_id", "")))
            continue

        if not isinstance(outcome, Fires):
            continue
        if _GRADE_ORDER[outcome.grade] < _GRADE_ORDER[MIN_EMIT_GRADE]:
            continue
        findings.append(ClaimFinding(
            rule_id=rule.rule_id, severity=rule.severity, title=rule.title,
            description=outcome.detail, evidence=outcome.evidence,
            recommendation=rule.recommendation, citation=rule.citation,
            grade=outcome.grade, claim_id=getattr(claim, "claim_id", ""),
        ))
    return findings


def evaluate_claims(claims, manuscript_text: str = "",
                    methods_text: str = "") -> List[ClaimFinding]:
    """Resolve each claim's test and audit it. The entry point both pipelines call."""
    from .assumption_reporting import detect_assumption_reporting
    from .test_resolver import resolve_test

    out: List[ClaimFinding] = []
    for claim in claims or []:
        resolution = resolve_test(claim)
        if not resolution.resolved:
            continue
        try:
            reporting = detect_assumption_reporting(
                claim, manuscript_text=manuscript_text, methods_text=methods_text,
                test_key=resolution.intended_test if not resolution.ambiguous else None,
            )
        except Exception:
            # The disclosure audit is an INPUT to rule 1, which treats None as "cannot
            # evaluate" and stays silent. A crash here must not become a finding.
            reporting = None
        out.extend(evaluate_claim(
            claim, resolution.intended_test,
            test_ambiguous=resolution.ambiguous, assumption_reporting=reporting,
            sentence=_sentence_of(manuscript_text, getattr(claim, "position", 0))))
    return out
