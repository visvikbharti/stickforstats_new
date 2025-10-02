# 📊 READY-TO-USE TEST DATASETS FOR FRONTEND TESTING
## Copy-Paste These Datasets Directly Into StickForStats

---

## 🌐 HOW TO ACCESS THE APP
**Open your browser and go to: http://localhost:3001**

---

## 📋 DATASET 1: DESCRIPTIVE STATISTICS
**Navigate to**: Statistical Analysis → Descriptive Statistics

### Copy this data:
```
12.5, 14.3, 11.8, 15.6, 13.2, 14.9, 12.1, 13.7, 15.2, 11.4, 14.8, 13.5, 12.9, 14.1, 15.8, 11.9, 13.3, 14.6, 12.7, 15.1
```

**What to expect**:
- Mean, Median, Mode
- Standard deviation & Variance
- Range, IQR, Quartiles
- Skewness & Kurtosis
- All with 50-decimal precision!

---

## 📊 DATASET 2: T-TEST (COMPARING TWO GROUPS)
**Navigate to**: Statistical Tests → T-Test

### Group 1 (Copy this):
```
23.5, 24.1, 22.8, 25.2, 23.9, 24.5, 23.2, 24.8, 23.6, 24.3
```

### Group 2 (Copy this):
```
26.3, 27.1, 25.8, 28.2, 26.7, 27.5, 26.1, 27.9, 26.4, 27.3
```

**Select**: Two-sample T-Test
**What this tests**: Are these two groups significantly different?

---

## 📊 DATASET 3: ONE-WAY ANOVA (THREE GROUPS)
**Navigate to**: Statistical Tests → ANOVA

### Group A - Low Performance:
```
45, 52, 48, 54, 47, 51, 49, 53, 46, 50
```

### Group B - Medium Performance:
```
38, 42, 39, 41, 37, 43, 40, 44, 36, 45
```

### Group C - High Performance:
```
55, 58, 56, 60, 57, 59, 54, 61, 53, 62
```

**What this tests**: Are there significant differences among the three groups?

---

## 📊 DATASET 4: CORRELATION ANALYSIS
**Navigate to**: Statistical Tests → Correlation

### X Variable (Hours Studied):
```
1, 2, 3, 4, 5, 6, 7, 8, 9, 10
```

### Y Variable (Test Score):
```
52, 58, 63, 70, 72, 78, 82, 85, 89, 95
```

**Select**: Pearson Correlation
**What this shows**: Strong positive correlation between study hours and test scores

---

## 📊 DATASET 5: LINEAR REGRESSION
**Navigate to**: Statistical Tests → Regression

### X Variable (Marketing Spend in $1000s):
```
10, 20, 30, 40, 50, 60, 70, 80, 90, 100
```

### Y Variable (Sales Revenue in $1000s):
```
45, 85, 125, 165, 205, 245, 285, 325, 365, 405
```

**What this predicts**: Sales revenue based on marketing spend

---

## 📊 DATASET 6: CHI-SQUARE TEST (CATEGORICAL DATA)
**Navigate to**: Statistical Tests → Chi-Square

### Create a contingency table with:

| Category | Group A | Group B | Group C |
|----------|---------|---------|---------|
| Satisfied | 45 | 38 | 42 |
| Neutral | 25 | 30 | 28 |
| Dissatisfied | 30 | 32 | 30 |

**Enter as**:
```
Row 1: 45, 38, 42
Row 2: 25, 30, 28
Row 3: 30, 32, 30
```

**What this tests**: Is satisfaction independent of group membership?

---

## 📊 DATASET 7: PAIRED T-TEST (BEFORE/AFTER)
**Navigate to**: Statistical Tests → T-Test (select Paired)

### Before Treatment (Blood Pressure):
```
145, 142, 148, 139, 151, 143, 147, 140, 149, 144
```

### After Treatment (Blood Pressure):
```
138, 135, 141, 132, 143, 136, 139, 133, 142, 137
```

**What this tests**: Did the treatment significantly reduce blood pressure?

---

## 📊 DATASET 8: MANN-WHITNEY U TEST (NON-PARAMETRIC)
**Navigate to**: Non-Parametric Tests → Mann-Whitney

### Group 1 (Non-normal data):
```
12, 14, 11, 15, 13, 16, 10, 17, 12, 14, 18, 11
```

### Group 2 (Non-normal data):
```
18, 20, 19, 22, 21, 23, 17, 24, 19, 20, 25, 18
```

**Use when**: Data is not normally distributed

---

## 📊 DATASET 9: FISHER'S EXACT TEST (2x2 TABLE)
**Navigate to**: Statistical Tests → Fisher's Exact

### Treatment Success/Failure Table:

|  | Success | Failure |
|--|---------|---------|
| Drug A | 12 | 3 |
| Drug B | 5 | 10 |

**Enter as a 2x2 table**:
```
12, 3
5, 10
```

**What this tests**: Is treatment success associated with drug type?

---

## 📊 DATASET 10: TIME SERIES DATA
**For Descriptive Statistics or Regression**

### Monthly Sales Data (12 months):
```
45000, 47000, 52000, 48000, 55000, 58000, 62000, 65000, 61000, 68000, 72000, 75000
```

---

## 🎯 QUICK TEST PROCEDURE

### For Each Dataset:
1. **Open Browser**: Go to http://localhost:3001
2. **Navigate**: Find the appropriate test in the menu
3. **Copy & Paste**: Use the datasets above
4. **Click Calculate**: Run the analysis
5. **Verify**: Check for 50-decimal precision in results
6. **Export**: Try exporting results as PDF or CSV

---

## ✅ WHAT TO LOOK FOR

### In Results:
- **Precision**: Numbers should show many decimal places (up to 50)
- **Example**: `2.8722813232690143299253057341094646591101322289914`
- **Not**: `2.872` (this would be standard precision)

### Performance:
- Results should appear within 1-2 seconds for most tests
- No errors in the browser console (F12 → Console)

---

## 🔧 TROUBLESHOOTING

### If you see "Connection Error":
- Make sure backend is running: `python manage.py runserver 8000`
- Make sure frontend is running: `npm start` (port 3001)

### If results don't show precision:
- Check browser console for errors
- Verify backend is updated with latest code

---

## 📝 REAL-WORLD SCENARIOS

### Scenario 1: A/B Testing (Use T-Test)
- Group A: Control group conversion rates
- Group B: Treatment group conversion rates

### Scenario 2: Quality Control (Use ANOVA)
- Three production lines
- Testing if product quality differs

### Scenario 3: Market Research (Use Chi-Square)
- Customer preferences across regions
- Testing if preference depends on location

### Scenario 4: Medical Study (Use Paired T-Test)
- Patient measurements before treatment
- Same patients after treatment

---

## 🚀 START TESTING NOW!

1. **Open**: http://localhost:3001
2. **Pick** any dataset above
3. **Copy & Paste** the data
4. **Run** the analysis
5. **Verify** 50-decimal precision

All datasets are real-world inspired and ready to use immediately!

---

**Created**: September 19, 2025
**Purpose**: Immediate testing of StickForStats v1.0
**Status**: READY TO USE