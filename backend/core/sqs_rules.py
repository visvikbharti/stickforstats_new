"""
Statistical Quality Score (SQS) Rule Definitions

This module contains 50+ detection rules for assessing statistical reporting
quality in manuscripts. Rules are organized by category and include regex
patterns, point values, severity levels, and recommendations.

Categories:
1. Effect Sizes (20 points max)
2. Assumption Transparency (15 points max)
3. Sample and Power (15 points max)
4. Statistical Precision (15 points max)
5. Reproducibility Indicators (20 points max)
6. Guideline Compliance (15 points max)

Total: 100 points
"""

from typing import Dict, List, Any

# =============================================================================
# CATEGORY 1: EFFECT SIZE RULES (20 points max)
# =============================================================================

EFFECT_SIZE_RULES = [
    {
        "id": "ES001",
        "name": "Cohen's d reported",
        "description": "Checks for Cohen's d effect size reporting",
        "pattern": r"[Cc]ohen'?s?\s*d\s*[=:]\s*-?[\d.]+",
        "category": "effect_sizes",
        "points": 3,
        "severity": "important",
        "recommendation": "Report Cohen's d for t-tests and mean comparisons.",
        "examples": ["Cohen's d = 0.82", "d = 0.45"],
    },
    {
        "id": "ES002",
        "name": "Hedges' g reported",
        "description": "Checks for Hedges' g effect size (bias-corrected)",
        "pattern": r"[Hh]edges'?\s*g\s*[=:]\s*-?[\d.]+",
        "category": "effect_sizes",
        "points": 3,
        "severity": "suggested",
        "recommendation": "Consider Hedges' g for small samples (n < 20 per group).",
        "examples": ["Hedges' g = 0.78", "g = 0.52"],
    },
    {
        "id": "ES003",
        "name": "Eta-squared reported",
        "description": "Checks for eta-squared effect size for ANOVA",
        "pattern": r"η[²2]\s*[=:]\s*[\d.]+|eta[- ]?squared\s*[=:]\s*[\d.]+",
        "category": "effect_sizes",
        "points": 3,
        "severity": "important",
        "recommendation": "Report η² (eta-squared) for ANOVA analyses.",
        "examples": ["η² = 0.14", "eta-squared = 0.08"],
    },
    {
        "id": "ES004",
        "name": "Partial eta-squared reported",
        "description": "Checks for partial eta-squared in factorial designs",
        "pattern": r"partial\s+η[²2p]?\s*[=:]\s*[\d.]+|η[²2]?p\s*[=:]\s*[\d.]+|ηp²\s*[=:]\s*[\d.]+",
        "category": "effect_sizes",
        "points": 3,
        "severity": "important",
        "recommendation": "Report partial η² for factorial ANOVA designs.",
        "examples": ["partial η² = 0.12", "ηp² = 0.09"],
    },
    {
        "id": "ES005",
        "name": "Omega-squared reported",
        "description": "Checks for omega-squared (less biased than eta-squared)",
        "pattern": r"ω[²2]\s*[=:]\s*[\d.]+|omega[- ]?squared\s*[=:]\s*[\d.]+",
        "category": "effect_sizes",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Consider ω² (omega-squared) as a less biased alternative to η².",
        "examples": ["ω² = 0.11", "omega-squared = 0.07"],
    },
    {
        "id": "ES006",
        "name": "Correlation coefficient (r) reported",
        "description": "Checks for Pearson r correlation reporting",
        "pattern": r"(?<![A-Za-z])r\s*[=:]\s*-?[01]?\.\d+(?:\s*,|\s*\)|[,;\.]|\s+[pn<>])",
        "category": "effect_sizes",
        "points": 2,
        "severity": "important",
        "recommendation": "Report correlation coefficients with exact values.",
        "examples": ["r = .45", "r = -0.32, p < .001"],
    },
    {
        "id": "ES007",
        "name": "R-squared reported",
        "description": "Checks for R² in regression analyses",
        "pattern": r"[Rr][²2]\s*[=:]\s*[\d.]+|[Rr]-?squared\s*[=:]\s*[\d.]+",
        "category": "effect_sizes",
        "points": 2,
        "severity": "important",
        "recommendation": "Report R² for regression analyses to show variance explained.",
        "examples": ["R² = 0.34", "R-squared = 0.28"],
    },
    {
        "id": "ES008",
        "name": "Odds ratio reported",
        "description": "Checks for odds ratio in logistic regression/categorical analysis",
        "pattern": r"(?:OR|[Oo]dds\s*[Rr]atio)\s*[=:]\s*[\d.]+",
        "category": "effect_sizes",
        "points": 2,
        "severity": "important",
        "recommendation": "Report odds ratios for logistic regression and categorical analyses.",
        "examples": ["OR = 2.45", "odds ratio = 1.82"],
    },
    {
        "id": "ES009",
        "name": "Risk ratio / Relative risk reported",
        "description": "Checks for relative risk in epidemiological analyses",
        "pattern": r"(?:RR|[Rr]isk\s*[Rr]atio|[Rr]elative\s*[Rr]isk)\s*[=:]\s*[\d.]+",
        "category": "effect_sizes",
        "points": 2,
        "severity": "important",
        "recommendation": "Report relative risk (RR) for cohort and experimental studies.",
        "examples": ["RR = 1.35", "relative risk = 0.72"],
    },
    {
        "id": "ES010",
        "name": "Confidence intervals for effect sizes",
        "description": "Checks for CIs accompanying effect sizes",
        "pattern": r"(?:95%?\s*)?CI\s*[=:\[]?\s*[\[(]?\s*-?[\d.]+\s*[,to–-]+\s*-?[\d.]+\s*[\])]?",
        "category": "effect_sizes",
        "points": 4,
        "severity": "critical",
        "recommendation": "Always report 95% confidence intervals for effect sizes.",
        "examples": ["95% CI [0.45, 0.89]", "CI = 0.23 to 0.67"],
    },
    {
        "id": "ES011",
        "name": "Effect size interpretation",
        "description": "Checks for interpretation of effect size magnitude",
        "pattern": r"(?:small|medium|moderate|large|negligible|trivial)\s+effect\s*(?:size)?|effect\s*(?:size)?\s*(?:was|is|were)\s*(?:small|medium|moderate|large)",
        "category": "effect_sizes",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Provide interpretation of effect size magnitude (small, medium, large).",
        "examples": ["This represents a medium effect size", "The effect was small"],
    },
]

