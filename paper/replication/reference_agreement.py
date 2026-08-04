#!/usr/bin/env python3
"""
Per-test agreement between StickForStats' OWN code paths and reference implementations.

Why this script exists
----------------------
The manuscript's validation table used to claim per-test agreement of the form
"Exact (14 digits)" / "Exact (16 digits)" / "Exact (10 digits)". No script in this
repository computed any of those numbers, and `validate_against_R.R` compares R against
HARD-CODED SciPy constants -- it never exercises StickForStats' code at all. This script
replaces those unsourced claims with measured ones.

What it measures
----------------
For each of the ten rows of the manuscript's validation table it

  1. POSTs a fixed dataset to the REAL production endpoint (Django test client, in-process,
     same URLconf, serializers, services and cache decorators that the deployed server uses),
  2. computes the same statistic with the reference implementation (SciPy / statsmodels /
     R `metafor` via Rscript),
  3. reports the StickForStats value, the reference value, the absolute difference, the
     relative difference, the number of AGREEING SIGNIFICANT DECIMAL DIGITS, and the
     distance in float64 ULPs between the two,
  4. states whether the StickForStats code path COMPUTES the statistic itself (independent
     Decimal / mpmath arithmetic) or DELEGATES to the reference library, in which case
     agreement is exact by construction and a digit count is meaningless.

Reading the digit counts honestly
---------------------------------
StickForStats returns 50-significant-digit Decimal values. The references return IEEE-754
binary64, which carries at most 53 bits ~= 15.95 significant decimal digits. So the
agreement measured here can never exceed ~16 digits, and a measured value at that ceiling
means the double nearest StickForStats' 50-digit answer IS the reference double
(ULP distance 0) -- i.e. the reference is the less accurate of the two numbers and there
is nothing further to measure with it. "Exact to N digits" for N > 16 would be
meaningless; N < 16 is a real, measurable shortfall.

Data
----
* Fisher's Iris -- `sklearn.datasets.load_iris()` (bundled with scikit-learn; the UCI copy).
* UCI Wine Quality, red -- `paper/replication/data/winequality-red.csv` (1,599 rows).
* IV-magnesium meta-analysis -- `paper/replication/data/iv_magnesium_meta_analysis.csv`
  (16 trials, Egger 1997 / Sterne 2001; `metafor::dat.egger2001`).

There is no randomness anywhere in this script: every input is a fixed, shipped dataset and
every row is deterministic. A seed is still set and printed so that the claim "no random
draw influences any number below" is checkable rather than asserted.

Usage
-----
    cd <repo root>
    .venv-django/bin/python paper/replication/reference_agreement.py

Exit status is 0 if every row was measured, 1 if any row could not be measured.
"""

from __future__ import annotations

import csv
import json
import math
import os
import platform
import struct
import subprocess
import sys
import tempfile
from decimal import Decimal, getcontext
from fractions import Fraction

# --------------------------------------------------------------------------------------
# Provenance: seed, paths, versions
# --------------------------------------------------------------------------------------

SEED = 20260804

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
BACKEND = os.path.join(REPO, "backend")
DATA = os.path.join(HERE, "data")

getcontext().prec = 80

sys.path.insert(0, BACKEND)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
# The Django test client speaks to host "testserver"; the production settings' ALLOWED_HOSTS
# does not include it, and SECURE_SSL_REDIRECT 301s plain HTTP (hence secure=True below).
os.environ["DJANGO_ALLOWED_HOSTS"] = "testserver,localhost,127.0.0.1"

import numpy as np  # noqa: E402
import scipy  # noqa: E402
import statsmodels  # noqa: E402
import statsmodels.api as sm  # noqa: E402
import sklearn  # noqa: E402
from scipy import stats  # noqa: E402
from sklearn.datasets import load_iris  # noqa: E402

np.random.seed(SEED)

import django  # noqa: E402

django.setup()
from django.test import Client  # noqa: E402

RSCRIPT = "/usr/local/bin/Rscript"

CLIENT = Client()


