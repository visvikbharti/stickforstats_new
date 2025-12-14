/**
 * AI Advisor Prompt Templates
 *
 * Comprehensive prompt engineering for statistical guidance.
 * These templates ensure accurate, helpful, and scientifically sound responses.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

/**
 * System prompt that defines StickAI's personality and capabilities
 */
export const SYSTEM_PROMPT = `You are StickAI, an expert statistical advisor built into StickForStats, the world's leading statistics education platform. Your role is to provide accurate, helpful, and scientifically rigorous statistical guidance.

## Your Expertise
- Statistical test selection and interpretation
- Assumption checking and violation handling
- Effect size calculation and interpretation
- Power analysis and sample size determination
- APA-style reporting and publication guidance
- Research design and methodology

## Guidelines

### Scientific Accuracy
- Always provide scientifically accurate information
- Cite established statistical conventions (Cohen's benchmarks, etc.)
- Distinguish between frequentist and Bayesian approaches when relevant
- Be clear about limitations and assumptions

### Communication Style
- Use clear, accessible language
- Provide both intuitive explanations AND technical details
- Use markdown formatting for readability
- Include formulas when helpful (LaTeX format)
- Give concrete examples when possible

### Ethical Guidance
- Warn against p-hacking and HARKing
- Emphasize pre-registration importance
- Encourage reporting of null results
- Advocate for effect sizes over p-values alone
- Promote reproducibility best practices

### Test Selection
When recommending tests, consider:
1. Research question type (difference, relationship, prediction)
2. Number of groups/variables
3. Variable types (continuous, categorical, ordinal)
4. Independence of observations
5. Sample size
6. Distribution assumptions

### Response Format
- Start with a direct answer
- Follow with explanation and context
- Provide practical next steps
- Offer to elaborate on specific aspects

### What NOT to Do
- Never recommend p-hacking or data manipulation
- Don't oversimplify to the point of inaccuracy
- Don't provide definitive answers without knowing the full context
- Don't discourage users from seeking additional expertise when needed

Remember: Your goal is to help users make sound statistical decisions while learning the principles behind them.`;

/**
 * Build a prompt for test selection recommendations
 */
export const buildTestSelectionPrompt = (context) => {
  const {
    researchQuestion,
    dependentVariable,
    independentVariables,
    variableTypes,
    sampleSize,
    groupCount,
    dataCharacteristics,
    assumptions,
  } = context;

  return `Based on the following research context, recommend the most appropriate statistical test(s):

## Research Context

**Research Question:** ${researchQuestion || 'Not specified'}

**Variables:**
- Dependent Variable: ${dependentVariable?.name || 'Not specified'} (${dependentVariable?.type || 'Unknown type'})
- Independent Variable(s): ${independentVariables?.map(iv => `${iv.name} (${iv.type})`).join(', ') || 'Not specified'}

**Sample Information:**
- Total Sample Size: ${sampleSize || 'Not specified'}
- Number of Groups: ${groupCount || 'Not specified'}

**Data Characteristics:**
${dataCharacteristics ? JSON.stringify(dataCharacteristics, null, 2) : 'Not available'}

**Assumption Check Results:**
${assumptions ? assumptions.map(a => `- ${a.name}: ${a.status}`).join('\n') : 'Not checked'}

## Your Task

Please provide:
1. **Primary Recommended Test** with clear justification
2. **Alternative Tests** if assumptions are violated
3. **Key Assumptions** to verify before proceeding
4. **Effect Size Measure** to report
5. **Sample Size Assessment** - is the current n adequate?

Format your response with clear headers and bullet points for easy reading.`;
};

/**
 * Build a prompt for result interpretation
 */
export const buildInterpretationPrompt = (results) => {
  const {
    testName,
    testStatistic,
    statisticValue,
    degreesOfFreedom,
    pValue,
    effectSize,
    confidenceInterval,
    sampleSize,
    groupMeans,
    context,
  } = results;

  return `Please interpret the following statistical results in plain English:

## Analysis Results

**Test Performed:** ${testName}
**Test Statistic:** ${testStatistic} = ${statisticValue}
${degreesOfFreedom ? `**Degrees of Freedom:** ${degreesOfFreedom}` : ''}
**P-value:** ${pValue}
${effectSize ? `**Effect Size:** ${effectSize.measure} = ${effectSize.value}` : ''}
${confidenceInterval ? `**95% CI:** [${confidenceInterval.lower}, ${confidenceInterval.upper}]` : ''}
**Sample Size:** ${sampleSize}
${groupMeans ? `**Group Means:** ${JSON.stringify(groupMeans)}` : ''}

**Research Context:** ${context || 'Not provided'}

## Your Task

Please provide:

1. **Plain English Interpretation** (1-2 sentences that anyone can understand)

2. **Statistical Significance Assessment**
   - Is the result statistically significant at α = 0.05?
   - What does the p-value tell us?

3. **Practical Significance Assessment**
   - Is the effect size small, medium, or large?
   - Is this effect meaningful in practical terms?

4. **APA-Format Result Statement**
   - Provide a publication-ready sentence

5. **Limitations and Caveats**
   - What should be kept in mind when interpreting these results?

6. **Next Steps**
   - What follow-up analyses might be useful?`;
};

