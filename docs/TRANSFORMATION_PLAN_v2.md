# StickForStats v2.0 — World-Class Transformation Plan

**Created:** 2026-04-16
**Status:** In Progress
**Goal:** Transform StickForStats into the world's best statistical analysis web platform

---

## Current State Assessment (2026-04-16)

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Statistical Coverage | 9.5/10 | Exceptional — 50+ tests, Guardian, high-precision |
| Architecture | 8.5/10 | Solid — clean separation, multi-tenant |
| UI/Theme | 9/10 | Professional — dark mode, i18n, enterprise look |
| Security | 4/10 | **Critical gaps** — no token expiry, rate limiting unenforced |
| Testing | 3/10 | **Critical** — <5% coverage, no security/load tests |
| Performance | 6/10 | WebSocket broken, no caching strategy, no compression |
| Accessibility | 5.5/10 | Semantic HTML good, ARIA coverage ~17% |
| Real-time | 3/10 | WebSocket service built but ASGI not configured |
| Mobile/Desktop | 2/10 | Skeleton only — 2 screens, outdated Tauri |
| Monitoring | 3/10 | Prometheus config exists, no dashboards/alerts |
| CI/CD | 7/10 | Lint+test green, missing deploy stage |
| Documentation | 8.5/10 | Excellent API docs, compliance docs |

**Overall: 6.5/10**

---

## Phase 0: Critical Security Fixes (Week 1) — BLOCKING

### 0.1 Authentication Hardening
- Replace DRF TokenAuthentication with `djangorestframework-simplejwt`
- Access token: 15-minute expiry
- Refresh token: 7-day expiry with rotation
- Token blacklisting on logout
- Password strength validation (django-password-validators or zxcvbn)
- Rate limit login attempts (5/min per IP)
- Optional TOTP-based 2FA

### 0.2 Rate Limiting Enforcement
- Rate limits defined in JournalAPIKey/PlatformAPIKey models but **never checked by middleware**
- Implement `django-ratelimit` or custom middleware to enforce limits
- Add per-IP rate limiting for unauthenticated endpoints
- Return proper 429 responses with Retry-After header

### 0.3 Webhook Security & Headers
- HMAC-SHA256 signing for all webhook deliveries
- Timing-safe comparison for API key validation (`hmac.compare_digest`)
- Security headers middleware: CSP, X-Frame-Options, X-Content-Type-Options, HSTS
- Environment-gate `/debug-login` route (remove from production)

---

## Phase 1: Testing & Quality Foundation (Weeks 2-4)

### 1.1 Backend Test Coverage → 80%
- Unit tests for all 8 Guardian validators (edge cases: large N, tiny N, ties, missing data)
- Integration tests for all major API endpoint families (target: 200+ tests)
- Statistical validation tests against R/SciPy baselines for every test type
- Service-layer tests for cascade engine, smart profiler, query handler
- Celery task tests with `CELERY_TASK_ALWAYS_EAGER=True`
- Security tests: injection, auth bypass, privilege escalation, IDOR

### 1.2 Frontend Test Coverage → 60%
- Component tests for Guardian, PCA, DOE, analysis modules
- Service tests for StatisticalTestService, api.js interceptors
- Page-level smoke tests for all 42 pages
- Context provider tests (AuthContext, SettingsContext)
- Snapshot tests for complex visualization components

### 1.3 E2E Testing Pipeline
- Playwright for critical user workflows:
  - Upload data → select test → run analysis → view results → export report
  - Register → login → create org → invite member → run analysis
  - Manuscript upload → parse → validate → generate report
- Integrate into CI (run on every PR)

### 1.4 Load Testing
- k6 or Artillery scripts targeting 1000 concurrent users
- Target: <200ms p95 for statistical endpoints, <500ms for manuscript processing
- Run weekly in CI, alert on regression

---

## Phase 2: Performance & Real-Time (Weeks 3-5)

