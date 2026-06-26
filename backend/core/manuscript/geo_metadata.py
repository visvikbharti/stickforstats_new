"""
geo_metadata.py — fetch + parse a GEO SERIES MATRIX into a sample-metadata frame.
=================================================================================

The genomics auto-linker (``genomics_linker.GenomicsLinker``) needs to know which samples belong
to which group (tumour type, condition, genotype, ...). That information lives in the GEO
**series matrix** header (`!Sample_title`, `!Sample_geo_accession`, repeated
`!Sample_characteristics_ch1` lines). This module fetches and parses it so the grouping is
obtained AUTOMATICALLY, closing the loop that the 2026-06-24 demo still filled with a hand-made
sample sheet. (T11-FETCH series-matrix follow-on.)

Pure stdlib + urllib + pandas; reuses ``data_fetcher`` for the GEO URL/HTTP plumbing. No-egress
note: this downloads FROM the public NCBI archive only.

Created: 2026-06-25 IST.
"""

from __future__ import annotations

import gzip
import io
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from .data_fetcher import _geo_suppl_url, _get, _list_dir, DEFAULT_MAX_BYTES


@dataclass
class GeoMetadata:
    accession: str
    status: str  # parsed | no_matrix_dir | no_matrix_file | fetch_error | parse_error
    frame: object = None          # pandas DataFrame indexed by sample_title (+ 'gsm' column), or None
    source_url: str = ""
    n_samples: int = 0
    grouping_columns: List[str] = field(default_factory=list)
    note: str = ""

    @property
    def ok(self) -> bool:
        return self.status == "parsed"


def _matrix_dir(gse: str) -> str:
    return _geo_suppl_url(gse).replace("/suppl/", "/matrix/")


def parse_series_matrix(text: str):
    """Parse the `!Sample_*` block of a GEO series matrix into a per-sample DataFrame."""
    import pandas as pd

    titles: Optional[List[str]] = None
    gsms: Optional[List[str]] = None
    char_lists: List[List[str]] = []
    for line in text.splitlines():
        if not line.startswith("!Sample_"):
            continue
        parts = line.split("\t")
        key = parts[0].strip()
        vals = [p.strip().strip('"') for p in parts[1:]]
        if key == "!Sample_title":
            titles = vals
        elif key == "!Sample_geo_accession":
            gsms = vals
        elif key == "!Sample_characteristics_ch1":
            char_lists.append(vals)

    index = titles or gsms
    if not index:
        return None
    n = len(index)

    # GEO characteristics are RAGGED: different samples can list characteristics in a different
    # order / count, so a `!Sample_characteristics_ch1` SLOT does not hold the same characteristic
    # across samples. Key each CELL by its own "label: value" instead of by slot position.
    per_sample = [dict() for _ in range(n)]
    for vals in char_lists:
        for j, v in enumerate(vals):
            if j >= n or not v:
                continue
            if ":" in v:
                k, val = v.split(":", 1)
                per_sample[j][k.strip()] = val.strip()
            # colon-less cells have no reliable label that is consistent across samples; keying them
            # by slot index would reintroduce the ragged-misalignment bug, so we skip them.

    all_keys = sorted({k for d in per_sample for k in d})
    data = {k: [d.get(k, "") for d in per_sample] for k in all_keys}
    df = pd.DataFrame(data, index=index)
    # grouping often lives in the TITLE, not a characteristic (e.g. "IL-2 41" vs "Ctrl 45"): derive a
    # group label by stripping a trailing sample number, and keep it only if it forms a real grouping.
    if titles:
        labels = [re.sub(r"[\s_.\-]*\d+\s*$", "", str(t)).strip() for t in titles]
        distinct = {lbl for lbl in labels if lbl}
        if 2 <= len(distinct) < len(labels):
            df["_title_group"] = labels
    if gsms:
        df["gsm"] = gsms
    df.index.name = "sample"
    return df


