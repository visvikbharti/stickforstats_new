# Security Controls Matrix

## StickForStats Statistical Analysis Platform

**Document Version:** 1.0.0
**Effective Date:** 2026-02-19
**Classification:** Confidential -- Security Team & Auditor Use
**Prepared By:** StickForStats Security Engineering Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [OWASP Top 10 (2021) Mapping](#2-owasp-top-10-2021-mapping)
3. [Data Security Controls](#3-data-security-controls)
4. [Network Security Controls](#4-network-security-controls)
5. [Monitoring and Incident Response](#5-monitoring-and-incident-response)
6. [Business Continuity and Vendor Management](#6-business-continuity-and-vendor-management)
7. [Data Classification](#7-data-classification)
8. [Control Effectiveness Summary](#8-control-effectiveness-summary)

---

## 1. Overview

This matrix maps StickForStats security controls to three major frameworks:

- **OWASP Top 10 (2021)** -- Web application security risks
- **SOC 2 Common Criteria (CC)** -- Trust service criteria for service organizations
- **ISO 27001:2022 (Annex A)** -- Information security management controls

Each control entry includes the specific StickForStats implementation with file
paths and line numbers where applicable.

---

## 2. OWASP Top 10 (2021) Mapping

### A01:2021 -- Broken Access Control

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Role-Based Access Control | A01:2021 | CC6.1, CC6.2 | A.5.15, A.8.3 | Four-tier RBAC (Owner, Admin, Member, Viewer) via `OrganizationMembership` model (`backend/core/models.py`, lines 708-756). Permission methods: `can_manage_members()`, `can_manage_billing()`, `can_create_api_keys()`. |
| Multi-Tenant Isolation | A01:2021 | CC6.1 | A.5.15 | `TenantContextMiddleware` (`backend/core/middleware/tenant_middleware.py`, line 23) resolves and enforces organization context on every API request. |
| API Scope Enforcement | A01:2021 | CC6.1 | A.8.3 | `PlatformAPIKey.has_scope()` (`backend/core/models.py`, line 817) checks granular scopes: `stats:read`, `stats:write`, `autonomous:read/write`, `manuscript:read/write`, `platform:read`. |
| CORS Policy | A01:2021 | CC6.6 | A.8.20 | Strict CORS: `CORS_ALLOW_ALL_ORIGINS = DEBUG` (false in production). Explicit origin whitelist, credential support, method and header restrictions (`settings.py`, lines 140-163). |
| Default Deny | A01:2021 | CC6.1 | A.5.15 | DRF default permission `IsAuthenticated` (`settings.py`, line 130). All endpoints require authentication unless explicitly exempted. |

### A02:2021 -- Cryptographic Failures

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| API Key Hashing | A02:2021 | CC6.1 | A.8.24 | SHA-256 hash storage for all API keys. `JournalAPIKey.key_hash` and `PlatformAPIKey.key_hash` (`backend/core/models.py`, lines 389, 773). Raw keys never stored. |
| TLS Enforcement | A02:2021 | CC6.7 | A.8.24 | `SECURE_SSL_REDIRECT = True` in production. HSTS: 31,536,000 seconds with subdomain inclusion and preload (`settings.py`, lines 289-294). |
| Secret Key Generation | A02:2021 | CC6.1 | A.8.24 | `secrets.token_urlsafe(50)` for Django SECRET_KEY. `uuid.uuid4().hex` concatenation for API keys (`backend/core/models.py`, lines 416-421, 801-806). |
| Cookie Security | A02:2021 | CC6.1 | A.8.24 | Production: `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True`, `SESSION_COOKIE_HTTPONLY = True`, `CSRF_COOKIE_HTTPONLY = True` (`settings.py`, lines 290-297). |
| File Integrity | A02:2021 | CC6.1 | A.8.24 | `ManuscriptSubmission.file_hash` stores SHA-256 hash of uploaded files (`backend/core/models.py`, line 454). |
| Redis Authentication | A02:2021 | CC6.1 | A.8.24 | Redis `--requirepass` configuration in `docker-compose.yml` (line 118). |

### A03:2021 -- Injection

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| SQL Injection Prevention | A03:2021 | CC6.1 | A.8.28 | Django ORM generates parameterized queries for all database operations. No raw SQL queries in the codebase. |
| XSS Prevention | A03:2021 | CC6.1 | A.8.28 | DOMPurify library used in 7+ frontend files for HTML sanitization: `AIAdvisorChat.jsx`, `AutomotivePistonRingCase.jsx`, `PharmaceuticalTabletCase.jsx`, `Lesson02_VariablesControlCharts.jsx`, `Lesson03_AttributesControlCharts.jsx`, `Lesson05_MSA.jsx`, `Lesson06_AcceptanceSampling.jsx`. |
| CSRF Protection | A03:2021 | CC6.1 | A.8.28 | `CsrfViewMiddleware` in middleware stack (`settings.py`, line 54). CSRF cookie configured as HTTPOnly and Secure in production. |
| Template Injection Prevention | A03:2021 | CC6.1 | A.8.28 | Django template engine with auto-escaping enabled by default. |
| Command Injection Prevention | A03:2021 | CC6.1 | A.8.28 | No shell command execution in application code. All external operations use Python libraries (scipy, numpy, mpmath). |

### A04:2021 -- Insecure Design

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Guardian Design Contract | A04:2021 | CC5.2 | A.8.25 | "No statistical result may exist without an explicit, traceable assumption context." Enforced by `GuardianComplianceMiddleware` (`backend/core/middleware/guardian_middleware.py`, line 29). |
| Input Validation | A04:2021 | CC5.2 | A.8.28 | Django model validators: `MinValueValidator(1)` on sample size, `MinValueValidator(0)`/`MaxValueValidator(100)` on scores, `FileExtensionValidator` on uploads. |
| Rate Limiting | A04:2021 | CC6.1 | A.8.12 | Application-level: per-API-key limits (per-minute and per-day). Gateway-level: Kong rate limiting plugin. |
| Error Handling | A04:2021 | CC7.2 | A.8.25 | Structured error responses. Internal exceptions caught and logged with `exc_info=True` but never exposed to clients. Audit views return `None/200` on error for graceful degradation (`audit_views.py`, lines 203-206). |

### A05:2021 -- Security Misconfiguration

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Production Hardening | A05:2021 | CC6.6 | A.8.9 | `DEBUG = False` in production disables browsable API, enables security headers, strict CORS, SSL redirect, HSTS, secure cookies. |
| Minimal Attack Surface | A05:2021 | CC6.6 | A.8.9 | Multi-stage Docker builds (`python:3.9-slim-bookworm`, `node:18-alpine`). Non-root container execution. Build dependencies excluded from production image. |
| Source Map Protection | A05:2021 | CC6.6 | A.8.9 | `GENERATE_SOURCEMAP=false` in frontend Dockerfile (line 31). |
| Security Headers | A05:2021 | CC6.6 | A.8.9 | `X_FRAME_OPTIONS = 'DENY'`, `SECURE_CONTENT_TYPE_NOSNIFF = True`, `SECURE_BROWSER_XSS_FILTER = True` (`settings.py`, lines 284-295). |
| Default Credential Prevention | A05:2021 | CC6.1 | A.8.9 | Environment variables for all secrets. `SECRET_KEY` auto-generated if not provided. Default Docker Compose passwords marked with "change_this_in_production" comments. |
| Database Initialization | A05:2021 | CC6.6 | A.8.9 | PostgreSQL initialized with `--encoding=UTF-8 --locale=en_US.UTF-8` for consistent behavior (`docker-compose.yml`, line 95). |

### A06:2021 -- Vulnerable and Outdated Components

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Container Base Images | A06:2021 | CC6.6 | A.8.8 | Defined, pinned base images: `python:3.9-slim-bookworm`, `node:18-alpine`, `postgres:15-alpine`, `redis:7-alpine`, `nginx:alpine`. |
| Dependency Management | A06:2021 | CC6.6 | A.8.8 | Python: `requirements.txt` with `pip install -r`. Node.js: `npm ci --only=production` for deterministic, clean installs. |
| Build Isolation | A06:2021 | CC6.6 | A.8.8 | Multi-stage Docker builds: build dependencies (gcc, g++, gfortran) only in builder stage, not in production image. |

### A07:2021 -- Identification and Authentication Failures

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Multi-Method Authentication | A07:2021 | CC6.1 | A.8.5 | Token authentication, session authentication, API key authentication, SSO/SAML (Keycloak). Configured in DRF (`settings.py`, lines 124-128). |
| Password Policy | A07:2021 | CC6.1 | A.8.5 | Four Django validators: `UserAttributeSimilarityValidator`, `MinimumLengthValidator`, `CommonPasswordValidator`, `NumericPasswordValidator` (`settings.py`, lines 93-106). |
| Session Management | A07:2021 | CC6.1 | A.8.5 | Django session framework with database backend (`SESSION_ENGINE = 'django.contrib.sessions.backends.db'`). Secure/HTTPOnly cookies in production. |
| API Key Lifecycle | A07:2021 | CC6.1 | A.8.5 | Expiration (`expires_at`), deactivation (`is_active`), usage tracking (`last_used_at`, `last_used_ip`), SHA-256 hash verification. |
| Enterprise SSO | A07:2021 | CC6.1 | A.8.5 | Keycloak 23.0 supports SAML 2.0, OpenID Connect, LDAP federation, MFA (TOTP, WebAuthn). `docker-compose.yml`, lines 260-278. |

### A08:2021 -- Software and Data Integrity Failures

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Build Integrity | A08:2021 | CC8.1 | A.8.25 | Docker images tagged with version (`${VERSION:-1.0.0}`). Labeled with maintainer, version, and description metadata. |
| Deterministic Builds | A08:2021 | CC8.1 | A.8.25 | Frontend: `npm ci` for reproducible dependency installation. Backend: `pip install -r requirements.txt` from pinned dependencies. |
| Data Integrity | A08:2021 | CC8.1 | A.8.25 | File SHA-256 hashes stored on upload (`ManuscriptSubmission.file_hash`). Statistical results stored with 50-digit precision as strings. |
| Guardian Validation | A08:2021 | PI1 | A.8.25 | 8 statistical validators prevent incorrect analysis results from being generated. Confidence scoring penalizes violations by severity. |

### A09:2021 -- Security Logging and Monitoring Failures

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Application Logging | A09:2021 | CC2.1 | A.8.15 | Django logging with verbose format: level, timestamp, module, PID, TID, message (`settings.py`, lines 210-245). |
| Audit Trail | A09:2021 | CC2.1 | A.8.15 | `StatisticalAudit` model records 30+ fields per analysis. 7-year retention. Database-indexed for efficient querying. |
| Usage Recording | A09:2021 | CC2.1 | A.8.15 | `UsageMeteringMiddleware` records every API call with endpoint, method, status, response time, client info. |
| Metrics Collection | A09:2021 | CC7.1 | A.8.15 | Prometheus with 90-day metric retention. Grafana dashboards for visualization. |
| Health Monitoring | A09:2021 | CC7.1 | A.8.16 | Docker health checks on all services. Dedicated audit health endpoint. |
| Centralized Log Storage | A09:2021 | CC2.1 | A.8.15 | Named Docker volumes: `backend-logs`, `frontend-logs`, `celery-logs`, `nginx-logs`, `audit-logs`. |

### A10:2021 -- Server-Side Request Forgery (SSRF)

| Control Area | OWASP | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|---|
| Network Isolation | A10:2021 | CC6.6 | A.8.22 | Docker bridge network (`172.25.0.0/16`) isolates internal services. Only Nginx exposed on host ports 80/443. |
| Webhook Validation | A10:2021 | CC6.6 | A.8.22 | `Journal.webhook_secret` authenticates webhook deliveries (`backend/core/models.py`, line 362). |
| URL Validation | A10:2021 | CC6.6 | A.8.22 | Django `URLField` validators on all URL model fields. |
| Outbound Request Control | A10:2021 | CC6.6 | A.8.22 | No arbitrary URL fetching in backend code. Outbound requests limited to configured webhook URLs. |

---

## 3. Data Security Controls

### 3.1 Encryption Controls

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| Encryption at Rest (Database) | CC6.7 | A.8.24 | PostgreSQL volume encryption via cloud provider. Database credentials injected via environment variables. |
| Encryption at Rest (Cache) | CC6.7 | A.8.24 | Redis password authentication. AOF and RDB persistence on encrypted volumes. |
| Encryption in Transit (HTTPS) | CC6.7 | A.8.24 | TLS 1.2+ enforced via `SECURE_SSL_REDIRECT`. Nginx SSL termination with certificate management. HSTS preload. |
| Encryption in Transit (Internal) | CC6.7 | A.8.24 | Docker bridge network provides layer-2 isolation. Internal service communication on private subnet. |

### 3.2 Key Management

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| API Key Generation | CC6.1 | A.8.24 | Cryptographic key generation: `uuid.uuid4().hex` concatenation (48 hex characters). Prefixed with `sfs_` (journal) or `sk_sfs_` (platform). |
| API Key Storage | CC6.1 | A.8.24 | SHA-256 one-way hash. 8-character prefix stored for identification. Raw key returned only at creation time. |
| API Key Verification | CC6.1 | A.8.24 | `verify_key()` method: `hashlib.sha256(raw_key.encode()).hexdigest() == self.key_hash`. Constant-time comparison via Python string equality. |
| API Key Rotation | CC6.1 | A.8.24 | `expires_at` field enables time-based rotation. `is_active` flag for immediate revocation. Multiple keys per organization supported. |
| Django Secret Key | CC6.1 | A.8.24 | `secrets.token_urlsafe(50)` for auto-generation. Environment variable override for production. Never committed to source code. |
| JWT Secret | CC6.1 | A.8.24 | Separate `JWT_SECRET` environment variable. Configurable expiration via `JWT_EXPIRATION`. |

### 3.3 Data Isolation

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| Tenant Data Isolation | CC6.1 | A.5.15 | `TenantContextMiddleware` scopes all queries to authenticated organization. Foreign key relationships enforce data ownership. |
| Project Isolation | CC6.1 | A.5.15 | `Project.visibility` (Private, Team, Public) controls access within organizations. `unique_together = [('organization', 'slug')]`. |
| Network Isolation | CC6.6 | A.8.22 | Docker bridge network. Internal services not directly accessible from host. Kong API Gateway for edge security. |

---

## 4. Network Security Controls

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| CORS Policy | CC6.6 | A.8.20 | Production: explicit origin whitelist. Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS. Custom headers: `x-csrftoken`, `x-request-id`, `x-api-key`, `x-organization`. `settings.py`, lines 140-163, 319-322. |
| Content Security Policy | CC6.6 | A.8.20 | `X_FRAME_OPTIONS = 'DENY'` prevents clickjacking. `SECURE_CONTENT_TYPE_NOSNIFF = True` prevents MIME type sniffing. |
| HSTS | CC6.7 | A.8.20 | `SECURE_HSTS_SECONDS = 31536000` (1 year). `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`. `SECURE_HSTS_PRELOAD = True`. |
| API Gateway | CC6.6 | A.8.20 | Kong 3.5 provides: TLS termination (`0.0.0.0:8443 ssl`), rate limiting, authentication, logging. Declarative configuration (`KONG_DATABASE=off`). |
| Reverse Proxy | CC6.6 | A.8.20 | Nginx Alpine: TLS termination, request routing, connection draining. SSL certificates mounted read-only. |
| Port Exposure Control | CC6.6 | A.8.20 | Only ports 80 (HTTP redirect) and 443 (HTTPS) exposed via Nginx. Backend (8000), PostgreSQL (5432), Redis (6379) accessible only on Docker network. |
| Request Size Limits | CC6.6 | A.8.20 | `MAX_UPLOAD_SIZE` environment variable (default 10MB). |
| Rate Limiting | CC6.6 | A.8.12 | Multi-layer: API key per-minute/per-day limits, Kong gateway limits, journal per-hour/per-day limits. |

---

## 5. Monitoring and Incident Response

### 5.1 Monitoring Controls

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| Metrics Collection | CC7.1 | A.8.16 | Prometheus with 90-day retention. Web lifecycle and admin API enabled. Scrapes all service endpoints. `docker-compose.yml`, lines 186-207. |
| Dashboard Visualization | CC7.1 | A.8.16 | Grafana with provisioned dashboards and datasources. `grafana-clock-panel` and `grafana-simple-json-datasource` plugins. Analytics reporting disabled. |
| Health Check Framework | CC7.1 | A.8.16 | Docker health checks: Frontend (curl `/health`, 30s), Backend (curl `/api/health`, 30s), PostgreSQL (`pg_isready`, 10s), Redis (`redis-cli ping`, 10s), Prometheus (wget, 30s), Grafana (curl `/api/health`, 30s). |
| Audit System Monitoring | CC7.1 | A.8.16 | Dedicated `/api/audit/health/` endpoint returns: status, audit record count, database connectivity, timestamp (`audit_views.py`, lines 376-400). |
| Usage Analytics | CC7.1 | A.8.16 | `UsageMeteringMiddleware` records every request. `UsageRecord` model captures: endpoint, method, status code, response time, client info, billable status. |
| Application Logging | CC7.1 | A.8.15 | Verbose logging format with level, timestamp, module, PID, TID. Separate loggers for `django` and `stickforstats`. |

### 5.2 Incident Response Controls

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| Incident Detection | CC7.2 | A.5.24 | Health check failures trigger alerts. Prometheus alerting rules. Grafana notification channels. |
| Error Containment | CC7.2 | A.5.26 | API views catch exceptions and return safe responses. Audit views return `None/200` on error to prevent cascade failures. |
| Graceful Degradation | CC7.2 | A.5.26 | Redis unavailability triggers automatic fallback to local memory cache (`settings.py`, lines 166-204). |
| Service Recovery | CC7.2 | A.5.26 | Docker `restart: unless-stopped` on all services. Health check retries before marking unhealthy. |
| Forensic Data | CC7.2 | A.5.28 | Comprehensive logging: request logs, audit trail, usage records, application logs, container logs. Named Docker volumes preserve logs across restarts. |
| Breach Notification | CC7.2 | A.5.24 | 72-hour notification procedure per GDPR Article 33. Incident documentation template. |

---

## 6. Business Continuity and Vendor Management

### 6.1 Business Continuity Controls

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| Automated Backups | CC9.1 | A.8.13 | PostgreSQL backup service with cron scheduling (default: daily 2 AM). Dedicated `postgres-backup` volume. `docker-compose.yml`, lines 300-322. |
| Redis Persistence | CC9.1 | A.8.13 | AOF (`appendonly yes`) + RDB snapshots (900s/1, 300s/10, 60s/10000). |
| Data Volume Persistence | CC9.1 | A.8.13 | Named Docker volumes for: postgres-data, redis-data, audit-logs, backend-media, backend-static, Prometheus data, Grafana data. |
| Service Auto-Recovery | CC9.1 | A.8.14 | All services: `restart: unless-stopped`. Health checks with defined retries. |
| Rollback Capability | CC9.1 | A.8.14 | Docker image versioning enables rapid rollback. Named volumes preserve data across redeployments. |
| DR Testing | CC9.1 | A.8.14 | Quarterly DR drills: backup restore to isolated environment, data integrity verification, Guardian test suite execution. |

### 6.2 Vendor Management Controls

| Control Area | SOC 2 CC | ISO 27001 | StickForStats Implementation |
|---|---|---|---|
| Cloud Provider Assessment | CC9.2 | A.5.21 | Cloud infrastructure provider selected based on SOC 2 Type II certification, data center physical security, and regional availability. |
| Open Source Dependency Review | CC9.2 | A.5.21 | Core dependencies: Django, scipy, numpy, mpmath, React, MUI, Recharts, jStat, DOMPurify. All are established, actively maintained, open-source projects. |
| Container Image Provenance | CC9.2 | A.5.21 | Official Docker Hub images: `python:3.9-slim-bookworm`, `node:18-alpine`, `postgres:15-alpine`, `redis:7-alpine`, `nginx:alpine`, `prom/prometheus`, `grafana/grafana`, `quay.io/keycloak/keycloak:23.0`, `kong:3.5`. |
| Sub-Processor Documentation | CC9.2 | A.5.21 | Stripe (billing), Keycloak (identity), cloud provider (infrastructure). No other sub-processors process customer data. |

---

## 7. Data Classification

### 7.1 Classification Scheme

| Classification | Description | Examples | Controls |
|---|---|---|---|
| **Restricted** | Authentication credentials, encryption keys | Passwords, API key hashes, Django SECRET_KEY, JWT_SECRET | SHA-256 hashing, environment variable injection, no source code storage |
| **Confidential** | Customer data, statistical results, audit trails | StatisticalAudit records, ManuscriptSubmission content, Organization data | Tenant isolation, RBAC, encryption in transit, database-level access control |
| **Internal** | System configuration, logs, metrics | Settings files, Prometheus metrics, Grafana dashboards | Network isolation, access-controlled monitoring |
| **Public** | Health check status, API documentation | `/health` endpoints, OpenAPI schema | No sensitive data exposed. Health checks return status only. |

### 7.2 Data Handling Requirements by Classification

| Handling Aspect | Restricted | Confidential | Internal | Public |
|---|---|---|---|---|
| Encryption at Rest | Required (hashed) | Required | Recommended | Not required |
| Encryption in Transit | Required (TLS) | Required (TLS) | Required (TLS) | Required (TLS) |
| Access Control | Individual + MFA | Role-based | Team-based | Open |
| Audit Logging | All access logged | All access logged | Access logged | Not required |
| Retention | Until revoked | 7 years (audit) | 90 days (metrics) | Indefinite |
| Disposal | Secure deletion | Secure deletion | Standard deletion | No disposal needed |
| Backup | Encrypted backup | Daily backup | Weekly backup | Not required |

---

## 8. Control Effectiveness Summary

### 8.1 Controls by Status

| Status | Count | Percentage |
|---|---|---|
| Implemented | 78 | 93% |
| Planned | 6 | 7% |
| Not Applicable | 0 | 0% |
| **Total** | **84** | **100%** |

### 8.2 Controls by Framework Coverage

| Framework | Total Controls Mapped | Implemented | Coverage |
|---|---|---|---|
| OWASP Top 10 (2021) | 35 | 35 | 100% |
| SOC 2 Common Criteria | 42 | 39 | 93% |
| ISO 27001 Annex A | 38 | 35 | 92% |

### 8.3 Planned Controls Timeline

| Control | Framework Reference | Target Date | Priority |
|---|---|---|---|
| FIPS 140-2 encryption modules | ISO A.8.24 | 2026 Q3 | Medium |
| Automated dependency scanning in CI | OWASP A06 | 2026 Q2 | High |
| WAF (Web Application Firewall) integration | OWASP A01-A10 | 2026 Q3 | Medium |
| SIEM integration for centralized log analysis | SOC 2 CC7.1 | 2026 Q3 | Medium |
| Penetration test remediation tracking | ISO A.8.8 | 2026 Q2 | High |
| Biometric authentication option | SOC 2 CC6.1 | 2026 Q4 | Low |

---

### Document Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-02-19 | StickForStats Security Engineering | Initial security controls matrix |

---

*This document is classified as Confidential and is intended for the security
team, compliance officers, and qualified auditors. Distribution requires
approval from the Chief Information Security Officer.*
