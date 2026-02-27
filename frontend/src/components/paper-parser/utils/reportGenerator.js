/**
 * Reproducibility Report Generator
 *
 * Generates comprehensive reproducibility reports based on paper analysis.
 * Follows JARS (Journal Article Reporting Standards) guidelines.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import { calculateQualityScore, getSeverityLabel, getCategoryIcon } from './errorRules';

/**
 * JARS Checklist Items (APA 2020)
 * Based on Journal Article Reporting Standards for Quantitative Research
 */
export const JARS_CHECKLIST = {
  title: [
    { id: 'title_1', item: 'Identifies variables or theoretical issues under investigation', required: true },
    { id: 'title_2', item: 'Identifies the population(s) studied', required: false }
  ],
  abstract: [
    { id: 'abstract_1', item: 'Problem under investigation', required: true },
    { id: 'abstract_2', item: 'Participants or subjects', required: true },
    { id: 'abstract_3', item: 'Study method/design', required: true },
    { id: 'abstract_4', item: 'Findings including effect sizes and confidence intervals', required: true },
    { id: 'abstract_5', item: 'Conclusions and implications', required: true }
  ],
  introduction: [
    { id: 'intro_1', item: 'Problem importance and theoretical significance', required: true },
    { id: 'intro_2', item: 'Review of relevant scholarship', required: true },
    { id: 'intro_3', item: 'Hypotheses and objectives', required: true },
    { id: 'intro_4', item: 'How hypotheses derive from theory', required: false }
  ],
  method: [
    { id: 'method_1', item: 'Eligibility and exclusion criteria for participants', required: true },
    { id: 'method_2', item: 'Major demographic characteristics', required: true },
    { id: 'method_3', item: 'Sampling procedures', required: true },
    { id: 'method_4', item: 'Sample size determination/power analysis', required: true },
    { id: 'method_5', item: 'Measures and covariates', required: true },
    { id: 'method_6', item: 'Data collection procedures', required: true },
    { id: 'method_7', item: 'Research design (between, within, mixed)', required: true },
    { id: 'method_8', item: 'Data diagnostics and assumption checks', required: true },
    { id: 'method_9', item: 'Missing data handling', required: false },
    { id: 'method_10', item: 'Statistical software used', required: false }
  ],
  results: [
    { id: 'results_1', item: 'Participant flow (recruitment, exclusions)', required: true },
    { id: 'results_2', item: 'Statistics and data analysis', required: true },
    { id: 'results_3', item: 'Effect sizes and confidence intervals', required: true },
    { id: 'results_4', item: 'Results of all planned analyses', required: true },
    { id: 'results_5', item: 'Precision estimates (SEs, CIs)', required: true },
    { id: 'results_6', item: 'Ancillary analyses (e.g., subgroups)', required: false }
  ],
  discussion: [
    { id: 'discuss_1', item: 'Support or non-support of hypotheses', required: true },
    { id: 'discuss_2', item: 'Similarity to prior work', required: true },
    { id: 'discuss_3', item: 'Interpretation of results', required: true },
    { id: 'discuss_4', item: 'Limitations and threats to validity', required: true },
    { id: 'discuss_5', item: 'Generalizability of findings', required: true },
    { id: 'discuss_6', item: 'Implications for theory, policy, or practice', required: false }
  ]
};

/**
 * Generate a comprehensive reproducibility report
 * @param {Object} paperData - Extracted paper data
 * @param {Object} statisticalContent - Extracted statistics
 * @param {Array} detectedIssues - Detected errors/issues
 * @returns {Object} - Complete report
 */
export function generateReport(paperData, statisticalContent, detectedIssues) {
  const qualityScore = calculateQualityScore(detectedIssues);

  const report = {
    // Metadata
    metadata: {
      generatedAt: new Date().toISOString(),
      paperTitle: paperData.metadata?.title || 'Unknown',
      paperAuthor: paperData.metadata?.author || 'Unknown',
      filename: paperData.filename,
      pageCount: paperData.numPages,
      wordCount: paperData.statistics?.wordCount || 0
    },

    // Quality Summary
    qualitySummary: {
      score: qualityScore.score,
      grade: qualityScore.grade,
      gradeColor: qualityScore.gradeColor,
      totalIssues: qualityScore.totalIssues,
      breakdown: {
        critical: qualityScore.criticalCount,
        high: qualityScore.highCount,
        medium: qualityScore.mediumCount,
        low: qualityScore.lowCount,
        info: qualityScore.infoCount
      },
      jarsViolations: qualityScore.jarsViolations
    },

    // Statistical Content Summary
    statisticalSummary: {
      pValuesFound: statisticalContent.pValues.length,
      testStatisticsFound: statisticalContent.testStatistics.length,
      effectSizesFound: statisticalContent.effectSizes.length,
      sampleSizesFound: statisticalContent.sampleSizes.length,
      confidenceIntervalsFound: statisticalContent.confidenceIntervals.length,
      testsIdentified: statisticalContent.testNames.map(t => t.name)
    },

    // Extracted Statistics Detail
    extractedStatistics: {
      pValues: statisticalContent.pValues,
      testStatistics: statisticalContent.testStatistics,
      effectSizes: statisticalContent.effectSizes,
      sampleSizes: statisticalContent.sampleSizes,
      confidenceIntervals: statisticalContent.confidenceIntervals,
      descriptives: statisticalContent.descriptives
    },

    // Detected Issues
    issues: detectedIssues.map(issue => ({
      ...issue,
      severityLabel: getSeverityLabel(issue.severity),
      categoryIcon: getCategoryIcon(issue.category)
    })),

    // Recommendations (prioritized)
    recommendations: generateRecommendations(detectedIssues),

    // JARS Compliance (estimated)
    jarsCompliance: estimateJARSCompliance(paperData, statisticalContent, detectedIssues)
  };

  return report;
}

