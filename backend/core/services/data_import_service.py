"""
Universal Data Import Service
==============================
Supports: CSV, Excel (.xlsx/.xls), SPSS (.sav), SAS (.sas7bdat), Stata (.dta), JSON

Provides a unified interface for importing statistical data files from all major
formats used in research. Extracts variable metadata (labels, value labels,
missing value definitions) from SPSS, SAS, and Stata files.

Author: StickForStats Development Team
Created: February 2026
Version: 1.0.0
"""

import io
import os
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
import logging
import json

logger = logging.getLogger(__name__)

# Maximum number of sample values stored per column in column info
MAX_SAMPLE_VALUES = 5

# Supported file extensions and their canonical format names
SUPPORTED_FORMATS = {
    '.csv': 'csv',
    '.xlsx': 'excel',
    '.xls': 'excel',
    '.sav': 'spss',
    '.sas7bdat': 'sas',
    '.dta': 'stata',
    '.json': 'json',
}


@dataclass
class DataImportResult:
    """
    Result container for a data import operation.

    Attributes:
        success: Whether the import completed without errors.
        data: Records-oriented dict list for JSON serialization (first N rows for preview).
        columns: List of column info dicts with name, dtype, n_unique, n_missing, sample_values.
        n_rows: Total number of rows in the dataset.
        n_cols: Total number of columns in the dataset.
        variable_metadata: Metadata extracted from SPSS/SAS/Stata files
                           (variable_labels, value_labels, missing_ranges).
        file_info: Dict with format, original_name, size_bytes, encoding.
        warnings: List of warning messages generated during import.
        errors: List of error messages if import failed.
        dataframe: The full pandas DataFrame (not serialized; for downstream use in Python).
    """
    success: bool = True
    data: List[Dict[str, Any]] = field(default_factory=list)
    columns: List[Dict[str, Any]] = field(default_factory=list)
    n_rows: int = 0
    n_cols: int = 0
    variable_metadata: Dict[str, Any] = field(default_factory=dict)
    file_info: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    dataframe: Optional[pd.DataFrame] = field(default=None, repr=False)

    def to_dict(self, preview_rows: int = 100) -> Dict[str, Any]:
        """Serialize to a JSON-safe dictionary, limiting data to preview_rows."""
        preview_data = self.data[:preview_rows] if self.data else []
        return {
            'success': self.success,
            'data': preview_data,
            'columns': self.columns,
            'n_rows': self.n_rows,
            'n_cols': self.n_cols,
            'n_preview_rows': len(preview_data),
            'variable_metadata': self.variable_metadata,
            'file_info': self.file_info,
            'warnings': self.warnings,
            'errors': self.errors,
        }