def post(url: str, payload: dict) -> dict:
    """POST to a real StickForStats endpoint and return the parsed JSON body."""
    resp = CLIENT.post(url, data=json.dumps(payload), content_type="application/json", secure=True)
    if resp.status_code != 200:
        raise RuntimeError(f"{url} -> HTTP {resp.status_code}: {resp.content[:400]!r}")
    return resp.json()


# --------------------------------------------------------------------------------------
# Agreement metrics
# --------------------------------------------------------------------------------------


def _f2i(x: float) -> int:
    """Order-preserving integer image of a float64, for ULP arithmetic."""
    (n,) = struct.unpack("<q", struct.pack("<d", x))
    return n if n >= 0 else -(n & 0x7FFFFFFFFFFFFFFF) - (1 << 63)


def ulp_distance(a: float, b: float) -> int:
    """Number of representable float64 values strictly between a and b (0 == identical)."""
    if math.isnan(a) or math.isnan(b):
        return -1
    return abs(_f2i(a) - _f2i(b))


class Agreement:
    """Measured agreement between one high-precision value and one float64 reference."""

    def __init__(self, label: str, sfs_repr: str, ref: float, sfs_is_float: bool = False):
        self.label = label
        self.sfs_repr = sfs_repr
        self.ref = float(ref)
        # sfs_is_float=True means the endpoint returned a JSON float, not a 50-digit string:
        # convert it to Decimal EXACTLY (via the double) so that repr rounding is not
        # mistaken for a difference between the two implementations.
        self.sfs = Decimal(float(sfs_repr)) if sfs_is_float else Decimal(sfs_repr)
        # Decimal(float) is EXACT: it is the binary64 value the reference actually holds,
        # not its shortest printable form. So `absdiff` is the true distance between our
        # 50-digit answer and the number the reference library returned.
        self.ref_exact = Decimal(self.ref)
        self.absdiff = abs(self.sfs - self.ref_exact)
        self.reldiff = (self.absdiff / abs(self.ref_exact)) if self.ref_exact != 0 else None
        self.ulps = ulp_distance(float(self.sfs), self.ref)
        if self.absdiff == 0 or self.reldiff is None:
            self.sig_digits = math.inf  # identical to the last bit of the reference
        else:
            self.sig_digits = -math.log10(float(self.reldiff))
        self.dp = self._decimal_places()

    def _decimal_places(self) -> int:
        """Largest d such that both values round to the same number at d decimal places.

        This is the metric the manuscript's meta-analysis row speaks in ("N decimal
        places"), so it is measured rather than asserted. Capped at 17.
        """
        best = 0
        for d in range(0, 18):
            q = Decimal(1).scaleb(-d)
            if self.sfs.quantize(q) == self.ref_exact.quantize(q):
                best = d
            else:
                break
        return best

    def digits_str(self) -> str:
        if self.absdiff == 0:
            return "identical (diff exactly 0)"
        return f"{self.sig_digits:.2f}"

    def line(self) -> str:
        return (
            f"      {self.label}\n"
            f"        StickForStats : {self.sfs_repr}\n"
            f"        reference     : {self.ref!r}\n"
            f"        |difference|  : {'0 (exactly)' if self.absdiff == 0 else format(self.absdiff, '.6E')}\n"
            f"        relative diff : {('0' if self.reldiff == 0 else format(self.reldiff, '.6E')) if self.reldiff is not None else 'n/a'}\n"
            f"        agreeing significant digits : {self.digits_str()}\n"
            f"        agreeing decimal places     : {self.dp}\n"
            f"        float64 ULP distance        : {self.ulps}"
        )