def align_samples(frame, sample_cols):
    """Map series-matrix metadata onto a processed matrix's SAMPLE COLUMNS.

    Processed matrices rarely name their columns by the series-matrix sample title or GSM
    (e.g. columns ``S41..S48`` vs titles ``"IL-2 41".."Ctrl 48"`` / ``GSM8749130..``). This tries,
    best-coverage-wins and only if the mapping is INJECTIVE (no two columns to one sample):
      1. exact (stripped, case-insensitive) vs title and GSM
      2. normalised alphanumeric vs title and GSM
      3. shared DISCRIMINATING number — a sample-distinguishing integer that occurs in exactly one
         sample id and in the column (e.g. ``S41`` <-> ``"IL-2 41"`` both carry the unique ``41``)
    Returns ``(aligned_frame | None, coverage, method)`` where ``aligned_frame`` is ``frame`` reindexed
    so its index IS the matched sample-column labels (ready for ``GenomicsLinker``). Positional
    (count-match) alignment is deliberately NOT attempted — a wrong order would silently mis-group.
    """
    cols = [str(c) for c in sample_cols]
    id_alt = {"title": [str(i) for i in frame.index]}
    if "gsm" in frame.columns:
        id_alt["gsm"] = [str(x) for x in frame["gsm"]]

    def _alnum(s):
        return re.sub(r"[^a-z0-9]+", "", s.lower())

    def _nums(s):
        return re.findall(r"\d+", s)

    best = None  # (coverage, method, mapping col->row_pos)

    def _consider(method, mapping):
        nonlocal best
        if mapping and len(set(mapping.values())) == len(mapping):  # injective
            cov = len(mapping) / len(cols)
            if best is None or cov > best[0]:
                best = (cov, method, mapping)

    for src, idvals in id_alt.items():
        for mname, keyfn in (("exact", lambda s: s.strip().lower()), ("normalized", _alnum)):
            idkey, dup = {}, set()
            for pos, v in enumerate(idvals):
                k = keyfn(v)
                if not k:
                    continue
                (dup.add(k) if k in idkey else idkey.__setitem__(k, pos))
            for k in dup:
                idkey.pop(k, None)
            _consider(f"{mname}:{src}", {c: idkey[keyfn(c)] for c in cols if keyfn(c) in idkey})

        # discriminating-number strategy
        count, first_pos = {}, {}
        for pos, v in enumerate(idvals):
            for num in set(_nums(v)):
                count[num] = count.get(num, 0) + 1
                first_pos.setdefault(num, pos)
        unique = {num: p for num, p in first_pos.items() if count[num] == 1}
        mapping = {}
        for c in cols:
            hits = {unique[num] for num in _nums(c) if num in unique}
            if len(hits) == 1:
                mapping[c] = next(iter(hits))
        _consider(f"numeric:{src}", mapping)

    if best is None or best[0] < 0.5:
        return None, (best[0] if best else 0.0), "no-alignment"
    cov, method, mapping = best
    matched = [c for c in cols if c in mapping]
    aligned = frame.iloc[[mapping[c] for c in matched]].copy()
    aligned.index = matched
    aligned.index.name = "sample"
    return aligned, cov, method


def fetch_geo_metadata(gse: str, dest_dir: Path, max_bytes: int = DEFAULT_MAX_BYTES) -> GeoMetadata:
    """Fetch + parse the series matrix for a GSE accession into a sample-metadata frame."""
    gse = gse.upper()
    if not re.fullmatch(r"GSE\d+", gse):  # validate before it becomes a URL / filesystem path component
        return GeoMetadata(gse, "fetch_error", note="invalid GSE accession")
    mdir = _matrix_dir(gse)
    names = _list_dir(mdir)
    if not names:
        return GeoMetadata(gse, "no_matrix_dir", source_url=mdir)
    matrices = [n for n in names if re.search(r"_series_matrix\.txt\.gz$", n, re.I)]
    if not matrices:
        return GeoMetadata(gse, "no_matrix_file", source_url=mdir, note=f"dir had {names[:6]}")

    # cache check
    dest_dir = Path(dest_dir) / gse
    frames = []
    import pandas as pd

    for mname in matrices:
        url = mdir + mname
        cached = dest_dir / mname[:-3]  # decompressed .txt
        try:
            if cached.exists():
                text = cached.read_text(errors="replace")
            else:
                data, _ = _get(url, max_bytes=max_bytes)
                if len(data) > max_bytes:
                    return GeoMetadata(gse, "fetch_error", source_url=url, note="series matrix too large")
                # bound the DECOMPRESSED size too (a small gzip can inflate to GBs — gzip-bomb guard)
                with gzip.GzipFile(fileobj=io.BytesIO(data)) as gz:
                    raw = gz.read(max_bytes + 1)
                if len(raw) > max_bytes:
                    return GeoMetadata(gse, "fetch_error", source_url=url,
                                       note="decompressed series matrix exceeds the size cap")
                text = raw.decode("utf-8", "replace")
                dest_dir.mkdir(parents=True, exist_ok=True)
                cached.write_text(text)
        except Exception as e:
            return GeoMetadata(gse, "fetch_error", source_url=url, note=str(e)[:140])
        try:
            df = parse_series_matrix(text)
        except Exception as e:
            return GeoMetadata(gse, "parse_error", source_url=url, note=str(e)[:140])
        if df is not None and len(df):
            frames.append(df)

    if not frames:
        return GeoMetadata(gse, "parse_error", source_url=mdir, note="no samples parsed")
    frame = pd.concat(frames) if len(frames) > 1 else frames[0]
    if frame.index.duplicated().any():  # multi-platform series can repeat a sample id; keep the first
        frame = frame[~frame.index.duplicated(keep="first")]

    # grouping columns = characteristic columns with 2..(n-1) discrete levels (exclude 'gsm')
    grouping = []
    for c in frame.columns:
        if c == "gsm":
            continue
        nun = frame[c].astype(str).nunique()
        if 2 <= nun < len(frame):
            grouping.append(c)
    return GeoMetadata(gse, "parsed", frame=frame, source_url=mdir,
                       n_samples=len(frame), grouping_columns=grouping)
