"""
P-Curve Core Analysis
=====================

Core implementation of p-curve analysis following
Simonsohn, Nelson, & Simmons (2014, JEP:General) and
Simonsohn, Simmons & Nelson (2014, "p-curve and effect size").

Key design notes (2026-06-05 statistical-correctness rewrite)
-------------------------------------------------------------
* The RIGHT-SKEW (evidential value) test uses pp-values = p/.05, combined with
  Stouffer's method. This is df-independent and works from bare p-values.
* The HALF-CURVE test mirrors it on the p < .025 subset (pp = p/.025).
* The FLAT test (vs 33% power) and the AVERAGE-POWER estimate are inherently
  df-dependent: they require each study's TEST STATISTIC (so the noncentrality
  giving a target power can be solved per study). They are therefore computed
  only when every significant study carries usable test info (t/r/F/chi2/z with
  the required df); otherwise they are reported as unavailable rather than
  fabricated. (Simonsohn's own p-curve app requires test statistics, not bare
  p-values, for exactly this reason.)
* The previous implementation (a) ran a direction-INVERTED binomial flat test
  vs 1/3, (b) reported a fabricated piecewise-linear "average power" (~38% for
  pure-noise data), and (c) used a magnitude-blind binomial half-test. All three
  are replaced here; the canonical versions are validated by simulation
  (recovery of known power; correct null/33%-power calibration).

Created: December 26, 2025
Rewritten: June 5, 2026
"""

from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass, asdict
import numpy as np
from scipy import stats, optimize


ALPHA = 0.05
# Test families for which a per-study noncentral power can be solved.
_NONCENTRAL_TYPES = {"t", "r", "f", "chi2", "x2", "z"}


@dataclass
class PCurveResult:
    """Complete result from p-curve analysis."""

    # Input summary
    n_studies: int
    n_significant: int
    p_values: List[float]

    # P-curve shape tests
    right_skew_test: Dict[str, Any]  # Test for evidential value
    flat_test: Dict[str, Any]  # Test against 33% power
    half_test: Dict[str, Any]  # Half-curve right-skew test

    # Overall conclusion
    has_evidential_value: bool
    inadequate_evidence: bool
    interpretation: str

    # PP-values (for power estimation)
    pp_values_full: List[float]
    pp_values_half: List[float]

    # Estimated power
    estimated_power: Optional[float]
    power_ci: Optional[Tuple[float, float]]

    # Histogram data for visualization
    histogram_bins: List[float]
    histogram_counts: List[int]
    expected_null: List[float]  # Expected if no effect (flat)
    expected_33: List[float]  # Expected if 33% power

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Right-skew (evidential value) test -- df-independent, from bare p-values
# ---------------------------------------------------------------------------

def compute_pp_values(p_values: List[float], use_half: bool = False) -> List[float]:
    """
    Compute pp-values under the null (no effect) for the right-skew test.

    Conditional on p < threshold and H0, p is uniform on (0, threshold), so
    pp = p / threshold is uniform on (0, 1). Small pp => right-skew => evidence.

    Args:
        p_values: significant p-values
        use_half: if True, use the half curve (threshold .025, p < .025 only)

    Returns:
        List of pp-values
    """
    threshold = 0.025 if use_half else 0.05
    return [p / threshold for p in p_values if 0 < p < threshold]


def stouffer_test(pp_values: List[float], test_name: str = "Right-skew test") -> Dict[str, Any]:
    """
    Stouffer's method combining pp-values for the right-skew test.

    Z = sum(Phi^{-1}(pp)) / sqrt(k); right-skew (evidential value) makes the
    pp-values small => Z negative => left-tail p small. (Algebraically identical
    to Simonsohn's published right-skew test; verified vs the canonical form.)

    Args:
        pp_values: pp-values (uniform under the relevant null)

    Returns:
        dict with z, p, significant
    """
    z_scores = [stats.norm.ppf(pp) for pp in pp_values if 0 < pp < 1]
    if not z_scores:
        return {"z": 0.0, "p": 1.0, "significant": False, "test_name": test_name}

    z_combined = float(np.sum(z_scores) / np.sqrt(len(z_scores)))
    p_combined = float(stats.norm.cdf(z_combined))  # left tail: small pp -> small p
    return {"z": z_combined, "p": p_combined, "significant": p_combined < 0.05, "test_name": test_name}