class Row:
    """One row of the manuscript validation table."""

    def __init__(self, name, metric, reference, code_path, delegated, dataset, agreements, notes=""):
        self.name = name
        self.metric = metric
        self.reference = reference
        self.code_path = code_path
        self.delegated = delegated  # True == StickForStats calls the reference library itself
        self.dataset = dataset
        self.agreements = agreements
        self.notes = notes

    @property
    def worst(self) -> Agreement:
        return min(self.agreements, key=lambda a: a.sig_digits)

    def report(self) -> str:
        kind = (
            "DELEGATED to the reference library -- agreement is exact by construction"
            if self.delegated
            else "COMPUTED independently by StickForStats (own Decimal/mpmath arithmetic)"
        )
        out = [
            f"[{self.name}]  metric: {self.metric}   reference: {self.reference}",
            f"    dataset   : {self.dataset}",
            f"    code path : {self.code_path}",
            f"    provenance: {kind}",
        ]
        out += [a.line() for a in self.agreements]
        if len(self.agreements) > 1:
            out.append(f"      WORST of {len(self.agreements)} quantities: {self.worst.label} -> {self.worst.digits_str()} digits")
        if self.notes:
            out.append(f"    note      : {self.notes}")
        return "\n".join(out)


# --------------------------------------------------------------------------------------
# Fixed datasets
# --------------------------------------------------------------------------------------


def iris_arrays():
    d = load_iris()
    return d.data, d.target


def wine_red():
    path = os.path.join(DATA, "winequality-red.csv")
    with open(path, newline="") as fh:
        rows = list(csv.DictReader(fh, delimiter=";"))
    cols = {k: np.array([float(r[k]) for r in rows]) for k in rows[0]}
    return cols, rows


def check_iris_provenance() -> str:
    """Verify that sklearn's bundled Iris IS the same 150x4 matrix R ships as datasets::iris.

    "Fisher's Iris" is a provenance claim, and the UCI copy historically carried two
    transcription errors (rows 35 and 38) relative to Fisher's paper. Rather than assert
    which copy sklearn ships, dump R's datasets::iris and diff it.
    """
    src = "write.csv(datasets::iris[,1:4], row.names=FALSE)"
    try:
        out = subprocess.run(
            [RSCRIPT, "-e", src], capture_output=True, text=True, check=True
        ).stdout
    except Exception as exc:  # pragma: no cover - environment dependent
        return f"iris provenance: UNCHECKED (Rscript unavailable: {exc})"
    r_rows = [line.split(",") for line in out.strip().splitlines()[1:]]
    r_mat = np.array([[float(v) for v in row] for row in r_rows])
    sk_mat = load_iris().data
    if r_mat.shape != sk_mat.shape:
        return f"iris provenance: SHAPE MISMATCH sklearn{sk_mat.shape} vs R{r_mat.shape}"
    maxdiff = float(np.max(np.abs(r_mat - sk_mat)))
    return (
        f"iris provenance: sklearn.load_iris() vs R datasets::iris, "
        f"shape {sk_mat.shape}, max |difference| over all 600 cells = {maxdiff:g}"
    )


def magnesium_studies():
    path = os.path.join(DATA, "iv_magnesium_meta_analysis.csv")
    with open(path, newline="") as fh:
        rows = list(csv.DictReader(fh))
    return rows


# --------------------------------------------------------------------------------------
# The ten rows
# --------------------------------------------------------------------------------------


def row_ttest_independent():
    X, y = iris_arrays()
    a = X[y == 0, 0].tolist()  # setosa sepal length, n=50
    b = X[y == 1, 0].tolist()  # versicolor sepal length, n=50
    body = post(
        "/api/v1/stats/ttest/",
        {
            "test_type": "two_sample",
            "data1": a,
            "data2": b,
            "parameters": {"equal_var": True},
            "options": {"compare_standard": False, "check_assumptions": False},
        },
    )
    sfs = body["high_precision_result"]["t_statistic"]
    ref = stats.ttest_ind(a, b, equal_var=True).statistic
    return Row(
        "t-test (independent)",
        "t-statistic",
        "scipy.stats.ttest_ind(equal_var=True)",
        "POST /api/v1/stats/ttest/ -> HighPrecisionCalculator.t_statistic_two_sample "
        "(backend/core/high_precision_calculator.py:275)",
        False,
        "Iris sepal length, setosa (n=50) vs versicolor (n=50)",
        [Agreement("t", sfs, ref)],
    )


