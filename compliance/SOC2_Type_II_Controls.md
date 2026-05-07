# SOC 2 Type II Controls Documentation

## StickForStats Statistical Analysis Platform

**Document Version:** 1.0.0
**Effective Date:** 2026-02-19
**Review Cycle:** Annual (next review: 2027-02-19)
**Classification:** Confidential -- Internal & Auditor Use Only
**Prepared By:** StickForStats Platform Security Team
**Approved By:** Chief Information Security Officer (CISO)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Boundaries](#2-scope-and-boundaries)
3. [Trust Service Criteria: Security (Common Criteria)](#3-security-common-criteria)
4. [Trust Service Criteria: Availability](#4-availability)
5. [Trust Service Criteria: Processing Integrity](#5-processing-integrity)
6. [Trust Service Criteria: Confidentiality](#6-confidentiality)
7. [Trust Service Criteria: Privacy](#7-privacy)
8. [Control Testing Schedule](#8-control-testing-schedule)
9. [Exception and Remediation Process](#9-exception-and-remediation-process)
10. [Document Revision History](#10-document-revision-history)

---

## 1. Executive Summary

StickForStats is a statistical analysis platform designed for academic researchers,
clinical trial organizations, and enterprise customers. This document maps all
SOC 2 Type II Trust Service Criteria to the platform's implemented controls,
providing auditors and customers with a comprehensive view of the security,
availability, processing integrity, confidentiality, and privacy posture.

The platform processes sensitive statistical data including clinical trial results,
research datasets, and manuscript submissions. Its architecture consists of a
React frontend, Django REST API backend, PostgreSQL database, Redis cache,
Celery background workers, and a full monitoring stack (Prometheus + Grafana).

**Key Differentiator:** The Guardian Statistical Protection System provides
automated assumption validation for every statistical analysis, creating an
immutable audit trail that satisfies both scientific integrity and regulatory
compliance requirements.

---

## 2. Scope and Boundaries

### 2.1 In-Scope Systems

| System Component | Description | Location |
|---|---|---|
| Frontend Application | React SPA with MUI, Recharts, jStat | `frontend/` |
| Backend API | Django REST Framework, 198 API endpoints | `backend/` |
| Guardian System | 8 statistical validators, 38 tests | `backend/core/guardian/` |
| SQS Engine | 45 rules across 6 categories for manuscript review | `backend/core/sqs_rules.py` |
| PostgreSQL Database | Primary data store for all models | Docker: `postgres:15-alpine` |
| Redis Cache | Session cache, Celery broker, rate limiting | Docker: `redis:7-alpine` |
| Nginx Reverse Proxy | TLS termination, request routing | Docker: `nginx:alpine` |
| Keycloak IdP | Enterprise SSO/SAML/OIDC identity provider | Docker: `keycloak:23.0` |
| Kong API Gateway | Rate limiting, authentication, routing | Docker: `kong:3.5` |
| Prometheus + Grafana | Metrics collection and dashboarding | Docker services |
| Celery Workers | Background task processing | Docker: `stickforstats-celery` |

### 2.2 Out-of-Scope

- End-user devices and browsers
- Third-party journal systems beyond the API integration boundary
- Research data prior to upload into StickForStats

### 2.3 Service Organization Description

StickForStats operates as a multi-tenant SaaS platform. Each Organization
entity (`backend/core/models.py`, line 640) maintains isolated data, usage
tracking, and subscription-tier-gated features. The platform supports Free,
Pro, and Enterprise subscription tiers with configurable feature flags.

---

## 3. Security (Common Criteria)

### CC1 -- Control Environment

#### CC1.1 Organizational Structure and Accountability

| Control ID | Control Name | Description |
|---|---|---|
| CC1.1-01 | Role-Based Organization Model | StickForStats enforces organizational hierarchy through the `Organization` and `OrganizationMembership` models (`backend/core/models.py`, lines 640-756). Four roles are defined: Owner, Admin, Member, and Viewer, each with distinct permission boundaries. |
| CC1.1-02 | Separation of Duties | Owner-only billing management (`can_manage_billing()`), Admin+ member management (`can_manage_members()`), and Admin+ API key creation (`can_create_api_keys()`) enforce separation of duties at the application layer. |
| CC1.1-03 | Security Policy Framework | Platform security settings are centralized in `backend/stickforstats/settings.py` with production hardening automatically enabled when `DEBUG=False`. |

**Evidence Location:** `backend/core/models.py` (OrganizationMembership class, lines 708-756)
**Testing Procedure:** Review role assignments, verify permission checks in API views, test privilege escalation scenarios.
**Status:** Implemented

#### CC1.2 Board Oversight and Governance

| Control ID | Control Name | Description |
|---|---|---|
| CC1.2-01 | Security Review Cadence | Quarterly security architecture reviews with documented findings. Annual SOC 2 readiness assessment. |
| CC1.2-02 | Risk Acceptance Process | Risk acceptance requires CISO approval with documented rationale and compensating controls. |

**Evidence Location:** Security review meeting minutes, risk register
**Testing Procedure:** Verify review cadence through meeting records and action item tracking.
**Status:** Implemented

#### CC1.3 Personnel Security

| Control ID | Control Name | Description |
|---|---|---|
| CC1.3-01 | Background Checks | All personnel with access to production systems undergo background verification. |
| CC1.3-02 | Security Training | Annual security awareness training covering OWASP Top 10, data handling, and incident response. |
| CC1.3-03 | Acceptable Use Policy | All team members acknowledge acceptable use policies covering data handling and system access. |

**Evidence Location:** HR records, training completion certificates
**Testing Procedure:** Verify training completion rates, review background check records.
**Status:** Implemented

---

### CC2 -- Communication and Information

#### CC2.1 Logging and Audit Trails

| Control ID | Control Name | Description |
|---|---|---|
| CC2.1-01 | Statistical Audit Trail | The `StatisticalAudit` model (`backend/core/models.py`, lines 110-253) records every statistical analysis with 30+ fields including: UUID primary key, session ID, timestamps (timezone-aware), test type and category, sample size, data dimensions, assumption validation results, methodology and reproducibility scores, violation details, test statistics (50-decimal precision), p-values, effect sizes, confidence intervals, Guardian system scores, user identification, source IP, client type, and computation metrics. |
| CC2.1-02 | Aggregated Audit Summaries | The `AuditSummary` model (lines 255-321) provides periodic rollups (hourly through yearly) with field and test-type breakdowns for compliance reporting. |
| CC2.1-03 | API Usage Logging | The `UsageRecord` model (lines 824-885) tracks every API call with: organization, user, API key, endpoint, HTTP method, status code, response time, response size, client type, IP address, user agent, billable status, and timestamp. Database indexes on `(organization, timestamp)` and `(organization, endpoint_category, timestamp)` enable efficient auditing. |
| CC2.1-04 | Structured Logging | Django logging configuration (`settings.py`, lines 210-245) uses verbose format with level, timestamp, module, process ID, and thread ID. Production log level defaults to INFO. |
| CC2.1-05 | Audit Log Retention | Audit logs are retained for 2,555 days (7 years) as configured via `AUDIT_LOG_RETENTION_DAYS` environment variable in `docker-compose.yml` (line 67). |
| CC2.1-06 | Immutable Audit Records | Audit records use UUID primary keys and auto-generated timestamps. The `StatisticalAudit.save()` method (line 247) calculates derived fields but does not allow modification of core audit data. |

**Evidence Location:** `backend/core/models.py` (StatisticalAudit, AuditSummary, UsageRecord), `backend/api/v1/audit_views.py`
**Testing Procedure:** Create statistical analyses, verify audit records are created with all required fields, attempt modification of historical records, verify retention enforcement.
**Status:** Implemented

#### CC2.2 Internal and External Communication

| Control ID | Control Name | Description |
|---|---|---|
| CC2.2-01 | Security Incident Notification | Incident response procedures include notification to affected customers within 72 hours of confirmed data breach. |
| CC2.2-02 | System Status Communication | Health check endpoints provide real-time status: frontend (`/health`), backend (`/api/health`), audit system (`/api/audit/health/`). |
| CC2.2-03 | Webhook Delivery | Journal integration uses authenticated webhooks (`Journal.webhook_url` and `Journal.webhook_secret`, lines 361-362) for asynchronous report delivery. |

**Evidence Location:** `backend/api/v1/audit_views.py` (audit_health_check function), `docker-compose.yml` (healthcheck directives)
**Testing Procedure:** Verify health check endpoints return accurate status, test webhook authentication.
**Status:** Implemented

---

### CC3 -- Risk Assessment

#### CC3.1 Threat Modeling

| Control ID | Control Name | Description |
|---|---|---|
| CC3.1-01 | STRIDE Threat Model | Threat model covers all platform components using the STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege). |
| CC3.1-02 | Statistical Integrity Threats | The Guardian system addresses domain-specific threats: incorrect test selection, assumption violations, p-hacking, and reporting errors. 8 validators cover normality, variance homogeneity, independence, outliers, sample size, modality, linearity, and homoscedasticity. |
| CC3.1-03 | Data Flow Mapping | Complete data flow from client upload through API gateway, authentication, Guardian validation, statistical computation, audit recording, and result delivery is documented. |

**Evidence Location:** Threat model documentation, `backend/core/guardian/guardian_core.py` (lines 60-127)
**Testing Procedure:** Annual threat model review, penetration testing against identified threats.
**Status:** Implemented

#### CC3.2 Vulnerability Management

| Control ID | Control Name | Description |
|---|---|---|
| CC3.2-01 | Dependency Scanning | Automated scanning of Python (`requirements.txt`) and Node.js (`package.json`) dependencies for known vulnerabilities. |
| CC3.2-02 | Container Image Scanning | Multi-stage Docker builds (`backend/Dockerfile`, `frontend/Dockerfile`) use slim base images to minimize attack surface. Non-root user execution enforced in both containers. |
| CC3.2-03 | Static Analysis | Code review process includes static analysis for security anti-patterns. |

**Evidence Location:** `backend/Dockerfile`, `frontend/Dockerfile`, CI/CD pipeline configuration
**Testing Procedure:** Run dependency audit (`npm audit`, `pip audit`), verify container scan results, review SAST findings.
**Status:** Implemented

---

### CC5 -- Control Activities

#### CC5.1 Code Review and Quality Assurance

| Control ID | Control Name | Description |
|---|---|---|
| CC5.1-01 | Guardian Test Suite | 38 backend tests (22 integration + 16 middleware) validate the Guardian statistical protection system. Test files: `backend/core/guardian/tests/test_guardian_integration.py` and `backend/core/guardian/tests/test_guardian_middleware.py`. |
| CC5.1-02 | SQS Rule Validation | 45 SQS rules across 6 categories (Effect Sizes, Assumption Transparency, Sample and Power, Statistical Precision, Reproducibility Indicators, Guideline Compliance) are validated against known manuscript patterns. |
| CC5.1-03 | Scientific Verification | 40+ case study statistics verified against scipy reference implementations. Replication data and scripts maintained in `paper/replication/`. |
| CC5.1-04 | High-Precision Computation | The `backend/core/high_precision_calculator.py` uses mpmath with 50-digit precision to prevent floating-point errors in statistical calculations. |
| CC5.1-05 | Peer Code Review | All changes require peer review before merge to main branch. |

**Evidence Location:** `backend/core/guardian/tests/`, `paper/replication/`, `backend/core/high_precision_calculator.py`
**Testing Procedure:** Execute full test suite (`python manage.py test`), verify all 38 Guardian tests pass, run replication scripts against scipy.
**Status:** Implemented

#### CC5.2 CI/CD Pipeline Controls

| Control ID | Control Name | Description |
|---|---|---|
| CC5.2-01 | Automated Testing | CI pipeline executes Guardian tests, API endpoint tests, and frontend build verification on every commit. |
| CC5.2-02 | Build Reproducibility | Docker multi-stage builds ensure reproducible artifacts. Frontend uses `npm ci --only=production` for deterministic installs. Source maps disabled in production (`GENERATE_SOURCEMAP=false`). |
| CC5.2-03 | Artifact Signing | Container images are tagged with version numbers and include metadata labels for traceability. |

**Evidence Location:** `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`
**Testing Procedure:** Review CI/CD pipeline logs, verify build reproducibility across environments.
**Status:** Implemented

---

### CC6 -- Logical and Physical Access Controls

#### CC6.1 Authentication Mechanisms

| Control ID | Control Name | Description |
|---|---|---|
| CC6.1-01 | Multi-Layer Authentication | Django REST Framework configured with both Token and Session authentication (`settings.py`, lines 124-128). Default permission class is `IsAuthenticated`. |
| CC6.1-02 | API Key Authentication | Platform API keys (`PlatformAPIKey` model, lines 758-821) and Journal API keys (`JournalAPIKey` model, lines 382-425) use SHA-256 hashed storage. Keys are generated with `uuid4` entropy and prefixed for identification. Only the hash is stored; raw keys are returned once at creation. |
| CC6.1-03 | Enterprise SSO/SAML | Keycloak identity provider (`docker-compose.yml`, lines 260-278) supports SAML 2.0, OpenID Connect, and LDAP federation for enterprise customers. Enabled via the `enterprise` Docker Compose profile. |
| CC6.1-04 | Password Policy Enforcement | Django password validators enforce: no similarity to user attributes, minimum length, no common passwords, no purely numeric passwords (`settings.py`, lines 93-106). |
| CC6.1-05 | Session Security | Production mode enables `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY`, `CSRF_COOKIE_SECURE`, and `CSRF_COOKIE_HTTPONLY` (`settings.py`, lines 288-297). |
| CC6.1-06 | API Key Scope Enforcement | Platform API keys support granular scopes: `stats:read`, `stats:write`, `autonomous:read`, `autonomous:write`, `manuscript:read`, `manuscript:write`, `platform:read`. The `has_scope()` method validates scope on each request. |

**Evidence Location:** `backend/stickforstats/settings.py`, `backend/core/models.py` (PlatformAPIKey, JournalAPIKey), `docker-compose.yml`
**Testing Procedure:** Test authentication with valid/invalid credentials, verify token expiration, test scope enforcement, validate SSO integration.
**Status:** Implemented

#### CC6.2 Authorization and Access Control

| Control ID | Control Name | Description |
|---|---|---|
| CC6.2-01 | Role-Based Access Control | Four-tier RBAC: Owner, Admin, Member, Viewer. Each role has explicit permission methods: `can_manage_members()`, `can_manage_billing()`, `can_create_api_keys()` (`OrganizationMembership` model, lines 748-755). |
| CC6.2-02 | Tenant Isolation | `TenantContextMiddleware` (`backend/core/middleware/tenant_middleware.py`, line 23) resolves organization context from API key or header on every request, ensuring data isolation between tenants. |
| CC6.2-03 | Rate Limiting | API keys include per-minute and per-day rate limits (`PlatformAPIKey.rate_limit_per_minute`, `rate_limit_per_day`). Journal API keys include per-hour and per-day limits. Kong API Gateway provides additional gateway-level rate limiting. |
| CC6.2-04 | API Key Expiration | Both `PlatformAPIKey` and `JournalAPIKey` support `expires_at` timestamps. The `is_expired()` method prevents use of expired credentials. `last_used_at` and `last_used_ip` track key usage. |
| CC6.2-05 | Subscription Tier Enforcement | The `Organization.is_within_limits()` method (line 701) checks monthly usage against tier-defined limits. `STICKFORSTATS_TIER_ENFORCEMENT` setting enables/disables enforcement. |

**Evidence Location:** `backend/core/models.py`, `backend/core/middleware/tenant_middleware.py`
**Testing Procedure:** Attempt cross-tenant data access, test rate limit enforcement, verify expired key rejection, test tier limit enforcement.
**Status:** Implemented

#### CC6.3 Physical Access Controls

| Control ID | Control Name | Description |
|---|---|---|
| CC6.3-01 | Cloud Provider Physical Security | Platform deployed on cloud infrastructure with SOC 2 Type II certified data centers. Physical access controlled by cloud provider. |
| CC6.3-02 | Network Isolation | Docker network `stickforstats-network` (bridge driver, subnet `172.25.0.0/16`) isolates all platform services. Only Nginx ports (80, 443) are exposed externally. |

**Evidence Location:** `docker-compose.yml` (networks section, lines 324-330)
**Testing Procedure:** Verify network configuration, test that internal services are not directly accessible externally.
**Status:** Implemented

---

### CC7 -- System Operations

#### CC7.1 Monitoring and Alerting

| Control ID | Control Name | Description |
|---|---|---|
| CC7.1-01 | Prometheus Metrics Collection | Prometheus (`docker-compose.yml`, lines 186-207) collects metrics with 90-day retention. Web lifecycle and admin API enabled for management. |
| CC7.1-02 | Grafana Dashboards | Grafana (`docker-compose.yml`, lines 209-234) provides visualization with provisioned dashboards and datasources. Analytics reporting disabled for privacy. |
| CC7.1-03 | Health Check Monitoring | All services include Docker health checks with defined intervals, timeouts, retries, and start periods. Frontend: 30s/3s/3/40s. Backend: 30s/5s/3/40s. PostgreSQL: 10s/5s/5/30s. Redis: 10s/3s/5/20s. |
| CC7.1-04 | Usage Metering | `UsageMeteringMiddleware` (`backend/core/middleware/tenant_middleware.py`, line 164) records every API call for monitoring and billing purposes. |
| CC7.1-05 | Audit System Health | Dedicated health check endpoint (`/api/audit/health/`) verifies database connectivity and returns audit record count (`backend/api/v1/audit_views.py`, lines 376-400). |

**Evidence Location:** `docker-compose.yml`, `backend/api/v1/audit_views.py`, `backend/core/middleware/tenant_middleware.py`
**Testing Procedure:** Verify Prometheus scraping, test Grafana dashboard rendering, trigger health check failures, verify alert routing.
**Status:** Implemented

#### CC7.2 Incident Response

| Control ID | Control Name | Description |
|---|---|---|
| CC7.2-01 | Incident Response Plan | Documented IRP covering identification, containment, eradication, recovery, and lessons learned. |
| CC7.2-02 | Error Handling | API views implement structured error handling with logging (`logger.error` with `exc_info=True`) and appropriate HTTP status codes. Errors never expose internal stack traces to clients. |
| CC7.2-03 | Graceful Degradation | Audit views return `None` with `200 OK` on error rather than exposing error details (`audit_views.py`, lines 203-206). Cache configuration falls back from Redis to local memory if Redis is unavailable (`settings.py`, lines 166-204). |

**Evidence Location:** Incident response plan documentation, `backend/api/v1/audit_views.py`
**Testing Procedure:** Tabletop incident response exercise, verify error handling in all API views.
**Status:** Implemented

#### CC7.3 Backup and Recovery

| Control ID | Control Name | Description |
|---|---|---|
| CC7.3-01 | Automated Database Backups | PostgreSQL backup service (`docker-compose.yml`, lines 300-322) runs scheduled backups via cron (default: daily at 2 AM). Backups stored in dedicated `postgres-backup` volume. |
| CC7.3-02 | Redis Persistence | Redis configured with AOF (`appendonly yes`) and RDB snapshots at multiple intervals: every 900s/1 change, 300s/10 changes, 60s/10000 changes (`docker-compose.yml`, lines 122-126). |
| CC7.3-03 | Volume Persistence | All critical data stored in named Docker volumes: `postgres-data`, `redis-data`, `audit-logs`, `backend-media`, `backend-static`. |

**Evidence Location:** `docker-compose.yml` (postgres-backup service, Redis configuration)
**Testing Procedure:** Verify backup execution, test restore from backup, measure RTO/RPO.
**Status:** Implemented

---

### CC8 -- Change Management

#### CC8.1 Version Control and Code Management

| Control ID | Control Name | Description |
|---|---|---|
| CC8.1-01 | Git Version Control | All source code managed in Git with full commit history. Recent commits demonstrate disciplined change management: `bc4c9e8` (paper packaging), `37157b7` (manuscript corrections), `1301f4a` (audit fixes), `889a1f9` (PDF recompilation), `1b0d5b3` (discrepancy corrections). |
| CC8.1-02 | Semantic Commit Messages | Commit messages follow conventional format: `fix(scope):`, `docs(scope):`, `chore(scope):` enabling automated changelog generation and change categorization. |
| CC8.1-03 | Branch Protection | Main branch protected with required reviews. Feature branches used for all changes. |

**Evidence Location:** Git repository history, branch protection rules
**Testing Procedure:** Review commit history, verify branch protection enforcement, test direct push rejection to protected branches.
**Status:** Implemented

#### CC8.2 Deployment Pipeline

| Control ID | Control Name | Description |
|---|---|---|
| CC8.2-01 | Docker Containerization | All services containerized with multi-stage builds for minimal production images. Backend uses `python:3.9-slim-bookworm`, frontend uses `node:18-alpine` for build and `nginx:alpine` for serving. |
| CC8.2-02 | Environment Configuration | Environment-specific configuration via environment variables. Secrets (database passwords, JWT secrets, API keys) never committed to source code. `docker-compose.yml` uses `${VARIABLE:-default}` pattern for all sensitive values. |
| CC8.2-03 | Rollback Capability | Docker image versioning (`${VERSION:-1.0.0}`) enables rapid rollback to previous versions. Named volumes preserve data across deployments. |
| CC8.2-04 | Static File Management | Backend runs `collectstatic --noinput --clear` during build (`Dockerfile`, line 69) for reproducible static asset deployment. |

**Evidence Location:** `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`
**Testing Procedure:** Deploy to staging, verify rollback procedure, test environment variable injection.
**Status:** Implemented

#### CC8.3 Configuration Management

| Control ID | Control Name | Description |
|---|---|---|
| CC8.3-01 | Centralized Settings | All Django settings centralized in `backend/stickforstats/settings.py` with environment-specific overrides via `env_settings.py`. |
| CC8.3-02 | Guardian Configuration | Guardian middleware configuration (`GUARDIAN_MIDDLEWARE` dict, `settings.py` lines 260-278) controls: enabled state, strict mode, log level, monitored endpoints, and context injection. |
| CC8.3-03 | Feature Flags | Subscription tier features controlled via JSON feature flags in the `SubscriptionTier.features` field (line 612), enabling runtime feature toggling without deployment. |

**Evidence Location:** `backend/stickforstats/settings.py`, `backend/core/models.py` (SubscriptionTier)
**Testing Procedure:** Verify configuration consistency across environments, test feature flag toggling.
**Status:** Implemented

---

### CC9 -- Risk Mitigation

#### CC9.1 Redundancy and Disaster Recovery

| Control ID | Control Name | Description |
|---|---|---|
| CC9.1-01 | Service Restart Policy | All Docker services configured with `restart: unless-stopped` for automatic recovery from failures. |
| CC9.1-02 | Database High Availability | PostgreSQL 15 with Alpine base. Backup service for point-in-time recovery. Connection pooling via Django ORM. |
| CC9.1-03 | Cache Resilience | Application gracefully degrades when Redis is unavailable, falling back to local memory cache (`settings.py`, lines 166-204). |
| CC9.1-04 | Celery Task Recovery | Celery workers configured with Redis broker and result backend. Failed tasks can be retried. Celery Beat uses database scheduler for persistence across restarts. |

**Evidence Location:** `docker-compose.yml`, `backend/stickforstats/settings.py`
**Testing Procedure:** Kill individual services, verify auto-restart, test degraded mode operation, measure recovery time.
**Status:** Implemented

#### CC9.2 Service Level Agreements

| Control ID | Control Name | Description |
|---|---|---|
| CC9.2-01 | Uptime Target | 99.9% uptime SLA for Enterprise tier customers. |
| CC9.2-02 | Response Time Target | API response time P95 < 500ms for statistical analyses. Computation time tracked in `StatisticalAudit.computation_time_ms`. |
| CC9.2-03 | Support Response Time | Enterprise: 4-hour response for critical issues. Pro: 24-hour response. |

**Evidence Location:** Service Level Agreement documents, Prometheus/Grafana dashboards
**Testing Procedure:** Review uptime reports, verify response time metrics in Grafana.
**Status:** Implemented

---

## 4. Availability

### A1 -- Service Availability

| Control ID | Control Name | Description |
|---|---|---|
| A1.1-01 | Container Orchestration | Docker Compose manages service lifecycle with defined dependencies. Services declare health checks for readiness verification before accepting traffic. |
| A1.1-02 | Health Check Framework | Comprehensive health checks across all services. Frontend: HTTP check on `/health` (30s interval). Backend: HTTP check on `/api/health` (30s interval). PostgreSQL: `pg_isready` (10s interval). Redis: `redis-cli ping` (10s interval). Prometheus: HTTP spider check (30s interval). Grafana: HTTP check on `/api/health` (30s interval). |
| A1.1-03 | Graceful Shutdown | Gunicorn workers handle SIGTERM for graceful connection draining. Nginx handles upstream server removal without dropping connections. |
| A1.1-04 | Auto-Recovery | `restart: unless-stopped` policy ensures all services automatically restart after failures. Health check `retries` parameter defines threshold before marking unhealthy. |

**Evidence Location:** `docker-compose.yml` (healthcheck directives throughout)
**Testing Procedure:** Stop services, verify auto-restart, measure time to healthy state.
**Status:** Implemented

### A1.2 -- Capacity Management

| Control ID | Control Name | Description |
|---|---|---|
| A1.2-01 | Worker Scaling | Gunicorn configured with 4 workers and 2 threads per worker (`backend/Dockerfile`, line 87). Celery concurrency configurable via `WORKER_CONCURRENCY` environment variable. |
| A1.2-02 | Memory Management | Redis `maxmemory` set to 256MB with `allkeys-lru` eviction policy. Node.js build uses `--max-old-space-size=4096` for compilation. Connection pool limits defined for Redis (50 connections). |
| A1.2-03 | Usage Limit Enforcement | `Organization.is_within_limits()` checks monthly API usage against tier-defined `max_analyses_per_month`. Rate limiting at both application (API key) and gateway (Kong) levels. |
| A1.2-04 | Database Connection Management | Django ORM manages connection pooling. PostgreSQL configured with `POSTGRES_INITDB_ARGS` for UTF-8 encoding and locale. |

**Evidence Location:** `docker-compose.yml`, `backend/Dockerfile`, `backend/stickforstats/settings.py`
**Testing Procedure:** Load test with concurrent users, verify rate limiting, test tier limit enforcement.
**Status:** Implemented

### A1.3 -- Disaster Recovery

| Control ID | Control Name | Description |
|---|---|---|
| A1.3-01 | Backup Strategy | Daily automated PostgreSQL backups at 2 AM (configurable via `BACKUP_SCHEDULE`). Redis AOF and RDB persistence. |
| A1.3-02 | Recovery Time Objective | RTO target: 4 hours for full service restoration from backup. |
| A1.3-03 | Recovery Point Objective | RPO target: 24 hours (daily backup cycle). Redis provides near-zero RPO for cached data. |
| A1.3-04 | Recovery Testing | Quarterly DR drill: restore from backup to isolated environment, verify data integrity, validate Guardian test suite passes. |

**Evidence Location:** `docker-compose.yml` (postgres-backup service), backup scripts
**Testing Procedure:** Execute DR drill, measure actual RTO/RPO, verify data integrity post-restore.
**Status:** Implemented

---

## 5. Processing Integrity

### PI1 -- Data Processing Accuracy

| Control ID | Control Name | Description |
|---|---|---|
| PI1.1-01 | Guardian Statistical Validation | The Guardian system (`backend/core/guardian/guardian_core.py`) validates all statistical assumptions before analysis. 8 validators: `NormalityValidator`, `VarianceHomogeneityValidator`, `IndependenceValidator`, `OutlierDetector`, `SampleSizeValidator`, `ModalityDetector`, `LinearityValidator`, `HomoscedasticityValidator`. Each test type maps to required assumptions (lines 83-123). |
| PI1.1-02 | Confidence Scoring | Guardian computes a confidence score using: `max(0, 1 - sum(w_si) / (max_penalty * 1.2))` where severity weights are: critical=3.0, warning=2.0, minor=1.0 (`SEVERITY_WEIGHTS`, lines 26-30). |
| PI1.1-03 | Alternative Test Recommendation | When assumptions are violated, Guardian recommends appropriate alternative tests (e.g., Mann-Whitney for non-normal t-test data, Kruskal-Wallis for non-normal ANOVA data). |
| PI1.1-04 | High-Precision Arithmetic | The `high_precision_calculator.py` uses mpmath with 50-digit decimal precision to prevent floating-point accumulation errors in statistical computations. Test statistics and p-values stored as strings in the audit trail to preserve full precision. |
| PI1.1-05 | SQS Manuscript Scoring | 45 detection rules (`backend/core/sqs_rules.py`) score manuscripts on a 100-point scale across 6 categories: Effect Sizes (20 pts), Assumption Transparency (15 pts), Sample and Power (15 pts), Statistical Precision (15 pts), Reproducibility Indicators (20 pts), Guideline Compliance (15 pts). |

**Evidence Location:** `backend/core/guardian/guardian_core.py`, `backend/core/high_precision_calculator.py`, `backend/core/sqs_rules.py`
**Testing Procedure:** Run 38 Guardian tests, verify confidence score calculations, validate alternative recommendations, compare results against scipy reference implementations.
**Status:** Implemented

### PI1.2 -- Data Validation

| Control ID | Control Name | Description |
|---|---|---|
| PI1.2-01 | Input Validation | Django model validators enforce data constraints: `MinValueValidator`, `MaxValueValidator`, `FileExtensionValidator`. Sample size must be >= 1 (`StatisticalAudit.sample_size`). Methodology scores bounded 0-100. |
| PI1.2-02 | XSS Prevention | DOMPurify library used across 7+ frontend components for sanitizing user-generated content and HTML output. |
| PI1.2-03 | SQL Injection Prevention | Django ORM generates parameterized queries. No raw SQL in the codebase. |
| PI1.2-04 | CSRF Protection | Django CSRF middleware enabled (`CsrfViewMiddleware` in middleware stack). CSRF tokens required for state-changing requests. |
| PI1.2-05 | File Upload Validation | `ManuscriptSubmission` model validates file types (PDF, LaTeX, DOCX, Plain Text) and records file hashes (SHA-256) for integrity verification. Maximum upload size controlled via `MAX_UPLOAD_SIZE` environment variable. |

**Evidence Location:** `backend/core/models.py` (validators), frontend DOMPurify usage, `backend/stickforstats/settings.py`
**Testing Procedure:** Submit invalid inputs, verify rejection with appropriate error messages, test XSS payloads, test SQL injection vectors.
**Status:** Implemented

### PI1.3 -- Audit Trail for Processing

| Control ID | Control Name | Description |
|---|---|---|
| PI1.3-01 | Complete Analysis Recording | Every statistical analysis creates a `StatisticalAudit` record with: full analysis snapshot (`full_analysis_data` JSON), computation metrics (time, memory), Guardian assessment (score, flags), and status tracking. |
| PI1.3-02 | Immutable Timestamps | `StatisticalAudit.timestamp` uses `timezone.now()` default with database indexing. `analysis_date` uses `auto_now_add=True` for tamper-resistant date recording. |
| PI1.3-03 | Integrity Score Calculation | `StatisticalAudit.calculate_integrity_score()` (lines 231-245) computes weighted average of methodology, reproducibility, Guardian, and assumption scores for overall quality assessment. |
| PI1.3-04 | Audit API | `AuditSummaryView` and `AuditRecordView` (`backend/api/v1/audit_views.py`) provide programmatic access to audit data with time range filtering, field filtering, and aggregation. |

**Evidence Location:** `backend/core/models.py` (StatisticalAudit), `backend/api/v1/audit_views.py`
**Testing Procedure:** Perform analyses, query audit API, verify record completeness and accuracy.
**Status:** Implemented

---

## 6. Confidentiality

### C1 -- Data Encryption

| Control ID | Control Name | Description |
|---|---|---|
| C1.1-01 | Encryption in Transit | Production mode enforces HTTPS via `SECURE_SSL_REDIRECT = True`. HSTS enabled for 1 year with subdomain inclusion and preload (`settings.py`, lines 289-294). Nginx configured with SSL/TLS termination (port 443). |
| C1.1-02 | API Key Hashing | All API keys (both `JournalAPIKey` and `PlatformAPIKey`) are hashed with SHA-256 before storage. Raw keys are returned only once at creation time. Key verification uses constant-time hash comparison via `verify_key()` methods. |
| C1.1-03 | Secret Key Management | Django `SECRET_KEY` generated using `secrets.token_urlsafe(50)` if not provided via environment variable (`settings.py`, line 14). JWT secrets configured separately via `JWT_SECRET` environment variable. |
| C1.1-04 | Database Encryption | PostgreSQL data-at-rest encryption provided by cloud provider volume encryption. Database credentials passed via environment variables, never hardcoded. |
| C1.1-05 | Redis Security | Redis configured with password authentication (`--requirepass`), AOF persistence for data durability. |

**Evidence Location:** `backend/stickforstats/settings.py`, `backend/core/models.py` (API key classes), `docker-compose.yml`
**Testing Procedure:** Verify HTTPS enforcement, test API key storage (confirm raw key not stored), review secret management.
**Status:** Implemented

### C1.2 -- Data Classification and Isolation

| Control ID | Control Name | Description |
|---|---|---|
| C1.2-01 | Multi-Tenant Data Isolation | `TenantContextMiddleware` resolves organization context on every request. Database queries scoped to the authenticated organization. |
| C1.2-02 | Project-Level Isolation | `Project` model (lines 931-969) supports visibility levels: Private, Team, and Public, providing granular access control within organizations. |
| C1.2-03 | Data Classification | Statistical data, manuscript content, and audit records are treated as confidential. User authentication data is treated as restricted. Public-facing health check data contains no sensitive information. |
| C1.2-04 | Source Map Protection | Frontend production builds disable source maps (`GENERATE_SOURCEMAP=false` in `frontend/Dockerfile`, line 31) to prevent client-side code exposure. |

**Evidence Location:** `backend/core/middleware/tenant_middleware.py`, `backend/core/models.py` (Project), `frontend/Dockerfile`
**Testing Procedure:** Attempt cross-organization data access, verify project visibility enforcement, check for source map availability in production.
**Status:** Implemented

### C1.3 -- Data Retention and Disposal

| Control ID | Control Name | Description |
|---|---|---|
| C1.3-01 | Audit Log Retention | 7-year retention period (`AUDIT_LOG_RETENTION_DAYS=2555`) for statistical audit records to satisfy regulatory requirements (FDA 21 CFR Part 11, GxP). |
| C1.3-02 | Session Cleanup | Django session framework manages session lifecycle. Expired sessions are purged per Django's default behavior. |
| C1.3-03 | API Key Lifecycle | API keys support expiration dates (`expires_at`). Deactivated keys are soft-deleted (`is_active=False`) to preserve audit trail. |

**Evidence Location:** `docker-compose.yml` (environment variables), `backend/core/models.py`
**Testing Procedure:** Verify retention policy enforcement, test session expiration, verify expired key rejection.
**Status:** Implemented

---

## 7. Privacy

### P1 -- GDPR Compliance

| Control ID | Control Name | Description |
|---|---|---|
| P1.1-01 | Consent Management | `ConsentRecord` model (`backend/core/models.py`, lines 893-928) tracks granular consent for: Usage Analytics, Statistical Data Processing, Email Notifications, Third-Party Data Sharing, and Cookie Consent. Records include: user, consent type, grant/revoke status, IP address, user agent, timestamp, and privacy policy version. |
| P1.1-02 | Consent Granularity | Five distinct consent types allow users to grant or revoke consent independently for each processing purpose. Unique constraint on `(user, consent_type)` prevents duplicate records. |
| P1.1-03 | Data Subject Rights | The platform supports GDPR data subject rights: right of access (audit trail export), right to rectification (profile editing), right to erasure (account deletion with cascade), right to data portability (JSON export). |
| P1.1-04 | Privacy by Design | Default permission class is `IsAuthenticated`. Minimal data collection principle: only fields necessary for statistical analysis are collected. Analytics disabled by default (`ENABLE_ANALYTICS=false` in `docker-compose.yml`). |

**Evidence Location:** `backend/core/models.py` (ConsentRecord), `docker-compose.yml`
**Testing Procedure:** Test consent grant/revoke flow, verify DSAR fulfillment, test account deletion cascade, verify analytics opt-in behavior.
**Status:** Implemented

### P1.2 -- Data Minimization

| Control ID | Control Name | Description |
|---|---|---|
| P1.2-01 | Minimal PII Collection | Statistical analysis endpoints process numerical data without requiring PII. User identification is optional (`user_id` field is nullable in `StatisticalAudit`). |
| P1.2-02 | IP Address Handling | Source IP recorded in audit trail for security purposes (`source_ip = GenericIPAddressField(blank=True, null=True)`). IP anonymization available for GDPR compliance. |
| P1.2-03 | Analytics Opt-In | Analytics disabled by default (`ENABLE_ANALYTICS=false`). Grafana analytics reporting disabled (`GF_ANALYTICS_REPORTING_ENABLED=false`). |

**Evidence Location:** `backend/core/models.py` (nullable fields), `docker-compose.yml`
**Testing Procedure:** Verify PII fields are nullable, test with analytics disabled, verify Grafana reporting is off.
**Status:** Implemented

### P1.3 -- Cross-Border Data Transfers

| Control ID | Control Name | Description |
|---|---|---|
| P1.3-01 | Data Residency | Platform deployment supports regional deployment for data residency requirements. Docker-based architecture enables deployment in any cloud region. |
| P1.3-02 | Transfer Mechanisms | Standard Contractual Clauses (SCCs) available for cross-border transfers. Data Processing Agreement template provided for customer compliance. |

**Evidence Location:** Deployment documentation, DPA template
**Testing Procedure:** Verify deployment region matches customer requirements, review SCC documentation.
**Status:** Implemented

### P1.4 -- Breach Notification

| Control ID | Control Name | Description |
|---|---|---|
| P1.4-01 | 72-Hour Notification | Incident response plan includes 72-hour notification to supervisory authorities and affected data subjects as required by GDPR Article 33. |
| P1.4-02 | Breach Record Keeping | All security incidents documented with: nature of breach, categories and approximate number of data subjects, likely consequences, and measures taken. |

**Evidence Location:** Incident response plan, breach register
**Testing Procedure:** Tabletop exercise for breach notification process.
**Status:** Implemented

---

## 8. Control Testing Schedule

| Quarter | Testing Activities |
|---|---|
| Q1 | Annual penetration test, SOC 2 readiness review, DR drill |
| Q2 | Access control review, API key audit, dependency vulnerability scan |
| Q3 | Incident response tabletop, Guardian test suite validation, backup restore test |
| Q4 | Annual risk assessment, privacy impact assessment, vendor security review |

### Continuous Testing

| Activity | Frequency | Owner |
|---|---|---|
| Guardian test suite execution | Every commit | CI/CD Pipeline |
| Health check monitoring | Every 30 seconds | Docker/Prometheus |
| Dependency vulnerability scan | Weekly | Security Team |
| Audit log integrity check | Daily | Automated script |
| Rate limit testing | Monthly | QA Team |

---

## 9. Exception and Remediation Process

### 9.1 Exception Request

All exceptions to these controls must be:
1. Documented with business justification
2. Approved by the CISO
3. Time-bounded (maximum 90 days)
4. Accompanied by compensating controls
5. Tracked in the risk register

### 9.2 Remediation SLAs

| Severity | Response Time | Remediation Time |
|---|---|---|
| Critical (CVSS >= 9.0) | 4 hours | 24 hours |
| High (CVSS 7.0-8.9) | 8 hours | 72 hours |
| Medium (CVSS 4.0-6.9) | 24 hours | 30 days |
| Low (CVSS < 4.0) | 72 hours | 90 days |

---

## 10. Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-19 | StickForStats Security Team | Initial SOC 2 Type II controls documentation |

---

*This document is confidential and intended for internal use and qualified auditors only.
Distribution outside the organization requires written authorization from the CISO.*
