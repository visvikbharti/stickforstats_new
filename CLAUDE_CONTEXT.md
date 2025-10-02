# Claude Context Document - StickForStats v1.0 Production

## Quick Start Prompt for Claude
When returning, say: 
```
I'm working on StickForStats in ~/StickForStats_v1.0_Production/
Please read CLAUDE_CONTEXT.md and STRATEGIC_OVERVIEW.md to understand the project.
Current version: v1.0 (baseline with 5 working modules)
Next task: Implement v1.1 - Test Recommender enhancements (Sprint 1 of PRAGMATIC_IMPLEMENTATION_PLAN.md)
```

## Project Overview

**What**: StickForStats - Statistical analysis platform for life scientists
**Where**: `~/StickForStats_v1.0_Production/` (ONLY work here, not in old directories)
**Current State**: v1.0 - Clean baseline with 25% of vision implemented
**Quality**: Production-ready, scientifically validated (4+ decimal accuracy)

## What's Currently Working (v1.0)

### 5 Statistical Modules (Validated)
1. **confidence_intervals** - Fully functional, multiple methods
2. **pca_analysis** - Complete with 3D visualizations  
3. **doe_analysis** - Factorial designs working
4. **sqc_analysis** - Control charts operational
5. **probability_distributions** - Basic distributions

### Core Infrastructure
- `backend/core/test_recommender.py` - 26 statistical tests defined
- `backend/core/data_profiler.py` - Variable type detection
- Django REST API - Clean and working
- React frontend - Material-UI components

## My Working Principles (MUST FOLLOW)
1. **No assumptions** - Check every fact, validate everything
2. **No placeholders** - Only complete, working features
3. **No mock data** - Real calculations only
4. **Evidence-based** - Scientific accuracy required
5. **Stay humble** - Simple, no exaggeration
6. **Real-world purpose** - Actual utility only

## Current Development Status

### Completed in This Session (Jan 10, 2025)
- ✅ Analyzed entire codebase - found 25% complete vs vision
- ✅ Created clean v1.0 by removing 75% non-working code
- ✅ Migrated only validated, working modules
- ✅ Documented complete vision and roadmap
- ✅ Set up clean development environment

### Next Immediate Task (v1.1)
**Sprint 1**: Test Recommender Enhancement (Week 1)
- Add assumption violation detection
- Implement auto-switching to robust alternatives
- Create 25-scenario test library
- File to modify: `backend/core/test_recommender.py`

## Key Documents (Read These)

### Must Read First
1. `STRATEGIC_OVERVIEW.md` - Complete development strategy
2. `docs/PRAGMATIC_IMPLEMENTATION_PLAN.md` - 6-week sprint plan
3. `docs/IMPLEMENTATION_TRACKER.md` - Task tracking

### Reference Documents
- `docs/STICKFORSTATS_VISION_ROADMAP.md` - Full 3-tier vision
- `docs/REALITY_ASSESSMENT_2025_01_10.md` - Gap analysis
- `docs/FUTURE_FEATURES.md` - Long-term features (RAG, ML, etc.)

## Directory Structure
```
~/StickForStats_v1.0_Production/
├── backend/                    # Django backend
│   ├── confidence_intervals/   # Working module
│   ├── pca_analysis/          # Working module
│   ├── doe_analysis/          # Working module
│   ├── sqc_analysis/          # Working module
│   ├── probability_distributions/ # Working module
│   ├── core/                  # Test recommender, data profiler
│   └── stickforstats/         # Django settings
├── frontend/                  # React app
├── docs/                      # All documentation
└── tests/                     # Validation tests
```

## Version Strategy
- **v1.0** (Current): Baseline with working modules
- **v1.1-1.5**: Tier 0 features (6 weeks)
- **v2.0**: Differentiation features
- **v3.0**: Advanced analytics + ML
- **v4.0**: Full ecosystem + RAG

## What NOT to Do
- ❌ Don't add placeholders or mock features
- ❌ Don't work in old directories
- ❌ Don't implement Tier 1/2 before Tier 0
- ❌ Don't add RAG/ML/Enterprise yet (planned for v3-4)
- ❌ Don't break working modules

## Commands to Start
```bash
# Navigate to project
cd ~/StickForStats_v1.0_Production

# Check structure
ls -la

# Read key documents
cat STRATEGIC_OVERVIEW.md
cat docs/PRAGMATIC_IMPLEMENTATION_PLAN.md

# Check current implementation
cat backend/core/test_recommender.py

# Start development server (if needed)
cd backend && python manage.py runserver
```

## Current Gaps (What's Missing)
### Tier 0 (Must Have for Publication)
1. Test Recommender - Needs assumption checking ← **START HERE**
2. Multiplicity corrections - Not implemented
3. Power analysis - Not implemented
4. Effect sizes - Partially implemented
5. Reproducibility bundle - Not implemented

## Session Context Summary

**Previous Session**: Migrated from cluttered 1.8GB project to clean 50MB v1.0
**Migration Result**: Removed 75% non-working code, kept only validated modules
**Current Focus**: Implement Tier 0 features for publication readiness
**Next Action**: Enhance test_recommender.py with assumption checking

## Important Reminders
- This is v1.0 PRODUCTION - only real, working code
- Follow the 6-week sprint plan in PRAGMATIC_IMPLEMENTATION_PLAN.md
- Update IMPLEMENTATION_TRACKER.md as tasks complete
- Create new version (v1.1) when first enhancement is done
- NEVER add features without full implementation and validation

---

## Optimal Prompt for New Session

```
I'm continuing work on StickForStats statistical platform.
Working directory: ~/StickForStats_v1.0_Production/
Please read CLAUDE_CONTEXT.md for full context.

Current state: v1.0 with 5 working modules (25% of vision complete)
Next task: Implement Sprint 1 from docs/PRAGMATIC_IMPLEMENTATION_PLAN.md
Focus: Enhance test_recommender.py with assumption checking

My principles: No placeholders, no mocks, only validated real code.
```

---

*Last Updated: January 10, 2025*
*Purpose: Ensure seamless context transfer between Claude sessions*