def row_ttest_paired():
    X, y = iris_arrays()
    a = X[y == 0, 0].tolist()  # setosa sepal length
    b = X[y == 0, 2].tolist()  # setosa petal length (same 50 flowers)
    body = post(
        "/api/v1/stats/ttest/",
        {
            "test_type": "paired",
            "data1": a,
            "data2": b,
            "options": {"compare_standard": False, "check_assumptions": False},
        },
    )
    sfs = body["high_precision_result"]["t_statistic"]
    ref = stats.ttest_rel(a, b).statistic
    return Row(
        "t-test (paired)",
        "t-statistic",
        "scipy.stats.ttest_rel",
        "POST /api/v1/stats/ttest/ (test_type=paired; differences formed at "
        "backend/api/v1/views.py:189) -> HighPrecisionCalculator.t_statistic_one_sample "
        "(backend/core/high_precision_calculator.py:222)",
        False,
        "Iris setosa, sepal length vs petal length on the same 50 flowers",
        [Agreement("t", sfs, ref)],
    )


def row_anova():
    X, y = iris_arrays()
    groups = [X[y == k, 0].tolist() for k in (0, 1, 2)]
    body = post(
        "/api/v1/stats/anova/",
        {
            "anova_type": "one_way",
            "groups": groups,
            "options": {
                "check_assumptions": False,
                "compare_standard": False,
                "generate_visualizations": False,
                "calculate_effect_sizes": False,
            },
        },
    )
    sfs = body["high_precision_result"]["f_statistic"]
    ref = stats.f_oneway(*groups).statistic
    return Row(
        "ANOVA (one-way)",
        "F-statistic",
        "scipy.stats.f_oneway",
        "POST /api/v1/stats/anova/ -> HighPrecisionANOVA.one_way_anova "
        "(backend/core/hp_anova_comprehensive.py:200)",
        False,
        "Iris sepal length by species (3 groups of 50)",
        [Agreement("F", sfs, ref)],
    )


def row_pearson(cols, n):
    x, ycol = cols["alcohol"].tolist(), cols["quality"].tolist()
    body = post("/api/v1/stats/correlation/", {"x": x, "y": ycol, "method": "pearson"})
    sfs = body["high_precision_result"]["correlation_coefficient"]
    ref = stats.pearsonr(x, ycol).statistic
    return Row(
        "Pearson correlation",
        "r",
        "scipy.stats.pearsonr",
        "POST /api/v1/stats/correlation/ -> HighPrecisionCorrelation.pearson_correlation "
        "(backend/core/hp_correlation_comprehensive.py:356)",
        False,
        f"Wine Quality (red), alcohol vs quality (n={n})",
        [Agreement("r", sfs, ref)],
    )


def row_spearman(cols, n):
    x, ycol = cols["alcohol"].tolist(), cols["quality"].tolist()
    body = post("/api/v1/stats/correlation/", {"x": x, "y": ycol, "method": "spearman"})
    sfs = body["high_precision_result"]["correlation_coefficient"]
    ref = stats.spearmanr(x, ycol).statistic
    return Row(
        "Spearman correlation",
        "rho",
        "scipy.stats.spearmanr",
        "POST /api/v1/stats/correlation/ -> HighPrecisionCorrelation.spearman_correlation "
        "(backend/core/hp_correlation_comprehensive.py:461; own midrank routine at :647, then "
        "its own Decimal Pearson on the ranks)",
        False,
        f"Wine Quality (red), alcohol vs quality (n={n}, heavily tied)",
        [Agreement("rho", sfs, ref)],
        notes="NOT a SciPy passthrough: ranks and r are both computed in Decimal in-house.",
    )


