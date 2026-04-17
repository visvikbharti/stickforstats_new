#!/usr/bin/env python3
"""
analyze.py — retraction-backtest primary + secondary analysis.

Implements the pre-committed analysis plan from paper/retraction_backtest/
PROTOCOL.md (§5-12). Reads the manifest produced by harvest.py and the per-
paper score file produced by score.py, joins them, and emits:

  reports/primary_analysis.csv      — AUC, 95% bootstrap CI, decision row
  reports/per_rule_table.csv        — one row per SQS rule (45 rules)
  reports/per_category_auc.csv      — six category subscore AUCs
  reports/calibration.csv           — SQS decile -> observed case rate + Brier
  reports/attrition_consort.csv     — CONSORT-style flow counts
  reports/PILOT_REPORT.md           — human-readable summary (pilot scope only)

Seed (from PROTOCOL §5): 20260417. All bootstraps and any tie-breaks use it.

Blinding (PROTOCOL §10.5): the AUC is computed from `sqs_score` and the
`class` column only. No other case/control-identifying columns touch the
scoring decision.

Pilot scope: this harness is written to produce the full analysis at any N.
When N is below the protocol's minimum viable (n_cases < 100, §8.4), the
report appends an UNDERPOWERED banner and refuses to emit a primary-endpoint
"claim" — only feasibility feedback.

Usage:
    python analyze.py \\
        --manifest data/manifest_v1.csv \\
        --scores data/scores_v1.csv \\
        --output reports/

Dependencies: pandas, numpy, scipy, statsmodels.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd
from scipy import stats

SEED = 20260417
BOOTSTRAP_REPLICATES = 2000
CATEGORIES = (
    "effect_sizes",
    "assumptions",
    "sample_power",
    "precision",
    "reproducibility",
    "guidelines",
)
MIN_VIABLE_CASES = 100
PRIMARY_AUC_FLOOR = 0.70
PRIMARY_CI_LOWER_FLOOR = 0.60
PARTIAL_AUC_FLOOR = 0.60


@dataclass(frozen=True)
class AUCResult:
    auc: float
    ci_lower: float
    ci_upper: float
    n_bootstrap_replicates: int
    n_cases: int
    n_controls: int


def mann_whitney_auc(case_scores: np.ndarray, ctrl_scores: np.ndarray) -> float:
    """AUC as rank statistic (Mann-Whitney U).

    Cases are the positive class; lower SQS is "more likely retracted", so
    we flip so that a larger "classifier score" means case-like. This matches
    the protocol's convention (§5): lower SQS -> higher classifier score ->
    positive.
    """
    if len(case_scores) == 0 or len(ctrl_scores) == 0:
        return float("nan")
    # Protocol: "lower SQS -> higher classifier score". We take -SQS as the
    # classifier output, then compute P(classifier(case) > classifier(control)).
    case_flipped = -case_scores
    ctrl_flipped = -ctrl_scores
    # Mann-Whitney style count of wins + 0.5 * ties.
    wins = 0.0
    for x in case_flipped:
        wins += (ctrl_flipped < x).sum() + 0.5 * (ctrl_flipped == x).sum()
    return float(wins / (len(case_flipped) * len(ctrl_flipped)))


def matched_cluster_bootstrap_auc(
    joined: pd.DataFrame,
    replicates: int = BOOTSTRAP_REPLICATES,
    seed: int = SEED,
) -> AUCResult:
    """Matched-cluster bootstrap 95% CI on the AUC.

    PROTOCOL §5: bootstrap unit is the matched cluster (one case + its two
    controls). This respects the matching structure; unit-level bootstrap
    would underestimate variance.

    We resample clusters with replacement, then compute AUC on the resampled
    set. The 2.5 / 97.5 percentiles of the bootstrap distribution form the
    CI. This is the percentile bootstrap; BCa refinements are a future
    extension (PROTOCOL §10.2 permits the DeLong-equivalent for the point
    estimate but the CI is the primary decision quantity).
    """
    rng = np.random.default_rng(seed)

    # Build cluster index: each case_id defines one cluster. A case whose
    # row's class == 'case' belongs to cluster record_id; its controls point
    # at the case via `case_id`.
    cases_df = joined[joined["class"] == "case"].copy()
    ctrls_df = joined[joined["class"] == "control"].copy()

    # Group controls by the case they were matched to.
    ctrl_by_case = {
        cid: g[["sqs_score"]].values.ravel()
        for cid, g in ctrls_df.groupby("case_id")
    }

    case_ids = cases_df["record_id"].tolist()
    case_scores_by_id = dict(zip(cases_df["record_id"], cases_df["sqs_score"]))

    clusters = [
        (cid, float(case_scores_by_id[cid]), ctrl_by_case.get(cid, np.array([])))
        for cid in case_ids
    ]
    clusters = [c for c in clusters if len(c[2]) > 0]

    if not clusters:
        return AUCResult(float("nan"), float("nan"), float("nan"), 0, 0, 0)

    point_case = np.array([c[1] for c in clusters])
    point_ctrl = np.concatenate([c[2] for c in clusters])
    point_auc = mann_whitney_auc(point_case, point_ctrl)

    boot_aucs = np.empty(replicates, dtype=np.float64)
    n_clusters = len(clusters)
    for b in range(replicates):
        idx = rng.integers(0, n_clusters, size=n_clusters)
        boot_case = np.array([clusters[i][1] for i in idx])
        boot_ctrl = np.concatenate([clusters[i][2] for i in idx])
        boot_aucs[b] = mann_whitney_auc(boot_case, boot_ctrl)

    lo, hi = np.nanpercentile(boot_aucs, [2.5, 97.5])
    return AUCResult(
        auc=float(point_auc),
        ci_lower=float(lo),
        ci_upper=float(hi),
        n_bootstrap_replicates=replicates,
        n_cases=int(len(point_case)),
        n_controls=int(len(point_ctrl)),
    )


def benjamini_hochberg(pvalues: np.ndarray, alpha: float = 0.05) -> np.ndarray:
    """Return a boolean mask of which null hypotheses are rejected at FDR=alpha.

    Standard BH (Benjamini & Hochberg, 1995). No dependencies on statsmodels
    so the pilot stays stdlib-light.
    """
    p = np.asarray(pvalues, dtype=np.float64)
    n = len(p)
    if n == 0:
        return np.array([], dtype=bool)
    order = np.argsort(p)
    ranked = p[order]
    thresholds = alpha * (np.arange(1, n + 1) / n)
    below = ranked <= thresholds
    # Largest k such that p_(k) <= alpha * k/n.
    if not below.any():
        reject_sorted = np.zeros(n, dtype=bool)
    else:
        k_star = np.max(np.where(below)[0])
        reject_sorted = np.zeros(n, dtype=bool)
        reject_sorted[: k_star + 1] = True
    reject = np.zeros(n, dtype=bool)
    reject[order] = reject_sorted
    return reject


def per_rule_analysis(joined: pd.DataFrame) -> pd.DataFrame:
    """For each rule (across all 45), one-sided Fisher exact test: rule failed
    more often in cases than in controls. BH-FDR corrected across the rule
    family (PROTOCOL §6.1 / §10.4).

    The rule universe is the UNION of every ID that ever appears in any of
    ``rules_hit``, ``rules_missed``, or ``rules_not_applicable``. Rules that
    are hit in every paper (and therefore never appear in ``rules_missed``)
    must still be counted so the multiple-testing family covers all 45 rules.
    """
    def _pipe_split(cell) -> list:
        if isinstance(cell, str) and cell:
            return [r for r in cell.split("|") if r]
        return []

    def _collect_universe(df: pd.DataFrame) -> list:
        ids = set()
        for col in ("rules_hit", "rules_missed", "rules_not_applicable"):
            if col not in df.columns:
                continue
            for cell in df[col].dropna():
                ids.update(_pipe_split(cell))
        return sorted(ids)

    def _to_mat(series: pd.Series, rule_ids: list) -> pd.DataFrame:
        mat = pd.DataFrame(0, index=series.index, columns=rule_ids, dtype=np.int8)
        for idx, cell in series.items():
            for r in _pipe_split(cell):
                if r in mat.columns:
                    mat.at[idx, r] = 1
        return mat

    rule_ids = _collect_universe(joined)
    missed = _to_mat(joined.get("rules_missed", pd.Series(dtype=object)), rule_ids)
    cases_mask = (joined["class"] == "case").values

    rows = []
    for rule_id in rule_ids:
        col = missed[rule_id].values if rule_id in missed.columns else np.zeros(
            len(joined), dtype=np.int8
        )
        case_fail = int(col[cases_mask].sum())
        ctrl_fail = int(col[~cases_mask].sum())
        n_case = int(cases_mask.sum())
        n_ctrl = int((~cases_mask).sum())
        case_pass = n_case - case_fail
        ctrl_pass = n_ctrl - ctrl_fail
        # Fisher one-sided: rule fails more in cases than controls.
        table = [[case_fail, ctrl_fail], [case_pass, ctrl_pass]]
        try:
            odds_ratio, pvalue = stats.fisher_exact(table, alternative="greater")
        except ValueError:
            odds_ratio, pvalue = float("nan"), 1.0
        rows.append(
            dict(
                rule_id=rule_id,
                case_fail=case_fail,
                case_pass=case_pass,
                ctrl_fail=ctrl_fail,
                ctrl_pass=ctrl_pass,
                case_fail_rate=case_fail / n_case if n_case else float("nan"),
                ctrl_fail_rate=ctrl_fail / n_ctrl if n_ctrl else float("nan"),
                odds_ratio=float(odds_ratio) if np.isfinite(odds_ratio) else float("nan"),
                p_value=float(pvalue),
            )
        )
    if not rows:
        return pd.DataFrame(
            columns=[
                "rule_id", "case_fail", "case_pass", "ctrl_fail", "ctrl_pass",
                "case_fail_rate", "ctrl_fail_rate", "odds_ratio", "p_value",
                "bh_fdr_reject",
            ]
        )
    df = pd.DataFrame(rows).sort_values("p_value").reset_index(drop=True)
    df["bh_fdr_reject"] = benjamini_hochberg(df["p_value"].values, alpha=0.05)
    return df


def per_category_auc(joined: pd.DataFrame) -> pd.DataFrame:
    """Per-category subscore AUC with a bootstrap CI (same seed as primary)."""
    rows = []
    for cat in CATEGORIES:
        col = f"cat_{cat}"
        if col not in joined.columns:
            continue
        cases = joined.loc[joined["class"] == "case", col].dropna().values
        ctrls = joined.loc[joined["class"] == "control", col].dropna().values
        if len(cases) == 0 or len(ctrls) == 0:
            rows.append(dict(category=cat, auc=float("nan"), n_cases=len(cases), n_controls=len(ctrls)))
            continue
        auc = mann_whitney_auc(cases, ctrls)
        rows.append(dict(category=cat, auc=auc, n_cases=len(cases), n_controls=len(ctrls)))
    return pd.DataFrame(rows)


def calibration_table(joined: pd.DataFrame, n_bins: int = 10) -> pd.DataFrame:
    """Reliability diagram data: bin SQS into deciles, observed case rate per
    bin, plus the Brier score for the implicit classifier.

    For small pilots with many duplicate SQS values, ``pd.qcut`` may collapse
    to < ``n_bins`` buckets; we handle that gracefully. The bin label column
    is converted to plain float ``(bin_low, bin_high)`` columns to avoid
    categorical-vs-float comparison errors downstream.
    """
    empty = pd.DataFrame(
        columns=["bin_low", "bin_high", "n", "observed_case_rate", "brier_score_overall"]
    )
    sub = joined[["sqs_score", "class"]].dropna(subset=["sqs_score"]).copy()
    if sub.empty:
        return empty
    sub["is_case"] = (sub["class"] == "case").astype(int)
    try:
        bins = pd.qcut(sub["sqs_score"], q=n_bins, duplicates="drop")
    except ValueError:
        return empty
    sub = sub.assign(_bin=bins.astype(object))
    if sub["_bin"].isna().all():
        return empty

    grouped = (
        sub.dropna(subset=["_bin"])
        .groupby("_bin", observed=True)
        .agg(n=("is_case", "count"), observed_case_rate=("is_case", "mean"))
        .reset_index()
    )
    grouped["bin_low"] = grouped["_bin"].apply(lambda iv: float(iv.left))
    grouped["bin_high"] = grouped["_bin"].apply(lambda iv: float(iv.right))

    # Per-row predicted probability (from its own bin's observed rate).
    row_pred = sub.merge(
        grouped[["_bin", "observed_case_rate"]],
        on="_bin",
        how="left",
    )
    brier = float(
        np.mean(
            (row_pred["observed_case_rate"] - row_pred["is_case"]) ** 2
        )
    )
    grouped = grouped.drop(columns=["_bin"])
    grouped["brier_score_overall"] = brier
    return grouped[
        ["bin_low", "bin_high", "n", "observed_case_rate", "brier_score_overall"]
    ].sort_values("bin_low").reset_index(drop=True)


def attrition_consort(
    n_retraction_watch: int,
    n_after_date_filter: int,
    n_after_language: int,
    n_with_pmcid: int,
    n_oa_license_pass: int,
    n_parser_pass: int,
    n_with_controls: int,
    n_in_scores: int,
    n_in_analysis: int,
) -> pd.DataFrame:
    rows = [
        ("Retraction Watch total (cases filter)", n_retraction_watch),
        ("After 2010-2023 date filter", n_after_date_filter),
        ("After English language filter", n_after_language),
        ("With resolvable PMCID", n_with_pmcid),
        ("With commercial-reuse license (group 1)", n_oa_license_pass),
        ("Passed parser-quality gate", n_parser_pass),
        ("With 2 matched controls", n_with_controls),
        ("Scored by SQS", n_in_scores),
        ("In final analysis (complete cases)", n_in_analysis),
    ]
    return pd.DataFrame(rows, columns=["stage", "n"])


def classify_outcome(auc: AUCResult) -> str:
    """Apply PROTOCOL §11 decision table verbatim."""
    if not np.isfinite(auc.auc):
        return "INCONCLUSIVE"
    if auc.auc >= PRIMARY_AUC_FLOOR and auc.ci_lower >= PRIMARY_CI_LOWER_FLOOR:
        return "POSITIVE"
    if auc.auc >= PARTIAL_AUC_FLOOR:
        return "PARTIAL"
    return "NULL"


def write_pilot_report(
    output_dir: Path,
    primary: AUCResult,
    outcome: str,
    joined: pd.DataFrame,
    per_rule: pd.DataFrame,
    per_cat: pd.DataFrame,
    calib: pd.DataFrame,
    consort: pd.DataFrame,
    is_pilot: bool,
) -> None:
    n_cases = int((joined["class"] == "case").sum())
    n_ctrl = int((joined["class"] == "control").sum())
    underpowered = n_cases < MIN_VIABLE_CASES
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    lines = [
        "# Retraction Backtest — Pilot Report",
        "",
        f"**Generated.** {now}",
        f"**Analysis seed.** {SEED}",
        f"**Bootstrap replicates.** {BOOTSTRAP_REPLICATES}",
        "",
    ]

    if underpowered:
        lines += [
            "> **UNDERPOWERED PILOT.** This report is generated on a corpus with",
            f"> n_cases = {n_cases}, below the protocol-mandated minimum viable",
            f"> sample of {MIN_VIABLE_CASES} cases (PROTOCOL §8.4). Per the",
            "> preregistration, no primary-endpoint **claim** is made from this",
            "> pilot. Numbers below are feasibility and calibration signals only.",
            "",
        ]

    lines += [
        "## Primary endpoint",
        "",
        f"- N cases: {primary.n_cases}",
        f"- N controls: {primary.n_controls}",
        f"- AUC (matched-cluster bootstrap, {primary.n_bootstrap_replicates} reps):",
        f"  {primary.auc:.3f} (95% CI {primary.ci_lower:.3f} – {primary.ci_upper:.3f})",
        f"- Pre-registered decision: **{outcome}**",
        "",
    ]

    if outcome == "POSITIVE":
        lines += [
            "AUC meets the primary floor (≥ 0.70) and the lower 95% CI bound clears",
            "0.60. Per PROTOCOL §11 this would support SQS as a reviewer pre-check — ",
            "but see the UNDERPOWERED caveat above if present.",
            "",
        ]
    elif outcome == "PARTIAL":
        lines += [
            "Point estimate or CI fails the primary threshold but clears the partial",
            "threshold of 0.60. SQS discriminates imperfectly and is not, on this data,",
            "sufficient as a stand-alone pre-check.",
            "",
        ]
    elif outcome == "NULL":
        lines += [
            "AUC < 0.60. On this corpus, SQS at time of publication does not",
            "meaningfully discriminate retracted-for-stats papers from controls.",
            "Per PROTOCOL §2 this result is published regardless.",
            "",
        ]
    else:
        lines += [
            "AUC could not be computed (likely too few cases or controls after",
            "matching). See the attrition table.",
            "",
        ]

    lines += [
        "## Per-rule table (top 10 by p-value)",
        "",
    ]
    if per_rule.empty:
        lines += ["_(no rules observed; check harvest + score output)_", ""]
    else:
        head = per_rule.head(10).copy()
        head["p_value"] = head["p_value"].map(lambda x: f"{x:.3g}")
        head["odds_ratio"] = head["odds_ratio"].map(
            lambda x: f"{x:.2f}" if np.isfinite(x) else "inf"
        )
        lines.append(head.to_markdown(index=False))
        lines.append("")
        n_sig = int(per_rule["bh_fdr_reject"].sum())
        lines.append(f"_{n_sig} of {len(per_rule)} rules reject H0 at BH-FDR = 0.05._")
        lines.append("")

    lines += ["## Per-category AUC", ""]
    if per_cat.empty:
        lines += ["_(per-category subscores not present in score output)_", ""]
    else:
        cat_copy = per_cat.copy()
        cat_copy["auc"] = cat_copy["auc"].map(
            lambda x: f"{x:.3f}" if np.isfinite(x) else "N/A"
        )
        lines.append(cat_copy.to_markdown(index=False))
        lines.append("")

    lines += ["## Calibration", ""]
    if calib.empty:
        lines += ["_(too few unique scores for decile calibration)_", ""]
    else:
        brier = float(calib["brier_score_overall"].iloc[0])
        lines.append(f"**Brier score (overall):** {brier:.4f}")
        lines.append("")
        lines.append(calib[["bin_low", "bin_high", "n", "observed_case_rate"]].to_markdown(index=False))
        lines.append("")

    consort_display = consort.copy()
    consort_display["n"] = consort_display["n"].map(
        lambda v: "—" if v is None or int(v) < 0 else str(int(v))
    )
    lines += [
        "## CONSORT-style attrition flow",
        "",
        consort_display.to_markdown(index=False),
        "",
    ]

    lines += [
        "## Honest limitations",
        "",
        "- The pilot N is far below the protocol-mandated floor; primary-endpoint",
        "  numbers here are feasibility signals, not clinical claims.",
        "- Label coding used a single coder for the pilot; a second coder and κ",
        "  computation are deferred to the full run (PROTOCOL §9.2).",
        "- The study will be rerun at full scale before any external claim is made,",
        "  and the code + manifest + retraction labels will be released for public",
        "  re-analysis.",
        "",
    ]

    (output_dir / "PILOT_REPORT.md").write_text("\n".join(lines))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", default="data/manifest_v1.csv")
    ap.add_argument("--scores", default="data/scores_v1.csv")
    ap.add_argument("--output", default="reports/")
    ap.add_argument("--bootstrap", type=int, default=BOOTSTRAP_REPLICATES)
    ap.add_argument(
        "--attrition-json",
        default="data/harvest_attrition.json",
        help=(
            "Path to the harvester's attrition report. Columns are mapped "
            "into the CONSORT-style flow table. Missing values render as '—'."
        ),
    )
    args = ap.parse_args()

    manifest_path = Path(args.manifest)
    scores_path = Path(args.scores)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    for p in (manifest_path, scores_path):
        if not p.exists():
            print(f"ERROR: required input missing: {p}", file=sys.stderr)
            return 2

    manifest = pd.read_csv(manifest_path)
    scores = pd.read_csv(scores_path)

    required_manifest_cols = {"record_id", "class", "case_id"}
    required_score_cols = {"record_id", "sqs_score", "rules_missed"}
    missing_manifest = required_manifest_cols - set(manifest.columns)
    missing_scores = required_score_cols - set(scores.columns)
    if missing_manifest:
        print(f"ERROR: manifest missing columns {missing_manifest}", file=sys.stderr)
        return 2
    if missing_scores:
        print(f"ERROR: scores missing columns {missing_scores}", file=sys.stderr)
        return 2

    # If score file has category_scores_json, unpack into cat_* columns.
    if "category_scores_json" in scores.columns:
        cat_df = scores["category_scores_json"].apply(
            lambda s: pd.Series(
                json.loads(s) if isinstance(s, str) and s else {}
            )
        )
        cat_df = cat_df.add_prefix("cat_")
        scores = pd.concat([scores, cat_df], axis=1)

    joined = manifest.merge(scores, on="record_id", how="inner")
    # Drop rows with an error in scoring.
    if "error" in joined.columns:
        joined = joined[joined["error"].isna() | (joined["error"] == "")]

    primary = matched_cluster_bootstrap_auc(
        joined, replicates=args.bootstrap, seed=SEED
    )
    outcome = classify_outcome(primary)
    per_rule = per_rule_analysis(joined)
    per_cat = per_category_auc(joined)
    calib = calibration_table(joined)
    attrition: dict = {}
    attrition_path = Path(args.attrition_json)
    if attrition_path.exists():
        try:
            attrition = json.loads(attrition_path.read_text())
        except (OSError, json.JSONDecodeError) as e:
            print(f"WARNING: could not read {attrition_path}: {e}", file=sys.stderr)

    def _a(key: str) -> int:
        val = attrition.get(key)
        if isinstance(val, int):
            return val
        return -1

    consort = attrition_consort(
        n_retraction_watch=_a("n_retraction_watch_total"),
        n_after_date_filter=_a("n_after_date_filter"),
        n_after_language=_a("n_after_language"),
        n_with_pmcid=_a("n_with_pmcid"),
        n_oa_license_pass=_a("n_oa_license_pass"),
        n_parser_pass=_a("n_parser_pass"),
        n_with_controls=int(joined[joined["class"] == "case"]["record_id"].nunique()),
        n_in_scores=len(scores),
        n_in_analysis=len(joined),
    )

    # Emit CSVs.
    pd.DataFrame(
        [
            dict(
                auc=primary.auc,
                ci_lower=primary.ci_lower,
                ci_upper=primary.ci_upper,
                n_cases=primary.n_cases,
                n_controls=primary.n_controls,
                n_bootstrap=primary.n_bootstrap_replicates,
                outcome=outcome,
                seed=SEED,
            )
        ]
    ).to_csv(output_dir / "primary_analysis.csv", index=False)
    per_rule.to_csv(output_dir / "per_rule_table.csv", index=False)
    per_cat.to_csv(output_dir / "per_category_auc.csv", index=False)
    calib.to_csv(output_dir / "calibration.csv", index=False)
    consort.to_csv(output_dir / "attrition_consort.csv", index=False)

    # Emit markdown report.
    write_pilot_report(
        output_dir=output_dir,
        primary=primary,
        outcome=outcome,
        joined=joined,
        per_rule=per_rule,
        per_cat=per_cat,
        calib=calib,
        consort=consort,
        is_pilot=primary.n_cases < MIN_VIABLE_CASES,
    )

    print(
        f"AUC {primary.auc:.3f} (95% CI {primary.ci_lower:.3f}–{primary.ci_upper:.3f}) "
        f"| outcome={outcome} | n_cases={primary.n_cases} n_controls={primary.n_controls}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