# =============================================================================
# CATEGORY 2: ASSUMPTION TRANSPARENCY RULES (15 points max)
# =============================================================================

ASSUMPTION_RULES = [
    {
        "id": "AS001",
        "name": "Normality assessment reported",
        "description": "Checks for normality testing or assessment",
        "pattern": r"[Ss]hapiro[- ]?[Ww]ilk|[Kk]olmogorov[- ]?[Ss]mirnov|[Aa]nderson[- ]?[Dd]arling|normality\s+(?:test|assumption|was\s+(?:assessed|tested|checked|examined|evaluated))|(?:test|check|assess|examine)(?:ed|ing)?\s+(?:for\s+)?normality|normal(?:ly)?\s+distributed",
        "category": "assumptions",
        "points": 3,
        "severity": "important",
        "recommendation": "Report normality assessment (e.g., Shapiro-Wilk test) for parametric tests.",
        "examples": ["Shapiro-Wilk test indicated normality", "Normality was assessed using"],
    },
    {
        "id": "AS002",
        "name": "Variance homogeneity tested",
        "description": "Checks for homogeneity of variance testing",
        "pattern": r"[Ll]evene'?s?\s*(?:test)?|[Bb]artlett'?s?\s*(?:test)?|[Bb]rown[- ]?[Ff]orsythe|(?:homogeneity|equality|homoscedasticity)\s+of\s+variance|variance\s+(?:homogeneity|equality)|equal\s+variance\s+(?:assumption|was)",
        "category": "assumptions",
        "points": 3,
        "severity": "important",
        "recommendation": "Report variance homogeneity testing (e.g., Levene's test) for ANOVA and t-tests.",
        "examples": ["Levene's test was non-significant", "Homogeneity of variance was tested"],
    },
    {
        "id": "AS003",
        "name": "Independence consideration",
        "description": "Checks for acknowledgment of independence assumption",
        "pattern": r"independence\s+(?:assumption|of\s+observations|was)|[Dd]urbin[- ]?[Ww]atson|observations\s+(?:were|are)\s+independent|independent\s+(?:observations|samples|groups)|autocorrelation\s+(?:test|was)",
        "category": "assumptions",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Address the independence assumption, especially for repeated measures or clustered data.",
        "examples": ["Observations were independent", "Durbin-Watson test indicated no autocorrelation"],
    },
    {
        "id": "AS004",
        "name": "Outlier handling described",
        "description": "Checks for outlier detection and handling",
        "pattern": r"outlier[s]?\s+(?:were|was)\s+(?:removed|excluded|identified|detected|retained|winsorized)|no\s+outliers|outlier\s+(?:analysis|detection|removal|identification)|[Gg]rubbs'?\s*(?:test)?|IQR\s+(?:method|rule|criterion)|z[- ]?score\s+(?:greater|above|beyond|threshold)",
        "category": "assumptions",
        "points": 2,
        "severity": "important",
        "recommendation": "Describe how outliers were detected and handled.",
        "examples": ["Outliers (> 3 SD) were removed", "No outliers were identified"],
    },
    {
        "id": "AS005",
        "name": "Linearity assessment",
        "description": "Checks for linearity assessment in regression/correlation",
        "pattern": r"linearity\s+(?:assumption|was\s+(?:assessed|tested|checked|met))|(?:linear|nonlinear)\s+relationship|scatterplot|residual\s+(?:plot|vs\s+(?:fitted|predicted))|LOESS|polynomial\s+terms?",
        "category": "assumptions",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Assess and report linearity for regression and correlation analyses.",
        "examples": ["Linearity was assessed via scatterplots", "The relationship appeared linear"],
    },
    {
        "id": "AS006",
        "name": "Homoscedasticity check",
        "description": "Checks for homoscedasticity in regression",
        "pattern": r"homoscedasticity|heteroscedasticity|[Bb]reusch[- ]?[Pp]agan|[Ww]hite'?s?\s+test|constant\s+variance|residual\s+(?:variance|spread)|robust\s+standard\s+errors",
        "category": "assumptions",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Test for homoscedasticity in regression (e.g., Breusch-Pagan test).",
        "examples": ["Breusch-Pagan test indicated homoscedasticity", "Robust standard errors were used"],
    },
    {
        "id": "AS007",
        "name": "Assumption violation acknowledged",
        "description": "Checks if assumption violations are acknowledged with justification",
        "pattern": r"(?:assumption|normality|homogeneity)\s+(?:was\s+)?violated|violated\s+(?:the\s+)?(?:assumption|normality)|despite\s+(?:the\s+)?violation|robust\s+to\s+violations|non-?parametric\s+(?:test|alternative)|used\s+(?:because|due\s+to)\s+(?:non-?normal|violated)",
        "category": "assumptions",
        "points": 2,
        "severity": "important",
        "recommendation": "Acknowledge assumption violations and justify chosen approach.",
        "examples": ["Despite violation of normality, ANOVA is robust", "Non-parametric test was used due to"],
    },
    {
        "id": "AS008",
        "name": "Sphericity assessment (repeated measures)",
        "description": "Checks for sphericity in repeated measures designs",
        "pattern": r"[Mm]auchly'?s?\s*(?:test)?|sphericity|[Gg]reenhouse[- ]?[Gg]eisser|[Hh]uynh[- ]?[Ff]eldt|epsilon\s+correction",
        "category": "assumptions",
        "points": 2,
        "severity": "important",
        "recommendation": "Report sphericity test (Mauchly's) and corrections for repeated measures ANOVA.",
        "examples": ["Mauchly's test indicated violated sphericity", "Greenhouse-Geisser correction was applied"],
    },
]

