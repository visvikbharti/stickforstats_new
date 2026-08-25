#!/usr/bin/env python3
"""Derive the paper-level agreement between our extractor and JATSdecoder.

The report used to state agreement as a hand-typed literal, and it was taken from the
body-text arm while the disagreement counts beside it came from the raw-XML arm — the two
did not sum to the sample size and nobody noticed. Every number below is computed here so
a correction cannot fail to reach the prose.

Inputs are both tracked and small (no external drive needed):
  paper/census_paper/data/jatsdecoder_sample_2026-08-25.json   stratum membership
  paper/census_paper/data/jatsdecoder_headtohead_2026-08-25.csv JATSdecoder counts

"Ours" for a re-fetched paper is its stratum: stratum A is the census ledger's checkable
set. That identification is what the 760/760 control in JATSDECODER_HEADTOHEAD_2026-08-25.md
establishes, and it is re-asserted below.
"""
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "census_paper" / "data"
SAMPLE = DATA / "jatsdecoder_sample_2026-08-25.json"
COUNTS = DATA / "jatsdecoder_headtohead_2026-08-25.csv"

ARMS = {"xml_chk": "raw JATS", "txt_chk": "our body text"}


def main() -> None:
    sample = json.loads(SAMPLE.read_text())
    stratum_a = set(sample["stratum_A"])
    stratum_b = set(sample["stratum_B"])
    rows = list(csv.DictReader(COUNTS.open()))
    n = len(rows)

    # Both arms must always be printed. The original defect was quoting one arm's
    # agreement beside the other arm's disagreement counts; that is only detectable
    # if a reader can see both lines side by side.
    assert set(ARMS) == {"xml_chk", "txt_chk"}, "both arms must be reported, never one alone"
    missing = set(ARMS) - set(rows[0])
    assert not missing, f"columns absent from the counts file: {missing}"

    unmatched = [r["pmcid"] for r in rows if r["pmcid"] not in stratum_a | stratum_b]
    if unmatched:
        raise SystemExit(f"{len(unmatched)} retrieved papers are in neither stratum: {unmatched[:5]}")

    in_a = sum(1 for r in rows if r["pmcid"] in stratum_a)
    print(f"retrieved {n} papers  ({in_a} from stratum A, {n - in_a} from stratum B)")
    print(f"seed {sample['seed']}  populations N_A={sample['N_A']} N_B={sample['N_B']}\n")

    for arm, label in ARMS.items():
        agree = ours_only = theirs_only = 0
        for row in rows:
            ours = row["pmcid"] in stratum_a
            theirs = int(row[arm]) > 0
            if ours and not theirs:
                ours_only += 1
            elif theirs and not ours:
                theirs_only += 1
            else:
                agree += 1
        # The arithmetic that the hand-typed version failed: the three must sum to n.
        assert agree + ours_only + theirs_only == n, (agree, ours_only, theirs_only, n)
        print(
            f"{arm:8s} ({label:14s}) agreement {agree}/{n} = {100 * agree / n:.1f}%"
            f"   ours-only {ours_only}   theirs-only {theirs_only}"
        )

    print(
        "\nQuote the arm the headline denominator comes from (raw JATS), and quote its own"
        "\ndisagreement split with it — n - ours_only - theirs_only must equal the agreement count."
    )


if __name__ == "__main__":
    main()
