# Statistical Power & Alpha: Complete Explanation

**Why You Need This**: To defend why PowerCalculator doesn't need Guardian validation

---

## 🎯 THE BIG PICTURE

**Statistical testing has 4 key parameters:**
1. **α (alpha)** - Your tolerance for Type I errors (false positives)
2. **β (beta)** - Your tolerance for Type II errors (false negatives)
3. **Power (1-β)** - Your ability to detect real effects
4. **Effect size** - How big a difference you're trying to detect
5. **Sample size (n)** - How many subjects you need

**Power analysis**: Calculate one of these parameters given the others

---

## 📖 CONCEPT 1: α (Alpha) - Significance Level

### **What Is Alpha?**
α = The probability of rejecting the null hypothesis **when it's actually true** (Type I error)

### **Common Values:**
- α = 0.05 (most common) → 5% chance of false positive
- α = 0.01 (strict) → 1% chance of false positive
- α = 0.10 (lenient) → 10% chance of false positive

### **Real-World Example:**

**Scenario**: Testing if a new drug lowers blood pressure

- **Null hypothesis (H₀)**: Drug has NO effect
- **Alternative (H₁)**: Drug DOES lower blood pressure

**What α = 0.05 means:**
> "If the drug actually has NO effect (H₀ is true), there's a 5% chance I'll incorrectly conclude it DOES work (reject H₀)."

**In Testing:**
- You run experiment, get p-value = 0.03
- Since 0.03 < 0.05 (alpha), you reject H₀
- Conclusion: "The drug works!"
- **BUT**: There's still a 3% chance this is a false positive

### **Why Guardian Can't Validate Alpha:**
```
Alpha = 0.05  ← This is a DECISION parameter, not data
```
You can't run Shapiro-Wilk on "0.05" - it's not a measurement!

---

## 📖 CONCEPT 2: Power (1 - β) - Probability of Detecting Real Effects

### **What Is Power?**
Power = The probability of rejecting H₀ **when it's actually false** (i.e., detecting a real effect)

### **Common Values:**
- Power = 0.80 (standard) → 80% chance of detecting real effect
- Power = 0.90 (high) → 90% chance of detecting real effect
- Power = 0.70 (low) → 70% chance of detecting real effect

### **Real-World Example:**

**Scenario**: Same drug testing

**What Power = 0.80 means:**
> "If the drug TRULY works (H₁ is true), I have an 80% chance of detecting it (rejecting H₀) in my experiment."

**Flip Side (β = 0.20):**
> "If the drug truly works, there's a 20% chance I'll MISS the effect and incorrectly conclude it doesn't work (Type II error)."

### **Power Depends On:**
1. **Effect size** - Bigger effects are easier to detect (higher power)
2. **Sample size** - More subjects = more power
3. **Alpha** - More lenient alpha (e.g., 0.10) = more power
4. **Variability** - Less noisy data = more power

### **Example:**

| Scenario | Effect Size | Sample Size | Alpha | Power |
|----------|-------------|-------------|-------|-------|
| Weak effect, small sample | 0.2 | 30 | 0.05 | 0.35 (LOW) |
| Weak effect, large sample | 0.2 | 200 | 0.05 | 0.88 (HIGH) |
| Strong effect, small sample | 0.8 | 30 | 0.05 | 0.94 (HIGH) |

**Interpretation**: To detect a weak effect (0.2), you need ~200 subjects to have 88% power

---

## 📖 CONCEPT 3: Effect Size - How Big Is the Difference?

### **What Is Effect Size?**
Effect size = Standardized measure of the magnitude of a difference or relationship

### **Common Measures:**

#### **Cohen's d** (for t-tests):
```
d = (Mean₁ - Mean₂) / Pooled SD

d = 0.2  →  Small effect
d = 0.5  →  Medium effect
d = 0.8  →  Large effect
```

**Example**:
- Drug group: Mean BP = 120 mmHg, SD = 10
- Placebo group: Mean BP = 130 mmHg, SD = 10
- **d = (130 - 120) / 10 = 1.0** → Large effect!

#### **η² (Eta-squared, for ANOVA)**:
```
η² = SS_between / SS_total

η² = 0.01  →  Small effect
η² = 0.06  →  Medium effect
η² = 0.14  →  Large effect
```

#### **r (Correlation)**:
```
r = Pearson correlation coefficient

r = 0.1  →  Small effect
r = 0.3  →  Medium effect
r = 0.5  →  Large effect
```

### **Why This Matters for Power:**
- Larger effect size → Easier to detect → Need fewer subjects
- Smaller effect size → Harder to detect → Need more subjects

---

## 🧮 CONCEPT 4: Power Calculation - What PowerCalculator Does

### **The 4-Parameter Relationship:**

You can calculate ANY ONE of these given the other THREE:
1. **α** (significance level)
2. **Power** (1-β)
3. **Effect size**
4. **Sample size (n)**

### **Common Use Cases:**

#### **Use Case 1: Calculate Sample Size Needed**

**Question**: "How many subjects do I need for my study?"

**Given**:
- α = 0.05 (standard)
- Power = 0.80 (want 80% chance of detecting effect)
- Effect size = 0.5 (expect medium effect based on pilot study)

**PowerCalculator Output**: n = 64 per group (128 total)

**Interpretation**: "You need 64 subjects per group to have 80% power to detect a medium effect (d=0.5) at α=0.05"

#### **Use Case 2: Calculate Achieved Power**

**Question**: "My study has 40 subjects per group. What's my power?"

**Given**:
- α = 0.05
- n = 40 per group
- Effect size = 0.5

**PowerCalculator Output**: Power = 0.70

