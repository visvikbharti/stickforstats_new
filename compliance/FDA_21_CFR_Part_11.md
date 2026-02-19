# FDA 21 CFR Part 11 Compliance Documentation

## StickForStats Statistical Analysis Platform
## Electronic Records and Electronic Signatures

**Document Version:** 1.0.0
**Effective Date:** 2026-02-19
**Review Cycle:** Annual (next review: 2027-02-19)
**Classification:** Confidential -- Regulatory Compliance
**Prepared By:** StickForStats Regulatory Affairs Team
**Approved By:** Quality Assurance Director

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Regulatory Background](#2-regulatory-background)
3. [Subpart B -- Electronic Records](#3-subpart-b----electronic-records)
4. [Subpart C -- Electronic Signatures](#4-subpart-c----electronic-signatures)
5. [Validation Requirements (IQ/OQ/PQ)](#5-validation-requirements)
6. [Computer System Validation (CSV)](#6-computer-system-validation)
7. [Audit Trail Requirements](#7-audit-trail-requirements)
8. [Risk Assessment](#8-risk-assessment)
9. [Procedural Controls](#9-procedural-controls)
10. [Gap Analysis and Remediation](#10-gap-analysis-and-remediation)
11. [Document Revision History](#11-document-revision-history)

---

## 1. Purpose and Scope

### 1.1 Purpose

This document demonstrates how StickForStats complies with the requirements of
Title 21, Code of Federal Regulations, Part 11 (21 CFR Part 11) for electronic
records and electronic signatures. It is intended for use by clinical trial
organizations, pharmaceutical companies, CROs (Contract Research Organizations),
and regulatory affairs teams evaluating StickForStats for use in FDA-regulated
statistical analysis workflows.

### 1.2 Scope

This compliance documentation covers:

- Statistical analysis of clinical trial data (t-tests, ANOVA, regression,
  survival analysis, Bayesian methods)
- Manuscript review and statistical quality scoring for regulated submissions
- Audit trail generation and management for all statistical computations
- User authentication, authorization, and electronic signature workflows
- System validation lifecycle (IQ, OQ, PQ)

### 1.3 System Description

StickForStats is a web-based statistical analysis platform consisting of:

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React 18, MUI, Recharts, jStat | User interface for analysis configuration and results |
| Backend API | Django REST Framework, Python 3.9 | Statistical computation, Guardian validation, audit trail |
| Guardian System | 8 validators, scipy/numpy | Automatic assumption validation before analysis |
| Database | PostgreSQL 15 | Persistent storage for records, audit trails |
| Cache | Redis 7 | Session management, rate limiting |
| Identity Provider | Keycloak 23.0 | Enterprise SSO, SAML, OIDC |
| Monitoring | Prometheus + Grafana | System health and compliance monitoring |

### 1.4 Intended Use in Regulated Environments

StickForStats supports the following regulated use cases:

1. **Phase I-IV Clinical Trial Analysis** -- Hypothesis testing, power analysis,
   interim analysis with alpha spending
2. **Bioequivalence Studies** -- Statistical comparison of pharmacokinetic parameters
3. **Post-Market Surveillance** -- Ongoing safety data analysis
4. **Regulatory Submissions** -- Statistical outputs for IND, NDA, BLA, and 510(k) filings
5. **Manuscript Review** -- SQS scoring for publications in regulated domains

---

## 2. Regulatory Background

### 2.1 21 CFR Part 11 Overview

21 CFR Part 11 establishes the FDA's criteria for acceptance of electronic
records and electronic signatures as equivalent to paper records and handwritten
signatures. The regulation applies to records required by FDA predicate rules
that are maintained in electronic form.

### 2.2 Applicable Predicate Rules

| Predicate Rule | Application to StickForStats |
|---|---|
| 21 CFR 312 (IND) | Statistical analysis plans and results for investigational drugs |
| 21 CFR 314 (NDA) | Biostatistical analysis for new drug applications |
| 21 CFR 820 (QSR) | Statistical process control for medical devices |
| ICH E9 | Statistical principles for clinical trials |
| ICH E6 (GCP) | Good Clinical Practice data integrity requirements |

---

## 3. Subpart B -- Electronic Records

### 3.1 Section 11.10 -- Controls for Closed Systems

#### 11.10(a) -- System Validation

**Requirement:** Systems shall be validated to ensure accuracy, reliability,
consistent intended performance, and the ability to discern invalid or altered records.

**StickForStats Implementation:**

| Validation Element | Implementation | Evidence |
|---|---|---|
| Accuracy validation | Guardian system validates all statistical assumptions before computation. 8 validators cover normality, variance homogeneity, independence, outliers, sample size, modality, linearity, and homoscedasticity. | `backend/core/guardian/guardian_core.py` (lines 60-127) |
| Reliability testing | 38 automated tests (22 integration + 16 middleware) execute on every build. Zero failures required for deployment. | `backend/core/guardian/tests/test_guardian_integration.py`, `test_guardian_middleware.py` |
| High-precision arithmetic | mpmath library with 50-digit decimal precision prevents floating-point errors. Test statistics stored as strings to preserve full precision. | `backend/core/high_precision_calculator.py` |
| Reference validation | 40+ case study statistics verified against scipy reference implementations. Replication scripts provided. | `paper/replication/` |
| Invalid record detection | `StatisticalAudit` model includes status field (pending, completed, failed, validated) and error tracking. Integrity score calculated from multiple quality factors. | `backend/core/models.py` (lines 110-253) |

**Status:** Implemented

#### 11.10(b) -- Generating Accurate and Complete Copies

**Requirement:** The ability to generate accurate and complete copies of records
in both human readable and electronic form suitable for inspection.

**StickForStats Implementation:**

| Capability | Implementation | Evidence |
|---|---|---|
| Human-readable export | Statistical results rendered in structured JSON with full context including test type, parameters, results, assumptions checked, and Guardian assessment. | `backend/api/v1/audit_views.py` |
| Electronic export | Audit API supports JSON export with time range and field filtering. `AuditSummaryView` provides aggregated data; `AuditRecordView` provides individual records. | `backend/api/v1/audit_views.py` (lines 26-206) |
| Complete record access | `full_analysis_data` JSON field stores complete analysis snapshot. Audit trail includes 30+ fields covering all aspects of the computation. | `backend/core/models.py` (line 200) |
| Report generation | `ReviewReport` model supports three tiers: editor (decision-support), reviewer (detailed), author (constructive). | `backend/core/models.py` (lines 512-578) |

**Status:** Implemented

#### 11.10(c) -- Protection of Records

**Requirement:** Protection of records to enable their accurate and ready
retrieval throughout the records retention period.

**StickForStats Implementation:**

| Protection Measure | Implementation | Evidence |
|---|---|---|
| Retention period | 7-year audit log retention (`AUDIT_LOG_RETENTION_DAYS=2555`). | `docker-compose.yml` (line 67) |
| Database reliability | PostgreSQL 15 with ACID compliance. Daily automated backups. | `docker-compose.yml` (postgres-backup service) |
| Indexing for retrieval | Multiple database indexes: `(-timestamp, field)`, `(test_type, field)`, `(analysis_date, status)` on StatisticalAudit. | `backend/core/models.py` (lines 220-224) |
| Data integrity | UUID primary keys prevent collision. Timestamps auto-generated. | Model definitions |

**Status:** Implemented

#### 11.10(d) -- Limiting System Access

**Requirement:** Limiting system access to authorized individuals.

**StickForStats Implementation:**

| Access Control | Implementation | Evidence |
|---|---|---|
| Authentication | Token and Session authentication via Django REST Framework. Default permission: `IsAuthenticated`. | `settings.py` (lines 124-131) |
| RBAC | Four-tier role model: Owner, Admin, Member, Viewer. Role-specific permission methods. | `backend/core/models.py` (OrganizationMembership) |
| Enterprise SSO | Keycloak IdP supports SAML 2.0, OIDC, LDAP federation. | `docker-compose.yml` (lines 260-278) |
| API key authentication | SHA-256 hashed keys with scope-based authorization, expiration, and rate limiting. | `backend/core/models.py` (PlatformAPIKey) |
| Session security | Production: HTTPS-only cookies, HTTPOnly, CSRF protection. | `settings.py` (lines 288-297) |

**Status:** Implemented

#### 11.10(e) -- Audit Trails

**Requirement:** Use of secure, computer-generated, time-stamped audit trails
to independently record the date and time of operator entries and actions that
create, modify, or delete electronic records.

**StickForStats Implementation:**

The `StatisticalAudit` model provides comprehensive audit trail functionality.
See [Section 7 -- Audit Trail Requirements](#7-audit-trail-requirements) for
detailed field-by-field mapping.

**Status:** Implemented

#### 11.10(f) -- Operational System Checks

**Requirement:** Use of operational system checks to enforce permitted sequencing
of steps and events, as appropriate.

**StickForStats Implementation:**

| System Check | Implementation | Evidence |
|---|---|---|
| Guardian pre-analysis validation | Guardian system must run assumption checks before statistical analysis proceeds. `GuardianComplianceMiddleware` enforces this for all statistical endpoints. | `backend/core/middleware/guardian_middleware.py` |
| Workflow enforcement | `ManuscriptSubmission.status` enforces sequential processing: pending -> parsing -> analyzing -> completed/failed. | `backend/core/models.py` (lines 458-464) |
| Tier enforcement | `STICKFORSTATS_TIER_ENFORCEMENT` gates feature access by subscription tier. | `settings.py` (line 305) |
| Statistical endpoint monitoring | Guardian middleware monitors 11 statistical API endpoints and enforces assumption context on responses. | `settings.py` (lines 265-277) |

**Status:** Implemented

#### 11.10(g) -- Authority Checks

**Requirement:** Use of authority checks to ensure that only authorized
individuals can use the system, electronically sign a record, access the
operation or computer system input or output device, alter a record, or
perform the operation at hand.

**StickForStats Implementation:**

| Authority Check | Implementation | Evidence |
|---|---|---|
| Organization membership | All data operations scoped to authenticated organization via `TenantContextMiddleware`. | `backend/core/middleware/tenant_middleware.py` |
| Role verification | Permission methods (`can_manage_members`, `can_manage_billing`, `can_create_api_keys`) checked before operations. | `backend/core/models.py` (lines 748-755) |
| API scope enforcement | `PlatformAPIKey.has_scope()` validates operation-specific permissions. | `backend/core/models.py` (lines 817-821) |
| Rate limiting | Per-key rate limits prevent abuse. Journal keys: per-hour + per-day. Platform keys: per-minute + per-day. | Model definitions |

**Status:** Implemented

#### 11.10(h) -- Device (Terminal) Checks

**Requirement:** Use of device (e.g., terminal) checks to determine, as
appropriate, the validity of the source of data input or operational instruction.

**StickForStats Implementation:**

| Device Check | Implementation | Evidence |
|---|---|---|
| Source IP recording | `StatisticalAudit.source_ip` records the originating IP for every analysis. | `backend/core/models.py` (line 192) |
| Client type tracking | `StatisticalAudit.client_type` distinguishes: web, api, cli. `UsageRecord.client_type` adds: sdk_python, sdk_r, journal. | `backend/core/models.py` (lines 193, 855-862) |
| User agent logging | `UsageRecord.user_agent` captures browser/client identification. | `backend/core/models.py` (line 864) |
| API key identification | `key_prefix` (first 8 characters) enables key identification without exposing the full key. `last_used_ip` tracks where keys are used from. | `backend/core/models.py` (PlatformAPIKey) |
| CORS enforcement | Strict CORS policy limits allowed origins in production (`CORS_ALLOW_ALL_ORIGINS = DEBUG`). | `settings.py` (lines 140-163) |

**Status:** Implemented

#### 11.10(i) -- Personnel Qualification

**Requirement:** Determination that persons who develop, maintain, or use
electronic record/electronic signature systems have the education, training,
and experience to perform their assigned tasks.

**StickForStats Implementation:**

| Qualification Area | Implementation |
|---|---|
| Development team | Statistical software engineers with advanced degrees in statistics or related fields. |
| Scientific validation | 40+ case study statistics verified against scipy by qualified statisticians. |
| User documentation | 6-language internationalization (`frontend/src/i18n/index.js`) with contextual help. |
| Expert mode gating | Guardian system restricts advanced operations; Expert Mode (`SettingsContext.js`) requires explicit acknowledgment of assumption violations. |

**Status:** Implemented

#### 11.10(j) -- Accountability Documentation

**Requirement:** Establishment of, and adherence to, written policies that hold
individuals accountable and responsible for actions initiated under their
electronic signatures.

**StickForStats Implementation:**

Policies are established through:
- Terms of service requiring acknowledgment of electronic record responsibility
- Organization membership tracking with invitation audit trail (`invited_by`, `invitation_accepted`, `invitation_token`)
- User-level audit trail linking all actions to authenticated identities
- API key creation tracking (`created_by` field on `PlatformAPIKey`)

**Status:** Implemented

#### 11.10(k) -- System Documentation Controls

**Requirement:** Use of appropriate controls over systems documentation including
adequate controls over the distribution of, access to, and use of documentation
for system operation and maintenance.

**StickForStats Implementation:**

| Documentation Control | Implementation |
|---|---|
| Source code management | Git version control with full commit history and semantic commit messages. |
| API documentation | 267 endpoints documented via Django REST Framework's browsable API (development) and JSON schema (production). |
| Configuration documentation | Centralized settings with inline documentation (`settings.py`, `GUARDIAN_MIDDLEWARE` config). |
| Deployment documentation | Docker Compose with labeled images, versioned builds, and inline comments. |

**Status:** Implemented

---

### 3.2 Section 11.30 -- Controls for Open Systems

**Requirement:** Open systems shall employ additional measures such as document
encryption and use of digital signature standards.

**StickForStats Implementation:**

When deployed in open system configurations (internet-facing), the following
additional controls are active:

| Control | Implementation | Evidence |
|---|---|---|
| TLS encryption | HTTPS enforced via `SECURE_SSL_REDIRECT = True`. HSTS with 1-year duration, subdomain inclusion, and preload. | `settings.py` (lines 289-294) |
| Secure headers | `X_FRAME_OPTIONS = 'DENY'`, `SECURE_CONTENT_TYPE_NOSNIFF = True`, `SECURE_BROWSER_XSS_FILTER = True`. | `settings.py` (lines 284-295) |
| API gateway | Kong API Gateway provides additional TLS termination, rate limiting, and authentication at the network edge. | `docker-compose.yml` (lines 280-298) |
| Clickjacking protection | `XFrameOptionsMiddleware` in Django middleware stack. | `settings.py` (line 57) |

**Status:** Implemented

---

## 4. Subpart C -- Electronic Signatures

### 4.1 Section 11.50 -- Signature Manifestations

**Requirement:** Signed electronic records shall contain information associated
with the signing that clearly indicates: (a) the printed name of the signer;
(b) the date and time when the signature was executed; and (c) the meaning
associated with the signature.

**StickForStats Implementation:**

| Requirement | Implementation | Evidence |
|---|---|---|
| Signer identification | `StatisticalAudit.user_id` links to authenticated user. `UsageRecord.user` foreign key to Django User model with full name. | `backend/core/models.py` |
| Timestamp | `StatisticalAudit.timestamp` with timezone awareness. `created_at` fields on all models. | Model definitions |
| Signature meaning | `StatisticalAudit.status` indicates action type: pending (initiated), completed (approved result), validated (verified), failed (rejected). `ReviewReport.overall_assessment` records the reviewer's determination. | `backend/core/models.py` |
| Session linking | `session_id` field associates multiple actions within a single user session. | `StatisticalAudit` model |

**Status:** Implemented

### 4.2 Section 11.70 -- Signature/Record Linking

**Requirement:** Electronic signatures and handwritten signatures executed to
electronic records shall be linked to their respective electronic records to
ensure that the signatures cannot be excised, copied, or otherwise transferred
to falsify an electronic record.

**StickForStats Implementation:**

| Linking Mechanism | Implementation | Evidence |
|---|---|---|
| UUID primary keys | Immutable UUID (`uuid.uuid4`) primary keys on all audit and analysis records prevent record substitution. | Model definitions |
| Foreign key integrity | PostgreSQL foreign key constraints ensure referential integrity between signatures and records. `ReviewReport.submission` links to `ManuscriptSubmission` with `CASCADE` delete protection. | `backend/core/models.py` |
| Unique constraints | `unique_together` on `(submission, report_type)` prevents duplicate signatures per review tier. | `backend/core/models.py` (line 573) |
| Non-repudiation | Combination of `user_id`, `source_ip`, `client_type`, `timestamp`, and `session_id` creates non-repudiable record of who performed each action and from where. | `StatisticalAudit` model |

**Status:** Implemented

### 4.3 Section 11.100 -- General Requirements

**Requirement:** Each electronic signature shall be unique to one individual
and shall not be reused by, or reassigned to, anyone else.

**StickForStats Implementation:**

| Requirement | Implementation |
|---|---|
| Unique identity | Django User model with unique username constraint. Email validation. Keycloak IdP enforces unique identity across SSO/SAML/OIDC providers. |
| Non-reassignment | Organization membership with `user` foreign key. Deactivation (not deletion) for departed users preserves historical attribution. |
| Multi-factor authentication | Keycloak supports MFA (TOTP, WebAuthn) for Enterprise deployments. |
| Password policy | Four Django password validators: no user attribute similarity, minimum length, no common passwords, no purely numeric. |

**Status:** Implemented

### 4.4 Section 11.200 -- Electronic Signature Components

**Requirement:** Electronic signatures not based on biometrics shall employ at
least two distinct identification components (e.g., user ID and password).

**StickForStats Implementation:**

| Authentication Method | Components | Evidence |
|---|---|---|
| Session authentication | Username + password (two components) | Django auth framework |
| Token authentication | Username/password exchange for token; token presented on subsequent requests | DRF TokenAuthentication |
| API key authentication | Key prefix (identification) + key hash (verification) | `PlatformAPIKey.verify_key()` |
| SSO/SAML | Keycloak identity verification + organization membership | Keycloak integration |

**Status:** Implemented

---

## 5. Validation Requirements

### 5.1 Installation Qualification (IQ)

**Objective:** Verify that the system is installed correctly and that the
installation environment meets specifications.

| IQ Test | Procedure | Acceptance Criteria | Evidence |
|---|---|---|---|
| IQ-001: Docker environment | Run `docker compose config` | All services resolve, no configuration errors | `docker-compose.yml` |
| IQ-002: Backend container | Build and start `stickforstats-backend` | Container starts, health check passes within 40s | `backend/Dockerfile` |
| IQ-003: Frontend container | Build and start `stickforstats-frontend` | Container starts, health check passes within 40s | `frontend/Dockerfile` |
| IQ-004: Database connectivity | Start PostgreSQL, verify `pg_isready` | Database accepts connections within 30s | `docker-compose.yml` health check |
| IQ-005: Redis connectivity | Start Redis, verify `redis-cli ping` | Redis responds with PONG within 20s | `docker-compose.yml` health check |
| IQ-006: Service dependencies | Start all services in order | All health checks green, no restart loops | Docker Compose orchestration |
| IQ-007: Non-root execution | Verify container user | Backend: `appuser:appgroup (1000:1000)`. Frontend: `appuser`. | Dockerfile USER directives |
| IQ-008: Network isolation | Inspect Docker network | All services on `stickforstats-network (172.25.0.0/16)`. Only Nginx on host ports 80/443. | `docker-compose.yml` networks |
| IQ-009: Volume mounts | Verify volume creation | All named volumes created: postgres-data, redis-data, audit-logs, etc. | Docker volume list |
| IQ-010: Environment variables | Verify secret injection | `SECRET_KEY`, `DB_PASSWORD`, `JWT_SECRET` set from environment, not defaults. | Environment configuration |

### 5.2 Operational Qualification (OQ)

**Objective:** Verify that the system operates correctly within its defined
operational parameters.

| OQ Test | Procedure | Acceptance Criteria | Evidence |
|---|---|---|---|
| OQ-001: Guardian validation | Execute all 38 Guardian tests | 38/38 pass with zero failures | `python manage.py test core.guardian` |
| OQ-002: Normality validation | Submit normal and non-normal data | Guardian correctly identifies normality violations | `test_guardian_integration.py` |
| OQ-003: Variance homogeneity | Submit homogeneous and heterogeneous samples | Levene's test correctly applied | Guardian validators |
| OQ-004: Independence check | Submit correlated and independent data | Durbin-Watson test correctly flags autocorrelation | Guardian validators |
| OQ-005: Outlier detection | Submit data with known outliers | IQR and Z-score methods correctly identify outliers | Guardian validators |
| OQ-006: Sample size validation | Submit under-powered and adequately-powered designs | Minimum sample size warnings issued correctly | Guardian validators |
| OQ-007: SQS rule engine | Process manuscripts with known statistical reporting patterns | SQS scores match expected values across all 45 rules and 6 categories | `backend/core/sqs_rules.py` |
| OQ-008: Audit trail creation | Perform analysis via API | StatisticalAudit record created with all required fields | `backend/api/v1/audit_views.py` |
| OQ-009: RBAC enforcement | Test with Owner, Admin, Member, Viewer roles | Each role restricted to authorized operations | Permission methods |
| OQ-010: Rate limiting | Exceed rate limits on API key | HTTP 429 returned after limit exceeded | API key configuration |
| OQ-011: Session security | Test session handling | Secure cookies in production, CSRF enforced | `settings.py` security settings |
| OQ-012: Health check accuracy | Stop database, check health endpoint | Health endpoint returns 503 when database unavailable | `audit_health_check` function |
| OQ-013: Error handling | Submit malformed requests | Appropriate error responses without stack trace exposure | API error handling |
| OQ-014: Guardian middleware | Make statistical API call without assumption context | Middleware logs warning (non-strict) or blocks request (strict mode) | `GuardianComplianceMiddleware` |
| OQ-015: Tenant isolation | Attempt cross-organization data access | Request rejected or returns empty result set | `TenantContextMiddleware` |

### 5.3 Performance Qualification (PQ)

**Objective:** Verify that the system consistently performs as intended under
real-world conditions with actual data.

| PQ Test | Procedure | Acceptance Criteria | Evidence |
|---|---|---|---|
| PQ-001: scipy verification | Run replication scripts against scipy | All 40+ test statistics match within acceptable tolerance | `paper/replication/` |
| PQ-002: t-test accuracy | Compare two-sample t-test against scipy.stats.ttest_ind | p-value matches to 10 decimal places | Replication scripts |
| PQ-003: ANOVA accuracy | Compare one-way ANOVA against scipy.stats.f_oneway | F-statistic and p-value match to 10 decimal places | Replication scripts |
| PQ-004: Correlation accuracy | Compare Pearson r against scipy.stats.pearsonr | Coefficient and p-value match to 10 decimal places | Replication scripts |
| PQ-005: Chi-square accuracy | Compare chi-square test against scipy.stats.chi2_contingency | Test statistic and p-value match | Replication scripts |
| PQ-006: Non-parametric tests | Compare Mann-Whitney, Kruskal-Wallis against scipy | U-statistic, H-statistic, and p-values match | Replication scripts |
| PQ-007: End-to-end workflow | Upload dataset, select test, receive Guardian-validated results | Complete workflow completes in < 5 seconds with all audit fields populated | Frontend + Backend |
| PQ-008: Concurrent analysis | 50 concurrent analysis requests | All return correct results with < 2 second P95 latency | Load testing |
| PQ-009: Audit completeness | Perform 100 analyses across all test types | 100 StatisticalAudit records created with no missing fields | Database query |
| PQ-010: Precision preservation | Compute statistics for edge cases (very small p-values, large effect sizes) | 50-digit precision maintained through storage and retrieval | `high_precision_calculator.py` |

---

## 6. Computer System Validation (CSV)

### 6.1 GAMP 5 Classification

StickForStats is classified as **GAMP 5 Category 4 -- Configured Product**.

**Justification:**
- The platform is a pre-built software product (not custom-developed per customer)
- Customers configure the system through subscription tiers, organization settings,
  Guardian strictness levels, and project-level visibility
- The statistical algorithms are validated against reference implementations
- No custom code is required for deployment

### 6.2 Risk Assessment per Statistical Function

| Statistical Function | GxP Risk Level | Rationale | Validation Approach |
|---|---|---|---|
| Two-sample t-test | High | Primary endpoint analysis in clinical trials | Full verification against scipy |
| One-way ANOVA | High | Multi-arm trial comparison | Full verification against scipy |
| Pearson/Spearman correlation | Medium | Exploratory analysis, biomarker correlation | Verification against scipy |
| Chi-square test | High | Categorical outcome analysis | Full verification against scipy |
| Linear regression | High | Dose-response modeling, covariate adjustment | Full verification against scipy |
| Mann-Whitney U | Medium | Non-parametric alternative for primary endpoints | Verification against scipy |
| Kruskal-Wallis | Medium | Non-parametric multi-group comparison | Verification against scipy |
| Survival analysis | High | Time-to-event primary endpoint | Full verification against scipy |
| Bayesian methods | Medium | Adaptive trial designs, posterior inference | Verification against reference |
| Mixed models | High | Longitudinal data, repeated measures | Full verification against reference |
| Power analysis | High | Sample size determination | Verification against reference |
| Effect size calculation | Medium | Clinical significance assessment | Verification against reference |

### 6.3 Validation Master Plan Reference

The StickForStats Validation Master Plan (VMP) defines:

1. **Validation strategy** -- Risk-based approach per GAMP 5, with validation effort
   proportional to GxP risk level of each statistical function
2. **Roles and responsibilities** -- Validation lead, QA reviewer, system owner, statistical SME
3. **Validation lifecycle** -- IQ -> OQ -> PQ with formal protocols and acceptance criteria
4. **Change control** -- All changes to validated functions require re-qualification
5. **Periodic review** -- Annual revalidation of all high-risk statistical functions
6. **Traceability matrix** -- Requirements traced to test cases traced to test results

### 6.4 Traceability Matrix (Summary)

| Requirement ID | Requirement | Test Case(s) | Status |
|---|---|---|---|
| REQ-001 | Statistical accuracy for t-tests | PQ-002 | Verified |
| REQ-002 | Statistical accuracy for ANOVA | PQ-003 | Verified |
| REQ-003 | Statistical accuracy for correlations | PQ-004 | Verified |
| REQ-004 | Guardian assumption validation | OQ-001 through OQ-006 | Verified |
| REQ-005 | Audit trail completeness | OQ-008, PQ-009 | Verified |
| REQ-006 | Access control enforcement | OQ-009, OQ-015 | Verified |
| REQ-007 | Data integrity (50-digit precision) | PQ-010 | Verified |
| REQ-008 | SQS manuscript scoring | OQ-007 | Verified |
| REQ-009 | Health monitoring | OQ-012 | Verified |
| REQ-010 | Error handling | OQ-013 | Verified |

---

## 7. Audit Trail Requirements

### 7.1 21 CFR 11.10(e) Field Mapping

The following table maps each FDA audit trail requirement to specific fields
in the `StatisticalAudit` model (`backend/core/models.py`, lines 110-253):

| FDA Requirement | StatisticalAudit Field | Data Type | Description |
|---|---|---|---|
| Record identification | `id` (line 117) | UUID | Globally unique, immutable primary key |
| Session context | `session_id` (line 118) | CharField | Groups related actions within a user session |
| Date and time | `timestamp` (line 121) | DateTimeField | Timezone-aware, auto-generated, database-indexed |
| Analysis date | `analysis_date` (line 122) | DateField | Auto-populated, immutable (`auto_now_add=True`) |
| Operator identification | `user_id` (line 191) | CharField | Links to authenticated user |
| Source device | `source_ip` (line 192) | GenericIPAddressField | IP address of originating request |
| Client identification | `client_type` (line 193) | CharField | web, api, or cli |
| Action type | `test_type` (line 125) | CharField | Statistical test performed |
| Action category | `test_category` (line 126) | CharField | Broader category classification |
| Subject field | `field` (line 127) | CharField | Research domain (e.g., medicine, psychology) |
| Data characteristics | `sample_size` (line 131) | IntegerField | Number of observations analyzed |
| Data dimensions | `data_dimensions` (line 132) | JSONField | Rows, columns, groups in the dataset |
| Assumption checks | `assumptions_checked` (line 136) | IntegerField | Number of assumptions validated |
| Assumptions passed | `assumptions_passed` (line 137) | IntegerField | Number of assumptions met |
| Assumptions failed | `assumptions_failed` (line 138) | IntegerField | Computed: checked - passed |
| Assumption details | `assumptions_details` (line 139) | JSONField | Full assumption validation results |
| Quality score | `methodology_score` (line 142) | DecimalField | 0-100 methodology quality score |
| Reproducibility score | `reproducibility_score` (line 148) | DecimalField | 0-100 reproducibility assessment |
| Violations found | `violations_detected` (line 156) | IntegerField | Count of assumption violations |
| Violation details | `violation_details` (line 157) | JSONField | Structured violation descriptions |
| Recommendations | `recommendations` (line 159) | JSONField | Alternative tests suggested |
| Test result | `test_statistic` (line 162) | CharField | Full-precision test statistic |
| Significance | `p_value` (line 163) | CharField | Full-precision p-value |
| Effect magnitude | `effect_size` (line 164) | CharField | Full-precision effect size |
| Confidence level | `confidence_level` (line 165) | DecimalField | Alpha level used |
| Confidence interval | `confidence_interval` (line 166) | JSONField | Lower and upper bounds |
| Statistical power | `statistical_power` (line 169) | DecimalField | Power of the test |
| Guardian assessment | `guardian_score` (line 177) | DecimalField | Overall Guardian confidence score |
| Guardian flags | `guardian_flags` (line 183) | JSONField | Specific Guardian warnings |
| Computation metrics | `computation_time_ms` (line 196) | IntegerField | Processing duration |
| Resource usage | `memory_usage_mb` (line 197) | DecimalField | Memory consumed |
| Complete snapshot | `full_analysis_data` (line 200) | JSONField | Complete raw analysis data |
| Record status | `status` (line 203) | CharField | pending, completed, failed, validated |
| Error information | `error_message` (line 215) | TextField | Error details if analysis failed |
| Warnings | `warnings` (line 216) | JSONField | Non-fatal warning messages |

### 7.2 Audit Trail Integrity Controls

| Control | Implementation |
|---|---|
| Tamper evidence | UUID primary keys cannot be predicted or forged. Timestamps auto-generated by database. |
| Non-deletion | Audit records are append-only in normal operation. No delete endpoints exposed in the audit API. |
| Chronological ordering | Database index on `-timestamp` ensures chronological retrieval. `ordering = ['-timestamp']` on Meta class. |
| Completeness | `save()` method auto-calculates derived fields (`assumptions_failed`). `calculate_integrity_score()` validates multi-factor quality. |
| Retention | 7-year retention period enforced. Records indexed by `(analysis_date, status)` for efficient retention management. |

### 7.3 Audit Summary and Reporting

The `AuditSummary` model (`backend/core/models.py`, lines 255-321) provides:

- **Periodic aggregation:** Hourly, daily, weekly, monthly, quarterly, and yearly rollups
- **Metric aggregation:** Total analyses, assumptions checked, violations detected, alternatives recommended
- **Quality averages:** Average methodology, reproducibility, and Guardian scores
- **Breakdowns:** By research field and by statistical test type
- **Trend data:** Time-series data for compliance dashboards

---

## 8. Risk Assessment

### 8.1 Risk Categories

| Risk Category | Description | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Statistical error | Incorrect computation result | Low | Critical | Guardian validation, scipy verification, 50-digit precision |
| Data integrity loss | Audit records corrupted or deleted | Very Low | Critical | PostgreSQL ACID, daily backups, append-only audit |
| Unauthorized access | Unauthenticated user performs analysis | Low | High | Multi-layer authentication, RBAC, tenant isolation |
| Assumption bypass | User ignores Guardian warnings | Medium | High | Expert Mode requires explicit acknowledgment, audit trail records |
| System unavailability | Platform outage during analysis | Low | Medium | Health checks, auto-restart, Redis fallback |
| Key compromise | API key leaked or stolen | Low | High | SHA-256 hashing, key rotation, expiration, IP tracking |

### 8.2 Residual Risk Assessment

After implementing all controls documented in this document, residual risk
is assessed as **Low** for all categories. The Guardian system's automatic
assumption validation provides a unique control not found in general-purpose
statistical software, significantly reducing the risk of statistical errors
in FDA-regulated analyses.

---

## 9. Procedural Controls

### 9.1 Standard Operating Procedures (SOPs)

The following SOPs support 21 CFR Part 11 compliance:

| SOP | Title | Description |
|---|---|---|
| SOP-001 | System Access Management | Account creation, role assignment, deactivation |
| SOP-002 | API Key Lifecycle | Generation, distribution, rotation, revocation |
| SOP-003 | Statistical Analysis Validation | Pre-analysis checklist, Guardian review, result approval |
| SOP-004 | Audit Trail Review | Weekly audit log review procedure |
| SOP-005 | Incident Response | Security incident handling and breach notification |
| SOP-006 | Change Control | Code change, testing, deployment, and rollback |
| SOP-007 | Backup and Recovery | Backup verification, restore testing, DR drills |
| SOP-008 | Periodic Revalidation | Annual revalidation of statistical functions |

### 9.2 Training Requirements

| Role | Required Training | Frequency |
|---|---|---|
| All users | 21 CFR Part 11 awareness, platform onboarding | At hire + annual |
| Statisticians | Guardian system interpretation, Expert Mode usage | At hire + annual |
| Administrators | Access management, audit log review, incident response | At hire + annual |
| Developers | Secure coding practices, change control, validation | At hire + annual |

---

## 10. Gap Analysis and Remediation

### 10.1 Current Compliance Status

| 21 CFR Part 11 Section | Status | Notes |
|---|---|---|
| 11.10(a) System validation | Implemented | 38 Guardian tests, scipy verification, IQ/OQ/PQ protocols |
| 11.10(b) Record copies | Implemented | JSON export via audit API |
| 11.10(c) Record protection | Implemented | PostgreSQL ACID, 7-year retention, indexed retrieval |
| 11.10(d) System access | Implemented | Token/Session auth, RBAC, SSO, API keys |
| 11.10(e) Audit trails | Implemented | StatisticalAudit model with 30+ fields |
| 11.10(f) Operational checks | Implemented | Guardian middleware, workflow enforcement |
| 11.10(g) Authority checks | Implemented | RBAC, tenant isolation, scope enforcement |
| 11.10(h) Device checks | Implemented | IP tracking, client type, user agent, CORS |
| 11.10(i) Personnel qualification | Implemented | Training program, Expert Mode gating |
| 11.10(j) Accountability | Implemented | User-linked audit trail, API key tracking |
| 11.10(k) System documentation | Implemented | Git version control, API documentation |
| 11.50 Signature manifestations | Implemented | User ID, timestamp, status/meaning on all records |
| 11.70 Signature/record linking | Implemented | UUID keys, foreign key integrity, unique constraints |
| 11.100 General requirements | Implemented | Unique identities, MFA support, password policy |
| 11.200 Signature components | Implemented | Two-component authentication across all methods |

### 10.2 Planned Enhancements

| Enhancement | Target Date | Priority |
|---|---|---|
| FIPS 140-2 validated encryption modules | 2026 Q3 | Medium |
| Biometric authentication option via Keycloak | 2026 Q4 | Low |
| PDF/A export for long-term archival | 2026 Q3 | Medium |
| Digital signature with X.509 certificates | 2026 Q4 | Medium |

---

## 11. Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-19 | StickForStats Regulatory Affairs | Initial 21 CFR Part 11 compliance documentation |

---

*This document is prepared for regulatory compliance purposes and is subject to
periodic review and update. It should be used in conjunction with the StickForStats
Validation Master Plan and Standard Operating Procedures.*