def row_chi_square(cols, n):
    quality = cols["quality"]
    alcohol = cols["alcohol"]
    qcls = np.digitize(quality, [6, 7])  # 0: quality<=5, 1: ==6, 2: >=7
    q33, q66 = np.quantile(alcohol, [1 / 3, 2 / 3])
    acls = np.digitize(alcohol, [q33, q66])  # alcohol terciles
    table = [[int(np.sum((qcls == i) & (acls == j))) for j in range(3)] for i in range(3)]
    body = post(
        "/api/v1/categorical/chi-square/independence/",
        {"contingency_table": table, "correction": False},
    )
    sfs = body["results"]["test_statistic"]
    ref = stats.chi2_contingency(np.array(table), correction=False).statistic
    return Row(
        "Chi-square test",
        "chi-squared",
        "scipy.stats.chi2_contingency(correction=False)",
        "POST /api/v1/categorical/chi-square/independence/ -> "
        "HighPrecisionCategorical.chi_square_independence "
        "(backend/core/hp_categorical_comprehensive.py:181)",
        False,
        f"Wine Quality (red) 3x3: quality class x alcohol tercile, table={table} (n={n})",
        [Agreement("chi2", sfs, ref)],
        notes="The STATISTIC is computed in Decimal in-house; only the p-value is delegated "
        "to scipy.stats.chi2.sf (backend/core/hp_categorical_comprehensive.py:243).",
    )


def row_mann_whitney():
    X, y = iris_arrays()
    a = X[y == 0, 0].tolist()
    b = X[y == 1, 0].tolist()
    body = post(
        "/api/v1/nonparametric/mann-whitney/",
        {"group1": a, "group2": b, "alternative": "two-sided"},
    )
    sfs = body["high_precision_result"]["u_statistic"]
    ref = stats.mannwhitneyu(a, b, alternative="two-sided").statistic
    return Row(
        "Mann-Whitney U",
        "U-statistic",
        "scipy.stats.mannwhitneyu",
        "POST /api/v1/nonparametric/mann-whitney/ -> HighPrecisionNonParametric.mann_whitney_u "
        "(backend/core/hp_nonparametric_comprehensive.py:311)",
        False,
        "Iris sepal length, setosa (n=50) vs versicolor (n=50)",
        [Agreement("U", sfs, ref)],
        notes="U is a half-integer here (ties), exactly representable, so the difference is "
        "exactly zero rather than merely small. The p-value IS delegated to scipy "
        "(backend/core/hp_nonparametric_comprehensive.py:404).",
    )


def row_shapiro():
    X, y = iris_arrays()
    a = X[y == 0, 0].tolist()
    body = post("/api/v1/stats/normality/", {"data": a})
    sw = [t for t in body["tests"] if t["name"] == "Shapiro-Wilk"][0]
    sfs = repr(sw["statistic"])
    ref = stats.shapiro(a).statistic
    ag = Agreement("W", sfs, ref, sfs_is_float=True)
    return Row(
        "Shapiro-Wilk",
        "W-statistic",
        "scipy.stats.shapiro",
        "POST /api/v1/stats/normality/ -> scipy.stats.shapiro "
        "(backend/api/v1/normality_view.py:106; the Guardian's normality validator likewise "
        "at backend/core/guardian/guardian_core.py:1067)",
        True,
        "Iris setosa sepal length (n=50)",
        [ag],
        notes="PASSTHROUGH. StickForStats calls scipy.stats.shapiro and returns its float. "
        "Agreement is bit-identical BY CONSTRUCTION; any digit count is unexplainable.",
    )


REG_PREDICTORS = ["alcohol", "volatile acidity", "sulphates"]


def exact_rational_ols(rows):
    """The EXACT least-squares solution for the regression row, in rational arithmetic.

    Every value in winequality-red.csv is a terminating decimal, so X and y are exactly
    representable as Fractions; the 4x4 normal equations can then be solved with zero
    rounding error by Gaussian elimination over the rationals. This adjudicates the
    regression row: it says which of the two float answers -- StickForStats' 50-digit
    mpmath one or statsmodels' float64 one -- is actually closer to the truth, instead of
    assuming the reference is right because it is the reference.
    """
    Xr = [[Fraction(1)] + [Fraction(r[c]) for c in REG_PREDICTORS] for r in rows]
    yr = [Fraction(r["quality"]) for r in rows]
    p = 1 + len(REG_PREDICTORS)
    XtX = [[sum(Xr[i][a] * Xr[i][b] for i in range(len(Xr))) for b in range(p)] for a in range(p)]
    Xty = [sum(Xr[i][a] * yr[i] for i in range(len(Xr))) for a in range(p)]
    M = [XtX[a][:] + [Xty[a]] for a in range(p)]
    for c in range(p):
        piv = next(r for r in range(c, p) if M[r][c] != 0)
        M[c], M[piv] = M[piv], M[c]
        pv = M[c][c]
        M[c] = [v / pv for v in M[c]]
        for r in range(p):
            if r != c and M[r][c] != 0:
                f = M[r][c]
                M[r] = [x - f * z for x, z in zip(M[r], M[c])]
    return [Decimal(M[a][p].numerator) / Decimal(M[a][p].denominator) for a in range(p)]


