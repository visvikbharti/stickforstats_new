# StickForStats Session Handoff Document
## December 12, 2025 - Complete Context Preservation

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Project Architecture](#project-architecture)
3. [Current Feature Status](#current-feature-status)
4. [AI Advisor System Details](#ai-advisor-system-details)
5. [Methods Section Generator Details](#methods-section-generator-details)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [File Inventory](#file-inventory)
8. [Code Patterns & Conventions](#code-patterns--conventions)
9. [Known Issues & Technical Debt](#known-issues--technical-debt)
10. [Environment Setup](#environment-setup)
11. [Testing Commands](#testing-commands)
12. [Tomorrow's Roadmap](#tomorrows-roadmap)
13. [Master Plan Reference](#master-plan-reference)

---

## Executive Summary

**Project**: StickForStats - World's Best Statistical Analysis Platform
**Session Date**: December 12, 2025
**Session Focus**: AI Statistical Advisor + Methods Section Generator

### What Was Accomplished Today

| Feature | Lines of Code | Status |
|---------|---------------|--------|
| AI Statistical Advisor (StickAI) | ~1,210 backend + ~2,730 frontend | ✅ Complete |
| Methods Section Generator | ~713 frontend | ✅ Complete |
| **Total New Code** | **~4,653 lines** | Production-ready |

### Critical Pending Item
- **API Credits**: Add $5-10 at https://console.anthropic.com/settings/billing
- API Key is already configured in `~/.zshrc`

---

## Project Architecture

```
StickForStats_v1.0_Production/
├── backend/                          # Django REST Framework
│   ├── stickforstats/               # Main Django project
│   │   ├── settings.py              # Django settings
│   │   └── urls.py                  # Root URL config
│   ├── api/v1/                      # API Version 1
│   │   ├── urls.py                  # API routes (includes AI advisor)
│   │   ├── views.py                 # Statistical test views
│   │   ├── ai_advisor_views.py      # AI advisor endpoints (NEW)
│   │   └── guardian_views.py        # Data quality guardian
│   ├── ai_advisor/                  # AI Advisor module (NEW)
│   │   ├── __init__.py
│   │   └── services/
│   │       ├── __init__.py
│   │       └── ai_service.py        # Claude API integration
│   ├── core/                        # Core statistical functions
│   │   ├── statistics_engine.py
│   │   ├── power_analysis.py
│   │   └── guardian.py
│   └── requirements.txt             # Python dependencies
│
├── frontend/                        # React 18 Application
│   ├── src/
│   │   ├── App.jsx                  # Main app with routes
│   │   ├── components/
│   │   │   ├── ai-advisor/          # AI Advisor module (NEW)
│   │   │   │   ├── AIAdvisorHub.jsx
│   │   │   │   ├── AIAdvisorChat.jsx
│   │   │   │   ├── AIAdvisorSuggestions.jsx
│   │   │   │   ├── AIAdvisorDataContext.jsx
│   │   │   │   ├── MethodsSectionGenerator.jsx  (NEW)
│   │   │   │   ├── hooks/useAIAdvisor.js
│   │   │   │   ├── utils/promptTemplates.js
│   │   │   │   ├── utils/testSelector.js
│   │   │   │   └── index.js
│   │   │   ├── education/           # Learning modules
│   │   │   ├── power-analysis/      # Power analysis tools
│   │   │   ├── statistical-analysis/ # Statistical tests
│   │   │   ├── Guardian/            # Data quality system
│   │   │   └── Landing/             # Landing page
│   │   └── api/                     # API client functions
│   └── package.json
│
├── Documentation Files (Root)
│   ├── MASTER_PLAN_WORLDS_BEST_STATS_PLATFORM.md
│   ├── AI_ADVISOR_IMPLEMENTATION_COMPLETE.md
│   ├── PROGRESS_UPDATE_DEC12_2025.md
│   └── SESSION_HANDOFF_DEC12_2025.md (this file)
│
└── .claude/plans/
    └── idempotent-launching-swing.md  # Power Analysis Education Plan
```

---

## Current Feature Status

### Master Plan Progress (10 Features)

| # | Feature | Status | Progress | Notes |
|---|---------|--------|----------|-------|
| 1 | AI Statistical Advisor | ✅ COMPLETE | 100% | Claude-powered, with mock fallback |
| 2 | Methods Section Generator | ✅ COMPLETE | 100% | Integrated in AI Advisor drawer |
| 3 | Meta-Analysis Module | ⬜ NOT STARTED | 0% | High priority next |
| 4 | Study Design Wizard | ⬜ NOT STARTED | 0% | |
| 5 | Certification Program | ⬜ NOT STARTED | 0% | |
| 6 | Mobile App | ⬜ NOT STARTED | 0% | |
| 7 | Statistical Debugger | ⬜ NOT STARTED | 0% | |
| 8 | Paper Parser | ⬜ NOT STARTED | 0% | |
| 9 | Multi-Language Support | ⬜ NOT STARTED | 0% | |
| 10 | R/Python Code Export | ⬜ NOT STARTED | 0% | |

### Educational Modules Status

| Module | Lessons | Status |
|--------|---------|--------|
| PCA (Principal Component Analysis) | 10/10 | ✅ Complete |
| Confidence Intervals | 8/8 | ✅ Complete |
| Design of Experiments | 8/8 | ✅ Complete |
| Probability Distributions | 6/6 | ✅ Complete |
| **Power Analysis** | 0/11 | ⬜ Plan ready |

---

## AI Advisor System Details

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                               │
├─────────────────────────────────────────────────────────────────┤
│  Floating FAB (bottom-right) → Opens Drawer                      │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────┐                    │
│  │         TABBED NAVIGATION               │                    │
│  │  [AI Chat]  │  [Methods Writer]         │                    │
│  └─────────────────────────────────────────┘                    │
│       │                    │                                     │
│       ▼                    ▼                                     │
│  AIAdvisorChat     MethodsSectionGenerator                       │
│  - Quick suggestions   - 5-step stepper                          │
│  - Message history     - Form inputs                             │
│  - Test recommendations - Generate/Copy/Download                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND API                                  │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/v1/ai-advisor/chat/                                   │
│       │                                                          │
│       ▼                                                          │
│  AIAdvisorService (Singleton)                                    │
│       │                                                          │
│       ├── Rate Limiter (30 req/min, 150K tokens/min)            │
│       ├── Conversation Manager (Thread-safe, 24hr TTL)          │
│       ├── Scientific System Prompt                               │
│       │                                                          │
│       ▼                                                          │
│  Anthropic Client → Claude Sonnet 4 API                          │
│       │                                                          │
│       ▼                                                          │
│  Response with test recommendations                              │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Components Detail

#### `AIAdvisorHub.jsx` (~550 lines)
```javascript
// Key state variables
const [isOpen, setIsOpen] = useState(initialOpen);
const [showDataContext, setShowDataContext] = useState(false);
const [activeCategory, setActiveCategory] = useState(null);
const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
const [activeView, setActiveView] = useState('chat'); // 'chat' or 'methods'

// Props
{
  embedded: false,        // Render inline vs floating
  initialOpen: false,     // Start open?
  dataContext: null,      // Data from analysis page
  onTestRecommendation,   // Callback when test selected
  onMethodsGenerate,      // Callback when methods generated
}
```

#### `useAIAdvisor.js` Hook (~475 lines)
```javascript
// Returns
{
  messages,              // Array of {role, content, timestamp, recommendations}
  isLoading,             // Boolean
  error,                 // Error message or null
  conversationId,        // UUID for conversation thread
  isAIAvailable,         // null (checking), true, or false
  usingMockResponses,    // Boolean - true if using fallback
  sendMessage,           // async (content) => void
  clearConversation,     // () => void
  setDataContext,        // (context) => void
}
```

#### Quick Suggestions Categories
```javascript
const QUICK_SUGGESTIONS = [
  { category: 'Test Selection', color: '#2196f3' },
  { category: 'Assumptions', color: '#ff9800' },
  { category: 'Interpretation', color: '#4caf50' },
  { category: 'Study Design', color: '#9c27b0' },
];
```

### Backend Service Detail

#### `AIAdvisorService` Class
```python
class AIAdvisorService:
    DEFAULT_MODEL = "claude-sonnet-4-20250514"
    MAX_TOKENS = 4096
    TEMPERATURE = 0.3

    def __init__(self):
        self.client = Anthropic()  # Uses ANTHROPIC_API_KEY env var
        self.conversation_manager = ConversationManager()
        self.rate_limiter = RateLimiter(
            requests_per_minute=30,
            tokens_per_minute=150000
        )

    def chat(self, message, conversation_id, data_context=None):
        # 1. Check rate limit
        # 2. Get/create conversation
        # 3. Build messages with context
        # 4. Call Claude API
        # 5. Parse response for recommendations
        # 6. Return structured response
```

#### System Prompt (Scientific Integrity)
```python
SYSTEM_PROMPT = """You are StickAI, an expert statistical advisor...

CORE PRINCIPLES:
1. NEVER recommend p-hacking or data manipulation
2. Always emphasize effect sizes alongside p-values
3. Recommend appropriate sample sizes
4. Warn about assumption violations
5. Promote pre-registration and transparency
6. Use Cohen's benchmarks (d: 0.2/0.5/0.8, η²: 0.01/0.06/0.14)

When recommending tests, format as:
**Recommended Test: [Test Name]**
- Test ID: [test-id]
- Reason: [Why this test]
- Assumptions: [List assumptions]
..."""
```

---

## Methods Section Generator Details

### 5-Step Wizard Flow

```
Step 1: Study Design
├── Select from predefined designs (RCT, cross-sectional, etc.)
└── Or enter custom design description

Step 2: Participants
├── Sample size (N)
├── Description (demographics)
├── Recruitment method
├── Inclusion criteria
└── Exclusion criteria

Step 3: Variables
├── Add multiple variables
├── For each: Name, Type (continuous/categorical/ordinal/binary)
└── Role (DV, IV, covariate, moderator, mediator)

Step 4: Statistical Tests
├── Select tests by category (Comparison, Non-parametric, etc.)
├── Set alpha level (0.05, 0.01, 0.001, 0.10)
├── Multiple comparison corrections
├── Assumption checks performed
└── Additional notes

Step 5: Generate
├── Calls /api/v1/ai-advisor/methods-section/
├── Falls back to local generation if API fails
├── Copy to clipboard
└── Download as .md file
```

### Form State Structure
```javascript
const [studyDesign, setStudyDesign] = useState('');
const [participants, setParticipants] = useState({
  n: '',
  description: '',
  recruitment: '',
  inclusionCriteria: '',
  exclusionCriteria: '',
});
const [variables, setVariables] = useState([
  { name: '', type: 'continuous', role: 'dependent' },
]);
const [selectedTests, setSelectedTests] = useState([]);
const [alphaLevel, setAlphaLevel] = useState('0.05');
const [corrections, setCorrections] = useState(['None']);
```

### Available Statistical Tests
```javascript
const STATISTICAL_TESTS = [
  // Comparison
  { id: 'independent-t', name: 'Independent Samples t-test' },
  { id: 'paired-t', name: 'Paired Samples t-test' },
  { id: 'one-way-anova', name: 'One-Way ANOVA' },
  // ... 20+ tests total
];
```

---

## API Endpoints Reference

### AI Advisor Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/v1/ai-advisor/chat/` | Main conversational AI | AllowAny |
| GET | `/api/v1/ai-advisor/status/` | Check service health | AllowAny |
| GET | `/api/v1/ai-advisor/conversation/<id>/` | Get conversation history | AllowAny |
| DELETE | `/api/v1/ai-advisor/conversation/<id>/` | Clear conversation | AllowAny |
| POST | `/api/v1/ai-advisor/quick-recommend/` | Quick test recommendation | AllowAny |
| POST | `/api/v1/ai-advisor/interpret/` | Interpret statistical results | AllowAny |
| POST | `/api/v1/ai-advisor/methods-section/` | Generate methods section | AllowAny |
| POST | `/api/v1/ai-advisor/assumption-guidance/` | Assumption violation help | AllowAny |

### Request/Response Examples

#### Chat Endpoint
```bash
# Request
curl -X POST http://localhost:8000/api/v1/ai-advisor/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What test should I use to compare means between two independent groups?",
    "conversation_id": "optional-uuid",
    "data_context": {
      "variables": ["group", "score"],
      "sample_size": 50,
      "data_types": {"group": "categorical", "score": "continuous"}
    }
  }'

# Response
{
  "success": true,
  "response": "Based on your data with two independent groups...",
  "conversation_id": "uuid-string",
  "recommendations": [
    {
      "test_id": "independent-t",
      "test_name": "Independent Samples t-test",
      "reason": "Comparing means of continuous DV between 2 groups"
    }
  ],
  "tokens_used": 450,
  "model": "claude-sonnet-4-20250514"
}
```

#### Methods Section Endpoint
```bash
# Request
curl -X POST http://localhost:8000/api/v1/ai-advisor/methods-section/ \
  -H "Content-Type: application/json" \
  -d '{
    "design": "Between-subjects experimental",
    "participants": {
      "n": 120,
      "description": "university students aged 18-25",
      "recruitment": "Online advertisements"
    },
    "variables": [
      {"name": "Anxiety Score", "type": "continuous", "role": "dependent"},
      {"name": "Treatment Group", "type": "categorical", "role": "independent"}
    ],
    "tests_used": [{"name": "Independent Samples t-test"}],
    "alpha_level": 0.05,
    "software": "StickForStats v1.0"
  }'
```

### Other Key Endpoints (Existing)

| Category | Endpoints |
|----------|-----------|
| Statistical Tests | `/api/v1/t-test/`, `/api/v1/anova/`, `/api/v1/correlation/` |
| Power Analysis | `/api/v1/power/t-test/`, `/api/v1/power/sample-size/` |
| Guardian | `/api/v1/guardian/analyze/`, `/api/v1/guardian/transform/` |
| Data | `/api/v1/upload/`, `/api/v1/data/summary/` |

---

## File Inventory

### Backend Files (AI Advisor)

| File | Lines | Purpose |
|------|-------|---------|
| `ai_advisor/__init__.py` | ~10 | Module init |
| `ai_advisor/services/__init__.py` | ~5 | Service exports |
| `ai_advisor/services/ai_service.py` | ~650 | Core Claude integration |
| `api/v1/ai_advisor_views.py` | ~560 | REST API views |

### Frontend Files (AI Advisor)

| File | Lines | Purpose |
|------|-------|---------|
| `AIAdvisorHub.jsx` | ~550 | Main container + tabs |
| `AIAdvisorChat.jsx` | ~350 | Chat interface |
| `AIAdvisorSuggestions.jsx` | ~100 | Quick suggestion chips |
| `AIAdvisorDataContext.jsx` | ~200 | Data context panel |
| `MethodsSectionGenerator.jsx` | ~713 | Methods wizard |
| `hooks/useAIAdvisor.js` | ~475 | State management |
| `utils/promptTemplates.js` | ~500 | System prompts |
| `utils/testSelector.js` | ~500 | Test catalog |
| `index.js` | ~55 | Module exports |

### Configuration Files Modified

| File | Change |
|------|--------|
| `backend/requirements.txt` | Added `anthropic>=0.39.0` |
| `backend/api/v1/urls.py` | Added 7 AI advisor URL patterns |
| `frontend/src/App.jsx` | Added AIAdvisorHub import and component |

---

## Code Patterns & Conventions

### React Component Pattern
```javascript
/**
 * Component Name
 * Brief description
 * @version 1.0.0
 */
import React, { useState, useCallback } from 'react';
import { Box, Paper, Typography } from '@mui/material';

const ComponentName = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);

  const handleAction = useCallback(() => {
    // Implementation
  }, [dependencies]);

  return (
    <Box>
      {/* JSX */}
    </Box>
  );
};

export default ComponentName;
```

### API Call Pattern (Frontend)
```javascript
const callAPI = async (endpoint, data) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('AI_UNAVAILABLE');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Fall back to mock/local implementation
    return generateLocalFallback(data);
  }
};
```

### Django API View Pattern
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class MyAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = request.data
            # Validation
            # Processing
            return Response({
                'success': True,
                'data': result
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=500)
```

### MUI Styling Pattern
```javascript
<Box
  sx={{
    p: 2,
    bgcolor: '#f5f5f5',
    borderRadius: 2,
    '&:hover': {
      bgcolor: '#e3f2fd',
    },
  }}
>
  <Typography variant="h6" gutterBottom>
    Title
  </Typography>
</Box>
```

---

## Known Issues & Technical Debt

### Critical Issues
| Issue | Impact | Resolution |
|-------|--------|------------|
| API credits needed | AI falls back to mock | Add $5-10 at console.anthropic.com |

### ESLint Warnings (Non-blocking)
```
src/App.jsx
  - 'useEffect' is defined but never used
  - 'AuthDebug' is defined but never used
  - 'OnboardingChecklist' is defined but never used
  - 'NonParametricTestsReal' is assigned but never used
  - 'StatisticalTestsPage' is assigned but never used

src/components/DataInput.jsx
  - Multiple unused imports (Tooltip, CircularProgress, etc.)

src/components/Guardian/TransformationWizard.jsx
  - Missing dependency warnings in useEffect/useMemo
```

### Technical Debt
1. **Unused imports** in several files (cosmetic, no impact)
2. **Source map warning** for @mediapipe/tasks-vision (can ignore)
3. **Webpack deprecation warnings** for dev server middleware (cosmetic)

---

## Environment Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm or yarn

### Environment Variables
```bash
# In ~/.zshrc (already configured)
export ANTHROPIC_API_KEY="REDACTED_API_KEY"
```

### Starting the Servers

#### Terminal 1: Backend
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend
source ~/.zshrc  # Load API key
python manage.py runserver 0.0.0.0:8000
```

#### Terminal 2: Frontend
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
PORT=3001 npm start
```

### URLs
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000/api/v1/
- AI Status: http://localhost:8000/api/v1/ai-advisor/status/

---

## Testing Commands

### Backend Tests
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend

# Check AI status
curl http://localhost:8000/api/v1/ai-advisor/status/

# Test chat (mock mode without credits)
curl -X POST http://localhost:8000/api/v1/ai-advisor/chat/ \
  -H "Content-Type: application/json" \
  -d '{"message": "What test for two groups?"}'

# Test methods generation
curl -X POST http://localhost:8000/api/v1/ai-advisor/methods-section/ \
  -H "Content-Type: application/json" \
  -d '{"design": "RCT", "participants": {"n": 100}}'
```

### Frontend Tests
```bash
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend

# Check if compiles
npm run build

# Run dev server
PORT=3001 npm start
```

---

## Tomorrow's Roadmap

### Priority 1: Add API Credits (5 minutes)
1. Go to https://console.anthropic.com/settings/billing
2. Add payment method
3. Add $5-10 credits
4. Test AI chat with real responses

### Priority 2: Choose Next Feature

#### Option A: Meta-Analysis Module (Recommended)
**Why**: No free, good meta-analysis tool exists. High market impact.

**What to build**:
- Forest plot visualization
- Effect size pooling (fixed/random effects)
- Heterogeneity analysis (I², Q statistic)
- Funnel plot for publication bias
- Subgroup analysis

**Estimated effort**: 1-2 days

#### Option B: Power Analysis Educational Module
**Why**: Comprehensive 11-lesson plan already exists in `.claude/plans/`

**What to build**:
- 11 interactive lessons (~22,000 lines)
- Type I/II error animations
- Power curve simulations
- Non-parametric power analysis
- Bayesian power analysis

**Estimated effort**: 3-5 days

#### Option C: R/Python Code Export
**Why**: Researchers want reproducibility

**What to build**:
- Generate R code for any analysis
- Generate Python code equivalent
- Include package requirements
- Add comments explaining each step

**Estimated effort**: 4-6 hours

### Priority 3: Guardian-AI Integration
Connect Guardian data quality warnings to AI Advisor context automatically.

---

## Master Plan Reference

### The 10 Features That Make StickForStats "World's Best"

1. **AI Statistical Advisor** ✅ - Claude-powered guidance
2. **Methods Section Generator** ✅ - APA-formatted output
3. **Meta-Analysis Module** - Forest plots, effect pooling
4. **Study Design Wizard** - Power analysis + design optimization
5. **Certification Program** - Badges, certificates
6. **Mobile App** - React Native companion
7. **Statistical Debugger** - Find errors in analyses
8. **Paper Parser** - Extract stats from PDFs
9. **Multi-Language** - i18n support
10. **R/Python Export** - Code generation

### Competitive Advantages
- **vs SPSS**: Free, AI-powered, web-based
- **vs R/Python**: No coding required, instant results
- **vs G*Power**: More comprehensive, better UX
- **vs JASP**: AI advisor, methods generator, Guardian system

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────┐
│                    STICKFORSTATS QUICK REF                      │
├────────────────────────────────────────────────────────────────┤
│ START BACKEND:  cd backend && python manage.py runserver       │
│ START FRONTEND: cd frontend && PORT=3001 npm start             │
├────────────────────────────────────────────────────────────────┤
│ AI ADVISOR:     Click floating button (bottom-right)           │
│ METHODS WRITER: AI Advisor → "Methods Writer" tab              │
├────────────────────────────────────────────────────────────────┤
│ API STATUS:     curl localhost:8000/api/v1/ai-advisor/status/  │
├────────────────────────────────────────────────────────────────┤
│ KEY FILES:                                                      │
│   Backend:  backend/ai_advisor/services/ai_service.py          │
│   Frontend: frontend/src/components/ai-advisor/AIAdvisorHub.jsx│
├────────────────────────────────────────────────────────────────┤
│ NEXT PRIORITY: Add API credits → Meta-Analysis Module          │
└────────────────────────────────────────────────────────────────┘
```

---

*Document created: December 12, 2025*
*For use in next session to restore full context*
