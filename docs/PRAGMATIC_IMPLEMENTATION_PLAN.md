# Pragmatic Implementation Plan - StickForStats
*Based on Reality Assessment - January 10, 2025*

## Starting Point: What We Actually Have

### Working Assets (Don't Break These!)
1. **Confidence Intervals Module** - Fully functional, validated
2. **PCA Analysis** - Complete with visualizations
3. **DOE Analysis** - Working factorial designs
4. **SQC Module** - Control charts functional
5. **Test Recommender Engine** - 26 tests, basic working

### Tech Stack (Already Set Up)
- Django 4.2.11 backend with REST API
- React 18 frontend with Material-UI
- NumPy/SciPy for calculations
- Working deployment scripts

## Immediate Priority: Complete Tier 0 for Publication

### Sprint 1: Test Recommender Enhancement (Week 1)
**Goal**: Upgrade existing test recommender to publication standard

```python
# Location: new_project/stickforstats/core/statistics/test_recommender.py

Tasks:
1. Add assumption violation detection
   - [ ] Implement Shapiro-Wilk normality test
   - [ ] Add Levene's test for homoscedasticity
   - [ ] Create automatic fallback logic
   
2. Implement auto-switching
   - [ ] Student's t → Welch's t (unequal variances)
   - [ ] Parametric → Mann-Whitney U (non-normal)
   - [ ] ANOVA → Kruskal-Wallis (violations)

3. Create test scenario library
   - [ ] Document 25 canonical scenarios
   - [ ] Add expected recommendations
   - [ ] Build validation suite
```

**Files to modify**:
- `stickforstats/core/statistics/test_recommender.py`
- `stickforstats/core/statistics/assumption_checker.py` (create)
- `tests/test_recommender_scenarios.py` (create)

### Sprint 2: Multiplicity Corrections (Week 2)
**Goal**: Prevent p-hacking with proper corrections

```python
# Location: new_project/stickforstats/core/statistics/multiplicity.py (create)

Tasks:
1. Implement correction methods
   - [ ] Benjamini-Hochberg FDR
   - [ ] Holm-Bonferroni
   - [ ] Hochberg procedure
   
2. Create hypothesis registry
   - [ ] Track all tests in session
   - [ ] Warning after 5+ tests
   - [ ] Force correction selection

3. UI Integration
   - [ ] Block "Export Results" until corrected
   - [ ] Show adjusted p-values
   - [ ] Generate correction statement
```

**New files to create**:
- `stickforstats/core/statistics/multiplicity.py`
- `stickforstats/core/models/hypothesis_registry.py`
- `frontend/src/components/MultiplicityCorrectionDialog.jsx`

### Sprint 3: Effect Sizes Implementation (Week 3)
**Goal**: Add effect sizes to all existing tests

```python
# Location: new_project/stickforstats/core/statistics/effect_sizes.py

Tasks:
1. Implement effect size calculations
   - [ ] Cohen's d (t-tests)
   - [ ] Hedges' g (small samples)
   - [ ] Eta-squared (ANOVA)
   - [ ] Cramér's V (chi-square)
   - [ ] Cliff's delta (non-parametric)

2. Add confidence intervals
   - [ ] Analytical CIs where possible
   - [ ] Bootstrap CIs (bias-corrected)
   - [ ] Interpretation guidelines

3. Integrate with existing modules
   - [ ] Update confidence_intervals module
   - [ ] Add to test results
   - [ ] Update report generation
```

**Files to update**:
- All test result serializers
- Report generation templates
- Frontend result displays

### Sprint 4: Power Analysis (Week 4)
**Goal**: Basic power and sample size calculations

