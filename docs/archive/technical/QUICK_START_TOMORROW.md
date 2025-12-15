# StickForStats - Quick Start Guide
## For Session: December 13, 2025

---

## 30-Second Summary

**What's Done**:
- ✅ AI Statistical Advisor (StickAI) - Full implementation
- ✅ Methods Section Generator - Integrated with AI advisor
- ✅ 4,653 lines of new production code

**What's Pending**:
- ⏳ Add API credits ($5-10) at console.anthropic.com

**Next Feature Options**:
1. Meta-Analysis Module (recommended - high impact)
2. Power Analysis Educational Module (plan exists)
3. R/Python Code Export

---

## Start Servers (2 commands)

### Terminal 1: Backend
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend
source ~/.zshrc && python manage.py runserver 0.0.0.0:8000
```

### Terminal 2: Frontend
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
PORT=3001 npm start
```

### Access
- **Frontend**: http://localhost:3001
- **AI Advisor**: Click floating blue button (bottom-right)
- **Methods Writer**: AI Advisor → "Methods Writer" tab

---

## Add API Credits (First Priority)

1. Go to: https://console.anthropic.com/settings/billing
2. Add payment method
3. Add $5-10 credits
4. Test: AI chat should now give real Claude responses

---

## Key Files to Know

```
AI Advisor System:
├── backend/ai_advisor/services/ai_service.py  # Claude API integration
├── backend/api/v1/ai_advisor_views.py         # REST endpoints
├── frontend/src/components/ai-advisor/
│   ├── AIAdvisorHub.jsx                       # Main container + tabs
│   ├── AIAdvisorChat.jsx                      # Chat interface
│   └── MethodsSectionGenerator.jsx            # Methods wizard
```

---

## Test AI Status

```bash
# Check if API is working
curl http://localhost:8000/api/v1/ai-advisor/status/

# Expected response (with credits):
{"status": "operational", "ai_available": true}

# Expected response (without credits):
{"status": "operational", "ai_available": false, "reason": "insufficient_credits"}
```

---

## Tomorrow's Recommended Work

### Option A: Meta-Analysis Module

**Why**: No free, good meta-analysis tool exists. Major market gap.

**Files to Create**:
```
frontend/src/components/meta-analysis/
├── MetaAnalysisHub.jsx          # Main container
├── ForestPlot.jsx               # Forest plot visualization
├── EffectSizePooling.jsx        # Fixed/random effects
├── HeterogeneityAnalysis.jsx    # I², Q statistic
├── FunnelPlot.jsx               # Publication bias
├── SubgroupAnalysis.jsx         # Subgroup comparisons
└── index.js                     # Exports

backend/core/
└── meta_analysis.py             # Backend calculations
```

### Option B: Power Analysis Education

**Why**: Comprehensive plan already exists at `.claude/plans/idempotent-launching-swing.md`

**Scope**: 11 lessons, ~22,000 lines, interactive simulations

### Option C: R/Python Export

**Why**: Researchers need reproducibility

**Files to Create**:
```
frontend/src/components/code-export/
├── CodeExporter.jsx             # Main component
├── RCodeGenerator.js            # R code templates
├── PythonCodeGenerator.js       # Python templates
└── index.js
```

---

## Architecture Reminder

```
User → Frontend (React 18 @ :3001)
         ↓
       API calls to /api/v1/...
         ↓
      Backend (Django @ :8000)
         ↓
      AI: Claude Sonnet 4 (via Anthropic SDK)
      Stats: scipy, numpy, pandas
```

---

## Important Context

### API Key Location
```bash
# Already in ~/.zshrc
export ANTHROPIC_API_KEY="REDACTED_API_KEY..."
```

### Current Mock Behavior
Without API credits, the AI advisor:
1. Tries to call Claude API
2. Gets "insufficient credits" error
3. Falls back to intelligent mock responses
4. Mock responses are contextual but not Claude-powered

### After Adding Credits
1. Real Claude Sonnet 4 responses
2. Full conversation memory
3. Scientific integrity prompts
4. Test recommendation extraction

---

## Commands Cheat Sheet

```bash
# Check backend status
curl http://localhost:8000/api/v1/ai-advisor/status/

# Test AI chat
curl -X POST http://localhost:8000/api/v1/ai-advisor/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "What test for comparing two means?"}'

# Check frontend build
cd frontend && npm run build

# View all documentation
ls -la /Users/vishalbharti/StickForStats_v1.0_Production/*.md
```

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `SESSION_HANDOFF_DEC12_2025.md` | **Full context** - read this first |
| `CODE_INVENTORY_COMPLETE.md` | All files cataloged |
| `AI_ADVISOR_IMPLEMENTATION_COMPLETE.md` | AI system details |
| `MASTER_PLAN_WORLDS_BEST_STATS_PLATFORM.md` | 10-feature roadmap |
| `.claude/plans/idempotent-launching-swing.md` | Power Analysis education plan |

---

*Ready for tomorrow's session!*
