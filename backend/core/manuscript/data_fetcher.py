"""
T11-FETCH (GEO-first) — accession -> downloaded, decompressed, ingestible table.
=================================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (A2 fetch/decompress/import)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T11-FETCH; depends on T09-ACCESSION)

The data-availability pilot (pilot_out/PILOT_REPORT_2026-06-24.md) found GEO is the #1
repository, so this first increment implements the GEO path end to end: resolve a GSE
series -> list its supplementary dir -> pick the most table-like file (count/expression
matrix) -> download with a size cap -> decompress (.gz/.zip) -> hand to DataImportService.
Other repositories (Zenodo/Dryad/figshare/OSF) are follow-ons.

Pure stdlib + urllib (no scipy). A7 no-egress note: downloads come FROM public archives;
nothing about the manuscript or its data is sent to any third-party LLM.
"""

from __future__ import annotations

import gzip
import io
import re
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

UA = {"User-Agent": "stickforstats-fetch/1.0 (research; mailto:vishalvikashbharti@gmail.com)"}
DEFAULT_MAX_BYTES = 100 * 1024 * 1024  # 100 MB per file

_DATA_EXT = (".csv", ".tsv", ".txt", ".tab", ".xlsx", ".xls")
# Things that are NOT an ingestible analysis table (raw reads, tracks, images, refs,
# and GEO bookkeeping files: filelist.txt is the series' file *listing*, not data).
_SKIP_NAME = re.compile(
    r"_RAW\.tar|filelist\.txt|_filelist|\.md5|readme|annot|^index\.html?|"
    r"\.bam|\.bai|\.bw|\.bigwig|\.bed|\.narrowpeak|\.wig|\.h5|\.mtx|\.loom|"
    r"\.png|\.jpe?g|\.pdf|\.gtf|\.gff|\.fa\b|\.fasta|\.fastq|\.sra",
    re.IGNORECASE,
)
_PREFER = re.compile(r"count|matrix|expression|fpkm|tpm|deseq|readcount|rawcount|abundance", re.IGNORECASE)


@dataclass
class FetchResult:
    accession: str
    repository: str
    status: str  # ingested | downloaded_not_ingestible | no_data_file | too_large |
                 # no_suppl_dir | fetch_error | unsupported_repo
    source_url: str = ""
    local_path: Optional[str] = None
    file_name: str = ""
    size_bytes: int = 0
    n_rows: Optional[int] = None
    n_cols: Optional[int] = None
    candidates: List[str] = field(default_factory=list)
    note: str = ""

    @property
    def ingestible(self) -> bool:
        return self.status == "ingested"


def _get(url: str, max_bytes: int = DEFAULT_MAX_BYTES, head: bool = False):
    req = urllib.request.Request(url, headers=UA, method="HEAD" if head else "GET")
    with urllib.request.urlopen(req, timeout=90) as resp:
        if head:
            return b"", int(resp.headers.get("Content-Length") or 0)
        return resp.read(max_bytes + 1), 0


def _geo_suppl_url(gse: str) -> str:
    """https://ftp.ncbi.nlm.nih.gov/geo/series/GSE271nnn/GSE271517/suppl/ — the 'nnn'
    directory replaces the last three digits of the series number."""
    num = gse[3:]
    stem = "GSEnnn" if len(num) <= 3 else "GSE" + num[:-3] + "nnn"
    return f"https://ftp.ncbi.nlm.nih.gov/geo/series/{stem}/{gse}/suppl/"


def _list_dir(url: str) -> List[str]:
    try:
        html, _ = _get(url, max_bytes=3_000_000)
    except Exception:
        return []
    names = re.findall(r'href="([^"?/][^"]*)"', html.decode("utf-8", "replace"))
    return [n for n in names if n not in (".", "..") and "=" not in n and not n.startswith("/")]


def _pick_candidate(names: List[str]) -> Optional[str]:
    cands = []
    for n in names:
        if _SKIP_NAME.search(n):
            continue
        base = n[:-3] if n.lower().endswith(".gz") else n
        if any(base.lower().endswith(e) for e in _DATA_EXT):
            cands.append(n)
    if not cands:
        return None
    cands.sort(key=lambda n: (0 if _PREFER.search(n) else 1, len(n)))
    return cands[0]


def _decompress(data: bytes, name: str, dest_dir: Path) -> Optional[Path]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    low = name.lower()
    if low.endswith(".gz"):
        out = dest_dir / name[:-3]
        out.write_bytes(gzip.decompress(data))
        return out
    if low.endswith(".zip"):
        zf = zipfile.ZipFile(io.BytesIO(data))
        members = [m for m in zf.namelist() if any(m.lower().endswith(e) for e in _DATA_EXT)]
        if not members:
            return None
        members.sort(key=lambda m: -zf.getinfo(m).file_size)
        out = dest_dir / Path(members[0]).name
        out.write_bytes(zf.read(members[0]))
        return out
    out = dest_dir / name
    out.write_bytes(data)
    return out


def fetch_geo(gse: str, dest_dir: Path, max_bytes: int = DEFAULT_MAX_BYTES, import_service=None) -> FetchResult:
    """Resolve a GSE series to an ingestible supplementary table."""
    suppl = _geo_suppl_url(gse)
    names = _list_dir(suppl)
    if not names:
        return FetchResult(gse, "GEO", "no_suppl_dir", source_url=suppl)
    cand = _pick_candidate(names)
    if not cand:
        return FetchResult(gse, "GEO", "no_data_file", source_url=suppl, candidates=names[:12])
    file_url = suppl + cand
    try:
        _, size = _get(file_url, head=True)
    except Exception:
        size = 0
    if size and size > max_bytes:
        return FetchResult(gse, "GEO", "too_large", source_url=file_url, file_name=cand, size_bytes=size)
    try:
        data, _ = _get(file_url, max_bytes=max_bytes)
    except Exception as e:
        return FetchResult(gse, "GEO", "fetch_error", source_url=file_url, file_name=cand, note=str(e)[:140])
    if len(data) > max_bytes:
        return FetchResult(gse, "GEO", "too_large", source_url=file_url, file_name=cand, size_bytes=len(data))
    try:
        local = _decompress(data, cand, dest_dir / gse)
    except Exception as e:
        return FetchResult(gse, "GEO", "fetch_error", source_url=file_url, file_name=cand, note=f"decompress: {str(e)[:120]}")
    if local is None:
        return FetchResult(gse, "GEO", "no_data_file", source_url=file_url, file_name=cand, note="archive had no table")

    res = FetchResult(gse, "GEO", "downloaded_not_ingestible", source_url=file_url,
                      local_path=str(local), file_name=cand, size_bytes=len(data))
    if import_service is not None:
        try:
            with open(local, "rb") as fh:
                imp = import_service.import_file(fh)
            if imp.success and imp.dataframe is not None:
                res.status = "ingested"
                res.n_rows, res.n_cols = imp.n_rows, imp.n_cols
            else:
                res.note = "; ".join(imp.errors)[:150]
        except Exception as e:
            res.note = f"ingest error: {str(e)[:120]}"
    return res


def fetch_accession(repository: str, accession: str, dest_dir: Path,
                    max_bytes: int = DEFAULT_MAX_BYTES, import_service=None) -> FetchResult:
    """Dispatch by repository. GEO implemented (T11 first increment); others are follow-ons."""
    if repository == "GEO" and accession.upper().startswith("GSE"):
        return fetch_geo(accession.upper(), dest_dir, max_bytes, import_service)
    return FetchResult(accession, repository, "unsupported_repo",
                       note=f"{repository} fetch not yet implemented (GEO-first per the pilot)")
