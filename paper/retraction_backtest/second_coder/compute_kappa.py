#!/usr/bin/env python3
"""
Compute Cohen's κ between the primary coder and the second coder, and
emit a reliability report that makes the pre-committed §9.2 decision
visible at a glance.

Inputs (all in the same directory):
    labeling_sheet.csv   — second coder's returned file; must have a
                           non-empty ``your_label`` column for every row.
    primary_labels.csv   — written by ``prepare_sample.py``; one row per
                           record_id with the primary coder's label.
    _sample_manifest.json (optional)
                         — consumed for the report header if present.

Outputs:
    kappa_report.md      — human-readable report: κ point estimate +
                           95 % CI, confusion matrix, per-class agreement,
                           sample of the (up to 20) first disagreements.
    kappa_report.json    — machine-readable version of the same numbers.

Decision rule is pre-committed in PROTOCOL §9.2 and reproduced in the
report:

    κ ≥ 0.80                accept labels, proceed to primary analysis.
    0.60 ≤ κ < 0.80         proceed with adjudication (third coder resolves
                            disagreements; disagreement rate is reported).
    κ < 0.60                HALT primary analysis, rewrite the codebook,
                            disclose the issue in the paper.

The script does not modify either input file; it only reads them and
writes the two report artifacts.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

HERE = Path(__file__).resolve().parent
LABEL_ORDER = ("stat", "nonstat", "ambiguous")


@dataclass
class PairedLabel:
    record_id: str
    primary: str
    coder: str
    reason_raw: str = ""


# --------------------------------------------------------------------------- #
# I/O
# --------------------------------------------------------------------------- #


def _read_labeling_sheet(path: Path) -> Dict[str, Tuple[str, str]]:
    """Return {record_id: (your_label, reason_raw)}.

    Empty ``your_label`` cells are kept as-is so the caller can count
    and report them rather than silently dropping rows.
    """
    out: Dict[str, Tuple[str, str]] = {}
    with path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rid = (row.get("record_id") or "").strip()
            if not rid:
                continue
            label = (row.get("your_label") or "").strip().lower()
            reason = row.get("reason_raw") or ""
            out[rid] = (label, reason)
    return out


def _read_primary_labels(path: Path) -> Dict[str, str]:
    out: Dict[str, str] = {}
    with path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rid = (row.get("record_id") or "").strip()
            if not rid:
                continue
            out[rid] = (row.get("primary_label") or "").strip().lower()
    return out


# --------------------------------------------------------------------------- #
# Cohen's κ
# --------------------------------------------------------------------------- #


def cohens_kappa(
    pairs: List[Tuple[str, str]], labels: Tuple[str, ...] = LABEL_ORDER
) -> Dict[str, float]:
    """Cohen's (1960) κ with the analytical 95 % CI (Cohen 1960 variance).

    Parameters
    ----------
    pairs
        List of (primary, coder) label tuples.
    labels
        Label universe in a fixed order. Any pair containing a label
        outside this set is discarded (and counted in the caller's
        ``skipped`` tally, not here).

    Returns
    -------
    dict with keys:
        n, p_o, p_e, kappa, se_kappa, ci95_low, ci95_high.
        When N < 2 or p_e == 1, kappa is NaN and CIs are NaN.
    """
    label_set = set(labels)
    pairs = [(p, c) for p, c in pairs if p in label_set and c in label_set]
    n = len(pairs)
    if n == 0:
        return {"n": 0, "p_o": float("nan"), "p_e": float("nan"),
                "kappa": float("nan"), "se_kappa": float("nan"),
                "ci95_low": float("nan"), "ci95_high": float("nan")}

    primary_counts = Counter(p for p, _ in pairs)
    coder_counts = Counter(c for _, c in pairs)
    agreements = sum(1 for p, c in pairs if p == c)

    p_o = agreements / n
    p_e = sum(
        (primary_counts.get(L, 0) / n) * (coder_counts.get(L, 0) / n)
        for L in labels
    )
    if p_e >= 1.0:
        # Both coders used exactly one label — κ is undefined.
        return {"n": n, "p_o": p_o, "p_e": p_e,
                "kappa": float("nan"), "se_kappa": float("nan"),
                "ci95_low": float("nan"), "ci95_high": float("nan")}

    kappa = (p_o - p_e) / (1.0 - p_e)
    # Cohen (1960) SE — conservative; jackknife would be tighter but
    # adds external dependency for a first-pass report. Adequate for
    # the three-threshold decision rule, not for meta-analysis.
    se = math.sqrt(p_o * (1.0 - p_o) / (n * (1.0 - p_e) ** 2))
    ci_low = kappa - 1.96 * se
    ci_high = kappa + 1.96 * se

    return {
        "n": n, "p_o": p_o, "p_e": p_e, "kappa": kappa,
        "se_kappa": se, "ci95_low": ci_low, "ci95_high": ci_high,
    }


def confusion_matrix(
    pairs: List[Tuple[str, str]], labels: Tuple[str, ...] = LABEL_ORDER
) -> Dict[str, Dict[str, int]]:
    """Return nested dict: matrix[primary][coder] = count."""
    matrix: Dict[str, Dict[str, int]] = {
        p: {c: 0 for c in labels} for p in labels
    }
    for p, c in pairs:
        if p in matrix and c in matrix[p]:
            matrix[p][c] += 1
    return matrix


def per_class_agreement(
    pairs: List[Tuple[str, str]], labels: Tuple[str, ...] = LABEL_ORDER
) -> Dict[str, Dict[str, float]]:
    """Sensitivity / specificity / PPV flavour per class (primary as reference)."""
    out: Dict[str, Dict[str, float]] = {}
    for L in labels:
        n_primary = sum(1 for p, _ in pairs if p == L)
        n_coder = sum(1 for _, c in pairs if c == L)
        n_both = sum(1 for p, c in pairs if p == L and c == L)
        n_total = len(pairs)
        n_neither = sum(1 for p, c in pairs if p != L and c != L)
        sensitivity = (n_both / n_primary) if n_primary else float("nan")
        specificity = (n_neither / (n_total - n_primary)) if (n_total - n_primary) else float("nan")
        ppv = (n_both / n_coder) if n_coder else float("nan")
        out[L] = {
            "sensitivity": sensitivity,
            "specificity": specificity,
            "ppv": ppv,
            "n_primary": n_primary,
            "n_coder": n_coder,
            "n_both": n_both,
        }
    return out


def decision_from_kappa(kappa: float) -> str:
    """Pre-committed PROTOCOL §9.2 decision."""
    if math.isnan(kappa):
        return "INDETERMINATE"
    if kappa >= 0.80:
        return "ACCEPT"
    if kappa >= 0.60:
        return "ADJUDICATE"
    return "HALT"


# --------------------------------------------------------------------------- #
# Report
# --------------------------------------------------------------------------- #


def _fmt(x: float, nd: int = 3) -> str:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return "—"
    return f"{x:.{nd}f}"


def render_report_md(
    kappa_result: Dict[str, float],
    matrix: Dict[str, Dict[str, int]],
    per_class: Dict[str, Dict[str, float]],
    skipped_rows: List[Dict[str, str]],
    missing_rows: List[str],
    disagreements: List[PairedLabel],
    manifest: Optional[dict],
) -> str:
    lines: List[str] = []
    lines.append("# Inter-Rater Reliability Report — Retraction Backtest")
    lines.append("")
    if manifest:
        lines.append(f"- Sample generated: `{manifest.get('generated_at_utc', '—')}`")
        lines.append(f"- PRNG seed: `{manifest.get('prng_seed', '—')}`")
        lines.append(f"- Source commit: `{manifest.get('git_commit_sha', '—')}`")
        lines.append(
            f"- Retraction Watch CSV SHA-1: "
            f"`{manifest.get('retraction_watch_csv_sha1', '—')}`"
        )
    lines.append("")

    lines.append("## Primary statistic")
    lines.append("")
    lines.append(f"- **N (paired rows)**: {kappa_result['n']}")
    lines.append(f"- **Observed agreement (p_o)**: {_fmt(kappa_result['p_o'])}")
    lines.append(f"- **Expected agreement by chance (p_e)**: {_fmt(kappa_result['p_e'])}")
    lines.append(
        f"- **Cohen's κ**: {_fmt(kappa_result['kappa'])} "
        f"(95 % CI {_fmt(kappa_result['ci95_low'])} – {_fmt(kappa_result['ci95_high'])})"
    )
    decision = decision_from_kappa(kappa_result["kappa"])
    lines.append("")
    lines.append(f"## Decision (PROTOCOL §9.2): **{decision}**")
    lines.append("")
    lines.append(_decision_copy(decision))
    lines.append("")

    lines.append("## Confusion matrix (primary × second coder)")
    lines.append("")
    header = "| primary ＼ coder | " + " | ".join(LABEL_ORDER) + " |"
    sep = "|---|" + "|".join(["---"] * len(LABEL_ORDER)) + "|"
    lines.append(header)
    lines.append(sep)
    for p_label in LABEL_ORDER:
        row = f"| **{p_label}** | " + " | ".join(
            str(matrix[p_label][c_label]) for c_label in LABEL_ORDER
        ) + " |"
        lines.append(row)
    lines.append("")

    lines.append("## Per-class agreement")
    lines.append("")
    lines.append("| class | sensitivity (primary=L) | specificity | PPV (coder=L) | n_primary | n_coder | n_both |")
    lines.append("|---|---|---|---|---|---|---|")
    for L in LABEL_ORDER:
        d = per_class[L]
        lines.append(
            f"| {L} | {_fmt(d['sensitivity'])} | {_fmt(d['specificity'])} | "
            f"{_fmt(d['ppv'])} | {d['n_primary']} | {d['n_coder']} | {d['n_both']} |"
        )
    lines.append("")

    if skipped_rows:
        lines.append("## Skipped rows (invalid / missing labels)")
        lines.append("")
        lines.append(f"{len(skipped_rows)} row(s) were excluded from κ.")
        for s in skipped_rows[:10]:
            lines.append(
                f"- `{s['record_id']}`: primary=`{s['primary']}` coder=`{s['coder']}` — {s['reason']}"
            )
        if len(skipped_rows) > 10:
            lines.append(f"- …and {len(skipped_rows) - 10} more.")
        lines.append("")

    if missing_rows:
        lines.append("## Rows present in labeling_sheet but not in primary_labels")
        lines.append("")
        lines.append(
            f"{len(missing_rows)} record_id(s) — check that you are running against "
            "the same sample the primary coder generated."
        )
        for rid in missing_rows[:20]:
            lines.append(f"- `{rid}`")
        if len(missing_rows) > 20:
            lines.append(f"- …and {len(missing_rows) - 20} more.")
        lines.append("")

    if disagreements:
        lines.append(f"## First {min(len(disagreements), 20)} disagreements")
        lines.append("")
        lines.append("Each row shows the verbatim RW reason text that drove the divergence.")
        lines.append("")
        for d in disagreements[:20]:
            reason_snippet = d.reason_raw.replace("\n", " ")
            if len(reason_snippet) > 180:
                reason_snippet = reason_snippet[:177] + "..."
            lines.append(
                f"- `{d.record_id}` — primary=`{d.primary}`, coder=`{d.coder}`"
            )
            lines.append(f"  > {reason_snippet}")
        if len(disagreements) > 20:
            lines.append(f"\n…and {len(disagreements) - 20} more.")
        lines.append("")

    return "\n".join(lines) + "\n"


def _decision_copy(decision: str) -> str:
    if decision == "ACCEPT":
        return ("> Both coders agree at or above the pre-committed κ ≥ 0.80 floor. "
                "The labeling is reliable; proceed to the blinded SQS scoring stage "
                "exactly as pre-registered.")
    if decision == "ADJUDICATE":
        return ("> The coders disagree more than `κ ≥ 0.80` allows but reliability "
                "is within the pre-committed adjudication window (`0.60 ≤ κ < 0.80`). "
                "Every disagreement must be resolved by a third coder (majority wins; "
                "ties broken by the third coder's vote). Report the raw disagreement "
                "rate in the paper alongside the primary endpoint.")
    if decision == "HALT":
        return ("> **Halt the primary analysis.** κ is below the `0.60` floor — the "
                "codebook is not reliably reproducible by an independent human coder. "
                "Per PROTOCOL §9.2, rewrite the codebook, disclose the issue in the "
                "paper, and do not proceed to primary analysis with these labels.")
    return ("> κ is undefined (insufficient overlap or a degenerate label set). "
            "Investigate before interpreting.")


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #


def build_argparser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=__doc__.splitlines()[1] if __doc__ else None,
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--sheet", type=Path, default=HERE / "labeling_sheet.csv",
                   help="Second coder's returned file.")
    p.add_argument("--primary", type=Path, default=HERE / "primary_labels.csv",
                   help="Primary labels CSV from prepare_sample.py.")
    p.add_argument("--manifest", type=Path, default=HERE / "_sample_manifest.json",
                   help="Optional sample manifest for the report header.")
    p.add_argument("--out-md", type=Path, default=HERE / "kappa_report.md",
                   help="Markdown report output path.")
    p.add_argument("--out-json", type=Path, default=HERE / "kappa_report.json",
                   help="JSON report output path.")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    args = build_argparser().parse_args(argv)

    for path in (args.sheet, args.primary):
        if not path.exists():
            print(f"required file missing: {path}", file=sys.stderr)
            return 1

    sheet = _read_labeling_sheet(args.sheet)
    primary = _read_primary_labels(args.primary)
    manifest = None
    if args.manifest.exists():
        try:
            manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manifest = None

    pairs: List[Tuple[str, str]] = []
    disagreements: List[PairedLabel] = []
    skipped_rows: List[Dict[str, str]] = []
    missing_in_primary: List[str] = []

    for rid, (coder_label, reason_raw) in sheet.items():
        primary_label = primary.get(rid)
        if primary_label is None:
            missing_in_primary.append(rid)
            continue
        if coder_label not in LABEL_ORDER:
            skipped_rows.append(
                {
                    "record_id": rid,
                    "primary": primary_label,
                    "coder": coder_label,
                    "reason": "coder label missing or not one of stat/nonstat/ambiguous",
                }
            )
            continue
        if primary_label not in LABEL_ORDER:
            skipped_rows.append(
                {
                    "record_id": rid,
                    "primary": primary_label,
                    "coder": coder_label,
                    "reason": "primary label not one of stat/nonstat/ambiguous (regenerate sample)",
                }
            )
            continue
        pairs.append((primary_label, coder_label))
        if primary_label != coder_label:
            disagreements.append(
                PairedLabel(
                    record_id=rid,
                    primary=primary_label,
                    coder=coder_label,
                    reason_raw=reason_raw,
                )
            )

    kappa_result = cohens_kappa(pairs)
    matrix = confusion_matrix(pairs)
    per_class = per_class_agreement(pairs)

    md = render_report_md(
        kappa_result, matrix, per_class, skipped_rows, missing_in_primary,
        disagreements, manifest,
    )
    args.out_md.write_text(md, encoding="utf-8")

    args.out_json.write_text(
        json.dumps(
            {
                "kappa": kappa_result,
                "decision": decision_from_kappa(kappa_result["kappa"]),
                "confusion_matrix": matrix,
                "per_class_agreement": per_class,
                "n_skipped": len(skipped_rows),
                "n_missing_in_primary": len(missing_in_primary),
                "n_disagreements": len(disagreements),
            },
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )

    print(
        f"κ = {_fmt(kappa_result['kappa'])} "
        f"(95 % CI {_fmt(kappa_result['ci95_low'])} – "
        f"{_fmt(kappa_result['ci95_high'])}) on N = {kappa_result['n']} → "
        f"{decision_from_kappa(kappa_result['kappa'])}"
    )
    print(f"wrote {args.out_md.name} and {args.out_json.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