# =============================================================================
# CATEGORY 3: SAMPLE AND POWER RULES (15 points max)
# =============================================================================

SAMPLE_POWER_RULES = [
    {
        "id": "SP001",
        "name": "Sample size clearly stated",
        "description": "Checks for clear sample size reporting",
        "pattern": r"[Nn]\s*[=:]\s*\d+|sample\s+(?:size|of)\s+(?:was\s+)?\d+|\d+\s+(?:participants?|subjects?|patients?|respondents?|individuals?|cases?)(?:\s+were)?|(?:participants?|subjects?|patients?|respondents?)\s*\(\s*[Nn]\s*=\s*\d+|total\s+of\s+\d+\s+(?:participants?|subjects?)",
        "category": "sample_power",
        "points": 3,
        "severity": "critical",
        "recommendation": "Clearly state sample size (N = X) in the participants/methods section.",
        "examples": ["N = 120", "Sample of 85 participants", "120 participants were recruited"],
    },
    {
        "id": "SP002",
        "name": "A priori power analysis reported",
        "description": "Checks for prospective power analysis",
        "pattern": r"(?:a\s*)?priori\s+power|power\s+analysis|G\*?[Pp]ower|sample\s+size\s+(?:calculation|determination|estimation)|required\s+sample\s+size|power\s+(?:of|was|=)\s*(?:[.0-9]+|80%|90%)|(?:80|90)%\s+power|power\s+to\s+detect",
        "category": "sample_power",
        "points": 4,
        "severity": "critical",
        "recommendation": "Report a priori power analysis with effect size, alpha, and power used.",
        "examples": ["Power analysis (G*Power) indicated N = 64", "80% power to detect d = 0.5"],
    },
    {
        "id": "SP003",
        "name": "Effect size for power calculation",
        "description": "Checks if effect size basis for power calculation is reported",
        "pattern": r"(?:expected|anticipated|assumed|target)\s+effect\s+size|effect\s+size\s+(?:of\s+)?[d=]?\s*[\d.]+\s+(?:was\s+)?used\s+(?:for|in)\s+power|based\s+on\s+(?:previous|prior|pilot)|medium\s+effect\s+size\s+(?:was\s+)?(?:assumed|used|expected)",
        "category": "sample_power",
        "points": 3,
        "severity": "important",
        "recommendation": "Specify the expected effect size (and its source) used in power calculations.",
        "examples": ["An expected effect size of d = 0.5 based on prior research", "Medium effect assumed"],
    },
    {
        "id": "SP004",
        "name": "Attrition/exclusions documented",
        "description": "Checks for documentation of participant exclusions",
        "pattern": r"(?:excluded|removed|dropped|eliminated)\s+(?:\d+\s+)?(?:participants?|subjects?|cases?|data\s+points?)|attrition|(?:missing|incomplete)\s+data|listwise\s+(?:deletion|excluded)|pairwise\s+deletion|final\s+sample\s+(?:of\s+)?\d+|after\s+exclusion|exclusion\s+criteria",
        "category": "sample_power",
        "points": 3,
        "severity": "important",
        "recommendation": "Document any participant exclusions/attrition and reasons.",
        "examples": ["5 participants were excluded due to", "After exclusions, final N = 115"],
    },
    {
        "id": "SP005",
        "name": "Post-hoc/achieved power reported",
        "description": "Checks for post-hoc power reporting (with appropriate caution)",
        "pattern": r"(?:post[- ]?hoc|observed|achieved|retrospective)\s+power|power\s+(?:was|of)\s+(?:[.0-9]+|[0-9]+%)|sensitivity\s+(?:power\s+)?analysis|minimum\s+detectable\s+effect",
        "category": "sample_power",
        "points": 2,
        "severity": "suggested",
        "recommendation": "If using post-hoc power, consider sensitivity analysis instead.",
        "examples": ["Achieved power was .92", "Sensitivity analysis indicated"],
    },
    {
        "id": "SP006",
        "name": "Sample size per group",
        "description": "Checks for group-specific sample sizes",
        "pattern": r"(?:n|N)\s*=\s*\d+\s+(?:per|in\s+each|for\s+(?:the\s+)?(?:control|treatment|experimental))|(?:control|treatment|experimental|group\s*[A-Z1-9])\s*(?:group)?\s*[\(:]?\s*n\s*=\s*\d+|\d+\s+(?:in\s+(?:the\s+)?)?(?:control|treatment|experimental)",
        "category": "sample_power",
        "points": 2,
        "severity": "important",
        "recommendation": "Report sample sizes for each group/condition.",
        "examples": ["Control group (n = 45)", "n = 30 per group"],
    },
]