# ---------------------------------------------------------------------------
# Noncentral machinery for the df-aware flat test and power estimate
# ---------------------------------------------------------------------------

def _coerce_record(s: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a study dict to the internal form {p, test_type(lower), df1, df2, n}.

    Accepts both the external (``p_value``, mixed-case ``test_type``) and the
    internal (``p``) shapes, so the helpers below can be called directly.
    """
    p = s.get("p", s.get("p_value"))
    return {
        "p": None if p is None else float(p),
        "test_type": str(s.get("test_type", "p")).lower(),
        "df1": s.get("df1"),
        "df2": s.get("df2"),
        "n": s.get("n"),
    }


def _study_is_noncentral(study: Dict[str, Any]) -> bool:
    """Whether a study carries enough test info to solve a noncentral power."""
    tt = str(study.get("test_type", "")).lower()
    if tt not in _NONCENTRAL_TYPES:
        return False
    if tt in ("t", "r", "chi2", "x2"):
        return study.get("df1") is not None
    if tt == "f":
        return study.get("df1") is not None and study.get("df2") is not None
    if tt == "z":
        return True  # normal: no df needed
    return False


def _pvalue_cdf_under_ncp(study: Dict[str, Any], ncp: float, p_threshold: float) -> float:
    """
    F_p(p_threshold | ncp) = P(p-value <= p_threshold | H1 with this noncentrality).

    Equivalently the power of the test at significance level ``p_threshold``.
    Tail convention matches how the parser computes each test's p-value
    (two-tailed for t/r/z, upper-tail for F/chi2).
    """
    tt = str(study["test_type"]).lower()
    if tt in ("t", "r"):
        df = float(study["df1"])
        tc = stats.t.ppf(1 - p_threshold / 2.0, df)
        return float(stats.nct.sf(tc, df, ncp) + stats.nct.cdf(-tc, df, ncp))
    if tt == "z":
        zc = stats.norm.ppf(1 - p_threshold / 2.0)
        return float(stats.norm.sf(zc - ncp) + stats.norm.cdf(-zc - ncp))
    if tt == "f":
        df1, df2 = float(study["df1"]), float(study["df2"])
        fc = stats.f.ppf(1 - p_threshold, df1, df2)
        return float(stats.ncf.sf(fc, df1, df2, ncp))
    if tt in ("chi2", "x2"):
        df = float(study["df1"])
        cc = stats.chi2.ppf(1 - p_threshold, df)
        return float(stats.ncx2.sf(cc, df, ncp))
    raise ValueError(f"Non-noncentral test type: {tt}")


_NCP_CACHE: Dict[Tuple, float] = {}


def _ncp_for_power(study: Dict[str, Any], target_power: float, alpha: float = ALPHA) -> float:
    """Noncentrality giving ``target_power`` at level ``alpha`` (cached per df/type)."""
    tt = str(study["test_type"]).lower()
    key = (tt, study.get("df1"), study.get("df2"), round(target_power, 6), alpha)
    if key in _NCP_CACHE:
        return _NCP_CACHE[key]

    def f(ncp):
        return _pvalue_cdf_under_ncp(study, ncp, alpha) - target_power

    # power is monotone increasing in ncp; grow the bracket until it spans the root
    hi = 20.0
    while f(hi) < 0 and hi < 1e6:
        hi *= 4.0
    ncp = float(optimize.brentq(f, 0.0, hi, xtol=1e-7)) if f(0.0) < 0 else 0.0
    _NCP_CACHE[key] = ncp
    return ncp


def _pp_under_power(study: Dict[str, Any], target_power: float, alpha: float = ALPHA) -> float:
    """pp-value of a study under the alternative with the given target power."""
    ncp = _ncp_for_power(study, target_power, alpha)
    pp = _pvalue_cdf_under_ncp(study, ncp, study["p"]) / target_power
    return float(np.clip(pp, 1e-12, 1 - 1e-12))


def half_test_stouffer(studies: List[Dict[str, Any]], alpha: float = ALPHA) -> Dict[str, Any]:
    """Half-curve right-skew test: Stouffer on pp = p/.025 for the p < .025 subset."""
    sub = [s for s in studies if 0 < s["p"] < alpha / 2.0]
    n_below = len(sub)
    n_total = len(studies)
    if n_below == 0:
        return {
            "z": 0.0, "p": 1.0, "significant": False,
            "n_below": 0, "n_total": n_total, "prop": 0.0,
            "test_name": "Half-curve right-skew test",
        }
    pp = [s["p"] / (alpha / 2.0) for s in sub]
    res = stouffer_test(pp, test_name="Half-curve right-skew test")
    res.update({"n_below": n_below, "n_total": n_total, "prop": float(n_below / n_total)})
    return res


def flat_test_33(studies: List[Dict[str, Any]], alpha: float = ALPHA) -> Dict[str, Any]:
    """
    Flat test: is the p-curve flatter than expected at 33% power (=> inadequate
    evidential value)? Stouffer over pp-values computed under 33% power; flatter
    curves push the pp-values toward 1 => Z positive => right-tail p small.

    Requires per-study test statistics. Returns ``available: False`` otherwise.
    """
    studies = [_coerce_record(s) for s in studies]
    if not studies or not all(_study_is_noncentral(s) for s in studies):
        return {
            "available": False,
            "significant": False,
            "reason": "The 33%-power flat test requires each study's test statistic "
                      "(t/F/chi2/z/r with df), not a bare p-value.",
            "test_name": "Flat test (vs 33% power)",
        }
    pp33 = [_pp_under_power(s, 1.0 / 3.0, alpha) for s in studies]
    z = float(np.sum([stats.norm.ppf(v) for v in pp33]) / np.sqrt(len(pp33)))
    p = float(stats.norm.sf(z))  # flatter than 33% (pp33 large) -> Z large + -> small p
    return {
        "available": True,
        "z": z,
        "p": p,
        "significant": p < 0.05,
        "test_name": "Flat test (vs 33% power)",
    }


def _ks_to_uniform(pp_sorted: np.ndarray) -> float:
    n = len(pp_sorted)
    ecdf = np.arange(1, n + 1) / n
    return float(np.max(np.abs(ecdf - pp_sorted)))


def estimate_power(
    studies: List[Dict[str, Any]],
    alpha: float = ALPHA,
    grid_size: int = 53,
    n_boot: int = 300,
) -> Tuple[Optional[float], Optional[Tuple[float, float]]]:
    """
    Estimate average statistical power by the loss-function method
    (Simonsohn, Simmons & Nelson 2014): find the power whose implied
    pp-value distribution is closest (min KS distance) to uniform. Bootstrap CI.

    Requires per-study test statistics; returns (None, None) otherwise or for
    fewer than 3 studies. Validated by simulation (recovers known power).
    """
    studies = [_coerce_record(s) for s in studies]
    if len(studies) < 3 or not all(_study_is_noncentral(s) for s in studies):
        return None, None

    grid = np.linspace(0.051, 0.99, grid_size)
    # pp_matrix[i, j] = pp of study i under power grid[j]
    pp_matrix = np.array([[_pp_under_power(s, g, alpha) for g in grid] for s in studies])

    def best_power(rows: np.ndarray) -> float:
        sub = pp_matrix[rows]
        losses = [_ks_to_uniform(np.sort(sub[:, j])) for j in range(len(grid))]
        return float(grid[int(np.argmin(losses))])

    n = len(studies)
    est = best_power(np.arange(n))

    # Deterministic bootstrap so identical inputs yield an identical CI
    # (reproducibility: a re-run of the same analysis must not move the CI).
    rng = np.random.RandomState(20140101)
    boot = np.array([best_power(rng.randint(0, n, n)) for _ in range(n_boot)])
    ci = (float(np.percentile(boot, 2.5)), float(np.percentile(boot, 97.5)))
    return est, ci


def expected_pcurve_props(
    studies: Optional[List[Dict[str, Any]]],
    power: float,
    alpha: float = ALPHA,
) -> List[float]:
    """
    Expected proportion of significant p-values in each of the five p-curve
    bins (.00-.01, ..., .04-.05) at a given power, averaged over the studies'
    test statistics. df-dependent; falls back to a representative df=40 t-test
    when no test statistics are available (clearly an approximation).
    """
    edges = [0.0, 0.01, 0.02, 0.03, 0.04, 0.05]
    if studies and all(_study_is_noncentral(s) for s in studies):
        ref = studies
    else:
        ref = [{"test_type": "t", "df1": 40.0, "p": 0.01}]  # representative

    props = np.zeros(5)
    for s in ref:
        ncp = _ncp_for_power(s, power, alpha)
        # cumulative F_p at each bin edge, normalized to the significant region
        cdf = [_pvalue_cdf_under_ncp(s, ncp, e) if e > 0 else 0.0 for e in edges]
        total = cdf[-1] if cdf[-1] > 0 else 1.0
        binned = [(cdf[i + 1] - cdf[i]) / total for i in range(5)]
        props += np.array(binned)
    props /= len(ref)
    return [float(x) for x in props]


# ---------------------------------------------------------------------------
# Top-level analysis
# ---------------------------------------------------------------------------

def _normalize_studies(p_values: List[float], studies: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Build internal study records {p, test_type, df1, df2, n} from inputs."""
    if studies:
        out = []
        for s in studies:
            p = s.get("p_value", s.get("p"))
            if p is None:
                continue
            out.append({
                "p": float(p),
                "test_type": str(s.get("test_type", "p")).lower(),
                "df1": s.get("df1"),
                "df2": s.get("df2"),
                "n": s.get("n"),
            })
        return out
    return [{"p": float(p), "test_type": "p", "df1": None, "df2": None, "n": None} for p in p_values]


def compute_pcurve(p_values: List[float], studies: Optional[List[Dict[str, Any]]] = None) -> PCurveResult:
    """
    Perform a complete p-curve analysis.

    Args:
        p_values: list of p-values (significant ones are selected). Backward
            compatible: when only this is given, the df-dependent flat test and
            power estimate are reported as unavailable.
        studies: optional per-study records carrying test statistics
            (keys: p_value/p, test_type, df1, df2, n). When provided for every
            study, the canonical df-aware flat test + average-power estimate run.

    Returns:
        PCurveResult
    """
    records = _normalize_studies(p_values, studies)
    sig = [r for r in records if 0 < r["p"] < ALPHA]
    sig_pvalues = [r["p"] for r in sig]
    n_studies = len(records)
    n_significant = len(sig)

    if n_significant < 3:
        return PCurveResult(
            n_studies=n_studies,
            n_significant=n_significant,
            p_values=sig_pvalues,
            right_skew_test={"z": 0, "p": 1.0, "significant": False,
                             "note": "Insufficient significant p-values for analysis"},
            flat_test={"available": False, "significant": False,
                       "reason": "Need at least 3 significant p-values."},
            half_test={"z": 0, "p": 1.0, "significant": False, "n_below": 0, "n_total": n_significant, "prop": 0},
            has_evidential_value=False,
            inadequate_evidence=False,
            interpretation="Insufficient data: need at least 3 significant p-values for p-curve analysis.",
            pp_values_full=[],
            pp_values_half=[],
            estimated_power=None,
            power_ci=None,
            histogram_bins=[0.01, 0.02, 0.03, 0.04, 0.05],
            histogram_counts=[0, 0, 0, 0, 0],
            expected_null=[n_significant / 5] * 5,
            expected_33=[n_significant / 5] * 5,
        )

    # PP-values (null) for the right-skew tests
    pp_values_full = compute_pp_values(sig_pvalues, use_half=False)
    pp_values_half = compute_pp_values(sig_pvalues, use_half=True)

    right_skew_test = stouffer_test(pp_values_full, test_name="Right-skew test for evidential value")
    half_test = half_test_stouffer(sig, alpha=ALPHA)
    flat_test = flat_test_33(sig, alpha=ALPHA)

    # Canonical combination rule (Simonsohn et al. 2014):
    # evidential value if the half curve is right-skewed (p < .05) OR both the
    # full and half curves are right-skewed at p < .10.
    full_sig = right_skew_test["p"] < 0.05
    half_sig = half_test["p"] < 0.05
    full_10 = right_skew_test["p"] < 0.10
    half_10 = half_test["p"] < 0.10
    has_evidential_value = bool(half_sig or (full_sig and half_10) or (full_10 and half_sig))

    # Inadequate evidence: flat test significant (curve flatter than 33% power)
    inadequate_evidence = bool(flat_test.get("available") and flat_test.get("significant"))

    estimated_power, power_ci = estimate_power(sig, alpha=ALPHA)

    prop_below_025 = sum(1 for p in sig_pvalues if p < 0.025) / n_significant
    interpretation = get_pcurve_interpretation(
        has_evidential_value, inadequate_evidence, estimated_power, n_significant, prop_below_025, flat_test
    )

    # Histogram (.00-.01, ..., .04-.05)
    bins = [0.01, 0.02, 0.03, 0.04, 0.05]
    bin_edges = [0, 0.01, 0.02, 0.03, 0.04, 0.05]
    counts = [sum(1 for p in sig_pvalues if bin_edges[i] < p <= bin_edges[i + 1]) for i in range(5)]

    expected_null = [n_significant / 5] * 5
    expected_33 = [n_significant * x for x in expected_pcurve_props(sig, 1.0 / 3.0, ALPHA)]

    return PCurveResult(
        n_studies=n_studies,
        n_significant=n_significant,
        p_values=sig_pvalues,
        right_skew_test=right_skew_test,
        flat_test=flat_test,
        half_test=half_test,
        has_evidential_value=has_evidential_value,
        inadequate_evidence=inadequate_evidence,
        interpretation=interpretation,
        pp_values_full=pp_values_full,
        pp_values_half=pp_values_half,
        estimated_power=estimated_power,
        power_ci=power_ci,
        histogram_bins=bins,
        histogram_counts=counts,
        expected_null=expected_null,
        expected_33=expected_33,
    )


def get_pcurve_interpretation(
    has_evidential_value: bool,
    inadequate_evidence: bool,
    estimated_power: Optional[float],
    n_significant: int,
    prop_below_025: float,
    flat_test: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate a human-readable interpretation of the p-curve result."""
    interpretation = f"P-Curve Analysis of {n_significant} significant results:\n\n"
    interpretation += f"P-curve shape: {prop_below_025*100:.1f}% of p-values are below .025"
    if prop_below_025 > 0.5:
        interpretation += " (right-skewed)\n"
    elif prop_below_025 < 0.33:
        interpretation += " (flat or left-skewed)\n"
    else:
        interpretation += " (moderately skewed)\n"

    if has_evidential_value:
        interpretation += (
            "\nConclusion: The p-curve is significantly right-skewed, indicating that the "
            "studies contain evidential value. The observed pattern of p-values is unlikely "
            "to have arisen from selective reporting or p-hacking alone.\n"
        )
    elif inadequate_evidence:
        interpretation += (
            "\nConclusion: The p-curve is flatter than would be expected even at 33% power, "
            "suggesting the evidence is inadequate. This pattern is consistent with low power, "
            "p-hacking, or selective reporting.\n"
        )
    else:
        interpretation += (
            "\nConclusion: The p-curve analysis is inconclusive -- neither significant evidence "
            "of evidential value nor a curve flat enough to indicate inadequate evidence.\n"
        )

    if estimated_power is not None:
        interpretation += f"\nEstimated average power: {estimated_power*100:.0f}%\n"
        if estimated_power < 0.5:
            interpretation += "This suggests the studies may be underpowered.\n"
        elif estimated_power >= 0.8:
            interpretation += "This suggests adequate statistical power.\n"
    elif flat_test is not None and not flat_test.get("available", True):
        interpretation += (
            "\nAverage power and the 33%-power flat test were not computed: they require each "
            "study's test statistic (e.g. t(48)=2.1), not a bare p-value.\n"
        )

    interpretation += "\nRecommendations:\n"
    if has_evidential_value:
        interpretation += "- The findings appear robust to publication-bias concerns.\n"
    else:
        interpretation += "- Consider the possibility of publication bias.\n"
        interpretation += "- Look for additional unpublished studies.\n"
        interpretation += "- Interpret effect-size estimates cautiously.\n"

    return interpretation
