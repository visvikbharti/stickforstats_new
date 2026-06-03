/**
 * Manuscript Review Service — API Client
 * =======================================
 * Frontend service for the manuscript statistical quality review pipeline.
 *
 * Endpoints:
 * - analyzeManuscript(file, options)   → Full statistical review report
 * - parseManuscript(file)              → Parse sections + metadata only
 * - extractClaims(file)               → Extract statistical claims
 * - checkConsistency(file, options)    → Consistency validation
 * - getReport(submissionId)           → Retrieve stored report
 * - journalSubmit(file, apiKey, options) → Submit to journal
 *
 * Created: February 2026
 */

import apiClient from './api';

const MANUSCRIPT_BASE = '/v1/manuscript';
const RECEIPT_BASE = '/v1/receipt';

/**
 * Analyze a manuscript — returns full statistical review report.
 * @param {File} file - PDF, LaTeX, or DOCX manuscript file
 * @param {Object} [options={}] - Analysis options
 * @param {string} [options.field='general'] - Research field
 * @param {number} [options.alpha=0.05] - Significance level
 * @returns {Promise<Object>} Full review report
 */
export const analyzeManuscript = async (file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('field', options.field || 'general');
  formData.append('alpha', String(options.alpha ?? 0.05));

  const response = await apiClient.post(`${MANUSCRIPT_BASE}/analyze/`, formData, {
    headers: {  },
    timeout: 120000, // 2 min for large manuscripts
  });
  return response.data;
};

/**
 * Parse a manuscript — returns parsed sections and metadata without full analysis.
 * @param {File} file - PDF, LaTeX, or DOCX manuscript file
 * @returns {Promise<Object>} Parsed sections + metadata
 */
export const parseManuscript = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`${MANUSCRIPT_BASE}/parse/`, formData, {
    headers: {  },
    timeout: 60000, // 60s
  });
  return response.data;
};

/**
 * Extract statistical claims from a manuscript.
 * @param {File} file - PDF, LaTeX, or DOCX manuscript file
 * @returns {Promise<Object>} Claims list + extraction summary
 */
export const extractClaims = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(`${MANUSCRIPT_BASE}/claims/`, formData, {
    headers: {  },
    timeout: 90000, // 90s
  });
  return response.data;
};

/**
 * Check internal consistency of statistical claims in a manuscript.
 * @param {File} file - PDF, LaTeX, or DOCX manuscript file
 * @param {Object} [options={}] - Consistency check options
 * @param {number} [options.alpha=0.05] - Significance level
 * @returns {Promise<Object>} Consistency validation results
 */
export const checkConsistency = async (file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('alpha', String(options.alpha ?? 0.05));

  const response = await apiClient.post(`${MANUSCRIPT_BASE}/consistency/`, formData, {
    headers: {  },
    timeout: 90000, // 90s
  });
  return response.data;
};

/**
 * Retrieve a previously stored manuscript review report.
 * @param {string} submissionId - Submission identifier
 * @returns {Promise<Object>} Stored report
 */
export const getReport = async (submissionId) => {
  const response = await apiClient.get(`${MANUSCRIPT_BASE}/report/${submissionId}/`, {
    timeout: 15000, // 15s
  });
  return response.data;
};

/**
 * Submit a manuscript to a journal via its API.
 * @param {File} file - PDF, LaTeX, or DOCX manuscript file
 * @param {string} apiKey - Journal API key
 * @param {Object} [options={}] - Submission options
 * @param {string} [options.manuscriptId] - Manuscript identifier
 * @param {string} [options.title] - Manuscript title
 * @param {string[]} [options.authors] - List of author names
 * @returns {Promise<Object>} Submission result
 */
export const journalSubmit = async (file, apiKey, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  if (options.manuscriptId) formData.append('manuscript_id', options.manuscriptId);
  if (options.title) formData.append('title', options.title);
  if (options.authors) formData.append('authors', JSON.stringify(options.authors));

  const response = await apiClient.post(`${MANUSCRIPT_BASE}/journal/submit/`, formData, {
    headers: {
      
      'X-API-Key': apiKey,
    },
    timeout: 120000, // 2 min
  });
  return response.data;
};

/**
 * Issue a signed reproducibility receipt for a completed analysis.
 * @param {string} submissionId - submission_id from analyzeManuscript()
 * @param {string} token - report_token from analyzeManuscript() (proves ownership)
 * @param {Object} [options={}] - { minimal: bool }
 * @returns {Promise<Object>} { receipt_id, download_token, verify_url, download_url, ... }
 */
export const issueReceipt = async (submissionId, token, options = {}) => {
  const body = { submission_id: submissionId, token };
  if (options.minimal) body.minimal = true;
  const response = await apiClient.post(`${RECEIPT_BASE}/issue/`, body, { timeout: 30000 });
  return response.data;
};

/**
 * Verify a reproducibility receipt (public — no auth, no trust required).
 * @param {string} receiptId - the receipt UUID
 * @param {string} [token] - optional download token to also check
 * @returns {Promise<Object>} structured verdict { valid, signature_ok, ... }
 */
export const verifyReceipt = async (receiptId, token) => {
  const params = token ? { token } : {};
  const response = await apiClient.get(`${RECEIPT_BASE}/verify/${receiptId}/`, { params, timeout: 15000 });
  return response.data;
};

/**
 * Direct (browser-navigable) URL to download the self-contained signed
 * receipt artifact. Requires the one-time download token.
 * @param {string} [format='json'] - 'json' or 'zip' (bundle with public key
 *   + an offline verify_receipt.py script)
 */
export const receiptDownloadUrl = (receiptId, token, format = 'json') =>
  `/api/v1/receipt/${receiptId}/download/?token=${encodeURIComponent(token)}&format=${format}`;

const ManuscriptService = {
  analyzeManuscript,
  parseManuscript,
  extractClaims,
  checkConsistency,
  getReport,
  journalSubmit,
  issueReceipt,
  verifyReceipt,
  receiptDownloadUrl,
};

export default ManuscriptService;