# =============================================================================
# CATEGORY 4: STATISTICAL PRECISION RULES (15 points max)
# =============================================================================

PRECISION_RULES = [
    {
        "id": "PR001",
        "name": "Exact p-values reported",
        "description": "Checks for exact p-values rather than just thresholds",
        "pattern": r"p\s*[=]\s*[01]?\.\d{2,}|p\s*[=]\s*<?\s*\.001",
        "category": "precision",
        "points": 4,
        "severity": "critical",
        "recommendation": "Report exact p-values (e.g., p = .023) rather than just p < .05.",
        "examples": ["p = .034", "p = .001", "p < .001"],
    },
    {
        "id": "PR002",
        "name": "Threshold-only p-values (penalize)",
        "description": "Detects p-values reported only as thresholds",
        "pattern": r"p\s*<\s*\.?0?5(?!\d)|p\s*<\s*\.?0?1(?!\d)|p\s*>\s*\.?0?5(?!\d)",
        "category": "precision",
        "points": -2,  # Negative points (penalty)
        "severity": "important",
        "recommendation": "Avoid reporting only threshold p-values (p < .05). Report exact values.",
        "examples": ["p < .05", "p < .01", "p > .05"],
        "is_penalty": True,
    },
    {
        "id": "PR003",
        "name": "Degrees of freedom reported",
        "description": "Checks for df in test statistics",
        "pattern": r"(?:df|d\.f\.)\s*[=:]\s*\d+|[Ft]\s*\(\s*\d+\s*,\s*\d+\s*\)|χ[²2]\s*\(\s*\d+\s*\)|t\s*\(\s*\d+\s*\)",
        "category": "precision",
        "points": 3,
        "severity": "important",
        "recommendation": "Report degrees of freedom with test statistics, e.g., F(2, 45) or t(38).",
        "examples": ["F(2, 87) = 4.56", "t(45) = 2.34", "χ²(3) = 8.92"],
    },
    {
        "id": "PR004",
        "name": "F-statistic reported",
        "description": "Checks for F-statistic in ANOVA",
        "pattern": r"[Ff]\s*[=:]\s*[\d.]+|[Ff]\s*\(\s*\d+\s*,\s*\d+\s*\)\s*[=:]\s*[\d.]+",
        "category": "precision",
        "points": 2,
        "severity": "important",
        "recommendation": "Report F-statistics for ANOVA: F(df1, df2) = X.XX.",
        "examples": ["F = 12.34", "F(2, 45) = 8.92"],
    },
    {
        "id": "PR005",
        "name": "t-statistic reported",
        "description": "Checks for t-statistic in t-tests",
        "pattern": r"t\s*[=:]\s*-?[\d.]+|t\s*\(\s*\d+\s*\)\s*[=:]\s*-?[\d.]+",
        "category": "precision",
        "points": 2,
        "severity": "important",
        "recommendation": "Report t-statistics for t-tests: t(df) = X.XX.",
        "examples": ["t = 2.34", "t(45) = -3.21"],
    },
    {
        "id": "PR006",
        "name": "Chi-square statistic reported",
        "description": "Checks for chi-square statistic",
        "pattern": r"χ[²2]\s*[=:]\s*[\d.]+|chi[- ]?square[d]?\s*[=:]\s*[\d.]+|χ[²2]\s*\(\s*\d+\s*\)\s*[=:]\s*[\d.]+",
        "category": "precision",
        "points": 2,
        "severity": "important",
        "recommendation": "Report chi-square statistics: χ²(df) = X.XX.",
        "examples": ["χ² = 15.67", "χ²(3) = 8.92"],
    },
    {
        "id": "PR007",
        "name": "Appropriate decimal places",
        "description": "Checks for consistent and appropriate decimal precision",
        "pattern": r"[=:]\s*[\d]+\.[\d]{2,4}(?!\d)",
        "category": "precision",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Use consistent decimal places (typically 2-3 for most statistics).",
        "examples": ["M = 4.56", "SD = 1.234"],
    },
    {
        "id": "PR008",
        "name": "Means and SDs reported",
        "description": "Checks for descriptive statistics (means and standard deviations)",
        "pattern": r"[Mm]\s*[=:]\s*[\d.]+\s*,?\s*(?:SD|SE)\s*[=:]\s*[\d.]+|(?:mean|average)\s*[=:]\s*[\d.]+|(?:SD|standard\s+deviation)\s*[=:]\s*[\d.]+",
        "category": "precision",
        "points": 2,
        "severity": "important",
        "recommendation": "Report means and standard deviations for continuous variables.",
        "examples": ["M = 4.56, SD = 1.23", "mean = 45.2"],
    },
]

