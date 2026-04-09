# Quick Start: Lab Presentation Demo
**5-Minute Setup Guide**

---

## 🎯 What You Have Now

✅ **6 NEW Guardian-specific demo datasets** in test_data/
✅ **Complete 40-minute presentation script** (LAB_PRESENTATION_DEMONSTRATION_GUIDE.md)
✅ **Premium presentation slides** (presentation_premium_final.html)
✅ **18 existing test datasets** for additional features

---

## ⚡ 5-Minute Pre-Demo Setup

### **Step 1: Start the Platform** (2 minutes)
```bash
# Terminal 1: Backend (if not already running)
cd /Users/vishalbharti/StickForStats_v1.0_Production/backend
source venv/bin/activate
python app.py

# Terminal 2: Frontend (if not already running)
cd /Users/vishalbharti/StickForStats_v1.0_Production/frontend
PORT=3001 npm start
```

### **Step 2: Open Presentation** (1 minute)
```bash
# Open premium presentation in browser
open presentation_premium_final.html
```

### **Step 3: Test ONE Demo** (2 minutes)
1. Go to http://localhost:3001/statistical-tests
2. Select "Two-Sample t-test"
3. Upload `test_data/Guardian_Demo_Normality_Violation.csv`
4. Verify: Red warning appears, button disabled
5. ✅ If it works → You're ready!

---

## 🎬 5 Essential Demonstrations

| # | Demo | Dataset | Expected Result | Time |
|---|------|---------|----------------|------|
| 1 | **t-test BLOCKS (normality)** | Guardian_Demo_Normality_Violation.csv | ❌ Red warning, disabled | 3 min |
| 2 | **Valid data ALLOWS** | Guardian_Demo_Valid_Data.csv | ✅ Green/neutral, enabled | 2 min |
| 3 | **ANOVA BLOCKS (variance)** | Guardian_Demo_Variance_Violation.csv | ❌ Variance warning, disabled | 3 min |
| 4 | **Mann-Whitney SKIPS** | Guardian_Demo_Normality_Violation.csv | ✅ No warning, enabled | 2 min |
| 5 | **Bootstrap WARNS** | Guardian_Demo_Bootstrap_NonNormal.csv | ⚠️ Yellow warning, enabled | 3 min |

**Total Demo Time**: 13 minutes
**Total Presentation**: 40 minutes (with slides + discussion)

---

## 📁 NEW Datasets Created (in test_data/)

1. **Guardian_Demo_Normality_Violation.csv**
   - Purpose: Show t-test blocking due to non-normal data
   - Properties: Extreme outlier (100), Shapiro-Wilk p < 0.001

2. **Guardian_Demo_Valid_Data.csv**
   - Purpose: Show valid data workflow (no warnings)
   - Properties: Normal distribution, equal variances, n=30

3. **Guardian_Demo_Variance_Violation.csv**
   - Purpose: Show ANOVA blocking due to unequal variances
   - Properties: Group 2 variance 100x higher than others

4. **Guardian_Demo_Small_Sample.csv**
   - Purpose: Show sample size warning
   - Properties: n=3 per group (insufficient power)

5. **Guardian_Demo_Nonlinear.csv**
   - Purpose: Show regression blocking (quadratic relationship)
   - Properties: Perfect Y = X² relationship

6. **Guardian_Demo_Bootstrap_NonNormal.csv**
   - Purpose: Show Bootstrap warning but allow
   - Properties: Non-normal with outlier, but Bootstrap is robust

---

## 🗣️ Key Talking Points

### **Opening** (Slide 1-2):
> "70%+ of researchers can't reproduce published results. 50% cite poor statistical analysis. Traditional tools let you run ANY test on ANY data - no validation. That's what we're fixing."

### **Demo #1 - Blocking** (Slide 6):
> "Watch what happens when I upload non-normal data to a t-test... [Guardian appears] ...Red warning, button disabled, evidence shown, alternatives suggested. This prevents false positives."