/**
 * Build a prompt for assumption violation guidance
 */
export const buildAssumptionPrompt = (violation) => {
  const {
    assumptionName,
    testUsed,
    testStatistic,
    pValue,
    severity,
    dataCharacteristics,
    plannedTest,
  } = violation;

  return `An assumption violation has been detected. Please provide guidance:

## Violation Details

**Assumption Violated:** ${assumptionName}
**Test Used to Check:** ${testUsed}
**Test Result:** ${testStatistic} = ${pValue} (p-value)
**Severity:** ${severity || 'Not assessed'}

**Planned Analysis:** ${plannedTest || 'Not specified'}

**Data Characteristics:**
${dataCharacteristics ? JSON.stringify(dataCharacteristics, null, 2) : 'Not available'}

## Your Task

Please provide:

1. **What This Violation Means**
   - Explain the assumption in simple terms
   - Why is this violation problematic?

2. **Severity Assessment**
   - How serious is this violation for the planned analysis?
   - Are some tests more robust to this violation than others?

3. **Recommended Solutions** (in order of preference)
   - Option 1: Best solution
   - Option 2: Alternative approach
   - Option 3: If all else fails

4. **If Using a Non-Parametric Alternative**
   - Which test to use
   - How it differs from the parametric version
   - Interpretation differences

5. **If Using Data Transformation**
   - Recommended transformation
   - How to back-transform for interpretation
   - Cautions about transformed results

6. **Reporting Guidance**
   - How to report this violation in your paper
   - What sensitivity analyses to consider`;
};

/**
 * Build a prompt for methods section generation
 */
export const buildMethodsSectionPrompt = (analysisDetails) => {
  const {
    design,
    participants,
    variables,
    tests,
    software,
    results,
  } = analysisDetails;

  return `Generate a publication-ready statistical methods section based on the following:

## Study Details

**Design:** ${design || 'Not specified'}

**Participants:**
${participants ? JSON.stringify(participants, null, 2) : 'Not specified'}

**Variables:**
${variables ? JSON.stringify(variables, null, 2) : 'Not specified'}

**Statistical Tests Used:**
${tests ? tests.map(t => `- ${t.name}: ${t.purpose}`).join('\n') : 'Not specified'}

**Software:** ${software || 'StickForStats v1.0'}

**Key Results:**
${results ? JSON.stringify(results, null, 2) : 'Not provided'}

## Your Task

Generate a methods section following APA 7th edition format. Include:

1. **Participants Section**
   - Sample demographics
   - Recruitment method (if known)
   - Inclusion/exclusion criteria (if known)

2. **Statistical Analysis Section**
   - Overview of analytical approach
   - Specific tests used with justification
   - Assumption checks performed
   - Alpha level and any corrections
   - Software used

3. **Results Summary** (if data provided)
   - Descriptive statistics
   - Inferential statistics with full reporting
   - Effect sizes and confidence intervals

Format the output as clean markdown that can be copied directly into a manuscript.`;
};

/**
 * Build a prompt for power analysis guidance
 */
export const buildPowerAnalysisPrompt = (context) => {
  const {
    testType,
    effectSize,
    alpha,
    power,
    sampleSize,
    groups,
    question, // 'sample_size', 'power', 'effect_size'
  } = context;

  return `Perform a power analysis and provide guidance:

## Analysis Parameters

**Test Type:** ${testType || 'Two-sample t-test'}
**Known Parameters:**
- Effect Size: ${effectSize || 'Unknown'}
- Alpha (α): ${alpha || 0.05}
- Power (1-β): ${power || 0.80}
- Sample Size: ${sampleSize || 'Unknown'}
- Number of Groups: ${groups || 2}

**Question:** Calculate ${question || 'sample size'}

## Your Task

Please provide:

1. **Power Analysis Result**
   - The calculated value with formula
   - Step-by-step calculation

2. **Interpretation**
   - What does this mean in practical terms?
   - Is this feasible?

3. **Sensitivity Analysis**
   - What if effect size is smaller/larger?
   - How does changing power affect sample size?

4. **Practical Recommendations**
   - Is the planned study adequately powered?
   - Suggestions for improving power

5. **Reporting Template**
   - How to report this power analysis in a paper
   - Required information to include`;
};

/**
 * Extract test recommendations from AI response
 */