```python
# Location: new_project/stickforstats/core/statistics/power_analysis.py

Tasks:
1. Implement power calculations
   - [ ] One-sample t-test
   - [ ] Two-sample t-test
   - [ ] ANOVA (one-way)
   - [ ] Correlation
   - [ ] Chi-square

2. Sample size determination
   - [ ] Forward calculation (find n)
   - [ ] Reverse calculation (post-hoc)
   - [ ] Sensitivity analysis

3. Interactive visualizations
   - [ ] Power curves
   - [ ] Effect size vs sample size
   - [ ] Alpha/beta tradeoffs
```

### Sprint 5: Reproducibility Bundle (Week 5-6)
**Goal**: One-click reproducible analyses

```python
# Location: new_project/stickforstats/core/reproducibility/

Tasks:
1. Design bundle schema
   - [ ] Data fingerprint (SHA-256)
   - [ ] Parameter capture
   - [ ] Software versions
   - [ ] Random seeds

2. Methods paragraph generator
   - [ ] APA format
   - [ ] CONSORT compliance
   - [ ] Statistical details

3. Import/Export system
   - [ ] ZIP archive creation
   - [ ] Bundle validation
   - [ ] Re-execution engine
```

## Validation Protocol (Week 7)

### Statistical Accuracy Testing
```python
# Location: new_project/tests/validation/

1. Create golden test suite
   - [ ] 100 test cases with known results
   - [ ] Compare against SciPy
   - [ ] Document any deviations

2. Cross-validation
   - [ ] Export R scripts
   - [ ] Run parallel analyses
   - [ ] Compare results

3. Real-world datasets
   - [ ] Fisher's Iris
   - [ ] Clinical trial data
   - [ ] Time series examples
```

## Quick Wins (Can Do Immediately)

### 1. Fix Existing Bugs
```bash
# Check and fix import errors
cd new_project
python manage.py check
python -m pytest tests/ -v
```

### 2. Complete Test Coverage
```bash
# Add tests for untested code
coverage run -m pytest
coverage report --show-missing
```

### 3. Documentation
- Update README with actual features
- Remove references to unimplemented features
- Add clear installation instructions

## What NOT to Do (Avoid Scope Creep)

1. **Don't start AI/RAG integration** - Not critical for publication
2. **Don't build marketplace** - Not needed for academic paper
3. **Don't add payment systems** - Premature optimization
4. **Don't refactor working code** - If it works and is tested, leave it
5. **Don't add new visualization libraries** - Use what's already there

## Success Metrics

### Week 1-2 Checkpoint
- [ ] Test recommender handles 25 scenarios correctly
- [ ] Multiplicity corrections working
- [ ] All tests pass

### Week 3-4 Checkpoint  
- [ ] Effect sizes on all tests
- [ ] Power calculations for 5 test types
- [ ] Validation against G*Power

### Week 5-6 Checkpoint
- [ ] Reproducibility bundle exports
- [ ] Methods paragraphs generate
- [ ] Bundle re-import works

### Final Validation
- [ ] 100 golden tests passing
- [ ] User study with 5 participants
- [ ] Performance <100ms for standard analyses

## Resource Requirements

### Developer Time
- 1 full-time developer: 6 weeks
- 2 developers: 3 weeks
- Part-time (20hrs/week): 12 weeks

### Testing Resources
- Access to R/RStudio for validation
- Sample datasets (already have some)
- 5 beta testers for user study

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing features | Comprehensive test suite before changes |
| Statistical errors | Validate every calculation against SciPy |
| Performance degradation | Profile before/after, use caching |
| Scope creep | Strict focus on Tier 0 only |

## Next Immediate Steps

1. **Today**: 
   - Set up development environment
   - Run existing tests
   - Verify all modules working

2. **Tomorrow**:
   - Start Sprint 1 (Test Recommender)
   - Create assumption_checker.py
   - Write first 5 test scenarios

3. **This Week**:
   - Complete test recommender upgrade
   - Begin multiplicity corrections
   - Document progress daily

---

*This plan focuses on achieving publication-ready status in 6 weeks by completing only essential Tier 0 features.*