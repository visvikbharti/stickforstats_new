import React, { useState, useMemo, useContext, useCallback } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Typography, TextField, Paper, Chip, Divider, IconButton, useMediaQuery, useTheme,
  InputAdornment, Tooltip, Alert, Tabs, Tab,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ScienceIcon from '@mui/icons-material/Science';
import ShieldIcon from '@mui/icons-material/Shield';
import GradingIcon from '@mui/icons-material/Grading';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ArticleIcon from '@mui/icons-material/Article';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SchoolIcon from '@mui/icons-material/School';
import VerifiedIcon from '@mui/icons-material/Verified';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import BusinessIcon from '@mui/icons-material/Business';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import DarkModeContext from '../context/DarkModeContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DRAWER_WIDTH = 280;

const METHOD_COLORS = {
  GET: { bg: '#e8f5e9', color: '#2e7d32', darkBg: '#1b3a1b', darkColor: '#66bb6a' },
  POST: { bg: '#e3f2fd', color: '#1565c0', darkBg: '#0d2744', darkColor: '#42a5f5' },
  PATCH: { bg: '#fff3e0', color: '#e65100', darkBg: '#3d2200', darkColor: '#ffa726' },
  PUT: { bg: '#fff3e0', color: '#e65100', darkBg: '#3d2200', darkColor: '#ffa726' },
  DELETE: { bg: '#ffebee', color: '#c62828', darkBg: '#3d0c0c', darkColor: '#ef5350' },
};

const CATEGORY_ICONS = {
  'Statistical Tests': ScienceIcon,
  'Guardian Protection': ShieldIcon,
  'SQS Manuscript Scoring': GradingIcon,
  'Autonomous Intelligence': SmartToyIcon,
  'Manuscript Review': ArticleIcon,
  'Journal Analytics': AnalyticsIcon,
  'Platform Management': SettingsIcon,
  'GDPR/Privacy': PrivacyTipIcon,
  'Marketplace': StorefrontIcon,
  'LMS/LTI': SchoolIcon,
  'Certification': VerifiedIcon,
  'SSO': VpnKeyIcon,
  'Site Licensing': BusinessIcon,
  'AI Advisor': PsychologyIcon,
};