# =============================================================================
# CATEGORY 5: REPRODUCIBILITY INDICATORS RULES (20 points max)
# =============================================================================

REPRODUCIBILITY_RULES = [
    {
        "id": "RP001",
        "name": "Data availability statement",
        "description": "Checks for data availability/sharing statement",
        "pattern": r"data\s+(?:are|is)\s+(?:available|accessible)|data\s+availability|available\s+(?:at|from|upon\s+request|in\s+(?:the\s+)?(?:supplementary|repository))|OSF|[Zz]enodo|[Dd]ryad|[Ff]igshare|[Gg]it[Hh]ub|[Dd]ataverse|supplementary\s+(?:data|materials?)|open\s+data|data\s+repository|data\s+(?:can|may)\s+be\s+(?:accessed|obtained|requested)",
        "category": "reproducibility",
        "points": 5,
        "severity": "critical",
        "recommendation": "Include a data availability statement specifying how data can be accessed.",
        "examples": ["Data are available at OSF", "Data available upon reasonable request"],
    },
    {
        "id": "RP002",
        "name": "Code/analysis script availability",
        "description": "Checks for code/script sharing",
        "pattern": r"(?:code|script|syntax)\s+(?:is\s+)?(?:available|accessible)|analysis\s+(?:script|code)|[Gg]it[Hh]ub|[Gg]it[Ll]ab|[Bb]itbucket|(?:R|[Pp]ython|SPSS|[Ss]tata|SAS)\s+(?:script|code|syntax)|reproducible\s+(?:code|analysis)|computational\s+notebook|[Jj]upyter",
        "category": "reproducibility",
        "points": 4,
        "severity": "important",
        "recommendation": "Share analysis code/scripts in a public repository (e.g., GitHub, OSF).",
        "examples": ["Code available at GitHub", "R scripts are provided in supplementary"],
    },
    {
        "id": "RP003",
        "name": "Software and version reported",
        "description": "Checks for statistical software and version reporting",
        "pattern": r"(?:SPSS|SAS|[Ss]tata|R|[Pp]ython|[Jj]amovi|JASP|[Gg]raph[Pp]ad\s*[Pp]rism|[Ee]xcel|MATLAB|[Jj]ulia)\s*(?:version|v\.?)?\s*[\d.]+|(?:version|v\.?)\s*[\d.]+\s*(?:of\s+)?(?:SPSS|SAS|Stata|R|Python)|using\s+(?:the\s+)?(?:SPSS|SAS|Stata|R|Python)|(?:analyses|analysis|tests?)\s+(?:were|was)\s+(?:conducted|performed|run)\s+(?:using|in|with)\s+(?:SPSS|SAS|Stata|R|Python)",
        "category": "reproducibility",
        "points": 4,
        "severity": "important",
        "recommendation": "Report statistical software name and version (e.g., R version 4.2.1).",
        "examples": ["Analyses were conducted using R version 4.2.1", "SPSS version 28"],
    },
    {
        "id": "RP004",
        "name": "Statistical packages reported",
        "description": "Checks for specific package/library reporting",
        "pattern": r"(?:package|library)\s+[\'\"]?[A-Za-z]+[\'\"]?|(?:lme4|ggplot2|tidyverse|dplyr|car|psych|lavaan|nlme|brms|statsmodels|scipy|numpy|pandas|seaborn|matplotlib)",
        "category": "reproducibility",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Report specific statistical packages used (e.g., lme4, scipy).",
        "examples": ["Using the lme4 package", "scipy.stats in Python"],
    },
    {
        "id": "RP005",
        "name": "Random seed mentioned",
        "description": "Checks for random seed reporting for reproducibility",
        "pattern": r"random\s+seed|set\.seed|np\.random\.seed|random_state|seed\s*[=:]\s*\d+|(?:for\s+)?reproduc(?:ibility|ible)",
        "category": "reproducibility",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Report random seed for any stochastic procedures (bootstrapping, simulation).",
        "examples": ["Random seed was set to 42", "set.seed(123)"],
    },
    {
        "id": "RP006",
        "name": "Pre-registration mentioned",
        "description": "Checks for study pre-registration",
        "pattern": r"pre[- ]?regist(?:er|ration|ered)|OSF|AsPredicted|clinicaltrials\.gov|PROSPERO|registered\s+(?:at|with|on)|registration\s+(?:number|ID)|protocol\s+(?:was\s+)?registered",
        "category": "reproducibility",
        "points": 3,
        "severity": "suggested",
        "recommendation": "Consider pre-registering hypotheses and analysis plans (OSF, AsPredicted).",
        "examples": ["Study was pre-registered at OSF", "Pre-registration: https://osf.io/"],
    },
    {
        "id": "RP007",
        "name": "Supplementary materials referenced",
        "description": "Checks for supplementary materials",
        "pattern": r"supplementary\s+(?:materials?|information|data|tables?|figures?)|(?:online\s+)?(?:appendix|appendices)|supporting\s+information|(?:see|available\s+in)\s+(?:the\s+)?supplement",
        "category": "reproducibility",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Provide supplementary materials for additional analyses and details.",
        "examples": ["See supplementary materials", "Details in online appendix"],
    },
]