/**
 * Generate prioritized recommendations
 * @param {Array} issues - Detected issues
 * @returns {Array} - Prioritized recommendations
 */
function generateRecommendations(issues) {
  const recommendations = [];

  // Critical issues first
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    recommendations.push({
      priority: 1,
      title: 'Address Critical Reporting Gaps',
      description: 'The following critical issues should be addressed immediately:',
      items: criticalIssues.map(i => i.recommendation)
    });
  }

  // High severity issues
  const highIssues = issues.filter(i => i.severity === 'high');
  if (highIssues.length > 0) {
    recommendations.push({
      priority: 2,
      title: 'Improve Statistical Reporting',
      description: 'These high-priority issues significantly affect the paper\'s quality:',
      items: highIssues.map(i => i.recommendation)
    });
  }

  // Medium severity issues
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  if (mediumIssues.length > 0) {
    recommendations.push({
      priority: 3,
      title: 'Enhance Methodological Transparency',
      description: 'Consider addressing these moderate concerns:',
      items: mediumIssues.map(i => i.recommendation)
    });
  }

  // Add general best practices if few issues
  if (issues.length < 3) {
    recommendations.push({
      priority: 4,
      title: 'Best Practice Suggestions',
      description: 'Consider these enhancements for even better reporting:',
      items: [
        'Include a pre-registration link if the study was pre-registered',
        'Add a data availability statement',
        'Report exact p-values to three decimal places',
        'Include interpretation guidelines for effect sizes'
      ]
    });
  }

  return recommendations;
}

/**
 * Estimate JARS compliance based on detected content
 * @param {Object} paperData - Paper data
 * @param {Object} stats - Statistical content
 * @param {Array} issues - Detected issues
 * @returns {Object} - JARS compliance estimate
 */
function estimateJARSCompliance(paperData, stats, issues) {
  const compliance = {
    overallScore: 0,
    sections: {},
    summary: ''
  };

  // Method section checks
  const methodChecks = {
    sampleSize: stats.sampleSizes.length > 0,
    effectSizes: stats.effectSizes.length > 0,
    testStatistics: stats.testStatistics.length > 0,
    pValues: stats.pValues.length > 0,
    confidenceIntervals: stats.confidenceIntervals.length > 0,
    powerAnalysis: !issues.some(i => i.id === 'no_power_analysis'),
    assumptionChecks: !issues.some(i => i.id === 'no_assumption_checks')
  };

  // Results section checks
  const resultsChecks = {
    effectSizesReported: stats.effectSizes.length > 0,
    cisReported: stats.confidenceIntervals.length > 0,
    exactPValues: stats.pValues.some(p => /p\s*=/.test(p)),
    testStatisticsReported: stats.testStatistics.length > 0
  };

  // Calculate scores
  const methodScore = Object.values(methodChecks).filter(Boolean).length / Object.keys(methodChecks).length * 100;
  const resultsScore = Object.values(resultsChecks).filter(Boolean).length / Object.keys(resultsChecks).length * 100;

  compliance.sections = {
    method: {
      score: Math.round(methodScore),
      checks: methodChecks
    },
    results: {
      score: Math.round(resultsScore),
      checks: resultsChecks
    }
  };

  compliance.overallScore = Math.round((methodScore + resultsScore) / 2);

  // Generate summary
  if (compliance.overallScore >= 80) {
    compliance.summary = 'Good JARS compliance. The paper includes most required statistical reporting elements.';
  } else if (compliance.overallScore >= 60) {
    compliance.summary = 'Moderate JARS compliance. Some required elements are missing.';
  } else if (compliance.overallScore >= 40) {
    compliance.summary = 'Low JARS compliance. Several required statistical elements are missing.';
  } else {
    compliance.summary = 'Poor JARS compliance. Many required statistical reporting elements are absent.';
  }

  return compliance;
}

/**
 * Generate report as downloadable text
 * @param {Object} report - Generated report
 * @returns {string} - Formatted text report
 */
