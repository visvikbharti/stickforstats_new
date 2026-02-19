# Next Session Prompt — Copy and paste everything below the line into Claude Code

---

## Context: StickForStats v2.0 — Session Continuation from Feb 19, 2026

I'm continuing work on **StickForStats**, a statistical analysis platform (React + Django) that was transformed from v1.0 (academic tool) to v2.0 (world platform) in yesterday's session.

### What was built yesterday (Feb 19):
We implemented the complete **3-pillar v2.0 vision** in a single day:

**Pillar 1 — Autonomous Intelligence** ("Anyone Can Use It"):
- SmartProfiler, CascadeEngine, PlainLanguageTranslator, AutonomousQueryHandler
- Frontend: SmartUpload, NaturalLanguageBar, PlainEnglishResults, GuidedWizard
- 5 new autonomous API endpoints

**Pillar 2 — Journal Integration** ("Turnitin for Statistics"):
- ManuscriptParser (GROBID/LaTeX/DOCX), ClaimExtractor (regex+LLM), ConsistencyValidator (STATCHECK-style)
- 7 manuscript validators, discipline profiles, webhook/batch submission
- ManuscriptAnalyzer component, JournalAnalyticsDashboard page

**Pillar 3 — Universal Platform** ("Used by Everyone"):
- Multi-tenant RBAC, GDPR compliance, billing/tiers, Celery async (13 tasks, 7 queues)
- Python SDK (`sdk/python/`), R SDK (`sdk/r/`), Browser extension, Jupyter extension
- React Native mobile app (`mobile/`), Tauri desktop app (`desktop/`)
- Keycloak SSO, Kong API Gateway, Plugin marketplace with sandboxed runtime
- Site licensing, LMS integration, Certification program
- 16 i18n languages, PWA, Interactive API docs page

**Documentation**: Complete rewrite of README.md, CONTRIBUTING.md, DEPLOYMENT_GUIDE.md, FEATURES_DOCUMENTATION.md, docs/API_DOCUMENTATION.md, docs/MULTI_LANGUAGE_SUPPORT.md

### Current verified state:
- **136 git commits**, all pushed to `main`, latest: `e134399`
- **195 API endpoints** (path() in urls.py)
- **25 frontend pages**, **16 languages**
- **38/38 Guardian tests pass**, **0 Django issues**, **0 frontend build errors**
- **10 commits yesterday**: 301 files changed, +60,798 / -19,432 lines

### Key files to read for context:
1. `docs/SESSION_HANDOFF_2026-02-19_v2.md` — Full session details, all new files/services listed
2. MEMORY.md (auto-loaded) — Updated v2.0 architecture, all key file locations
3. `~/.claude/plans/mossy-finding-charm.md` — The strategic v2.0 roadmap plan

### What's next (suggested priorities):
1. **Write tests** for new v2.0 services (only Guardian has tests currently)
2. **Run database migrations** for new models (Organization, Project, Plugin, ConsentRecord, etc.)
3. **Install external dependencies** (GROBID, pyreadstat, django-tenants, etc.)
4. **Integration testing** — end-to-end flow from data upload → autonomous query → result → report
5. **Real manuscript testing** — test the parser with actual academic papers
6. **SDK publishing** — prepare Python SDK for PyPI, R SDK for CRAN
7. **CI/CD expansion** — GitHub Actions for new services and SDKs
8. **Performance testing** — Locust/k6 load testing

### Important notes:
- Frontend build requires: `NODE_OPTIONS="--max-old-space-size=4096"`
- Guardian test path: `python manage.py test core.guardian.tests` (NOT `core.tests`)
- `CELERY_TASK_ALWAYS_EAGER = True` in settings (runs synchronously in dev)
- i18n config: `frontend/src/i18n/index.js` (NOT config.js)
- LaTeX compiler: `tectonic` (no pdflatex)

Please start by reading `docs/SESSION_HANDOFF_2026-02-19_v2.md` to get the full picture, then let's discuss what to tackle today.
