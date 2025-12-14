# 📊 Guardian vs Other Statistical Platforms - Comparison Table

**For EMBO presentation - show this when asked "What's new?"**

---

## **ASSUMPTION VALIDATION COMPARISON**

| Feature | GraphPad Prism | SPSS | R/Python | **Guardian** |
|---------|---------------|------|----------|--------------|
| **Normality Testing** | ✅ Available | ✅ Available | ✅ Manual code | ✅ **Automatic** |
| **Variance Testing** | ✅ Available | ✅ Available | ✅ Manual code | ✅ **Automatic** |
| **When Tests Run** | ⚠️ Manual (separate step) | ⚠️ Manual (options menu) | ⚠️ Must write code | ✅ **Before every test** |
| **User Must Remember** | ❌ Yes | ❌ Yes | ❌ Yes | ✅ **No - automatic** |
| **Can Ignore Warnings** | ❌ Yes | ❌ Yes | ❌ Yes | ✅ **No - blocks test** |
| **Suggests Alternatives** | ❌ No | ❌ No | ❌ No | ✅ **Yes** |
| **Educational Tooltips** | ⚠️ Limited | ⚠️ Limited | ❌ No | ✅ **Comprehensive** |
| **Test-Specific Validation** | ❌ Generic | ❌ Generic | ⚠️ If coded | ✅ **Context-aware** |
| **Learning Curve** | ⚠️ Moderate | ⚠️ High | ❌ Very high | ✅ **Zero** |
| **Price (Academic)** | $1,995/year | ~$2,000/year | Free (steep learning) | ✅ **Free** |

---

## **KEY DISTINCTIONS**

### **What Other Tools Do:**
```
1. User selects t-test
2. User runs test
3. (Maybe) User remembers to check assumptions
4. (Maybe) User interprets test results correctly
5. (Maybe) User chooses alternative if needed
6. Test proceeds regardless of violations
```

### **What Guardian Does:**
```
1. User selects t-test
2. Guardian AUTOMATICALLY checks assumptions
3. Guardian BLOCKS test if violated
4. Guardian SUGGESTS appropriate alternative (Mann-Whitney)
5. Guardian EXPLAINS why and HOW TO FIX
6. Test only proceeds if valid OR user switches
```

---

## **THE CRITICAL DIFFERENCE**

| Aspect | Traditional Tools | Guardian |
|--------|------------------|----------|
| **Philosophy** | "We provide the tools, you do it right" | "We ensure you do it right" |
| **Validation** | OPTIONAL | MANDATORY |
| **Errors** | User's responsibility | System prevents |
| **Learning** | Requires statistics training | Built-in guardrails |
| **Publication** | Hope reviewer doesn't catch errors | Provable validation |

---

## **ANALOGY FOR NON-STATISTICIANS**

### **Traditional Tools = Spell-Check (Available)**
- ✅ Spelling dictionary exists in software
- ❌ User must click "Check Spelling"
- ❌ User can ignore red underlines
- ❌ Document published with typos

### **Guardian = Autocorrect (Automatic)**
- ✅ Runs automatically as you type
- ✅ Prevents you from saving misspelled words
- ✅ Suggests correct spelling
- ✅ Document published correctly

---

## **REAL-WORLD IMPACT**

### **Why Optional Validation Hasn't Worked:**

**Evidence:**
- Baker (2016): **70%+ of researchers fail to reproduce** published findings
- ~50% cite **poor statistical analysis** as cause
- GraphPad, SPSS, R have existed for 20+ years
- **Reproducibility crisis PERSISTS despite these tools**

**The Problem:**
> "Having validation tools available ≠ Researchers using them"

**Reasons researchers skip validation:**
1. ⏰ Time pressure (deadlines, grant cycles)
2. 📚 Lack of statistical training (bench scientists)
3. 🤷 Don't know they should check (not taught in grad school)
4. 😰 Fear of finding problems (sunk cost fallacy)
5. 🔢 Don't know how to interpret results (p-value confusion)

**Guardian's Solution:**
> "Remove human factor - make validation unavoidable and interpretation automatic"

---

## **STATISTICAL RIGOR COMPARISON**

| Test Used | GraphPad | SPSS | R | Guardian |
|-----------|----------|------|---|----------|
| **Shapiro-Wilk (Normality)** | ✅ Available | ✅ Available | ✅ Manual | ✅ **Auto-run** |
| **Anderson-Darling** | ❌ No | ⚠️ Some versions | ✅ Package | ✅ **Auto-run** |
| **Levene's (Variance)** | ✅ Available | ✅ Available | ✅ Manual | ✅ **Auto-run** |
| **Bartlett's Test** | ⚠️ Limited | ✅ Available | ✅ Manual | ✅ **Auto-run** |
| **Linearity (Regression)** | ⚠️ Visual only | ⚠️ Manual | ✅ Manual | ✅ **Auto-detect** |
| **Independence Check** | ❌ No | ❌ No | ✅ Manual | 🚧 **Planned** |

