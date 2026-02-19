/**
 * Platform Service — API Client
 * ==============================
 * Frontend service for platform management endpoints:
 * organizations, tiers, billing, usage, team members, and API keys.
 *
 * Base path: /v1/platform
 *
 * Created: February 2026
 */

import { apiClient } from './api';

const PLATFORM_BASE = '/v1/platform';

/**
 * Get available subscription tiers.
 * @returns {Promise<Object>} List of tiers with features and pricing
 */
export const getTiers = async () => {
  const response = await apiClient.get(`${PLATFORM_BASE}/tiers/`);
  return response.data;
};

/**
 * Get all organizations the current user belongs to.
 * @returns {Promise<Object>} List of organizations
 */
export const getOrganizations = async () => {
  const response = await apiClient.get(`${PLATFORM_BASE}/organizations/`);
  return response.data;
};

/**
 * Create a new organization.
 * @param {Object} data - Organization creation data
 * @param {string} data.name - Organization name
 * @param {string} [data.slug] - URL-friendly slug
 * @returns {Promise<Object>} Created organization
 */
export const createOrganization = async (data) => {
  const response = await apiClient.post(`${PLATFORM_BASE}/organizations/`, data);
  return response.data;
};

/**
 * Get detailed information about a specific organization.
 * @param {string} slug - Organization slug
 * @returns {Promise<Object>} Organization details
 */
export const getOrganizationDetail = async (slug) => {
  const response = await apiClient.get(`${PLATFORM_BASE}/organizations/${slug}/`);
  return response.data;
};

/**
 * Update an organization's settings.
 * @param {string} slug - Organization slug
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Updated organization
 */
export const updateOrganization = async (slug, data) => {
  const response = await apiClient.patch(`${PLATFORM_BASE}/organizations/${slug}/`, data);
  return response.data;
};

/**
 * Get members of an organization.
 * @param {string} slug - Organization slug
 * @returns {Promise<Object>} List of members with roles
 */
export const getMembers = async (slug) => {
  const response = await apiClient.get(`${PLATFORM_BASE}/organizations/${slug}/members/`);
  return response.data;
};

/**
 * Invite a new member to an organization.
 * @param {string} slug - Organization slug
 * @param {string} email - Email address of the invitee
 * @param {string} role - Role to assign (e.g., 'admin', 'member', 'viewer')
 * @returns {Promise<Object>} Invitation result
 */
export const inviteMember = async (slug, email, role) => {
  const response = await apiClient.post(`${PLATFORM_BASE}/organizations/${slug}/invite/`, {
    email,
    role,
  });
  return response.data;
};

/**
 * Get usage statistics for an organization.
 * @param {Object} params - Query parameters
 * @param {string} params.org - Organization slug
 * @param {number} [params.days=30] - Number of days to look back
 * @returns {Promise<Object>} Usage data with daily breakdown
 */
export const getUsage = async (params) => {
  const response = await apiClient.get(`${PLATFORM_BASE}/usage/`, { params });
  return response.data;
};

/**
 * Get billing information for an organization.
 * @param {string} orgSlug - Organization slug
 * @returns {Promise<Object>} Billing details, current plan, and invoices
 */
export const getBilling = async (orgSlug) => {
  const response = await apiClient.get(`${PLATFORM_BASE}/billing/`, {
    params: { org: orgSlug },
  });
  return response.data;
};

/**
 * Create a Stripe checkout session for plan upgrade.
 * @param {Object} data - Checkout data
 * @param {string} data.org - Organization slug
 * @param {string} data.tier - Target tier identifier
 * @returns {Promise<Object>} Checkout session with redirect URL
 */
export const createCheckout = async (data) => {
  const response = await apiClient.post(`${PLATFORM_BASE}/billing/`, data);
  return response.data;
};

/**
 * Get API keys for an organization.
 * @param {string} orgSlug - Organization slug
 * @returns {Promise<Object>} List of API keys (prefix only, not full key)
 */
export const getAPIKeys = async (orgSlug) => {
  const response = await apiClient.get(`${PLATFORM_BASE}/api-keys/`, {
    params: { org: orgSlug },
  });
  return response.data;
};

/**
 * Create a new API key for an organization.
 * @param {Object} data - Key creation data
 * @param {string} data.org - Organization slug
 * @param {string} data.name - Key label/name
 * @returns {Promise<Object>} Created key (full key shown once)
 */
export const createAPIKey = async (data) => {
  const response = await apiClient.post(`${PLATFORM_BASE}/api-keys/`, data);
  return response.data;
};

/**
 * Revoke (delete) an API key.
 * @param {string} keyId - API key identifier
 * @returns {Promise<void>}
 */
export const revokeAPIKey = async (keyId) => {
  const response = await apiClient.delete(`${PLATFORM_BASE}/api-keys/${keyId}/`);
  return response.data;
};

const PlatformService = {
  getTiers,
  getOrganizations,
  createOrganization,
  getOrganizationDetail,
  updateOrganization,
  getMembers,
  inviteMember,
  getUsage,
  getBilling,
  createCheckout,
  getAPIKeys,
  createAPIKey,
  revokeAPIKey,
};

export default PlatformService;