# =============================================================================
# CATEGORY 6: GUIDELINE COMPLIANCE RULES (15 points max)
# =============================================================================

GUIDELINE_RULES = [
    {
        "id": "GC001",
        "name": "APA format followed",
        "description": "Checks for APA-style statistical reporting",
        "pattern": r"[Ff]\s*\(\s*\d+\s*,\s*\d+\s*\)\s*=\s*[\d.]+\s*,\s*p\s*[=<]|t\s*\(\s*\d+\s*\)\s*=\s*-?[\d.]+\s*,\s*p\s*[=<]|χ[²2]\s*\(\s*\d+\s*\)\s*=\s*[\d.]+\s*,\s*p\s*[=<]|r\s*\(\s*\d+\s*\)\s*=\s*-?[\d.]+\s*,\s*p\s*[=<]",
        "category": "guidelines",
        "points": 3,
        "severity": "important",
        "recommendation": "Follow APA format for statistics: statistic(df) = value, p = value.",
        "examples": ["F(2, 45) = 4.56, p = .023", "t(38) = 2.34, p = .024"],
    },
    {
        "id": "GC002",
        "name": "JARS-Quant elements present",
        "description": "Checks for JARS-Quant required elements",
        "pattern": r"(?:sample\s+size|N\s*=)|(?:effect\s+size|Cohen|eta)|(?:confidence\s+interval|CI)|(?:power\s+analysis|statistical\s+power)",
        "category": "guidelines",
        "points": 4,
        "severity": "critical",
        "recommendation": "Follow JARS-Quant guidelines for quantitative research reporting.",
        "examples": ["Following JARS-Quant guidelines"],
    },
    {
        "id": "GC003",
        "name": "CONSORT elements (clinical trials)",
        "description": "Checks for CONSORT flow diagram and elements",
        "pattern": r"CONSORT|flow\s+diagram|PRISMA|(?:randomization|randomisation)\s+(?:was|procedure)|intention[- ]to[- ]treat|ITT\s+analysis|per[- ]protocol|allocation\s+concealment|blinding|(?:primary|secondary)\s+(?:outcome|endpoint)",
        "category": "guidelines",
        "points": 3,
        "severity": "important",
        "recommendation": "Follow CONSORT guidelines for clinical trial reporting.",
        "examples": ["CONSORT flow diagram", "Intention-to-treat analysis"],
    },
    {
        "id": "GC004",
        "name": "Multiple comparison correction",
        "description": "Checks for correction when multiple tests conducted",
        "pattern": r"[Bb]onferroni|[Hh]olm|[Tt]ukey|[Ss]cheff[eé]|[Ff]alse\s+[Dd]iscovery\s+[Rr]ate|FDR|[Bb]enjamini[- ]?[Hh]ochberg|family[- ]?wise\s+error|FWER|multiple\s+(?:comparison|test)(?:ing|s)?\s+correction|corrected\s+(?:for\s+)?multiple|adjusted\s+(?:p[- ]?value|alpha)",
        "category": "guidelines",
        "points": 3,
        "severity": "important",
        "recommendation": "Apply and report correction for multiple comparisons (e.g., Bonferroni, FDR).",
        "examples": ["Bonferroni correction was applied", "FDR-corrected p-values"],
    },
    {
        "id": "GC005",
        "name": "Alpha level specified",
        "description": "Checks if significance threshold is explicitly stated",
        "pattern": r"(?:alpha|α|significance)\s*(?:level|threshold|criterion)?\s*(?:of|was|=|set\s+(?:at|to))?\s*\.?0?[015]|p\s*<\s*\.?0?5\s+(?:was\s+)?considered\s+significant|two[- ]?(?:tailed|sided)|one[- ]?(?:tailed|sided)",
        "category": "guidelines",
        "points": 2,
        "severity": "suggested",
        "recommendation": "Explicitly state the alpha level used (e.g., α = .05, two-tailed).",
        "examples": ["Alpha was set at .05", "Two-tailed tests with α = .05"],
    },
]

