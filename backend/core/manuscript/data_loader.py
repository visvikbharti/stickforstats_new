"""
data_loader.py — bounded loader for uploaded tabular raw-data files.
====================================================================

Single source of truth for turning an uploaded data file into a *bounded*
pandas DataFrame, shared by the single-file verify endpoint and the multi-file
bundle endpoint.

Formats:
  - CSV / TSV / TAB / TXT / DAT  -> pandas (delimiter sniffed; tab for .tsv/.tab)
  - XLSX / XLS                   -> pandas + openpyxl (with a zip-bomb guard)
  - SAV / SAS7BDAT / DTA / JSON  -> the richer DataImportService (pyreadstat)

The bounds protect the worker: the upload-size cap only limits the *compressed*
bytes, but an .xlsx is a zip that can inflate to GBs, so we bound the
uncompressed size and the materialised row/column count too.
"""

from __future__ import annotations

import io
import zipfile

# Bounds on what is materialised in the request thread (see module docstring).
MAX_DATA_ROWS = 1_000_000
MAX_DATA_COLS = 10_000
MAX_XLSX_UNCOMPRESSED = 200 * 1024 * 1024  # reject workbooks that decompress past 200 MB

_EXCEL = (".xlsx", ".xls")
_RICH = (".sav", ".sas7bdat", ".dta", ".json")  # handled by DataImportService
_TAB = (".tsv", ".tab")


def _bound_cols(df):
    if df.shape[1] > MAX_DATA_COLS:
        raise ValueError(f"Too many columns ({df.shape[1]}); the limit is {MAX_DATA_COLS}.")
    return df


def load_dataframe(name: str, raw: bytes):
    """Read raw bytes of a tabular file into a bounded pandas DataFrame.

    Raises ``ValueError`` on a malformed/oversized/unsupported table (the caller
    surfaces this as a user-actionable 400).
    """
    import pandas as pd  # lazy

    low = (name or "").lower()

    if low.endswith(_EXCEL):
        if low.endswith(".xlsx"):
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                    total = sum(zi.file_size for zi in zf.infolist())
            except zipfile.BadZipFile as exc:
                raise ValueError("Not a valid .xlsx workbook.") from exc
            if total > MAX_XLSX_UNCOMPRESSED:
                raise ValueError(
                    f"Spreadsheet decompresses to {total // (1024 * 1024)} MB, exceeding the "
                    f"{MAX_XLSX_UNCOMPRESSED // (1024 * 1024)} MB limit."
                )
        return _bound_cols(pd.read_excel(io.BytesIO(raw), nrows=MAX_DATA_ROWS))

    if low.endswith(_RICH):
        # SPSS/SAS/Stata/JSON via the richer importer (pyreadstat, etc.)
        try:
            from core.services.data_import_service import DataImportService
        except Exception as exc:  # pragma: no cover
            raise ValueError(f"Importer for this format is unavailable: {exc}") from exc
        bio = io.BytesIO(raw)
        bio.name = name  # the importer auto-detects format from the name
        result = DataImportService().import_file(bio)
        if not result.success or result.dataframe is None:
            raise ValueError("; ".join(result.errors) or "could not import the data file")
        return _bound_cols(result.dataframe)

    # delimited text (csv/tsv/tab/txt/dat)
    sep = "\t" if low.endswith(_TAB) else None  # None -> sniff (python engine)
    return _bound_cols(pd.read_csv(io.BytesIO(raw), sep=sep, engine="python", nrows=MAX_DATA_ROWS))