export function generateTextReport(report) {
  const lines = [];

  lines.push('═'.repeat(70));
  lines.push('STATISTICAL REPRODUCIBILITY REPORT');
  lines.push('Generated by StickForStats Paper Parser');
  lines.push('═'.repeat(70));
  lines.push('');

  // Metadata
  lines.push('PAPER INFORMATION');
  lines.push('─'.repeat(40));
  lines.push(`Title: ${report.metadata.paperTitle}`);
  lines.push(`Author: ${report.metadata.paperAuthor}`);
  lines.push(`File: ${report.metadata.filename}`);
  lines.push(`Pages: ${report.metadata.pageCount}`);
  lines.push(`Words: ${report.metadata.wordCount.toLocaleString()}`);
  lines.push(`Report Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}`);
  lines.push('');

  // Quality Score
  lines.push('QUALITY ASSESSMENT');
  lines.push('─'.repeat(40));
  lines.push(`Overall Score: ${report.qualitySummary.score}/100 (Grade: ${report.qualitySummary.grade})`);
  lines.push(`Total Issues Found: ${report.qualitySummary.totalIssues}`);
  lines.push(`  - Critical: ${report.qualitySummary.breakdown.critical}`);
  lines.push(`  - High: ${report.qualitySummary.breakdown.high}`);
  lines.push(`  - Medium: ${report.qualitySummary.breakdown.medium}`);
  lines.push(`  - Low: ${report.qualitySummary.breakdown.low}`);
  lines.push(`JARS Compliance: ${report.jarsCompliance.overallScore}%`);
  lines.push('');

  // Statistical Summary
  lines.push('STATISTICAL CONTENT FOUND');
  lines.push('─'.repeat(40));
  lines.push(`P-values: ${report.statisticalSummary.pValuesFound}`);
  lines.push(`Test Statistics: ${report.statisticalSummary.testStatisticsFound}`);
  lines.push(`Effect Sizes: ${report.statisticalSummary.effectSizesFound}`);
  lines.push(`Sample Sizes: ${report.statisticalSummary.sampleSizesFound}`);
  lines.push(`Confidence Intervals: ${report.statisticalSummary.confidenceIntervalsFound}`);
  if (report.statisticalSummary.testsIdentified.length > 0) {
    lines.push(`Tests Identified: ${report.statisticalSummary.testsIdentified.join(', ')}`);
  }
  lines.push('');

  // Detected Issues
  if (report.issues.length > 0) {
    lines.push('DETECTED ISSUES');
    lines.push('─'.repeat(40));
    report.issues.forEach((issue, index) => {
      lines.push(`${index + 1}. [${issue.severityLabel}] ${issue.name}`);
      lines.push(`   ${issue.description}`);
      lines.push(`   Recommendation: ${issue.recommendation}`);
      lines.push('');
    });
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('RECOMMENDATIONS');
    lines.push('─'.repeat(40));
    report.recommendations.forEach(rec => {
      lines.push(`Priority ${rec.priority}: ${rec.title}`);
      lines.push(rec.description);
      rec.items.forEach(item => {
        lines.push(`  • ${item}`);
      });
      lines.push('');
    });
  }

  // Footer
  lines.push('═'.repeat(70));
  lines.push('Report generated by StickForStats (https://stickforstats.com)');
  lines.push('Based on JARS (Journal Article Reporting Standards) guidelines');
  lines.push('═'.repeat(70));

  return lines.join('\n');
}

/**
 * Generate report as JSON for export
 * @param {Object} report - Generated report
 * @returns {string} - JSON string
 */
export function generateJSONReport(report) {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate a summary statement
 * @param {Object} report - Generated report
 * @returns {string} - Summary statement
 */
export function generateSummaryStatement(report) {
  const { qualitySummary, statisticalSummary, issues: _issues } = report;

  const parts = [];

  // Overall assessment
  if (qualitySummary.score >= 80) {
    parts.push(`This paper demonstrates good statistical reporting practices with a quality score of ${qualitySummary.score}/100.`);
  } else if (qualitySummary.score >= 60) {
    parts.push(`This paper has moderate statistical reporting quality (${qualitySummary.score}/100) with room for improvement.`);
  } else {
    parts.push(`This paper has significant statistical reporting gaps (${qualitySummary.score}/100) that should be addressed.`);
  }

  // Key findings
  if (statisticalSummary.effectSizesFound === 0 && statisticalSummary.testStatisticsFound > 0) {
    parts.push('Notably, no effect sizes were reported despite conducting statistical tests.');
  }

  if (qualitySummary.breakdown.critical > 0) {
    parts.push(`${qualitySummary.breakdown.critical} critical issue(s) require immediate attention.`);
  }

  // JARS compliance
  parts.push(`JARS compliance is estimated at ${report.jarsCompliance.overallScore}%.`);

  return parts.join(' ');
}

const reportGenerator = {
  JARS_CHECKLIST,
  generateReport,
  generateTextReport,
  generateJSONReport,
  generateSummaryStatement
};

export default reportGenerator;
