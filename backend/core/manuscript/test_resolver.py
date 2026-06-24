"""
T12-RESOLVER — extracted claim_type (+design hints) -> cascade intended_test.
=============================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T12-RESOLVER; depends on T02-SPINE)

Maps a StatisticalClaim's claim_type (claim_extractor: t_statistic / f_statistic / r_value /
chi_square / ...) to a cascade_engine ``intended_test`` key (AutonomousCascadeEngine
GUARDIAN_TEST_MAP). Resolution is design-ambiguous from text alone (a t could be
independent/paired/one-sample; an r could be Pearson/Spearman), so we use test_name hints
where present and otherwise default to the most common form, FLAGGING the assumption.

Claim families with no simple summary-level re-run (regression coefficients, odds/hazard
ratios, bare z, Shapiro W) resolve to None -> the engine emits INSUFFICIENT_DATA rather
than guessing. Pure module (stdlib only).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

# claim families that cannot be re-run from a 2-array/k-array summary (need the full
# model, the contingency counts, or a different design): -> not directly verifiable.
UNVERIFIABLE_FAMILIES = frozenset({"beta", "odds_ratio", "hazard_ratio", "z_statistic", "shapiro_wilk"})


@dataclass
class TestResolution:
    intended_test: Optional[str]      # cascade_engine key, or None if no executor
    design_type: Optional[str]
    ambiguous: bool                   # True when defaulted (design not stated)
    reason: str

    @property
    def resolved(self) -> bool:
        return self.intended_test is not None


def resolve_test(claim) -> TestResolution:
    """Resolve one StatisticalClaim to a cascade intended_test (duck-typed: claim_type, test_name)."""
    ct = (getattr(claim, "claim_type", "") or "")
    name = (getattr(claim, "test_name", "") or "").lower()

    if ct == "t_statistic":
        # check 'independent' FIRST — it contains the substring 'dependent', so a bare
        # 'dependent' keyword would misfire on "independent-samples t-test".
        if "independent" in name or "two-sample" in name or "two sample" in name:
            return TestResolution("independent_t", "two_group", False, "independent-samples t-test (from test_name)")
        if "welch" in name:
            return TestResolution("welch_t", "two_group", False, "Welch t-test (from test_name)")
        if any(k in name for k in ("paired", "repeated", "within-subject", "within subject", "matched")):
            return TestResolution("paired_t", "paired", False, "paired t-test (from test_name)")
        if "one-sample" in name or "one sample" in name:
            return TestResolution("one_sample_t", "one_sample", False, "one-sample t-test (from test_name)")
        return TestResolution("independent_t", "two_group", True,
                              "defaulted to independent-samples t-test (design not stated)")

    if ct == "r_value":
        if "spearman" in name:
            return TestResolution("spearman", "correlation", False, "Spearman (from test_name)")
        if "kendall" in name:
            return TestResolution("kendall", "correlation", False, "Kendall (from test_name)")
        return TestResolution("pearson", "correlation", True, "defaulted to Pearson correlation")

    if ct == "f_statistic":
        return TestResolution("one_way_anova", "k_group", True,
                              "defaulted to one-way ANOVA (could be factorial / repeated-measures)")

    if ct == "chi_square":
        return TestResolution("chi_square_independence", "contingency", False, "chi-square test of independence")

    if ct == "mann_whitney":
        return TestResolution("mann_whitney_u", "two_group_nonparametric", False, "Mann-Whitney U")
    if ct == "kruskal_wallis":
        return TestResolution("kruskal_wallis", "k_group_nonparametric", False, "Kruskal-Wallis H")

    if ct in UNVERIFIABLE_FAMILIES:
        return TestResolution(None, None, False,
                              f"no direct summary-level re-run for '{ct}' (needs the full model / different design)")
    return TestResolution(None, None, False, f"unknown or unsupported claim_type '{ct}'")