### 2.1 ASGI + WebSocket
- Frontend WebSocket infrastructure already built (service, hooks, DOE/RAG/SQC integration)
- Configure Django Channels with `daphne` or `uvicorn`
- Channel layers via Redis
- Enable: long-running analysis progress, collaborative sessions, live Guardian feedback

### 2.2 Systematic Caching
- Reference data: subscription tiers, discipline profiles, SQS rules (TTL: 1 hour)
- RBAC permission checks (TTL: 5 min, invalidate on role change)
- Journal configs (TTL: 30 min)
- `Cache-Control` headers for immutable API responses
- `@cache_page` for analytics endpoints

### 2.3 Response Optimization
- GZip middleware for all JSON responses
- Parallelize batch manuscript processing (Celery `group`/`chord`)
- Database indexes: `Organization.slug` unique, `Journal.is_active` partial, natural keys
- `select_related`/`prefetch_related` audit across all views

### 2.4 Structured Logging + Observability
- `python-json-logger` for structured logging
- Correlation IDs (request_id, user_id, org_id) on every log line
- Sentry for error aggregation and alerting
- OpenTelemetry for distributed tracing
- Grafana dashboards: request rates, error rates, p95 latency, Guardian stats

---

## Phase 3: UX Excellence (Weeks 4-7)

### 3.1 Accessibility → WCAG 2.1 AA
- ARIA coverage 17% → 90%
- Focus trap in all modals/dialogs
- Screen reader support for data visualizations (alt-text, data tables)
- RTL layout for Arabic
- Keyboard navigation for all workflows
- Color contrast audit + fixes
- `axe-core` in CI (fail on violations)

### 3.2 UX Polish
- Onboarding: adaptive based on expertise level
- Command palette: fuzzy search across all features
- Guided wizard: "I don't know which test to use" → conversational flow
- Results: plain-language summary prominently above technical output
- Export: APA-formatted tables, publication-ready plots
- Loading: skeleton screens instead of spinners

### 3.3 Data Visualization Upgrade
- Unified chart theming (currently 4 libraries: Plotly, Recharts, Chart.js, D3)
- Interactive exploration: click point → see data row
- Publication export: SVG/PDF/PNG at 300+ DPI
- Dark mode for all charts

### 3.4 Collaboration Features
- Real-time co-analysis (requires ASGI from Phase 2)
- Shareable analysis links (public/org/private)
- Comment threads on results
- Analysis version history

---

## Phase 4: Guardian v2 — Context-Aware (Weeks 5-8)

### 4.1 Context-Aware Validation
- **Large-N robustness**: ANOVA tolerates normality violations with N>30/group
- **Severity graduation**: p=0.04 vs p=0.001 normality violation → different scores
- **Violation interaction**: Two minor violations together may be worse than one warning
- **Methodological citations**: Every recommendation cites a paper
- **Audit trail**: Log every check with inputs, violations, score, recommendations

### 4.2 Guardian Reporting
- Visual evidence for every violation (Q-Q, residual, boxplot)
- Downloadable PDF report for supplementary materials
- "Guardian Verified" badge for clean analyses
- Journal-specific assumption profiles

