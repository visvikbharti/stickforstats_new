/**
 * Autonomous Intelligence Layer — API Client
 * ============================================
 * Frontend service for the autonomous analysis pipeline.
 *
 * Endpoints:
 * - profileData(file|data)       → Smart data profiling
 * - queryAnalysis(query, data)    → Full autonomous pipeline
 * - executeCascade(test, data)    → Guardian cascade execution
 * - translateResults(type, results) → Plain language translation
 * - getNextSteps(state)           → Next step recommendations
 *
 * Created: February 2026
 */

import apiClient from './api';

const AUTONOMOUS_BASE = '/v1/autonomous';

/**
 * The variables of a profile as the list the page shows.
 *
 * The server sends them as an object keyed by the variable's name, with the number of distinct
 * values under `n_unique` and the result of its normality check under `is_normal`
 * (backend/core/services/smart_profiler.py). The page lists them, and reads `unique_values` and
 * `normality`. It called `.map` on the object and crashed as soon as a file had been profiled.
 * Every field the server sends is kept.
 */
export const variableList = (variables) => {
  if (Array.isArray(variables)) return variables;
  if (!variables || typeof variables !== 'object') return [];
  return Object.entries(variables).map(([name, summary]) => ({
    ...summary,
    name,
    unique_values: summary.n_unique,
    normality: summary.is_normal == null ? null : summary.is_normal ? 'normal' : 'not normal',
  }));
};

const withVariableList = (profile) =>
  profile && typeof profile === 'object' ? { ...profile, variables: variableList(profile.variables) } : profile;

/**
 * Profile uploaded data — returns health card, inferred questions, recommendations.
 * @param {File|Object} dataSource - CSV/Excel File object, or {data: [...]} object
 * @param {string} [userHint] - Optional hint about research goal
 * @returns {Promise<Object>} Profile result
 */
export const profileData = async (dataSource, userHint = null) => {
  if (dataSource instanceof File) {
    const formData = new FormData();
    formData.append('file', dataSource);
    if (userHint) formData.append('user_hint', userHint);

    const response = await apiClient.post(`${AUTONOMOUS_BASE}/profile/`, formData, {
      headers: {  },
      timeout: 60000, // 60s for large files
    });
    return withVariableList(response.data);
  }

  // JSON data
  const payload = { data: dataSource };
  if (userHint) payload.user_hint = userHint;
  const response = await apiClient.post(`${AUTONOMOUS_BASE}/profile/`, payload);
  return withVariableList(response.data);
};

/**
 * Full autonomous query pipeline — query + data → results in plain English.
 * @param {string} query - Natural language research question
 * @param {File|Object} dataSource - CSV/Excel File or data object
 * @param {string} [mode='plain_english'] - Output mode
 * @param {number} [alpha=0.05] - Significance level
 * @returns {Promise<Object>} Complete analysis result
 */
export const queryAnalysis = async (query, dataSource, mode = 'plain_english', alpha = 0.05) => {
  if (dataSource instanceof File) {
    const formData = new FormData();
    formData.append('file', dataSource);
    formData.append('query', query);
    formData.append('mode', mode);
    formData.append('alpha', String(alpha));

    const response = await apiClient.post(`${AUTONOMOUS_BASE}/query/`, formData, {
      headers: {  },
      timeout: 120000, // 2 min for full pipeline
    });
    return response.data;
  }

  const payload = { query, data: dataSource, mode, alpha };
  const response = await apiClient.post(`${AUTONOMOUS_BASE}/query/`, payload, {
    timeout: 120000,
  });
  return response.data;
};

/**
 * Execute a specific test with Guardian cascade protection.
 * @param {string} testName - Test to execute (e.g., 'independent_t')
 * @param {Object} data - Data in dict-of-arrays or list-of-arrays format
 * @param {number} [alpha=0.05] - Significance level
 * @param {number} [maxCascades=3] - Max cascade attempts
 * @returns {Promise<Object>} Cascade result
 */
export const executeCascade = async (testName, data, alpha = 0.05, maxCascades = 3) => {
  const response = await apiClient.post(`${AUTONOMOUS_BASE}/cascade/`, {
    test: testName,
    data,
    alpha,
    max_cascades: maxCascades,
  }, {
    timeout: 60000,
  });
  return response.data;
};

/**
 * Translate statistical results to plain English / researcher / APA format.
 * @param {string} testType - Test type name
 * @param {Object} results - Result object with statistic, p_value, effect_size
 * @param {string} [mode='plain_english'] - Output mode
 * @param {number} [alpha=0.05] - Significance level
 * @returns {Promise<Object>} Translation with summary, details, effect_size_interpretation
 */
export const translateResults = async (testType, results, mode = 'plain_english', alpha = 0.05) => {
  const response = await apiClient.post(`${AUTONOMOUS_BASE}/translate/`, {
    test_type: testType,
    results,
    mode,
    alpha,
  });
  return response.data;
};

/**
 * Get recommendations for next analysis steps.
 * @param {Object} analysisState - Current state of analysis session
 * @returns {Promise<Object>} Next step recommendations
 */
export const getNextSteps = async (analysisState) => {
  const response = await apiClient.post(`${AUTONOMOUS_BASE}/next-step/`, analysisState);
  return response.data;
};

const AutonomousService = {
  profileData,
  queryAnalysis,
  executeCascade,
  translateResults,
  getNextSteps,
};

export default AutonomousService;