def report_regression_adjudication(rows, sfs_strs, sm_params):
    """Print, per coefficient, how far StickForStats and statsmodels are from exact truth."""
    exact = exact_rational_ols(rows)
    names = ["intercept", "beta_alcohol", "beta_volatile_acidity", "beta_sulphates"]
    print("[Linear regression -- adjudicated against the EXACT rational OLS solution]")
    print("    (winequality-red.csv holds terminating decimals, so the normal equations can")
    print("     be solved with Fractions at zero rounding error; 4x4 system, n = %d)" % len(rows))
    for nm, ex, s, ref in zip(names, exact, sfs_strs, sm_params):
        d_sfs = abs(Decimal(s) - ex)
        d_ref = abs(Decimal(float(ref)) - ex)
        dig_sfs = -math.log10(float(d_sfs / abs(ex))) if d_sfs else math.inf
        dig_ref = -math.log10(float(d_ref / abs(ex))) if d_ref else math.inf
        print(f"      {nm}")
        print(f"        exact (rational)      : {ex}")
        print(f"        |StickForStats-exact| : {d_sfs:.3E}   -> {dig_sfs:.2f} significant digits correct")
        print(f"        |statsmodels  -exact| : {d_ref:.3E}   -> {dig_ref:.2f} significant digits correct")
    print()


def row_regression(cols, n):
    Xm = np.column_stack([cols[c] for c in REG_PREDICTORS])
    yv = cols["quality"]
    body = post(
        "/api/v1/stats/regression/",
        {
            "type": "multiple_linear",
            "X": Xm.tolist(),
            "y": yv.tolist(),
            "options": {
                "include_diagnostics": False,
                "include_visualization": False,
                "compare_with_standard": False,
            },
        },
    )
    ols = sm.OLS(yv, sm.add_constant(Xm)).fit()
    sfs_strs = [body["intercept"]] + [body["coefficients"][k] for k in ("X1", "X2", "X3")]
    ags = [
        Agreement("intercept", sfs_strs[0], ols.params[0]),
        Agreement("beta_alcohol", sfs_strs[1], ols.params[1]),
        Agreement("beta_volatile_acidity", sfs_strs[2], ols.params[2]),
        Agreement("beta_sulphates", sfs_strs[3], ols.params[3]),
        Agreement("r_squared", body["metrics"]["r_squared"], ols.rsquared),
    ]
    row = Row(
        "Linear regression",
        "coefficients (and R^2)",
        "statsmodels.api.OLS",
        "POST /api/v1/stats/regression/ -> HighPrecisionRegression.linear_regression "
        "(backend/core/hp_regression_comprehensive.py:151; mpmath normal equations, own "
        "matrix inverse at :870)",
        False,
        f"Wine Quality (red): quality ~ alcohol + volatile acidity + sulphates (n={n})",
        ags,
        notes="statsmodels solves by pinv on float64; StickForStats solves the normal "
        "equations in 50-digit mpmath. Which of the two is wrong is settled below, against "
        "the exact rational solution -- not assumed.",
    )
    row.reg_payload = (sfs_strs, [ols.params[i] for i in range(4)])
    return row