// ---------------------------------------------------------------------------
// API Endpoint Data — comprehensive reference derived from urls.py
// ---------------------------------------------------------------------------
const API_ENDPOINTS = [
  // ── Statistical Tests ───────────────────────────────────────────────────
  {
    method: 'POST', path: '/api/v1/stats/ttest/', name: 'Independent Samples T-Test',
    description: 'Compare means of two independent groups. Includes Guardian assumption validation, 50-decimal precision via mpmath, and automatic effect size (Cohen\'s d).',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { group1: '[4.2, 5.1, 3.8, 6.0, 5.5]', group2: '[7.1, 8.3, 6.9, 7.5, 8.0]', alpha: '0.05', test_type: 'independent' } },
    response: { example: { t_statistic: -5.014, p_value: 0.00105, effect_size_cohens_d: 2.243, confidence_interval: [-4.37, -1.43], degrees_of_freedom: 8, guardian: { confidence: 0.92, violations: [] } } },
  },
  {
    method: 'POST', path: '/api/v1/stats/anova/', name: 'One-Way ANOVA',
    description: 'Compare means across three or more groups with Levene\'s test for homogeneity, post-hoc comparisons (Tukey HSD), and eta-squared effect size.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { groups: '[[3,4,5],[6,7,8],[9,10,11]]', alpha: '0.05', post_hoc: 'tukey' } },
    response: { example: { f_statistic: 27.0, p_value: 0.00013, eta_squared: 0.9, post_hoc: { tukey: [{ comparison: 'G1 vs G2', p_adj: 0.004 }] } } },
  },
  {
    method: 'POST', path: '/api/v1/stats/ancova/', name: 'ANCOVA',
    description: 'Analysis of covariance — compare group means while controlling for covariates. High-precision computation with 50-decimal accuracy.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { dependent: '[5,6,7,8]', groups: '[1,1,2,2]', covariates: '[[2,3,4,5]]', alpha: '0.05' } },
    response: { example: { f_statistic: 12.5, p_value: 0.038, adjusted_means: { group_1: 5.8, group_2: 7.2 }, eta_squared: 0.68 } },
  },
  {
    method: 'POST', path: '/api/v1/stats/correlation/', name: 'Correlation Analysis',
    description: 'Compute Pearson, Spearman, or Kendall correlation with confidence intervals and Guardian assumption checks (normality, outliers).',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { x: '[1,2,3,4,5]', y: '[2,4,5,4,5]', method: 'pearson' } },
    response: { example: { r: 0.8, p_value: 0.104, confidence_interval: [0.12, 0.97], method: 'pearson' } },
  },
  {
    method: 'POST', path: '/api/v1/stats/regression/', name: 'Regression Analysis',
    description: 'Simple/multiple linear regression with R-squared, adjusted R-squared, residual diagnostics, and coefficient confidence intervals.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { x: '[[1],[2],[3],[4],[5]]', y: '[2.1,3.9,6.2,7.8,10.1]' } },
    response: { example: { coefficients: [0.05, 2.0], r_squared: 0.994, adjusted_r_squared: 0.992, f_statistic: 496.0, p_value: 0.00001 } },
  },
  {
    method: 'POST', path: '/api/v1/stats/descriptive/', name: 'Descriptive Statistics',
    description: 'Compute mean, median, mode, standard deviation, skewness, kurtosis, quartiles, and 50-decimal precision values.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { data: '[4, 8, 15, 16, 23, 42]' } },
    response: { example: { mean: 18.0, median: 15.5, std_dev: 13.28, skewness: 0.89, kurtosis: -0.35, n: 6 } },
  },
  {
    method: 'POST', path: '/api/v1/stats/recommend/', name: 'Automatic Test Selection',
    description: 'Upload your dataset and receive Guardian-powered recommendations for the most appropriate statistical test based on data characteristics.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { data: '{"col1":[1,2,3],"col2":[4,5,6]}', research_question: 'compare groups' } },
    response: { example: { recommended_test: 'independent_t_test', confidence: 0.95, alternatives: ['mann_whitney_u'], reasoning: 'Two numeric groups, approximately normal' } },
  },
  {
    method: 'POST', path: '/api/v1/nonparametric/mann-whitney/', name: 'Mann-Whitney U Test',
    description: 'Non-parametric alternative to independent t-test. Tests whether two samples come from the same distribution.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { group1: '[3,5,2,6,1]', group2: '[8,7,9,6,10]' } },
    response: { example: { u_statistic: 2.0, p_value: 0.016, effect_size_r: 0.75, rank_biserial: 0.84 } },
  },
  {
    method: 'POST', path: '/api/v1/nonparametric/kruskal-wallis/', name: 'Kruskal-Wallis H Test',
    description: 'Non-parametric alternative to one-way ANOVA for comparing distributions across three or more groups.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { groups: '[[1,2,3],[4,5,6],[7,8,9]]' } },
    response: { example: { h_statistic: 7.2, p_value: 0.027, df: 2, epsilon_squared: 0.90 } },
  },
  {
    method: 'POST', path: '/api/v1/categorical/chi-square/independence/', name: 'Chi-Square Independence Test',
    description: 'Test association between two categorical variables using a contingency table with Cramer\'s V effect size.',
    auth: 'Token / API Key', category: 'Statistical Tests',
    request: { body: { observed: '[[10,20],[30,40]]' } },
    response: { example: { chi2: 0.267, p_value: 0.606, df: 1, cramers_v: 0.052, expected: [[12, 18], [28, 42]] } },
  },

  // ── Guardian Protection ─────────────────────────────────────────────────
  {
    method: 'POST', path: '/api/v1/stats/ttest/', name: 'Guardian-Protected T-Test',
    description: 'Every statistical endpoint automatically runs 8 Guardian validators: normality (Shapiro-Wilk), homogeneity (Levene), sample size, outlier detection, independence, measurement scale, missing data, and equal variances.',
    auth: 'Token / API Key', category: 'Guardian Protection',
    request: { body: { group1: '[1,1,1,1,100]', group2: '[2,2,2,2,200]', alpha: '0.05' } },
    response: { example: { guardian: { confidence: 0.45, violations: [{ validator: 'outlier_detection', severity: 'critical', message: 'Extreme outliers detected in both groups', suggestion: 'Consider robust methods or removing outliers' }], recommendation: 'Use Mann-Whitney U instead' } } },
  },
  {
    method: 'GET', path: '/api/v1/validation/dashboard/', name: 'Validation Dashboard',
    description: 'Retrieve Guardian validation metrics, recent violation history, and overall statistical quality indicators for the current session.',
    auth: 'Token / API Key', category: 'Guardian Protection',
    request: {},
    response: { example: { total_analyses: 42, guardian_pass_rate: 0.88, common_violations: ['normality', 'sample_size'], avg_confidence: 0.82 } },
  },
  {
    method: 'GET', path: '/api/v1/audit/summary/', name: 'Audit Summary',
    description: 'Full audit trail of all analyses performed, including Guardian decisions, Expert Mode overrides, and statistical integrity metrics.',
    auth: 'Token / API Key', category: 'Guardian Protection',
    request: {},
    response: { example: { total_records: 156, expert_overrides: 3, high_confidence: 140, flagged: 13 } },
  },
  {
    method: 'GET', path: '/api/v1/audit/health/', name: 'Audit System Health',
    description: 'Health check for the audit subsystem — confirms database connectivity, record integrity, and storage availability.',
    auth: 'None', category: 'Guardian Protection',
    request: {},
    response: { example: { status: 'healthy', db_connected: true, records_count: 156, storage_ok: true } },
  },

  // ── SQS Manuscript Scoring ──────────────────────────────────────────────
  {
    method: 'POST', path: '/api/v1/sqs/analyze/', name: 'SQS Full Analysis',
    description: 'Upload a manuscript (PDF/DOCX) for comprehensive Statistical Quality Score analysis across 45 rules in 6 categories. Returns a 0-100 SQS score.',
    auth: 'Token / API Key', category: 'SQS Manuscript Scoring',
    request: { body: { file: '<multipart PDF or DOCX>', journal: 'jss' } },
    response: { example: { sqs_score: 78, grade: 'B+', categories: { reporting: 92, methodology: 85, assumptions: 65, effect_sizes: 70, reproducibility: 80, visualization: 75 }, violations: 7, rules_checked: 45 } },
  },
  {
    method: 'POST', path: '/api/v1/sqs/analyze-text/', name: 'SQS Text Analysis',
    description: 'Analyze raw manuscript text (plain text or LaTeX) for statistical quality without file upload.',
    auth: 'Token / API Key', category: 'SQS Manuscript Scoring',
    request: { body: { text: 'We performed a t-test (p<0.05) showing significance...', journal: 'jss' } },
    response: { example: { sqs_score: 45, grade: 'D', issues: [{ rule: 'R1', message: 'Exact p-values should be reported', severity: 'critical' }] } },
  },
  {
    method: 'GET', path: '/api/v1/sqs/rules/', name: 'SQS Rules Catalog',
    description: 'List all 45 SQS rules with descriptions, severity levels, categories, and example violations.',
    auth: 'None', category: 'SQS Manuscript Scoring',
    request: {},
    response: { example: { rules: [{ id: 'R1', name: 'Exact p-values', category: 'reporting', severity: 'critical', description: 'Report exact p-values, not just < or > thresholds' }], total: 45 } },
  },
  {
    method: 'GET', path: '/api/v1/sqs/fields/', name: 'SQS Fields Reference',
    description: 'List all SQS scoring fields and their weight in the final score calculation.',
    auth: 'None', category: 'SQS Manuscript Scoring',
    request: {},
    response: { example: { fields: [{ name: 'p_value_reporting', weight: 3.0, category: 'reporting' }] } },
  },
  {
    method: 'GET', path: '/api/v1/sqs/categories/', name: 'SQS Categories',
    description: 'List the 6 SQS scoring categories with descriptions and max points.',
    auth: 'None', category: 'SQS Manuscript Scoring',
    request: {},
    response: { example: { categories: ['reporting', 'methodology', 'assumptions', 'effect_sizes', 'reproducibility', 'visualization'] } },
  },
  {
    method: 'POST', path: '/api/v1/sqs/quick-check/', name: 'SQS Quick Check',
    description: 'Rapid check of a statistical statement for common reporting errors. Lighter-weight than full analysis.',
    auth: 'Token / API Key', category: 'SQS Manuscript Scoring',
    request: { body: { statement: 't(28) = 2.45, p < 0.05' } },
    response: { example: { issues: [{ rule: 'R1', message: 'Report exact p-value instead of threshold' }], pass: false } },
  },
  {
    method: 'GET', path: '/api/v1/sqs/health/', name: 'SQS System Health',
    description: 'Health check for the SQS scoring engine — confirms rule engine is loaded and operational.',
    auth: 'None', category: 'SQS Manuscript Scoring',
    request: {},
    response: { example: { status: 'healthy', rules_loaded: 45, categories_loaded: 6, engine_version: '1.0.0' } },
  },

  // ── Autonomous Intelligence ─────────────────────────────────────────────
  {
    method: 'POST', path: '/api/v1/autonomous/profile/', name: 'Smart Data Profiling',
    description: 'Upload a dataset and receive an autonomous profile: variable types, distributions, correlations, anomalies, and recommended analyses.',
    auth: 'Token / API Key', category: 'Autonomous Intelligence',
    request: { body: { data: '{"age":[25,30,35],"score":[80,90,85]}', context: 'educational study' } },
    response: { example: { variables: [{ name: 'age', type: 'continuous', distribution: 'normal' }], suggested_tests: ['correlation', 'regression'], data_quality: 0.95 } },
  },
  {
    method: 'POST', path: '/api/v1/autonomous/query/', name: 'Natural Language Query',
    description: 'Ask a statistical question in plain English. The system interprets intent, selects tests, and returns results.',
    auth: 'Token / API Key', category: 'Autonomous Intelligence',
    request: { body: { query: 'Is there a significant difference between treatment and control?', data_id: 'session_abc123' } },
    response: { example: { interpretation: 'Two-group comparison', test_selected: 'independent_t_test', results: { t: 3.2, p: 0.004 }, narrative: 'There is a statistically significant difference...' } },
  },
  {
    method: 'POST', path: '/api/v1/autonomous/cascade/', name: 'Analysis Cascade',
    description: 'Execute a full analysis cascade: profiling, assumption testing, primary analysis, post-hoc tests, and effect sizes in one call.',
    auth: 'Token / API Key', category: 'Autonomous Intelligence',
    request: { body: { data: '{"group":[1,1,2,2],"score":[5,6,8,9]}', cascade_type: 'full' } },
    response: { example: { steps: ['profiling', 'assumptions', 'anova', 'post_hoc', 'effect_size'], results: {}, total_time_ms: 320 } },
  },
  {
    method: 'POST', path: '/api/v1/autonomous/translate/', name: 'Translate Results',
    description: 'Convert raw statistical output into plain-English narrative suitable for a methods section or executive summary.',
    auth: 'Token / API Key', category: 'Autonomous Intelligence',
    request: { body: { results: { t: 3.2, p: 0.004, d: 1.1 }, audience: 'non-technical' } },
    response: { example: { narrative: 'The treatment group scored significantly higher than the control group, with a large practical effect.' } },
  },
  {
    method: 'POST', path: '/api/v1/autonomous/next-step/', name: 'Next Step Suggestion',
    description: 'Given current analysis results, suggest the logical next analytical step (e.g., post-hoc, effect size, visualization).',
    auth: 'Token / API Key', category: 'Autonomous Intelligence',
    request: { body: { current_test: 'anova', results: { f: 12.5, p: 0.001 } } },
    response: { example: { next_steps: [{ action: 'post_hoc_tukey', reason: 'Significant ANOVA requires pairwise comparisons' }, { action: 'effect_size', reason: 'Report eta-squared for practical significance' }] } },
  },

  // ── Manuscript Review ───────────────────────────────────────────────────
  {
    method: 'POST', path: '/api/v1/manuscript/analyze/', name: 'Full Manuscript Analysis',
    description: 'Comprehensive statistical review of an uploaded manuscript. Extracts claims, checks consistency, validates methodology, and generates SQS score.',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: { body: { file: '<multipart PDF/DOCX>', journal_guidelines: 'jss' } },
    response: { example: { claims_found: 12, inconsistencies: 2, sqs_score: 81, methodology_issues: ['Missing effect sizes for 3 tests'], overall_verdict: 'minor_revisions' } },
  },
  {
    method: 'POST', path: '/api/v1/manuscript/parse/', name: 'Manuscript Parser',
    description: 'Parse a manuscript into structured sections: abstract, methods, results, discussion. Extract tables and figures.',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: { body: { file: '<multipart PDF>' } },
    response: { example: { sections: { abstract: '...', methods: '...', results: '...' }, tables: 3, figures: 5, references: 42 } },
  },
  {
    method: 'POST', path: '/api/v1/manuscript/claims/', name: 'Claim Extraction',
    description: 'Extract all statistical claims from a manuscript with confidence scores. Identifies p-values, test statistics, effect sizes, and sample sizes.',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: { body: { text: 'We found a significant effect (t(28)=3.45, p=0.002, d=1.1)...' } },
    response: { example: { claims: [{ text: 't(28)=3.45, p=0.002, d=1.1', test: 't-test', p_value: 0.002, effect_size: 1.1, confidence: 0.98 }] } },
  },
  {
    method: 'POST', path: '/api/v1/manuscript/consistency/', name: 'Consistency Check',
    description: 'Cross-validate statistical claims within a manuscript: do reported degrees of freedom match sample sizes? Are p-values consistent with test statistics?',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: { body: { claims: [{ test: 't-test', df: 28, t: 3.45, p: 0.002 }] } },
    response: { example: { consistent: true, checks: [{ claim_index: 0, expected_p: 0.0018, reported_p: 0.002, match: true }] } },
  },
  {
    method: 'GET', path: '/api/v1/manuscript/report/{submission_id}/', name: 'Submission Report',
    description: 'Retrieve the full review report for a previously analyzed manuscript submission.',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: {},
    response: { example: { submission_id: 'abc-123', status: 'reviewed', sqs_score: 81, claims: 12, issues: 2, report_url: '/reports/abc-123.pdf' } },
  },
  {
    method: 'POST', path: '/api/v1/manuscript/journal/submit/', name: 'Journal Submission',
    description: 'Submit a reviewed manuscript to a target journal with the SQS certificate and review report attached.',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: { body: { submission_id: 'abc-123', journal: 'jss', cover_letter: '...' } },
    response: { example: { status: 'submitted', journal: 'jss', tracking_id: 'JSS-2026-0042' } },
  },
  {
    method: 'POST', path: '/api/v1/manuscript/batch-submit/', name: 'Batch Manuscript Submit',
    description: 'Submit multiple manuscripts for review in a single batch. Returns a batch tracking ID.',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: { body: { files: ['<file1>', '<file2>'], journal: 'jss' } },
    response: { example: { batch_id: 'batch-xyz', count: 2, status: 'processing', estimated_time_s: 120 } },
  },
  {
    method: 'GET', path: '/api/v1/manuscript/batch-status/{batch_id}/', name: 'Batch Status',
    description: 'Check the processing status of a batch manuscript submission.',
    auth: 'Token / API Key', category: 'Manuscript Review',
    request: {},
    response: { example: { batch_id: 'batch-xyz', status: 'complete', completed: 2, failed: 0, results: ['sub-1', 'sub-2'] } },
  },

  // ── Journal Analytics ───────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/journal/analytics/overview/', name: 'Analytics Overview',
    description: 'High-level journal analytics: acceptance rates, average review times, SQS score distributions, and submission volumes.',
    auth: 'Token / API Key', category: 'Journal Analytics',
    request: {},
    response: { example: { total_submissions: 234, acceptance_rate: 0.42, avg_review_days: 45, avg_sqs_score: 72 } },
  },
  {
    method: 'GET', path: '/api/v1/journal/analytics/issues/', name: 'Common Statistical Issues',
    description: 'Aggregated report of the most common statistical issues found across all reviewed manuscripts.',
    auth: 'Token / API Key', category: 'Journal Analytics',
    request: {},
    response: { example: { top_issues: [{ issue: 'Missing effect sizes', frequency: 0.67 }, { issue: 'Inexact p-values', frequency: 0.54 }] } },
  },
  {
    method: 'GET', path: '/api/v1/journal/analytics/trends/', name: 'Quality Trends',
    description: 'Statistical quality trends over time: monthly SQS averages, violation frequencies, and improvement trajectories.',
    auth: 'Token / API Key', category: 'Journal Analytics',
    request: {},
    response: { example: { months: ['2025-10', '2025-11', '2025-12'], avg_sqs: [68, 72, 76], trend: 'improving' } },
  },
  {
    method: 'GET', path: '/api/v1/journal/analytics/comparison/', name: 'Journal Comparison',
    description: 'Compare statistical quality metrics across different journals or time periods.',
    auth: 'Token / API Key', category: 'Journal Analytics',
    request: {},
    response: { example: { journals: [{ name: 'JSS', avg_sqs: 78 }, { name: 'JASA', avg_sqs: 82 }] } },
  },

  // ── Platform Management ─────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/platform/tiers/', name: 'Tier Information',
    description: 'List available subscription tiers (Free, Academic, Professional, Enterprise) with features, limits, and pricing.',
    auth: 'None', category: 'Platform Management',
    request: {},
    response: { example: { tiers: [{ name: 'Free', price: 0, analyses_per_month: 50 }, { name: 'Academic', price: 9.99, analyses_per_month: 500 }] } },
  },
  {
    method: 'POST', path: '/api/v1/platform/organizations/', name: 'Create Organization',
    description: 'Create a new organization for team-based access with role-based permissions.',
    auth: 'Token', category: 'Platform Management',
    request: { body: { name: 'My Research Lab', tier: 'academic' } },
    response: { example: { slug: 'my-research-lab', name: 'My Research Lab', tier: 'academic', created_at: '2026-02-19T00:00:00Z' } },
  },
  {
    method: 'GET', path: '/api/v1/platform/organizations/{org_slug}/', name: 'Organization Details',
    description: 'Retrieve details for a specific organization including members, tier, usage, and billing status.',
    auth: 'Token', category: 'Platform Management',
    request: {},
    response: { example: { slug: 'my-research-lab', members: 5, tier: 'academic', usage_this_month: 120, limit: 500 } },
  },
  {
    method: 'POST', path: '/api/v1/platform/organizations/{org_slug}/invite/', name: 'Invite Member',
    description: 'Invite a new member to an organization by email. Specify their role (viewer, analyst, admin).',
    auth: 'Token (Admin)', category: 'Platform Management',
    request: { body: { email: 'colleague@university.edu', role: 'analyst' } },
    response: { example: { status: 'invited', email: 'colleague@university.edu', role: 'analyst', expires_at: '2026-03-01T00:00:00Z' } },
  },
  {
    method: 'GET', path: '/api/v1/platform/usage/', name: 'Usage Dashboard',
    description: 'Current month usage metrics: API calls, analyses performed, storage used, and remaining quota.',
    auth: 'Token', category: 'Platform Management',
    request: {},
    response: { example: { api_calls: 342, analyses: 120, storage_mb: 45, quota_remaining: 380 } },
  },
  {
    method: 'GET', path: '/api/v1/platform/billing/', name: 'Billing Information',
    description: 'Current billing status, upcoming invoice, payment method, and billing history.',
    auth: 'Token (Admin)', category: 'Platform Management',
    request: {},
    response: { example: { tier: 'academic', monthly_cost: 9.99, next_invoice: '2026-03-01', payment_method: 'visa_4242' } },
  },
  {
    method: 'POST', path: '/api/v1/platform/api-keys/', name: 'Create API Key',
    description: 'Generate a new API key for programmatic access. Keys can be scoped to specific endpoints.',
    auth: 'Token', category: 'Platform Management',
    request: { body: { name: 'CI Pipeline Key', scopes: ['stats:read', 'stats:write'] } },
    response: { example: { key_id: 'uuid-here', key: 'sfs_live_abc123...', name: 'CI Pipeline Key', created_at: '2026-02-19' } },
  },
  {
    method: 'DELETE', path: '/api/v1/platform/api-keys/{key_id}/', name: 'Revoke API Key',
    description: 'Immediately revoke an API key. All requests using this key will be rejected.',
    auth: 'Token', category: 'Platform Management',
    request: {},
    response: { example: { status: 'revoked', key_id: 'uuid-here', revoked_at: '2026-02-19T12:00:00Z' } },
  },
  {
    method: 'POST', path: '/api/v1/platform/projects/', name: 'Create Project',
    description: 'Create a new project within an organization for organizing analyses and data.',
    auth: 'Token', category: 'Platform Management',
    request: { body: { name: 'Clinical Trial Analysis', org_slug: 'my-research-lab' } },
    response: { example: { slug: 'clinical-trial-analysis', name: 'Clinical Trial Analysis', created_at: '2026-02-19' } },
  },
  {
    method: 'GET', path: '/api/v1/platform/permissions/', name: 'RBAC Permissions',
    description: 'List all role-based access control permissions for the current user across organizations and projects.',
    auth: 'Token', category: 'Platform Management',
    request: {},
    response: { example: { roles: [{ org: 'my-research-lab', role: 'admin', permissions: ['read', 'write', 'delete', 'invite'] }] } },
  },

  // ── GDPR/Privacy ────────────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/privacy/consent/', name: 'Consent Status',
    description: 'Retrieve the current user\'s GDPR consent status for data processing, analytics, and marketing.',
    auth: 'Token', category: 'GDPR/Privacy',
    request: {},
    response: { example: { data_processing: true, analytics: true, marketing: false, updated_at: '2026-01-15' } },
  },
  {
    method: 'POST', path: '/api/v1/privacy/export/', name: 'Data Export (DSAR)',
    description: 'Request a full export of all personal data (Data Subject Access Request). Returns a download link when ready.',
    auth: 'Token', category: 'GDPR/Privacy',
    request: { body: { format: 'json' } },
    response: { example: { request_id: 'dsar-001', status: 'processing', estimated_completion: '2026-02-20T00:00:00Z' } },
  },
  {
    method: 'POST', path: '/api/v1/privacy/erase/', name: 'Data Erasure (Right to Forget)',
    description: 'Request complete erasure of all personal data. Irreversible. Requires confirmation token.',
    auth: 'Token', category: 'GDPR/Privacy',
    request: { body: { confirm: true, confirmation_token: 'tok_abc123' } },
    response: { example: { status: 'scheduled', erasure_date: '2026-03-01', warning: 'This action is irreversible' } },
  },
  {
    method: 'GET', path: '/api/v1/privacy/info/', name: 'Privacy Information',
    description: 'Public privacy policy details including data retention periods, processing purposes, and third-party sharing.',
    auth: 'None', category: 'GDPR/Privacy',
    request: {},
    response: { example: { data_retention_days: 365, processing_purposes: ['statistical_analysis', 'service_improvement'], third_party_sharing: false } },
  },

  // ── Marketplace ─────────────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/marketplace/plugins/', name: 'Browse Plugins',
    description: 'List all available plugins in the marketplace with ratings, install counts, and compatibility information.',
    auth: 'None', category: 'Marketplace',
    request: {},
    response: { example: { plugins: [{ slug: 'bayesian-toolkit', name: 'Bayesian Toolkit', rating: 4.7, installs: 1200, price: 'free' }], total: 24 } },
  },
  {
    method: 'GET', path: '/api/v1/marketplace/plugins/{plugin_slug}/', name: 'Plugin Details',
    description: 'Detailed information about a specific plugin: description, changelog, screenshots, reviews, and dependencies.',
    auth: 'None', category: 'Marketplace',
    request: {},
    response: { example: { slug: 'bayesian-toolkit', version: '2.1.0', description: 'Bayesian inference tools...', reviews: 42, avg_rating: 4.7 } },
  },
  {
    method: 'POST', path: '/api/v1/marketplace/plugins/{plugin_slug}/install/', name: 'Install Plugin',
    description: 'Install a plugin to the current user\'s workspace. Paid plugins require an active subscription.',
    auth: 'Token', category: 'Marketplace',
    request: { body: {} },
    response: { example: { status: 'installed', plugin: 'bayesian-toolkit', version: '2.1.0', installed_at: '2026-02-19' } },
  },
  {
    method: 'POST', path: '/api/v1/marketplace/plugins/{plugin_slug}/review/', name: 'Submit Review',
    description: 'Submit a rating and review for an installed plugin.',
    auth: 'Token', category: 'Marketplace',
    request: { body: { rating: 5, comment: 'Excellent Bayesian inference tools!' } },
    response: { example: { status: 'published', review_id: 'rev-001', plugin: 'bayesian-toolkit' } },
  },
  {
    method: 'GET', path: '/api/v1/marketplace/installed/', name: 'Installed Plugins',
    description: 'List all plugins currently installed in the user\'s workspace with version and update availability.',
    auth: 'Token', category: 'Marketplace',
    request: {},
    response: { example: { installed: [{ slug: 'bayesian-toolkit', version: '2.1.0', update_available: false }], count: 3 } },
  },

  // ── LMS/LTI ─────────────────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/lti/config/', name: 'LTI Configuration',
    description: 'Retrieve LTI 1.3 tool configuration for registering StickForStats with your LMS (Canvas, Moodle, Blackboard).',
    auth: 'None', category: 'LMS/LTI',
    request: {},
    response: { example: { issuer: 'https://stickforstats.com', authorization_endpoint: '/lti/login/', jwks_uri: '/lti/jwks/', client_id: 'sfs-lti-001' } },
  },
  {
    method: 'POST', path: '/api/v1/lti/login/', name: 'LTI OIDC Login',
    description: 'Initiate the LTI 1.3 OIDC login flow. Redirects the user to the LMS for authentication.',
    auth: 'None (LTI)', category: 'LMS/LTI',
    request: { body: { iss: 'https://canvas.instructure.com', login_hint: 'user123', target_link_uri: '/lti/launch/' } },
    response: { example: { redirect_url: 'https://canvas.instructure.com/api/lti/authorize_redirect?...' } },
  },
  {
    method: 'POST', path: '/api/v1/lti/launch/', name: 'LTI Launch',
    description: 'Handle the LTI 1.3 launch after OIDC authentication. Creates a session and loads the requested resource.',
    auth: 'None (LTI)', category: 'LMS/LTI',
    request: { body: { id_token: '<JWT from LMS>' } },
    response: { example: { status: 'launched', user: 'student@uni.edu', resource: 'statistics-module', session_id: 'sess-abc' } },
  },
  {
    method: 'POST', path: '/api/v1/lti/grade/', name: 'Grade Passback',
    description: 'Send a grade back to the LMS gradebook using LTI Assignment and Grade Services (AGS).',
    auth: 'Token (LTI)', category: 'LMS/LTI',
    request: { body: { user_id: 'student123', score: 0.85, max_score: 1.0, comment: 'Good statistical analysis' } },
    response: { example: { status: 'sent', user_id: 'student123', score: 0.85, gradebook_updated: true } },
  },
  {
    method: 'GET', path: '/api/v1/lti/platforms/', name: 'LTI Platforms',
    description: 'List all registered LMS platforms with connection status and last activity.',
    auth: 'Token (Admin)', category: 'LMS/LTI',
    request: {},
    response: { example: { platforms: [{ name: 'Canvas', issuer: 'https://canvas.instructure.com', status: 'active', last_launch: '2026-02-18' }] } },
  },

  // ── Certification ───────────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/certification/levels/', name: 'Certification Levels',
    description: 'List all available certification levels: Foundations, Practitioner, and Expert, with prerequisites and exam details.',
    auth: 'None', category: 'Certification',
    request: {},
    response: { example: { levels: [{ id: 'foundations', name: 'Statistical Foundations', questions: 50, passing_score: 0.70, duration_min: 90 }] } },
  },
  {
    method: 'GET', path: '/api/v1/certification/levels/{level_id}/', name: 'Level Details',
    description: 'Detailed information about a specific certification level, including topic breakdown and study resources.',
    auth: 'None', category: 'Certification',
    request: {},
    response: { example: { id: 'foundations', topics: ['descriptive_statistics', 'hypothesis_testing', 'correlation'], study_hours: 20, prerequisites: [] } },
  },
  {
    method: 'POST', path: '/api/v1/certification/exam/start/', name: 'Start Exam',
    description: 'Begin a certification exam. Returns the question set and a time-limited session token.',
    auth: 'Token', category: 'Certification',
    request: { body: { level_id: 'foundations' } },
    response: { example: { exam_id: 'exam-001', questions: 50, time_limit_min: 90, started_at: '2026-02-19T10:00:00Z' } },
  },
  {
    method: 'POST', path: '/api/v1/certification/exam/submit/', name: 'Submit Exam',
    description: 'Submit completed exam answers. Returns score, pass/fail status, and topic-level breakdown.',
    auth: 'Token', category: 'Certification',
    request: { body: { exam_id: 'exam-001', answers: { q1: 'a', q2: 'c' } } },
    response: { example: { score: 0.84, passed: true, topic_scores: { hypothesis_testing: 0.90, correlation: 0.75 }, certificate_id: 'cert-abc' } },
  },
  {
    method: 'GET', path: '/api/v1/certification/verify/{certificate_id}/', name: 'Verify Certificate',
    description: 'Publicly verify the authenticity of a certificate by its ID. Returns holder name, level, and issue date.',
    auth: 'None', category: 'Certification',
    request: {},
    response: { example: { valid: true, holder: 'Dr. Jane Smith', level: 'Practitioner', issued_at: '2026-01-15', expires_at: '2029-01-15' } },
  },
  {
    method: 'GET', path: '/api/v1/certification/my-certifications/', name: 'My Certifications',
    description: 'List all certifications earned by the authenticated user with expiration dates and renewal status.',
    auth: 'Token', category: 'Certification',
    request: {},
    response: { example: { certifications: [{ level: 'Foundations', certificate_id: 'cert-abc', issued_at: '2026-01-15', expires_at: '2029-01-15' }] } },
  },

  // ── SSO ─────────────────────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/sso/config/', name: 'SSO Configuration',
    description: 'Retrieve the SSO/OIDC configuration for the platform, including supported providers and metadata.',
    auth: 'None', category: 'SSO',
    request: {},
    response: { example: { providers: ['google', 'microsoft', 'orcid', 'institutional'], oidc_discovery: '/.well-known/openid-configuration' } },
  },
  {
    method: 'POST', path: '/api/v1/sso/login/', name: 'SSO Login',
    description: 'Initiate SSO login with a specified provider. Returns the authorization URL to redirect the user.',
    auth: 'None', category: 'SSO',
    request: { body: { provider: 'google', redirect_uri: 'https://app.stickforstats.com/callback' } },
    response: { example: { authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth?...', state: 'random-state-token' } },
  },
  {
    method: 'POST', path: '/api/v1/sso/callback/', name: 'SSO Callback',
    description: 'Handle the SSO callback after user authentication. Exchanges the authorization code for tokens.',
    auth: 'None', category: 'SSO',
    request: { body: { code: 'auth_code_from_provider', state: 'random-state-token' } },
    response: { example: { access_token: 'sfs_token_abc123', user: { email: 'user@university.edu', name: 'Dr. Smith' }, created: false } },
  },
  {
    method: 'POST', path: '/api/v1/sso/validate/', name: 'Validate Token',
    description: 'Validate an SSO-issued token and return user identity claims.',
    auth: 'Bearer Token', category: 'SSO',
    request: { body: { token: 'sfs_token_abc123' } },
    response: { example: { valid: true, user_id: 'user-001', email: 'user@university.edu', expires_at: '2026-02-20T10:00:00Z' } },
  },
  {
    method: 'GET', path: '/api/v1/sso/providers/', name: 'SSO Providers',
    description: 'List all configured SSO identity providers with status and user counts.',
    auth: 'Token (Admin)', category: 'SSO',
    request: {},
    response: { example: { providers: [{ name: 'Google', enabled: true, users: 150 }, { name: 'ORCID', enabled: true, users: 42 }] } },
  },

  // ── Site Licensing ──────────────────────────────────────────────────────
  {
    method: 'GET', path: '/api/v1/platform/organizations/{org_slug}/', name: 'Site License Details',
    description: 'View site license details for an institution: seat count, expiration, features enabled, and usage.',
    auth: 'Token (Admin)', category: 'Site Licensing',
    request: {},
    response: { example: { org: 'mit-statistics-dept', license_type: 'enterprise', seats: 200, seats_used: 156, expires: '2027-01-01' } },
  },
  {
    method: 'GET', path: '/api/v1/platform/organizations/{org_slug}/members/', name: 'License Members',
    description: 'List all members under the site license with roles, last active dates, and usage statistics.',
    auth: 'Token (Admin)', category: 'Site Licensing',
    request: {},
    response: { example: { members: [{ email: 'prof@mit.edu', role: 'admin', analyses: 342, last_active: '2026-02-18' }], total: 156 } },
  },
  {
    method: 'PATCH', path: '/api/v1/platform/organizations/{org_slug}/members/{member_id}/role/', name: 'Update Member Role',
    description: 'Change a member\'s role within the organization (viewer, analyst, admin).',
    auth: 'Token (Admin)', category: 'Site Licensing',
    request: { body: { role: 'admin' } },
    response: { example: { member_id: 'uuid-here', new_role: 'admin', updated_at: '2026-02-19' } },
  },
  {
    method: 'GET', path: '/api/v1/platform/usage/', name: 'License Usage Report',
    description: 'Aggregated usage report for the entire site license: total analyses, active users, peak usage times.',
    auth: 'Token (Admin)', category: 'Site Licensing',
    request: {},
    response: { example: { total_analyses: 12450, active_users_30d: 89, peak_hour: '14:00 UTC', top_tests: ['t-test', 'anova', 'correlation'] } },
  },
  {
    method: 'GET', path: '/api/v1/platform/billing/', name: 'License Billing',
    description: 'Billing details for the site license: annual cost, payment history, and renewal date.',
    auth: 'Token (Admin)', category: 'Site Licensing',
    request: {},
    response: { example: { license_type: 'enterprise', annual_cost: 4999, next_renewal: '2027-01-01', payment_method: 'purchase_order' } },
  },

  // ── AI Advisor ──────────────────────────────────────────────────────────
  {
    method: 'POST', path: '/api/v1/ai-advisor/chat/', name: 'AI Chat',
    description: 'Send a message to the AI Statistical Advisor. Supports multi-turn conversations with statistical context awareness.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { message: 'Which test should I use for my 2x3 factorial design?', conversation_id: 'conv-001' } },
    response: { example: { response: 'For a 2x3 factorial design, a two-way ANOVA is appropriate...', conversation_id: 'conv-001', suggestions: ['two_way_anova', 'interaction_effects'] } },
  },
  {
    method: 'GET', path: '/api/v1/ai-advisor/status/', name: 'AI Advisor Status',
    description: 'Check the operational status of the AI Advisor service, including model availability and response latency.',
    auth: 'None', category: 'AI Advisor',
    request: {},
    response: { example: { status: 'operational', model: 'claude-3-opus', avg_latency_ms: 850, uptime: 0.999 } },
  },
  {
    method: 'GET', path: '/api/v1/ai-advisor/conversation/{conversation_id}/', name: 'Get Conversation',
    description: 'Retrieve the full conversation history for a specific AI Advisor session.',
    auth: 'Token', category: 'AI Advisor',
    request: {},
    response: { example: { conversation_id: 'conv-001', messages: [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }], created_at: '2026-02-19' } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/quick-recommend/', name: 'Quick Recommendation',
    description: 'Get a quick test recommendation based on a brief description of your data and research question.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { description: 'I have two groups of continuous scores and want to compare means', sample_size: 30 } },
    response: { example: { recommended: 'independent_t_test', confidence: 0.92, alternatives: ['mann_whitney_u'], rationale: 'Two independent groups with continuous outcome' } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/interpret/', name: 'Interpret Results',
    description: 'Submit statistical results for AI-powered interpretation. Returns a plain-English explanation with caveats.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { test: 't-test', t_statistic: 2.45, p_value: 0.021, effect_size: 0.65, n: 30 } },
    response: { example: { interpretation: 'The difference between groups is statistically significant with a medium effect size...', caveats: ['Sample size is moderate; consider replication'], apa_text: 't(28) = 2.45, p = .021, d = 0.65' } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/methods-section/', name: 'Generate Methods Section',
    description: 'Auto-generate an APA-formatted methods section based on the analyses performed in the current session.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { analyses: ['t-test', 'anova'], context: 'Educational intervention study' } },
    response: { example: { methods_section: 'Data were analyzed using independent-samples t-tests and one-way ANOVA...', format: 'APA 7th', word_count: 250 } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/assumption-guidance/', name: 'Assumption Guidance',
    description: 'Get detailed guidance on statistical assumptions for a specific test, including how to check and what to do if violated.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { test: 'independent_t_test' } },
    response: { example: { assumptions: [{ name: 'Normality', check: 'Shapiro-Wilk test', violated_action: 'Use Mann-Whitney U' }, { name: 'Homogeneity of variances', check: 'Levene\'s test', violated_action: 'Use Welch\'s t-test' }] } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/parse-query/', name: 'Parse Statistical Query',
    description: 'NLP-powered parsing of a natural language statistical question into structured intent, variables, and test recommendations.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { query: 'Does caffeine affect reaction time in a within-subjects design?' } },
    response: { example: { intent: 'comparison', design: 'within-subjects', iv: 'caffeine', dv: 'reaction_time', recommended_test: 'paired_t_test' } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/analysis-plan/', name: 'Generate Analysis Plan',
    description: 'Create a comprehensive analysis plan with primary/secondary analyses, assumptions to check, and sample size requirements.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { research_question: 'Effect of teaching method on exam scores', design: '3-group between-subjects', n: 90 } },
    response: { example: { primary_analysis: 'One-way ANOVA', secondary: ['effect_sizes', 'post_hoc_tukey'], assumptions: ['normality', 'homogeneity'], power: 0.87 } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/apa-report/', name: 'Generate APA Report',
    description: 'Generate a full APA 7th-edition formatted results section from raw statistical output.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { results: { test: 'anova', f: 12.5, df1: 2, df2: 87, p: 0.00002, eta_sq: 0.22 } } },
    response: { example: { apa_text: 'A one-way ANOVA revealed a statistically significant effect, F(2, 87) = 12.50, p < .001, eta-squared = .22.', tables: [] } },
  },
  {
    method: 'POST', path: '/api/v1/ai-advisor/enhanced-chat/', name: 'Enhanced AI Chat',
    description: 'NLP-enhanced conversational AI with deeper statistical understanding, context tracking, and proactive suggestions.',
    auth: 'Token / API Key', category: 'AI Advisor',
    request: { body: { message: 'My data is non-normal with many outliers. What should I do?', context: { test: 't-test', shapiro_p: 0.001 } } },
    response: { example: { response: 'Given the non-normality and outliers, I recommend switching to a Mann-Whitney U test or using a robust t-test...', actions: [{ label: 'Run Mann-Whitney U', endpoint: '/api/v1/nonparametric/mann-whitney/' }] } },
  },
];

// Derive categories in display order
const CATEGORY_ORDER = [
  'Statistical Tests', 'Guardian Protection', 'SQS Manuscript Scoring',
  'Autonomous Intelligence', 'Manuscript Review', 'Journal Analytics',
  'Platform Management', 'GDPR/Privacy', 'Marketplace', 'LMS/LTI',
  'Certification', 'SSO', 'Site Licensing', 'AI Advisor',
];

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

const MethodBadge = ({ method, darkMode }) => {
  const colors = METHOD_COLORS[method] || METHOD_COLORS.GET;
  return (
    <Chip
      label={method}
      size="small"
      sx={{
        fontWeight: 700,
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        minWidth: 60,
        bgcolor: darkMode ? colors.darkBg : colors.bg,
        color: darkMode ? colors.darkColor : colors.color,
        border: `1px solid ${darkMode ? colors.darkColor : colors.color}`,
        borderRadius: 1,
      }}
    />
  );
};

const CodeBlock = ({ children, darkMode, copyable = true }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(typeof children === 'string' ? children : JSON.stringify(children, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [children]);

  const text = typeof children === 'string' ? children : JSON.stringify(children, null, 2);

  return (
    <Box sx={{ position: 'relative', my: 1 }}>
      {copyable && (
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ position: 'absolute', top: 4, right: 4, color: darkMode ? '#90caf9' : '#1565c0', zIndex: 1 }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Box
        component="pre"
        sx={{
          p: 2, pr: 5,
          borderRadius: 1,
          bgcolor: darkMode ? '#1a1a2e' : '#f5f5f5',
          color: darkMode ? '#e0e0e0' : '#333',
          border: `1px solid ${darkMode ? '#333' : '#ddd'}`,
          fontSize: '0.8rem',
          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
          overflow: 'auto',
          maxHeight: 320,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          m: 0,
        }}
      >
        {text}
      </Box>
    </Box>
  );
};

const AuthBadge = ({ auth, darkMode }) => {
  if (!auth || auth === 'None') {
    return (
      <Chip
        label="Public"
        size="small"
        color="success"
        variant="outlined"
        sx={{ fontSize: '0.7rem' }}
      />
    );
  }
  return (
    <Chip
      icon={<LockIcon sx={{ fontSize: '0.85rem !important' }} />}
      label={auth}
      size="small"
      variant="outlined"
      sx={{
        fontSize: '0.7rem',
        color: darkMode ? '#ffa726' : '#e65100',
        borderColor: darkMode ? '#ffa726' : '#e65100',
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Endpoint Card
// ---------------------------------------------------------------------------
const EndpointCard = ({ endpoint, darkMode, id }) => {
  const [tab, setTab] = useState(0);

  return (
    <Paper
      id={id}
      elevation={darkMode ? 0 : 1}
      sx={{
        mb: 2,
        border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        bgcolor: darkMode ? '#121212' : '#fff',
        overflow: 'hidden',
        scrollMarginTop: '80px',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          bgcolor: darkMode ? '#1a1a1a' : '#fafafa',
          flexWrap: 'wrap',
        }}
      >
        <MethodBadge method={endpoint.method} darkMode={darkMode} />
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            color: darkMode ? '#e0e0e0' : '#333',
            flexGrow: 1,
          }}
        >
          {endpoint.path}
        </Typography>
        <AuthBadge auth={endpoint.auth} darkMode={darkMode} />
      </Box>

      {/* Body */}
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1rem' }}>
          {endpoint.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {endpoint.description}
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontSize: '0.8rem', px: 1.5 },
          }}
        >
          {endpoint.request && (endpoint.request.body || endpoint.request.params) && <Tab label="Request" />}
          <Tab label="Response" />
        </Tabs>

        <Divider />

        <Box sx={{ pt: 1.5 }}>
          {/* Request Tab */}
          {tab === 0 && endpoint.request && (endpoint.request.body || endpoint.request.params) && (
            <Box>
              {endpoint.request.headers && (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    Headers
                  </Typography>
                  <CodeBlock darkMode={darkMode}>{endpoint.request.headers}</CodeBlock>
                </>
              )}
              {endpoint.request.body && (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    Request Body (JSON)
                  </Typography>
                  <CodeBlock darkMode={darkMode}>{endpoint.request.body}</CodeBlock>
                </>
              )}
              {endpoint.request.params && (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    Query Parameters
                  </Typography>
                  <CodeBlock darkMode={darkMode}>{endpoint.request.params}</CodeBlock>
                </>
              )}
            </Box>
          )}

          {/* Response Tab — show when it's the active tab */}
          {((tab === 1 && endpoint.request && (endpoint.request.body || endpoint.request.params)) ||
            (tab === 0 && !(endpoint.request && (endpoint.request.body || endpoint.request.params)))) && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                Response Example (200 OK)
              </Typography>
              <CodeBlock darkMode={darkMode}>{endpoint.response?.example || {}}</CodeBlock>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
const APIDocsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dmContext = useContext(DarkModeContext);
  const darkMode = dmContext?.darkMode ?? false;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(() => {
    const init = {};
    CATEGORY_ORDER.forEach(c => { init[c] = true; });
    return init;
  });
  const [activeCategory, setActiveCategory] = useState(null);

  // Filter endpoints by search
  const filtered = useMemo(() => {
    if (!search.trim()) return API_ENDPOINTS;
    const q = search.toLowerCase();
    return API_ENDPOINTS.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [search]);

  // Group filtered endpoints by category
  const grouped = useMemo(() => {
    const map = {};
    CATEGORY_ORDER.forEach(c => { map[c] = []; });
    filtered.forEach(e => {
      if (map[e.category]) map[e.category].push(e);
    });
    return map;
  }, [filtered]);

  // Count per category
  const categoryCounts = useMemo(() => {
    const map = {};
    CATEGORY_ORDER.forEach(c => { map[c] = grouped[c]?.length || 0; });
    return map;
  }, [grouped]);

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    const el = document.getElementById(`cat-${cat.replace(/[^a-zA-Z]/g, '')}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (isMobile) setMobileOpen(false);
  };

  const scrollToEndpoint = (endpoint) => {
    const id = `ep-${endpoint.path.replace(/[^a-zA-Z0-9]/g, '')}-${endpoint.method}`;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (isMobile) setMobileOpen(false);
  };

  // ----------- Sidebar content -----------
  const sidebarContent = (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        height: '100%',
        overflow: 'auto',
        bgcolor: darkMode ? '#0d0d0d' : '#fafafa',
        borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
          API Reference
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {filtered.length} endpoint{filtered.length !== 1 ? 's' : ''}
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search endpoints..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 1,
            '& .MuiOutlinedInput-root': {
              fontSize: '0.85rem',
            },
          }}
        />
      </Box>

      <Divider />

      <List dense sx={{ py: 0 }}>
        {CATEGORY_ORDER.map(cat => {
          const Icon = CATEGORY_ICONS[cat] || ScienceIcon;
          const count = categoryCounts[cat];
          if (count === 0 && search.trim()) return null;
          return (
            <React.Fragment key={cat}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    toggleCategory(cat);
                    scrollToCategory(cat);
                  }}
                  selected={activeCategory === cat}
                  sx={{ py: 0.75 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Icon fontSize="small" sx={{ color: darkMode ? '#90caf9' : '#1565c0' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={cat}
                    primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                  />
                  <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                  {expandedCategories[cat] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </ListItemButton>
              </ListItem>
              <Collapse in={expandedCategories[cat]} timeout="auto">
                <List dense disablePadding>
                  {(grouped[cat] || []).map((ep, i) => (
                    <ListItemButton
                      key={`${ep.path}-${ep.method}-${i}`}
                      sx={{ pl: 5, py: 0.3 }}
                      onClick={() => scrollToEndpoint(ep)}
                    >
                      <MethodBadge method={ep.method} darkMode={darkMode} />
                      <Typography
                        variant="caption"
                        sx={{ ml: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {ep.name}
                      </Typography>
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 120px)' }}>
      {/* Mobile drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              position: 'relative',
              height: 'auto',
              minHeight: 'calc(100vh - 120px)',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          maxWidth: 960,
          mx: 'auto',
        }}
      >
        {/* Mobile menu button */}
        {isMobile && (
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ mb: 1 }}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Hero */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            StickForStats API Documentation
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Complete reference for the StickForStats REST API. All statistical endpoints include automatic
            Guardian assumption validation with 50-decimal precision via mpmath.
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Base URL:</strong>{' '}
            <code style={{ fontFamily: 'monospace' }}>https://your-domain.com/api/v1/</code>
            &nbsp;&mdash;&nbsp;All endpoints require the <code>/api/v1/</code> prefix.
          </Alert>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${API_ENDPOINTS.length} Endpoints`} color="primary" />
            <Chip label={`${CATEGORY_ORDER.length} Categories`} variant="outlined" />
            <Chip label="Guardian Protected" icon={<ShieldIcon />} color="success" variant="outlined" />
            <Chip label="50-Decimal Precision" variant="outlined" />
          </Box>
        </Box>

        {/* Search for mobile / main area */}
        {isMobile && (
          <TextField
            size="small"
            fullWidth
            placeholder="Search endpoints..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />
        )}

        {/* Authentication section */}
        <Paper
          elevation={darkMode ? 0 : 1}
          sx={{
            mb: 4,
            p: 3,
            border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
            bgcolor: darkMode ? '#121212' : '#fff',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Authentication
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Most endpoints require authentication via one of two methods:
          </Typography>
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Token Authentication</Typography>
            <CodeBlock darkMode={darkMode}>{'Authorization: Token your_auth_token_here'}</CodeBlock>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>API Key Authentication</Typography>
            <CodeBlock darkMode={darkMode}>{'X-API-Key: sfs_live_your_api_key_here'}</CodeBlock>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Endpoints marked <Chip label="Public" size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem', mx: 0.5 }} /> do not require authentication.
          </Typography>
        </Paper>

        {/* Endpoint categories */}
        {CATEGORY_ORDER.map(cat => {
          const endpoints = grouped[cat] || [];
          if (endpoints.length === 0 && search.trim()) return null;
          const Icon = CATEGORY_ICONS[cat] || ScienceIcon;
          return (
            <Box key={cat} id={`cat-${cat.replace(/[^a-zA-Z]/g, '')}`} sx={{ mb: 5, scrollMarginTop: '20px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon sx={{ color: darkMode ? '#90caf9' : '#1565c0' }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {cat}
                </Typography>
                <Chip label={`${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}`} size="small" variant="outlined" />
              </Box>
              {endpoints.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No matching endpoints found.</Typography>
              ) : (
                endpoints.map((ep, i) => (
                  <EndpointCard
                    key={`${ep.path}-${ep.method}-${i}`}
                    endpoint={ep}
                    darkMode={darkMode}
                    id={`ep-${ep.path.replace(/[^a-zA-Z0-9]/g, '')}-${ep.method}`}
                  />
                ))
              )}
            </Box>
          );
        })}

        {/* Footer note */}
        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center', pb: 4 }}>
          <Typography variant="body2" color="text.secondary">
            StickForStats API v1 &mdash; {API_ENDPOINTS.length} endpoints across {CATEGORY_ORDER.length} categories
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Interactive OpenAPI schema available at{' '}
            <code>/api/v1/schema/swagger/</code> and <code>/api/v1/schema/redoc/</code>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default APIDocsPage;
