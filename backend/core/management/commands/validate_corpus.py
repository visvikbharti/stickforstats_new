"""Validation harness: run the claim-extractor + consistency engine over a
corpus of manuscript text files and report extraction + consistency metrics.

This backs the accuracy/validation study: point it at a folder of real paper
texts and it reports, per paper and in aggregate, how many statistical claims
were extracted (by type), how many carried a usable test statistic, how many
were recomputable (stat + df + p of a supported type), and the consistency
verdicts (consistent / discrepancy / gross decision-error) from recomputing
the p-value with scipy -- the same math statcheck uses.

Usage::

    python manage.py validate_corpus paper/replication/manuscript_validation/corpus \\
        --json paper/replication/manuscript_validation/results.json

It is read-only and deterministic, so the JSON output is reproducible.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.manuscript.advanced_validators import StatisticalConsistencyValidator
from core.manuscript.claim_extractor import StatisticalClaimExtractor

TEXT_SUFFIXES = {".txt", ".md", ".text"}


class Command(BaseCommand):
    help = "Run extraction + consistency over a corpus of manuscript text files and report metrics."

    def add_arguments(self, parser):
        parser.add_argument("path", help="A .txt/.md file, or a directory of them.")
        parser.add_argument("--json", dest="json_out", default=None, help="Write full results to this JSON file.")
        parser.add_argument("--alpha", type=float, default=0.05, help="Significance threshold for decision errors.")

    def handle(self, *args, **opts):
        root = Path(opts["path"])
        if root.is_dir():
            files = sorted(f for f in root.iterdir() if f.suffix.lower() in TEXT_SUFFIXES)
        elif root.is_file():
            files = [root]
        else:
            raise CommandError(f"No such path: {root}")
        if not files:
            raise CommandError(f"No {sorted(TEXT_SUFFIXES)} files found under {root}")

        extractor = StatisticalClaimExtractor()
        consistency = StatisticalConsistencyValidator(alpha=opts["alpha"])

        results = []
        agg = Counter()
        for f in files:
            text = f.read_text(encoding="utf-8", errors="replace")
            claims = extractor.extract(text, section="results")
            findings = consistency.validate(text, claims)

            by_type = Counter(c.claim_type or "(bare-p)" for c in claims)
            n_with_stat = sum(1 for c in claims if c.statistic_value is not None)
            consistent = sum(1 for x in findings if x.severity == "positive")
            discrepancy = sum(1 for x in findings if x.severity == "major")
            gross = sum(1 for x in findings if x.severity == "blocking")
            checked = consistent + discrepancy + gross

            inconsistencies = [
                {"title": x.title, "evidence": x.evidence, "detail": (x.description or "")[:300]}
                for x in findings
                if x.severity in ("major", "blocking")
            ]

            rec = {
                "file": f.name,
                "n_claims": len(claims),
                "by_type": dict(by_type),
                "n_with_statistic": n_with_stat,
                "n_recomputed": checked,
                "consistent": consistent,
                "discrepancy": discrepancy,
                "gross_error": gross,
                "inconsistencies": inconsistencies,
            }
            results.append(rec)

            agg["files"] += 1
            agg["claims"] += len(claims)
            agg["with_stat"] += n_with_stat
            agg["recomputed"] += checked
            agg["consistent"] += consistent
            agg["discrepancy"] += discrepancy
            agg["gross"] += gross

            self.stdout.write(
                f"{f.name}: {len(claims)} claims, {n_with_stat} w/stat, "
                f"{checked} recomputed -> {consistent} consistent / "
                f"{discrepancy} discrepancy / {gross} gross"
            )
            for inc in inconsistencies:
                self.stdout.write(f"    [{inc['title']}] {inc['evidence'][:80]}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"AGGREGATE over {agg['files']} papers: {agg['claims']} claims, "
            f"{agg['with_stat']} with a statistic, {agg['recomputed']} recomputable -> "
            f"{agg['consistent']} consistent, {agg['discrepancy']} discrepancy, {agg['gross']} gross error(s)."
        ))

        if opts["json_out"]:
            out = {"alpha": opts["alpha"], "aggregate": dict(agg), "papers": results}
            Path(opts["json_out"]).write_text(json.dumps(out, indent=2), encoding="utf-8")
            self.stdout.write(f"Wrote {opts['json_out']}")