### **Demo #4 - Smart Skipping** (Slide 12):
> "Same data that blocked t-test. But Mann-Whitney is non-parametric - doesn't assume normality. Watch... No warning! Button enabled. Guardian knows when to validate vs when to skip. Smart protection."

### **Closing** (Slide 13):
> "77.3% coverage, <500ms response, zero errors. First FREE tool that automatically validates assumptions AND blocks invalid tests. Questions?"

---

## 🚨 Emergency Backup Plan

**If Live Demo Fails**:
1. Use screenshots (take them during pre-demo test)
2. Explain verbally what SHOULD happen
3. Continue with presentation slides (they have examples)
4. Offer to demonstrate after the meeting 1-on-1

**If Backend Not Running**:
- Restart: `cd backend && python app.py`
- Check: http://localhost:8000/health
- Give it 30 seconds to initialize

**If Dataset Upload Fails**:
- Manually type the values (they're short!)
- Example: Group 1: `1, 1, 1, 2, 2, 2, 3, 100`

---

## 📱 Cheat Sheet (Print This!)

```
DEMO 1: Normality Violation
→ Statistical Tests → t-test
→ Upload: Guardian_Demo_Normality_Violation.csv
→ EXPECT: Red warning, disabled button

DEMO 2: Valid Data
→ Statistical Tests → t-test
→ Upload: Guardian_Demo_Valid_Data.csv
→ EXPECT: No warning, enabled button

DEMO 3: Variance Violation
→ Statistical Tests → ANOVA
→ Upload: Guardian_Demo_Variance_Violation.csv
→ EXPECT: Variance warning, disabled button

DEMO 4: Non-Parametric Skip
→ Statistical Tests → Mann-Whitney U
→ Upload: Guardian_Demo_Normality_Violation.csv
→ EXPECT: No warning, enabled immediately

DEMO 5: Bootstrap Warning
→ Confidence Intervals → Bootstrap
→ Upload: Guardian_Demo_Bootstrap_NonNormal.csv
→ EXPECT: Yellow warning, enabled button
```

---

## ✅ Final Checklist

**Night Before**:
- [ ] Run through all 5 demos once
- [ ] Take screenshots of each result
- [ ] Print this cheat sheet
- [ ] Charge laptop + bring charger

**1 Hour Before**:
- [ ] Start backend + frontend
- [ ] Test Demo #1 to verify Guardian works
- [ ] Open presentation + demo URLs in browser tabs
- [ ] Close unnecessary apps
- [ ] Turn off notifications

**Right Before**:
- [ ] Connect to projector
- [ ] Test display size (make fonts larger if needed)
- [ ] Have test_data folder open for quick access
- [ ] Breathe! You've got this 🚀

---

## 🎓 Presentation Flow

1. **Slides 1-2** (5 min): Problem + motivation
2. **Slides 3-5** (5 min): Solution + validators
3. **Slide 6 + Demo #1** (5 min): Live blocking demonstration
4. **Slides 7-11** (8 min): Stats + competitive advantage + roadmap
5. **Slide 12 + Demos #2-5** (12 min): Full demo walkthrough
6. **Slide 13-14** (10 min): Q&A + discussion

**Total**: ~40 minutes

---

## 💡 Pro Tips

1. **Slow down during demos** - Give Guardian 2-3 seconds to validate
2. **Point with mouse** - Show exactly where warning appears
3. **Read warnings aloud** - "See here: Shapiro-Wilk p = 0.001"
4. **Compare side-by-side** - Demo #1 (blocks) vs Demo #4 (allows)
5. **Invite questions** - "Want me to try different data?"

---

## 📚 Additional Resources

- **Full Guide**: LAB_PRESENTATION_DEMONSTRATION_GUIDE.md (detailed 40-min script)
- **Testing Plan**: GUARDIAN_TESTING_PLAN.md (technical validation details)
- **Concepts Explained**: GUARDIAN_CONCEPTS_EXPLAINED.md (for Q&A reference)
- **All Test Data**: test_data/README.md (18 datasets for other features)

---

**You're Ready!** 🚀

Remember: The goal is to show Guardian's VALUE (preventing bad science), not just features.

Good luck with your presentation! 🎉