# =============================================================================
# COMPILE ALL RULES
# =============================================================================

ALL_RULES = (
    EFFECT_SIZE_RULES
    + ASSUMPTION_RULES
    + SAMPLE_POWER_RULES
    + PRECISION_RULES
    + REPRODUCIBILITY_RULES
    + GUIDELINE_RULES
)

# Category metadata
CATEGORIES = {
    "effect_sizes": {
        "name": "Effect Sizes",
        "max_points": 20,
        "description": "Reporting of standardized and unstandardized effect sizes with confidence intervals",
    },
    "assumptions": {
        "name": "Assumption Transparency",
        "max_points": 15,
        "description": "Documentation of statistical assumption testing and handling",
    },
    "sample_power": {
        "name": "Sample and Power",
        "max_points": 15,
        "description": "Sample size reporting, power analysis, and attrition documentation",
    },
    "precision": {
        "name": "Statistical Precision",
        "max_points": 15,
        "description": "Exact p-values, degrees of freedom, and test statistics",
    },
    "reproducibility": {
        "name": "Reproducibility Indicators",
        "max_points": 20,
        "description": "Data and code availability, software versions, pre-registration",
    },
    "guidelines": {
        "name": "Guideline Compliance",
        "max_points": 15,
        "description": "Adherence to APA, JARS-Quant, CONSORT, and other reporting guidelines",
    },
}