class DataImportService:
    """
    Universal data import service supporting CSV, Excel, SPSS, SAS, Stata, and JSON.

    Usage::

        service = DataImportService()
        result = service.import_file(uploaded_file)
        if result.success:
            df = result.dataframe
            preview = result.to_dict(preview_rows=100)
    """

    # Map format names to importer methods
    _IMPORTERS = {
        'csv': '_import_csv',
        'excel': '_import_excel',
        'spss': '_import_spss',
        'sas': '_import_sas',
        'stata': '_import_stata',
        'json': '_import_json',
    }

    def import_file(
        self,
        file_obj,
        file_type: Optional[str] = None,
        encoding: str = 'utf-8',
    ) -> DataImportResult:
        """
        Import a data file and return a DataImportResult.

        Auto-detects format from file extension when file_type is not provided.

        Args:
            file_obj: A file-like object (Django UploadedFile, io.BytesIO, etc.)
                      Must have a .name attribute for auto-detection.
            file_type: Explicit format override ('csv', 'excel', 'spss', 'sas', 'stata', 'json').
                       If None, format is detected from the file extension.
            encoding: Character encoding for text-based formats (CSV, JSON). Default 'utf-8'.

        Returns:
            DataImportResult with imported data, column info, and metadata.
        """
        result = DataImportResult()

        # --- Resolve format ---
        if file_type is None:
            file_type = self._detect_format(file_obj)

        if file_type is None:
            file_name = getattr(file_obj, 'name', 'unknown')
            ext = os.path.splitext(file_name)[1].lower() if file_name else ''
            supported = ', '.join(sorted(SUPPORTED_FORMATS.keys()))
            result.success = False
            result.errors.append(
                f"Unsupported file extension '{ext}'. "
                f"Supported formats: {supported}"
            )
            return result

        # --- Populate file info ---
        file_name = getattr(file_obj, 'name', 'unknown')
        file_size = 0
        if hasattr(file_obj, 'size'):
            file_size = file_obj.size
        elif hasattr(file_obj, 'seek') and hasattr(file_obj, 'tell'):
            current_pos = file_obj.tell()
            file_obj.seek(0, 2)  # seek to end
            file_size = file_obj.tell()
            file_obj.seek(current_pos)  # seek back

        result.file_info = {
            'format': file_type,
            'original_name': file_name,
            'size_bytes': file_size,
            'encoding': encoding if file_type in ('csv', 'json') else None,
        }

        # --- Ensure file position is at the start ---
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)

        # --- Call the appropriate importer ---
        importer_name = self._IMPORTERS.get(file_type)
        if importer_name is None:
            result.success = False
            result.errors.append(f"No importer registered for format '{file_type}'.")
            return result

        importer = getattr(self, importer_name)
        try:
            df, metadata, import_warnings = importer(file_obj, encoding=encoding)
        except Exception as e:
            logger.error("Import failed for %s (%s): %s", file_name, file_type, str(e))
            result.success = False
            result.errors.append(f"Failed to import {file_type.upper()} file: {str(e)}")
            return result

        if df is None or df.empty:
            result.success = False
            result.errors.append("The imported file contains no data.")
            return result

        result.warnings.extend(import_warnings)
        result.variable_metadata = metadata

        # --- Build column info ---
        result.columns = self._build_column_info(df)
        result.n_rows = len(df)
        result.n_cols = len(df.columns)

        # --- Convert to records for JSON serialization ---
        result.data = self._dataframe_to_records(df)

        # --- Attach the raw DataFrame for backend use ---
        result.dataframe = df

        logger.info(
            "Successfully imported %s: %d rows x %d cols from '%s'",
            file_type.upper(), result.n_rows, result.n_cols, file_name,
        )
        return result

    # ------------------------------------------------------------------
    # Format-specific importers
    # ------------------------------------------------------------------

    def _import_csv(
        self, file_obj, encoding: str = 'utf-8', **kwargs
    ) -> Tuple[pd.DataFrame, Dict, List[str]]:
        """Import a CSV file using pandas."""
        warnings_list: List[str] = []
        try:
            df = pd.read_csv(file_obj, encoding=encoding)
        except UnicodeDecodeError:
            # Retry with latin-1 encoding
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
            df = pd.read_csv(file_obj, encoding='latin-1')
            warnings_list.append(
                f"File could not be read as {encoding}; fell back to latin-1 encoding."
            )
        return df, {}, warnings_list

    def _import_excel(
        self, file_obj, **kwargs
    ) -> Tuple[pd.DataFrame, Dict, List[str]]:
        """Import an Excel file (.xlsx/.xls) using pandas + openpyxl/xlrd."""
        warnings_list: List[str] = []
        try:
            df = pd.read_excel(file_obj, engine=None)  # auto-detect engine
        except ImportError as e:
            missing_pkg = 'openpyxl' if 'openpyxl' in str(e) else 'xlrd'
            raise ImportError(
                f"Excel support requires the '{missing_pkg}' package. "
                f"Install it with: pip install {missing_pkg}"
            ) from e

        # Check for multiple sheets
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)
        try:
            xls = pd.ExcelFile(file_obj)
            if len(xls.sheet_names) > 1:
                warnings_list.append(
                    f"Workbook contains {len(xls.sheet_names)} sheets "
                    f"({', '.join(xls.sheet_names)}). Only the first sheet was imported."
                )
        except Exception:
            pass  # Non-critical; skip sheet detection

        return df, {}, warnings_list

    def _import_spss(
        self, file_obj, **kwargs
    ) -> Tuple[pd.DataFrame, Dict, List[str]]:
        """Import an SPSS .sav file using pyreadstat."""
        try:
            import pyreadstat
        except ImportError:
            raise ImportError(
                "SPSS file support requires the 'pyreadstat' package. "
                "Install it with: pip install pyreadstat"
            )

        warnings_list: List[str] = []

        # pyreadstat needs a file path or bytes buffer
        buffer = self._to_bytes_buffer(file_obj)
        df, meta = pyreadstat.read_sav(buffer)

        metadata = self._extract_pyreadstat_metadata(meta)
        return df, metadata, warnings_list

    def _import_sas(
        self, file_obj, **kwargs
    ) -> Tuple[pd.DataFrame, Dict, List[str]]:
        """Import a SAS .sas7bdat file using pyreadstat."""
        try:
            import pyreadstat
        except ImportError:
            raise ImportError(
                "SAS file support requires the 'pyreadstat' package. "
                "Install it with: pip install pyreadstat"
            )

        warnings_list: List[str] = []
        buffer = self._to_bytes_buffer(file_obj)
        df, meta = pyreadstat.read_sas7bdat(buffer)

        metadata = self._extract_pyreadstat_metadata(meta)
        return df, metadata, warnings_list

    def _import_stata(
        self, file_obj, **kwargs
    ) -> Tuple[pd.DataFrame, Dict, List[str]]:
        """Import a Stata .dta file using pyreadstat."""
        try:
            import pyreadstat
        except ImportError:
            raise ImportError(
                "Stata file support requires the 'pyreadstat' package. "
                "Install it with: pip install pyreadstat"
            )

        warnings_list: List[str] = []
        buffer = self._to_bytes_buffer(file_obj)
        df, meta = pyreadstat.read_dta(buffer)

        metadata = self._extract_pyreadstat_metadata(meta)
        return df, metadata, warnings_list

    def _import_json(
        self, file_obj, encoding: str = 'utf-8', **kwargs
    ) -> Tuple[pd.DataFrame, Dict, List[str]]:
        """
        Import a JSON file using pandas.

        Supports both records-oriented JSON (list of dicts) and
        column-oriented JSON (dict of lists).
        """
        warnings_list: List[str] = []

        # Read raw content to try parsing
        raw = file_obj.read()
        if isinstance(raw, bytes):
            raw = raw.decode(encoding)

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {str(e)}")

        if isinstance(parsed, list):
            df = pd.DataFrame(parsed)
        elif isinstance(parsed, dict):
            # Check if it looks like records vs columns
            first_value = next(iter(parsed.values()), None)
            if isinstance(first_value, list):
                df = pd.DataFrame(parsed)
            else:
                # Single record
                df = pd.DataFrame([parsed])
                warnings_list.append(
                    "JSON contained a single object; imported as one row."
                )
        else:
            raise ValueError(
                "Unsupported JSON structure. Expected a list of objects or a dict of arrays."
            )

        return df, {}, warnings_list

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_format(file_obj) -> Optional[str]:
        """Detect the file format from its extension."""
        name = getattr(file_obj, 'name', None)
        if name is None:
            return None
        ext = os.path.splitext(name)[1].lower()
        return SUPPORTED_FORMATS.get(ext)

    @staticmethod
    def _to_bytes_buffer(file_obj) -> io.BytesIO:
        """
        Convert a Django UploadedFile (or any file-like) to a BytesIO buffer
        that pyreadstat can consume.
        """
        if isinstance(file_obj, io.BytesIO):
            file_obj.seek(0)
            return file_obj

        data = file_obj.read()
        if isinstance(data, str):
            data = data.encode('utf-8')
        return io.BytesIO(data)

    @staticmethod
    def _extract_pyreadstat_metadata(meta) -> Dict[str, Any]:
        """
        Extract variable labels, value labels, and missing value definitions
        from a pyreadstat metadata object.
        """
        metadata: Dict[str, Any] = {}

        # Variable labels (column_name -> human-readable label)
        if hasattr(meta, 'column_names_to_labels') and meta.column_names_to_labels:
            metadata['variable_labels'] = {
                k: v for k, v in meta.column_names_to_labels.items() if v
            }

        # Value labels (column_name -> {code: label})
        if hasattr(meta, 'variable_value_labels') and meta.variable_value_labels:
            metadata['value_labels'] = {}
            for col, mapping in meta.variable_value_labels.items():
                if mapping:
                    # Convert numeric keys to strings for JSON safety
                    metadata['value_labels'][col] = {
                        str(k): str(v) for k, v in mapping.items()
                    }

        # Missing value definitions (SPSS user-defined missing values)
        if hasattr(meta, 'missing_ranges') and meta.missing_ranges:
            metadata['missing_ranges'] = {}
            for col, ranges in meta.missing_ranges.items():
                if ranges:
                    metadata['missing_ranges'][col] = [
                        {
                            'lo': _safe_scalar(r.get('lo')),
                            'hi': _safe_scalar(r.get('hi')),
                        }
                        for r in ranges
                    ]

        # File-level metadata
        if hasattr(meta, 'file_label') and meta.file_label:
            metadata['file_label'] = str(meta.file_label)
        if hasattr(meta, 'file_encoding') and meta.file_encoding:
            metadata['file_encoding'] = str(meta.file_encoding)
        if hasattr(meta, 'number_rows'):
            metadata['original_row_count'] = int(meta.number_rows)
        if hasattr(meta, 'number_columns'):
            metadata['original_column_count'] = int(meta.number_columns)

        return metadata

    @staticmethod
    def _build_column_info(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Build a list of column info dicts for the response.

        Each dict contains:
            name, dtype, n_unique, n_missing, sample_values
        """
        columns = []
        for col in df.columns:
            series = df[col]
            n_missing = int(series.isnull().sum())
            n_unique = int(series.nunique())

            # Determine a serializable dtype string
            dtype_str = str(series.dtype)
            if pd.api.types.is_numeric_dtype(series):
                if pd.api.types.is_integer_dtype(series):
                    dtype_str = 'integer'
                else:
                    dtype_str = 'numeric'
            elif pd.api.types.is_datetime64_any_dtype(series):
                dtype_str = 'datetime'
            elif pd.api.types.is_bool_dtype(series):
                dtype_str = 'boolean'
            elif pd.api.types.is_categorical_dtype(series):
                dtype_str = 'categorical'
            else:
                dtype_str = 'string'

            # Collect sample non-null values
            non_null = series.dropna()
            sample_values = [
                _safe_scalar(v) for v in non_null.head(MAX_SAMPLE_VALUES).tolist()
            ]

            columns.append({
                'name': str(col),
                'dtype': dtype_str,
                'n_unique': n_unique,
                'n_missing': n_missing,
                'sample_values': sample_values,
            })
        return columns

    @staticmethod
    def _dataframe_to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Convert a DataFrame to a list of dicts, replacing numpy/pandas types
        with native Python types for JSON serialization.
        """
        records = []
        for _, row in df.iterrows():
            record = {}
            for col in df.columns:
                record[str(col)] = _safe_scalar(row[col])
            records.append(record)
        return records

    @staticmethod
    def get_supported_formats() -> List[Dict[str, str]]:
        """Return a list of supported file formats with descriptions."""
        return [
            {
                'extension': '.csv',
                'format': 'csv',
                'description': 'Comma-separated values',
                'requires': 'pandas (built-in)',
            },
            {
                'extension': '.xlsx',
                'format': 'excel',
                'description': 'Microsoft Excel (modern)',
                'requires': 'openpyxl',
            },
            {
                'extension': '.xls',
                'format': 'excel',
                'description': 'Microsoft Excel (legacy)',
                'requires': 'xlrd',
            },
            {
                'extension': '.sav',
                'format': 'spss',
                'description': 'IBM SPSS Statistics',
                'requires': 'pyreadstat',
            },
            {
                'extension': '.sas7bdat',
                'format': 'sas',
                'description': 'SAS Data Set',
                'requires': 'pyreadstat',
            },
            {
                'extension': '.dta',
                'format': 'stata',
                'description': 'Stata Data File',
                'requires': 'pyreadstat',
            },
            {
                'extension': '.json',
                'format': 'json',
                'description': 'JSON (records or columnar)',
                'requires': 'pandas (built-in)',
            },
        ]


def _safe_scalar(value) -> Any:
    """
    Convert numpy/pandas scalar types to native Python types for JSON serialization.
    Returns None for NaN/NaT values.
    """
    if value is None:
        return None
    if isinstance(value, float) and np.isnan(value):
        return None
    if isinstance(value, (pd.NaT.__class__,)):
        return None
    if pd.isna(value):
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, (np.ndarray,)):
        return value.tolist()
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, (bytes,)):
        return value.decode('utf-8', errors='replace')
    return value