def _rscript_metafor(use_se_squared: bool):
    """Run R metafor rma(method='DL') on the shipped CSV; return dict of float values."""
    vi = "d$se^2" if use_se_squared else "d$variance"
    src = f"""
suppressPackageStartupMessages(library(metafor))
d <- read.csv({json.dumps(os.path.join(DATA, 'iv_magnesium_meta_analysis.csv'))})
res <- rma(yi = d$log_or, vi = {vi}, method = "DL")
eg  <- regtest(res, model = "lm", predictor = "sei")
cat(sprintf("R_version=%s\\n", R.version.string))
cat(sprintf("metafor=%s\\n", as.character(packageVersion("metafor"))))
cat(sprintf("pooled=%.17g\\n", res$beta[1]))
cat(sprintf("se=%.17g\\n", res$se))
cat(sprintf("ci_lb=%.17g\\n", res$ci.lb))
cat(sprintf("ci_ub=%.17g\\n", res$ci.ub))
cat(sprintf("tau2=%.17g\\n", res$tau2))
cat(sprintf("I2=%.17g\\n", res$I2))
cat(sprintf("Q=%.17g\\n", res$QE))
cat(sprintf("Q_p=%.17g\\n", res$QEp))
cat(sprintf("egger_t=%.17g\\n", eg$zval))
cat(sprintf("egger_p=%.17g\\n", eg$pval))
cat(sprintf("k=%d\\n", res$k))
"""
    with tempfile.NamedTemporaryFile("w", suffix=".R", delete=False) as fh:
        fh.write(src)
        path = fh.name
    try:
        out = subprocess.run([RSCRIPT, path], capture_output=True, text=True, check=True).stdout
    finally:
        os.unlink(path)
    d = {}
    for line in out.strip().splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            d[k] = v
    return d


def rows_meta():
    """Two rows: the CSV as shipped, and the same CSV with inputs made identical."""
    rows = magnesium_studies()
    studies = [
        {
            "study_name": f"{r['author']} {r['year']}",
            "effect_size": float(r["log_or"]),
            "standard_error": float(r["se"]),
        }
        for r in rows
    ]
    body = post(
        "/api/v1/meta-analysis/",
        {"studies": studies, "model": "random", "method": "DL", "alpha": 0.05},
    )
    het = body["heterogeneity"]
    # keys are the names emitted by the R helper below
    sfs_vals = {
        "pooled": body["pooled_effect"],
        "se": body["pooled_se"],
        "ci_lb": body["pooled_ci"][0],
        "ci_ub": body["pooled_ci"][1],
        "tau2": het["tau_squared"],
        "I2": het["i_squared"],
        "Q": het["q"],
        "egger_t": body["publication_bias"]["eggers_test"]["t_statistic"],
    }

    out = []
    for use_sq, label, note in (
        (
            True,
            "Meta-analysis (identical inputs)",
            "R is given vi = se^2, i.e. EXACTLY the standard errors StickForStats was given. "
            "This isolates the algorithms from the data file.",
        ),
        (
            False,
            "Meta-analysis (CSV as shipped)",
            "R is given the CSV's own `variance` column while StickForStats is given the CSV's "
            "`se` column. Both columns are rounded to 6 decimals in the CSV and se^2 != variance "
            "at that rounding, so this row measures the CSV's rounding, not the two engines.",
        ),
    ):
        r = _rscript_metafor(use_sq)
        ags = [
            Agreement(k, repr(sfs_vals[k]), float(r[k]), sfs_is_float=True) for k in sfs_vals
        ]
        out.append(
            Row(
                label,
                "pooled log OR (+ SE, CI, tau^2, I^2, Q, Egger t)",
                f"R {r['R_version']} / metafor {r['metafor']}, rma(method='DL')",
                "POST /api/v1/meta-analysis/ -> MetaAnalysisEngine.analyze "
                "(backend/core/meta_analysis.py:81; DerSimonian-Laird at :240, random-effects "
                "pooling at :182 -- numpy float64, not Decimal)",
                False,
                f"IV magnesium, k={r['k']} trials (Egger 1997 / Sterne 2001)",
                ags,
                notes=note,
            )
        )
    return out


# --------------------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------------------