**Interpretation**: "With 40 per group, you have 70% power to detect d=0.5. You're underpowered - should aim for 64 per group to reach 80% power."

#### **Use Case 3: Calculate Minimum Detectable Effect**

**Question**: "I have 50 subjects per group. What effect size can I detect?"

**Given**:
- α = 0.05
- Power = 0.80
- n = 50 per group

**PowerCalculator Output**: Minimum detectable effect = 0.56

**Interpretation**: "With 50 per group and 80% power, you can reliably detect effects of d=0.56 or larger. Smaller effects will be missed."

---

## 🛡️ WHY POWERCALCULATOR DOESN'T NEED GUARDIAN

### **What PowerCalculator Accepts:**

**INPUT (Parameters, not data):**
```javascript
{
  alpha: 0.05,          // Decision parameter
  power: 0.80,          // Desired probability
  effectSize: 0.5,      // Standardized difference
  sampleSize: null      // What we're calculating
}
```

**OUTPUT (Calculation):**
```javascript
{
  requiredN: 64         // Calculated sample size
}
```

### **Why No Guardian Validation:**

**Guardian checks raw data distributions:**
- Normality (Shapiro-Wilk)
- Variance homogeneity (Levene's)
- Outliers (IQR method)

**PowerCalculator has NO raw data:**
```
α = 0.05        ← Can't check normality of "0.05"
Power = 0.80    ← Can't detect outliers in "0.80"
d = 0.5         ← Can't run Levene's test on "0.5"
```

These are **abstract parameters**, not data points with distributions!

---

## 📊 REAL EXAMPLE: Power Calculation Workflow

### **Scenario: Planning a Clinical Trial**

#### **Step 1: Researcher's Question**
> "I want to test if meditation reduces anxiety scores (measured 0-100). Based on pilot data, I expect a 10-point reduction (d ≈ 0.5). How many subjects do I need?"

#### **Step 2: PowerCalculator Input**
```
Test type: Two-sample t-test
Alpha: 0.05
Power: 0.80
Effect size: 0.5 (medium)
Tails: Two-tailed
```

#### **Step 3: PowerCalculator Output**
```
Required sample size: 64 per group (128 total)
```

#### **Step 4: Researcher's Decision**
> "I have budget for 150 subjects. I'll recruit 75 per group to slightly exceed the requirement."

### **WHERE IS THE RAW DATA?**

**There is none!** This is **prospective** (planning before data collection).

- No measurements to validate
- No distributions to check
- No outliers to detect
- No assumptions to verify

**Guardian would have nothing to validate.**

---

## 🎯 HOW TO DEFEND IN YOUR PRESENTATION

### **If Asked: "What does PowerCalculator do?"**

**Answer**:
> "PowerCalculator performs statistical power analysis for study planning. Researchers input desired significance level (alpha), statistical power, and expected effect size, then the calculator determines required sample size. This is a **prospective calculation** using abstract parameters - there's no raw data to validate. You're planning the study BEFORE you collect data."

### **If Asked: "Why doesn't it need Guardian?"**

**Answer**:
> "Guardian validates **distributional assumptions** of **raw data**. PowerCalculator accepts **design parameters** like alpha=0.05 and power=0.80 - these are theoretical probabilities, not measurements. You can't check if '0.05' is normally distributed - it's not a data point, it's a decision parameter. Guardian protects data-driven analyses; PowerCalculator is a prospective planning tool."

### **If Asked: "Couldn't you validate the effect size?"**

**Answer**:
> "Effect sizes entered into PowerCalculator are typically from literature or pilot studies - they're **estimates**, not raw data. If the effect size comes from a pilot study, that original pilot data WOULD be Guardian-validated when analyzed. But once you extract 'd=0.5' as a summary, you've moved from raw data to a parameter. PowerCalculator uses that parameter for planning - it doesn't re-analyze the original pilot data."

---

## 📚 KEY TERMINOLOGY SUMMARY

| Term | Symbol | Definition | Typical Value | What It Controls |
|------|--------|------------|---------------|------------------|
| **Significance level** | α | P(reject H₀ \| H₀ true) | 0.05 | False positive rate |
| **Type I error** | α | Incorrectly reject H₀ | 5% | Saying "effect exists" when it doesn't |
| **Type II error** | β | Incorrectly fail to reject H₀ | 20% | Missing a real effect |
| **Statistical power** | 1-β | P(reject H₀ \| H₁ true) | 0.80 | Ability to detect real effects |
| **Effect size** | d, r, η² | Magnitude of difference | 0.2-0.8 | How big the effect is |
| **Sample size** | n | Number of subjects | Varies | Precision & power |

---

## 🎓 MEMORIZE THIS ANALOGY

**Guardian is like a food safety inspector:**
- Inspects **actual food** (raw data)
- Checks for contamination, spoilage, proper storage
- Blocks distribution if unsafe

**PowerCalculator is like a menu planner:**
- Plans meals BEFORE cooking (prospective)
- Uses **recipes** (parameters: α, power, effect size)
- No actual food to inspect yet

**You wouldn't ask a food inspector to check a recipe - there's no food to inspect! Same with Guardian and PowerCalculator.**

---

## ✅ CONFIDENCE CHECK

After reading this, you should be able to explain:
- ✅ What alpha (α) is → Significance level, false positive rate
- ✅ What power is → Ability to detect real effects (1-β)
- ✅ What effect size is → Standardized magnitude of difference
- ✅ What PowerCalculator does → Sample size / power planning
- ✅ Why it doesn't need Guardian → No raw data, only parameters

---

**You're now prepared to defend the PowerCalculator exclusion! 🎉**