export const extractRecommendations = (response) => {
  // This function parses the AI response to extract structured recommendations
  // In a full implementation, this would use regex or NLP to find test names

  const recommendations = [];

  // Simple pattern matching for common test names
  const testPatterns = [
    { pattern: /independent[- ]?samples?\s*t[- ]?test/gi, name: 'Independent Samples t-test', id: 'independent-t-test' },
    { pattern: /paired[- ]?samples?\s*t[- ]?test/gi, name: 'Paired Samples t-test', id: 'paired-t-test' },
    { pattern: /one[- ]?sample\s*t[- ]?test/gi, name: 'One-Sample t-test', id: 'one-sample-t-test' },
    { pattern: /mann[- ]?whitney/gi, name: 'Mann-Whitney U Test', id: 'mann-whitney' },
    { pattern: /wilcoxon/gi, name: 'Wilcoxon Signed-Rank Test', id: 'wilcoxon' },
    { pattern: /one[- ]?way\s*anova/gi, name: 'One-Way ANOVA', id: 'one-way-anova' },
    { pattern: /two[- ]?way\s*anova/gi, name: 'Two-Way ANOVA', id: 'two-way-anova' },
    { pattern: /kruskal[- ]?wallis/gi, name: 'Kruskal-Wallis Test', id: 'kruskal-wallis' },
    { pattern: /chi[- ]?square/gi, name: 'Chi-Square Test', id: 'chi-square' },
    { pattern: /pearson.*correlation/gi, name: 'Pearson Correlation', id: 'pearson-correlation' },
    { pattern: /spearman.*correlation/gi, name: 'Spearman Correlation', id: 'spearman-correlation' },
    { pattern: /linear\s*regression/gi, name: 'Linear Regression', id: 'linear-regression' },
    { pattern: /logistic\s*regression/gi, name: 'Logistic Regression', id: 'logistic-regression' },
  ];

  testPatterns.forEach(({ pattern, name, id }) => {
    if (pattern.test(response)) {
      recommendations.push({
        name,
        id,
        confidence: 80, // Default confidence
      });
    }
  });

  return recommendations;
};

/**
 * Format a number for statistical reporting
 */
export const formatStatistic = (value, decimals = 3) => {
  if (typeof value !== 'number') return value;

  // Handle very small p-values
  if (value < 0.001) {
    return '< .001';
  }

  // Format with leading zero removed for values < 1
  const formatted = value.toFixed(decimals);
  if (Math.abs(value) < 1) {
    return formatted.replace(/^0/, '');
  }

  return formatted;
};

/**
 * Generate APA-style result string
 */
export const generateAPAResult = (results) => {
  const {
    testName,
    testStatistic,
    statisticValue,
    df,
    pValue,
    effectSize,
    ci,
  } = results;

  let apa = '';

  switch (testName?.toLowerCase()) {
    case 't-test':
    case 'independent t-test':
    case 'paired t-test':
      apa = `t(${df}) = ${formatStatistic(statisticValue, 2)}, p ${formatStatistic(pValue)}`;
      if (effectSize) {
        apa += `, d = ${formatStatistic(effectSize.value, 2)}`;
      }
      if (ci) {
        apa += `, 95% CI [${formatStatistic(ci.lower, 2)}, ${formatStatistic(ci.upper, 2)}]`;
      }
      break;

    case 'anova':
    case 'one-way anova':
      apa = `F(${df.between}, ${df.within}) = ${formatStatistic(statisticValue, 2)}, p ${formatStatistic(pValue)}`;
      if (effectSize) {
        apa += `, η² = ${formatStatistic(effectSize.value, 2)}`;
      }
      break;

    case 'correlation':
    case 'pearson correlation':
      apa = `r(${df}) = ${formatStatistic(statisticValue, 2)}, p ${formatStatistic(pValue)}`;
      if (ci) {
        apa += `, 95% CI [${formatStatistic(ci.lower, 2)}, ${formatStatistic(ci.upper, 2)}]`;
      }
      break;

    case 'chi-square':
      apa = `χ²(${df}) = ${formatStatistic(statisticValue, 2)}, p ${formatStatistic(pValue)}`;
      if (effectSize) {
        apa += `, V = ${formatStatistic(effectSize.value, 2)}`;
      }
      break;

    default:
      apa = `${testStatistic} = ${formatStatistic(statisticValue, 2)}, p ${formatStatistic(pValue)}`;
  }

  return apa;
};

export default {
  SYSTEM_PROMPT,
  buildTestSelectionPrompt,
  buildInterpretationPrompt,
  buildAssumptionPrompt,
  buildMethodsSectionPrompt,
  buildPowerAnalysisPrompt,
  extractRecommendations,
  formatStatistic,
  generateAPAResult,
};
