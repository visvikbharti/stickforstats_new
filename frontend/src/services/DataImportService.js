/**
 * Universal Data Import Service — API Client
 * ============================================
 * Frontend service for importing data files in all major statistical formats.
 *
 * Supported formats:
 * - CSV  (.csv)
 * - Excel (.xlsx, .xls)
 * - SPSS (.sav)
 * - SAS  (.sas7bdat)
 * - Stata (.dta)
 * - JSON (.json)
 *
 * Endpoints:
 * - universalImport(file, options)  -> Upload and parse a data file
 * - getSupportedFormats()           -> List supported formats and install status
 *
 * Created: February 2026
 * Version: 1.0.0
 */

import apiClient from './api';

const DATA_BASE = '/v1/data';

/**
 * Accepted file extensions for client-side validation.
 */
const ACCEPTED_EXTENSIONS = [
  '.csv', '.xlsx', '.xls', '.sav', '.sas7bdat', '.dta', '.json',
];

/**
 * Maximum file size in bytes (100 MB) — matches backend limit.
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Upload and import a data file using the universal import endpoint.
 *
 * @param {File} file - The file to upload (from an <input type="file"> or drag-and-drop).
 * @param {Object} [options={}] - Optional import settings.
 * @param {string}   [options.fileType]     - Explicit format override (e.g. 'csv', 'spss').
 *                                            If omitted, format is auto-detected from extension.
 * @param {string}   [options.encoding]     - Character encoding for CSV/JSON. Default: 'utf-8'.
 * @param {number}   [options.previewRows]  - Number of data rows to return. Default: 100, max: 1000.
 * @param {Function} [options.onProgress]   - Callback receiving upload progress (0-100).
 * @param {AbortSignal} [options.signal]    - AbortController signal for cancellation.
 * @returns {Promise<Object>} Import result with data preview, column info, and metadata.
 *
 * @example
 * import { universalImport } from './services/DataImportService';
 *
 * const result = await universalImport(file, {
 *   onProgress: (pct) => setProgress(pct),
 * });
 * if (result.success) {
 *   console.log(`Imported ${result.n_rows} rows, ${result.n_cols} columns`);
 * }
 */
export const universalImport = async (file, options = {}) => {
  // --- Client-side validation ---
  if (!file) {
    throw new Error('No file provided.');
  }

  // Validate extension
  const fileName = file.name || '';
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported file type "${ext}". Accepted formats: ${ACCEPTED_EXTENSIONS.join(', ')}`
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    const actualMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `File too large (${actualMB} MB). Maximum allowed: ${maxMB} MB.`
    );
  }

  // --- Build FormData ---
  const formData = new FormData();
  formData.append('file', file);

  if (options.fileType) {
    formData.append('file_type', options.fileType);
  }
  if (options.encoding) {
    formData.append('encoding', options.encoding);
  }
  if (options.previewRows !== undefined) {
    formData.append('preview_rows', String(options.previewRows));
  }

  // --- Upload with progress tracking ---
  const response = await apiClient.post(
    `${DATA_BASE}/universal-import/`,
    formData,
    {
      headers: {  },
      timeout: 120000, // 2 minutes for large files
      signal: options.signal || undefined,
      onUploadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          options.onProgress(percentCompleted);
        }
      },
    }
  );

  return response.data;
};

/**
 * Retrieve the list of supported file formats from the backend.
 * Includes whether required Python packages are installed.
 *
 * @returns {Promise<Object>} Object with `formats` array and `max_upload_size_bytes`.
 *
 * @example
 * import { getSupportedFormats } from './services/DataImportService';
 *
 * const { formats, max_upload_size_mb } = await getSupportedFormats();
 * formats.forEach(f => {
 *   console.log(`${f.extension} (${f.description}) — installed: ${f.installed}`);
 * });
 */
export const getSupportedFormats = async () => {
  const response = await apiClient.get(`${DATA_BASE}/supported-formats/`);
  return response.data;
};

/**
 * Client-side utility: check if a filename has a supported extension.
 *
 * @param {string} filename - The file name to check.
 * @returns {boolean} True if the extension is supported.
 */
export const isSupportedFormat = (filename) => {
  if (!filename) return false;
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
};

/**
 * Client-side utility: get the human-readable format name for a file.
 *
 * @param {string} filename - The file name.
 * @returns {string} Format description (e.g. "SPSS (.sav)").
 */
export const getFormatLabel = (filename) => {
  if (!filename) return 'Unknown';
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const labels = {
    '.csv': 'CSV (.csv)',
    '.xlsx': 'Excel (.xlsx)',
    '.xls': 'Excel (.xls)',
    '.sav': 'SPSS (.sav)',
    '.sas7bdat': 'SAS (.sas7bdat)',
    '.dta': 'Stata (.dta)',
    '.json': 'JSON (.json)',
  };
  return labels[ext] || `Unknown (${ext})`;
};

/**
 * Client-side constant: accepted extensions for file input elements.
 * Use as the `accept` attribute on <input type="file">.
 *
 * @example
 * <input type="file" accept={ACCEPT_STRING} onChange={handleFile} />
 */
export const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(',');

const dataImportService = {
  universalImport,
  getSupportedFormats,
  isSupportedFormat,
  getFormatLabel,
  ACCEPT_STRING,
};

export default dataImportService;
