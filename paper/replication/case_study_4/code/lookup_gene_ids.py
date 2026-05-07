"""
Look up Ensembl gene IDs for the canonical synovial-sarcoma markers and
metastasis-associated genes via the Ensembl REST API.

Per the Anti-Fabrication Charter: every gene-ID claim in the case study
must trace to a live API fetch, not training memory. This script makes
the live calls, saves the responses, and writes a single CSV mapping
that downstream scripts can consume.

Source: https://rest.ensembl.org/lookup/symbol/homo_sapiens/<SYMBOL>
Endpoint specifies GRCh38 by default; we explicitly request GRCh37 to
match the paper's hg19 alignment (per PMC11892499 §4 RNA seq Data
Processing).
"""

from __future__ import annotations

import csv
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "evidence"
OUT_CSV = Path(__file__).parent.parent / "data" / "marker_gene_ensembl_ids.csv"

# Symbols we need, with their case-study role.
GENES = [
    # Canonical synovial-sarcoma markers (C1 check)
    ("TLE1",  "SS_marker",         "TLE1 corepressor; canonical SS IHC marker"),
    ("SS18",  "SS_marker",         "SS18 (formerly SYT); the 'SS18' half of SS18::SSX fusion"),
    ("SSX1",  "SS_marker",         "SSX family member 1; SSX1 fusion partner"),
    ("SSX2",  "SS_marker",         "SSX family member 2; SSX2 fusion partner"),
    ("BCL2",  "SS_marker",         "B-cell lymphoma 2; commonly overexpressed in SS"),
    # Metastasis-associated: proliferation (UP in metastasis)
    ("MKI67", "metastasis_prolif", "Ki-67; canonical proliferation marker"),
    ("TOP2A", "metastasis_prolif", "Topoisomerase II alpha; proliferation marker"),
    # EMT (UP in metastasis)
    ("VIM",   "metastasis_EMT",    "Vimentin; mesenchymal marker"),
    ("SNAI1", "metastasis_EMT",    "Snail family transcriptional repressor 1"),
    ("ZEB1",  "metastasis_EMT",    "Zinc finger E-box binding homeobox 1"),
    # Epithelial (DOWN in metastasis)
    ("CDH1",  "metastasis_epithelial", "E-cadherin; epithelial junction"),
    ("KRT8",  "metastasis_epithelial", "Keratin 8; mentioned in paper for biphasic SS"),
    ("KRT18", "metastasis_epithelial", "Keratin 18; epithelial intermediate filament"),
    # Bonus (paper-named regulator of biphasic differentiation)
    ("OVOL1", "paper_named",       "OVOL1; paper §2.10 'OVOL1 and KRT8 may Determine Epithelial Transition of SS Cells'"),
]


def lookup_symbol_grch37(symbol: str) -> dict | None:
    """Fetch the Ensembl record for a gene symbol against GRCh37 (the
    assembly the paper used). Returns parsed JSON or None on failure.
    Saves the raw response to evidence/.
    """
    url = (
        f"https://grch37.rest.ensembl.org/lookup/symbol/homo_sapiens/{symbol}"
        f"?expand=0"
    )
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "stickforstats-case-study-4/1.0 (vishalvikashbharti@gmail.com)",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        print(f"  {symbol}: HTTP {e.code} — {e.reason}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  {symbol}: error — {e}", file=sys.stderr)
        return None

    # Save raw evidence
    raw_path = OUT_DIR / f"C0_ensembl_lookup_{symbol}.json"
    raw_path.write_text(payload)
    return json.loads(payload)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    print(f"Looking up {len(GENES)} gene symbols against Ensembl GRCh37 …")
    rows: list[dict[str, str]] = []
    for symbol, role, desc in GENES:
        rec = lookup_symbol_grch37(symbol)
        time.sleep(0.4)  # Ensembl REST etiquette
        if rec is None:
            ensembl_id = "<lookup-failed>"
            chromosome = ""
            biotype = ""
        else:
            ensembl_id = rec.get("id", "<missing>")
            chromosome = str(rec.get("seq_region_name", ""))
            biotype = rec.get("biotype", "")
        print(f"  {symbol:7s} → {ensembl_id} (chr {chromosome or '?'}, {biotype or '?'})")
        rows.append({
            "symbol": symbol,
            "ensembl_id": ensembl_id,
            "chromosome": chromosome,
            "biotype": biotype,
            "role": role,
            "description": desc,
        })

    with OUT_CSV.open("w") as f:
        w = csv.DictWriter(f, fieldnames=["symbol", "ensembl_id", "chromosome", "biotype", "role", "description"])
        w.writeheader()
        w.writerows(rows)

    n_ok = sum(1 for r in rows if r["ensembl_id"].startswith("ENSG"))
    print(f"\nWrote {OUT_CSV} ({n_ok}/{len(rows)} successful lookups)")
    print(f"Raw API responses saved as evidence/C0_ensembl_lookup_<SYMBOL>.json")
    return 0 if n_ok == len(rows) else 1


if __name__ == "__main__":
    sys.exit(main())