### 4.3 Advanced Assumptions
- Multicollinearity detection (VIF) for regression
- Influential observations (Cook's distance, DFBETAS)
- HC0-HC4 robust standard errors as automatic fallback
- Bootstrap CIs when parametric assumptions fail

---

## Phase 5: AI Intelligence Layer (Weeks 6-9)

### 5.1 Natural Language Analysis
- "Compare treatment vs control for gene expression" → auto-detect, run, explain
- Context-aware: remembers dataset, suggests follow-ups
- Multi-turn: "Now try without outliers" → understands context

### 5.2 Manuscript Intelligence
- Enhanced statistical claim detection accuracy
- Cross-reference reported vs recomputed values
- P-hacking indicators (p-curve, unusual clustering)
- Reviewer-ready statistical audit reports

### 5.3 Learning System
- Adaptive content based on analysis history
- "You used t-test but have 4 groups — here's why ANOVA is better"
- Spaced repetition for statistical concepts
- Certification with real analysis challenges

---

## Phase 6: Platform Completion (Weeks 8-12)

### 6.1 Mobile (React Native)
- Complete screens: Dashboard, Quick Analysis, Results, Guardian, Settings, Profile, Manuscript Scanner, Offline
- Camera OCR: photograph stats table → validate
- Push notifications for async completion
- Offline-first with sync

### 6.2 Desktop (Tauri)
- Upgrade to Tauri 2.x
- Native file dialogs, system tray, auto-update
- Local-first mode (no server needed for sensitive data)

### 6.3 SDKs & Extensions
- Python SDK → PyPI (add async client)
- R SDK → CRAN (full test suite)
- Jupyter: magic commands (`%%stickforstats analyze`)
- Browser extension: enhanced paper detection, inline Guardian badges
- VS Code extension: statistical analysis in editor

### 6.4 Plugin Marketplace
- Sandbox hardening (resource limits, timeouts)
- Automated security scan for plugins
- Developer SDK + documentation
- Featured domain packs (genomics, psychology, economics)

---

## Phase 7: Infrastructure Maturity (Weeks 10-14)

### 7.1 CI/CD Completion
- Docker registry push (GHCR or ECR)
- Staging auto-deploy on merge to `develop`
- Production deploy with manual approval
- Migration safety checks
- Bundle size tracking (alert on >5% increase)

### 7.2 Kubernetes Production
- Complete manifests: backend, Celery worker/beat StatefulSets
- ConfigMaps + Secrets (migrate from .env)
- HPA based on CPU/request rate
- PVCs for PostgreSQL, Redis, audit logs
- Ingress + cert-manager for TLS

### 7.3 Monitoring & Alerting
- postgres_exporter for Prometheus
- Custom app metrics (analysis_duration, guardian_violations)
- Grafana dashboards: API health, engine performance, user activity
- PagerDuty/Slack alerts: error spikes, latency > 500ms, disk > 80%
- Public status page

### 7.4 Data Architecture
- UsageRecord archival (>90 days → cold storage)
- Read replicas for analytics
- PgBouncer connection pooling
- Automated VACUUM/ANALYZE

---

## Agent Team Structure

| Agent | Focus | Phases |
|-------|-------|--------|
| **SecurityAgent** | Auth, rate limiting, HMAC, headers, pen testing | 0, ongoing |
| **TestingAgent** | Backend/frontend/E2E/load tests, CI gates | 1 |
| **PerformanceAgent** | ASGI, caching, compression, logging, DB | 2 |
| **FrontendAgent** | WCAG 2.1 AA, UX polish, charts, collaboration | 3 |
| **GuardianAgent** | Context-aware validators, citations, reporting | 4 |
| **AIAgent** | NL analysis, manuscript intelligence, learning | 5 |
| **PlatformAgent** | Mobile, desktop, SDKs, plugins, extensions | 6 |
| **InfraAgent** | K8s, CI/CD deploy, Grafana, archival | 7 |

### Execution Timeline

```
Week 1:        [SecurityAgent] ← BLOCKING
Weeks 2-4:     [TestingAgent] + [PerformanceAgent] in parallel
Weeks 4-7:     [FrontendAgent] + [GuardianAgent] in parallel
Weeks 6-9:     [AIAgent]
Weeks 8-12:    [PlatformAgent]
Weeks 10-14:   [InfraAgent]
```

---

## Target Scores After v2.0

| Dimension | Current | Target |
|-----------|---------|--------|
| Statistical Coverage | 9.5/10 | 10/10 |
| Architecture | 8.5/10 | 9.5/10 |
| UI/Theme | 9/10 | 9.5/10 |
| Security | 4/10 | 9/10 |
| Testing | 3/10 | 9/10 |
| Performance | 6/10 | 9/10 |
| Accessibility | 5.5/10 | 9/10 |
| Real-time | 3/10 | 8.5/10 |
| Mobile/Desktop | 2/10 | 7.5/10 |
| Monitoring | 3/10 | 8.5/10 |
| CI/CD | 7/10 | 9.5/10 |
| **Overall** | **6.5/10** | **9.2/10** |