def main() -> int:
    print("=" * 100)
    print("StickForStats -- per-test agreement against reference implementations")
    print("=" * 100)
    print(f"seed (set, though every input below is a fixed dataset and nothing is drawn): {SEED}")
    print(f"python      : {platform.python_version()}  ({sys.executable})")
    print(f"numpy       : {np.__version__}")
    print(f"scipy       : {scipy.__version__}")
    print(f"statsmodels : {statsmodels.__version__}")
    print(f"scikit-learn: {sklearn.__version__}   (source of Fisher's Iris)")
    print(f"django      : {django.get_version()}")
    try:
        rv = subprocess.run(
            [RSCRIPT, "-e", 'cat(R.version.string, as.character(packageVersion("metafor")))'],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        print(f"R / metafor : {rv}")
    except Exception as exc:  # pragma: no cover - environment dependent
        print(f"R / metafor : UNAVAILABLE ({exc})")
    print()
    print("float64 reference ceiling: 53-bit mantissa = 15.95 significant decimal digits.")
    print("No agreement measured against a float64 reference can exceed that; a measured")
    print("value at the ceiling with ULP distance 0 means the reference double IS the double")
    print("nearest StickForStats' 50-digit answer.")
    print()

    print(check_iris_provenance())
    print()

    cols, wine_rows = wine_red()
    n_wine = len(wine_rows)

    builders = [
        row_ttest_independent,
        row_ttest_paired,
        row_anova,
        lambda: row_pearson(cols, n_wine),
        lambda: row_spearman(cols, n_wine),
        lambda: row_chi_square(cols, n_wine),
        row_mann_whitney,
        row_shapiro,
        lambda: row_regression(cols, n_wine),
    ]

    measured = []
    failures = []
    for b in builders:
        try:
            r = b()
        except Exception as exc:
            failures.append(f"{getattr(b, '__name__', b)}: {exc}")
            print(f"!! FAILED: {getattr(b, '__name__', b)}: {exc}\n")
            continue
        measured.append(r)
        print(r.report())
        print()
        if getattr(r, "reg_payload", None) is not None:
            sfs_strs, sm_params = r.reg_payload
            report_regression_adjudication(wine_rows, sfs_strs, sm_params)

    try:
        for r in rows_meta():
            measured.append(r)
            print(r.report())
            print()
    except Exception as exc:
        failures.append(f"rows_meta: {exc}")
        print(f"!! FAILED: rows_meta: {exc}\n")

    # ---------------- markdown summary ----------------
    print("=" * 100)
    print("MEASURED SUMMARY (markdown)")
    print("=" * 100)
    print()
    print("| Test | Metric | Reference | Own code or delegated? | Measured agreement |")
    print("|---|---|---|---|---|")
    for r in measured:
        w = r.worst
        if r.delegated:
            # The "by construction" part is a statement about the code; the parenthesis is
            # the MEASUREMENT, printed so that the claim is checkable and so that a code
            # change which stopped delegating would show up here instead of being hidden
            # behind the label.
            if w.absdiff == 0:
                agree = "bit-identical by construction (measured: difference exactly 0, 0 ULP)"
            else:
                agree = (
                    f"LABELLED delegated BUT MEASURED DIFFERENT: {w.sig_digits:.1f} digits, "
                    f"{w.ulps} ULP -- investigate"
                )
        elif w.absdiff == 0:
            agree = "bit-identical (difference exactly 0)"
        elif w.ulps == 0:
            agree = f"float64-identical, 0 ULP ({w.sig_digits:.1f} sig. digits)"
        else:
            agree = f"{w.sig_digits:.1f} significant digits ({w.ulps} ULP)"
        kind = "delegated" if r.delegated else "own"
        print(f"| {r.name} | {r.metric} | {r.reference} | {kind} | {agree} |")
    print()

    print("Per-quantity detail, every number printed above:")
    for r in measured:
        for a in r.agreements:
            ad = "0 (exactly)" if a.absdiff == 0 else format(a.absdiff, ".6E")
            print(
                f"  {r.name} :: {a.label} :: sfs={a.sfs_repr} ref={a.ref!r} "
                f"absdiff={ad} digits={a.digits_str()} dp={a.dp} ulps={a.ulps}"
            )
    print()

    if failures:
        print(f"FAILURES ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"All {len(measured)} rows measured.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