# Field-specific weight adjustments
FIELD_WEIGHTS = {
    "psychology": {
        "effect_sizes": 1.2,
        "assumptions": 1.0,
        "sample_power": 1.2,
        "precision": 1.0,
        "reproducibility": 0.8,
        "guidelines": 1.0,
    },
    "medicine": {
        "effect_sizes": 1.0,
        "assumptions": 0.9,
        "sample_power": 1.2,
        "precision": 1.2,
        "reproducibility": 1.0,
        "guidelines": 1.2,
    },
    "biology": {
        "effect_sizes": 0.9,
        "assumptions": 1.1,
        "sample_power": 1.0,
        "precision": 1.0,
        "reproducibility": 1.2,
        "guidelines": 0.9,
    },
    "ecology": {
        "effect_sizes": 1.0,
        "assumptions": 1.2,
        "sample_power": 0.8,
        "precision": 1.0,
        "reproducibility": 1.2,
        "guidelines": 0.8,
    },
    "economics": {
        "effect_sizes": 0.8,
        "assumptions": 1.2,
        "sample_power": 0.8,
        "precision": 1.0,
        "reproducibility": 1.2,
        "guidelines": 0.8,
    },
    "general": {
        "effect_sizes": 1.0,
        "assumptions": 1.0,
        "sample_power": 1.0,
        "precision": 1.0,
        "reproducibility": 1.0,
        "guidelines": 1.0,
    },
}


def get_rules_by_category(category: str) -> List[Dict[str, Any]]:
    """Get all rules for a specific category."""
    return [r for r in ALL_RULES if r["category"] == category]


def get_rule_by_id(rule_id: str) -> Dict[str, Any]:
    """Get a specific rule by its ID."""
    for rule in ALL_RULES:
        if rule["id"] == rule_id:
            return rule
    return None


def get_total_possible_points() -> int:
    """Calculate total possible points (excluding penalties)."""
    return sum(r["points"] for r in ALL_RULES if r.get("points", 0) > 0)


# Summary statistics
RULE_SUMMARY = {
    "total_rules": len(ALL_RULES),
    "rules_by_category": {cat: len(get_rules_by_category(cat)) for cat in CATEGORIES.keys()},
    "max_possible_score": sum(cat["max_points"] for cat in CATEGORIES.values()),
    "critical_rules": len([r for r in ALL_RULES if r.get("severity") == "critical"]),
    "important_rules": len([r for r in ALL_RULES if r.get("severity") == "important"]),
    "suggested_rules": len([r for r in ALL_RULES if r.get("severity") == "suggested"]),
}


if __name__ == "__main__":
    # Print summary when run directly
    print("SQS Rules Summary")
    print("=" * 50)
    print(f"Total Rules: {RULE_SUMMARY['total_rules']}")
    print(f"Max Possible Score: {RULE_SUMMARY['max_possible_score']}")
    print("\nRules by Category:")
    for cat, count in RULE_SUMMARY["rules_by_category"].items():
        print(f"  {CATEGORIES[cat]['name']}: {count} rules")
    print("\nRules by Severity:")
    print(f"  Critical: {RULE_SUMMARY['critical_rules']}")
    print(f"  Important: {RULE_SUMMARY['important_rules']}")
    print(f"  Suggested: {RULE_SUMMARY['suggested_rules']}")
