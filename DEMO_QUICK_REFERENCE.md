# StickForStats Demo Quick Reference Card
## Print this and keep next to your laptop

---

## STARTUP COMMANDS

```bash
# Terminal 1 (Backend)
cd ~/StickForStats_v1.0_Production/backend && python manage.py runserver

# Terminal 2 (Frontend)
cd ~/StickForStats_v1.0_Production/frontend && npm start
```

**URLs:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

---

## KEY ROUTES FOR DEMO

| Demo | URL | Module |
|------|-----|--------|
| T-Test | `/modules/t-test-real` | TTestRealBackend |
| Causal | `/modules/causal-inference` | CausalInferenceModule |
| PCA Learn | `/pca-learn` | PCAEducationHub |
| AI Advisor | Bottom-right chat icon | AIAdvisorHub |

---

## BUILT-IN EXAMPLE DATASETS (REAL DATA)

### For T-Test Demo (Independent Samples):
- **Psychology > Anxiety Scores**: CBT vs Medication
- **Medical > Blood Pressure**: Control vs Treatment
- **Education > Math Scores**: Traditional vs Innovative

### For Paired T-Test Demo:
- **Medical > Cholesterol**: Before/After statin
- **Psychology > Reaction Time**: Pre/Post training

### For ANOVA Demo:
- **Medical > Hemoglobin**: Placebo vs Iron vs Iron+VitC
- **Environmental > Air Quality**: Industrial vs Residential vs Commercial

---

## GUARDIAN STATUS COLORS

| Color | Meaning |
|-------|---------|
| Green | Assumption met |
| Yellow | Warning (proceed with caution) |
| Red | Critical violation (consider alternative) |

---

## NUMBERS TO REMEMBER

- **8** Guardian validators
- **50** decimal precision
- **58** lessons
- **14-16** decimal validation
- **60+** API endpoints
- **80+** test files

---

## KEY PHRASES

"Notice this appears AUTOMATICALLY"
"You cannot see results without assumption context"
"Real computation, not animation tricks"
"Validated against R and scipy"
"Nothing is demo-only - this is production code"

---

## IF SOMETHING BREAKS

1. Refresh browser (Ctrl+Shift+R)
2. Check terminal for red errors
3. Restart backend: `python manage.py runserver`
4. Use backup demo (Descriptive Stats)

---

## QUESTIONS TO EXPECT

**Q: Can I use my own data?**
A: Yes, paste into any module or upload CSV

**Q: Is this open source?**
A: Will be upon JSS publication

**Q: How is this different from R?**
A: Guardian makes assumption checking mandatory, not optional

**Q: What if I disagree with Guardian?**
A: Expert mode allows override with documentation

---

*Good luck!*