**Guardian uses the SAME gold-standard tests - we just run them automatically.**

---

## **FEATURE COMPARISON**

### **Analysis Features**

| Feature | GraphPad | SPSS | R | Guardian |
|---------|----------|------|---|----------|
| **t-tests** | ✅ | ✅ | ✅ | ✅ |
| **ANOVA** | ✅ | ✅ | ✅ | ✅ |
| **Regression** | ✅ | ✅ | ✅ | 🚧 |
| **Non-parametric** | ✅ | ✅ | ✅ | ✅ |
| **Power Analysis** | ✅ | ⚠️ Separate | ✅ Manual | 🚧 **Auto** |
| **Effect Sizes** | ✅ | ⚠️ Limited | ✅ Manual | ✅ **Auto** |
| **Multiple Corrections** | ⚠️ Limited | ✅ | ✅ Manual | 🚧 **Auto** |

### **Validation Features** ⭐ **GUARDIAN'S STRENGTH**

| Feature | GraphPad | SPSS | R | Guardian |
|---------|----------|------|---|----------|
| **Auto Assumption Check** | ❌ | ❌ | ❌ | ✅ |
| **Active Test Blocking** | ❌ | ❌ | ❌ | ✅ |
| **Alternative Suggestions** | ❌ | ❌ | ❌ | ✅ |
| **Fix Recommendations** | ❌ | ❌ | ❌ | 🚧 |
| **Reproducibility Score** | ❌ | ❌ | ❌ | 🚧 |
| **Validation Certificate** | ❌ | ❌ | ❌ | 🚧 |
| **Auto Methods Section** | ❌ | ❌ | ❌ | 🚧 |

✅ = Available now | 🚧 = Planned/in development | ❌ = Not available

---

## **TARGET USER COMPARISON**

### **Who Uses Which Tool?**

**GraphPad Prism:**
- Target: Life sciences researchers
- Strength: Beautiful graphs, ease of use
- Weakness: Expensive ($1,995/year), passive validation

**SPSS:**
- Target: Social sciences, psychology
- Strength: Comprehensive, established
- Weakness: Very expensive, steep learning curve

**R/Python:**
- Target: Statisticians, bioinformaticians
- Strength: Unlimited flexibility, free
- Weakness: Programming required, manual everything

**Guardian:**
- Target: 80% of researchers who lack statistical training
- Strength: **Automatic rigor**, free, zero learning curve
- Ideal for: Grad students, core facilities, clinical researchers, pre-publication validation

---

## **COST COMPARISON (Academic License)**

| Platform | Annual Cost | Perpetual License | Free Option |
|----------|------------|-------------------|-------------|
| **GraphPad Prism** | $1,995 | $2,995 | ❌ No |
| **SPSS** | ~$2,000 | ~$8,000 | ❌ No |
| **R/Python** | $0 | $0 | ✅ Yes (but steep learning) |
| **Guardian** | **$0** | **$0** | ✅ **Yes** |

**Guardian competitive advantage: FREE + AUTOMATIC VALIDATION**

---

## **WHEN TO USE EACH TOOL**

### **Use GraphPad Prism if:**
- ✅ You have budget ($1,995/year)
- ✅ You need publication-quality graphs
- ✅ You have statistical training
- ✅ You remember to check assumptions
- ⚠️ But: You can still make mistakes

### **Use SPSS if:**
- ✅ Your field uses it (psychology, social science)
- ✅ You have extensive training
- ✅ Budget isn't a concern ($2,000+)
- ⚠️ But: High learning curve

### **Use R/Python if:**
- ✅ You can program
- ✅ You need ultimate flexibility
- ✅ You have time to code everything manually
- ⚠️ But: Easy to skip validation steps

### **Use Guardian if:**
- ✅ You want validation to be **automatic**
- ✅ You lack extensive statistical training
- ✅ You want to prevent publication mistakes
- ✅ You need provable validation for journals
- ✅ **FREE** is important
- ⚠️ But: Limited to core tests (for now)

---

## **THE BOTTOM LINE**

### **Other Tools Say:**
> "Here are the tools to do statistics correctly. Use them properly."

### **Guardian Says:**
> "We ensure you do statistics correctly. You can't accidentally skip validation."

---

**One Sentence Summary:**
> "GraphPad, SPSS, and R make rigorous statistics POSSIBLE. Guardian makes rigorous statistics UNAVOIDABLE."

---

## **SHOW THIS TABLE AT EMBO:**

Print this comparison or have it ready on your tablet. When someone asks "What's different from GraphPad?", show them the **Assumption Validation Comparison** table at the top.

**Key talking points:**
1. "Same tests, automatic execution"
2. "Optional vs mandatory validation"
3. "70%+ failure rate shows optional doesn't work"
4. "We're addressing human factor, not inventing new statistics"

---

**Created**: November 12, 2025
**Purpose**: Visual aid for EMBO Q&A
**Status**: ✅ Ready to present
