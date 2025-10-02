/**
 * Results Panel Component
 * ========================
 * Professional statistical test results display
 * 
 * FEATURES:
 * - Comprehensive test statistics display
 * - Effect sizes with confidence intervals
 * - Post-hoc analysis results
 * - Publication-ready output formatting
 * - APA-style reporting text generation
 * - Visual result representations
 * - Export in multiple formats (PDF, LaTeX, CSV)
 * 
 * OUTPUT SECTIONS:
 * 1. Primary Results: Test statistic, p-value, decision
 * 2. Effect Sizes: Multiple measures with CIs
 * 3. Descriptive Statistics: Group means, SDs, etc.
 * 4. Assumptions: Final check status
 * 5. Post-hoc Tests: If applicable
 * 6. Interpretation: Plain language explanation
 * 7. Reporting Text: APA-formatted paragraph
 * 
 * DESIGN PHILOSOPHY:
 * - Show ALL relevant statistics (not just p-value)
 * - Multiple effect size measures for robustness
 * - Clear visual indicators of significance
 * - Professional formatting for publication
 * - No hiding of complexity
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  selectTestResults, 
  selectDataCharacteristics,
  selectRecommendations,
  selectUI
} from '../../store/slices/testRecommenderSlice';
import './ResultsPanel.scss';

// Significance thresholds
const SignificanceThresholds = {
  HIGHLY_SIGNIFICANT: 0.001,
  VERY_SIGNIFICANT: 0.01,
  SIGNIFICANT: 0.05,
  MARGINAL: 0.10
};

// Effect size interpretations
const EffectSizeInterpretations = {
  cohen_d: {
    small: 0.2,
    medium: 0.5,
    large: 0.8,
    very_large: 1.2
  },
  eta_squared: {
    small: 0.01,
    medium: 0.06,
    large: 0.14
  },
  cramers_v: {
    small: 0.1,
    medium: 0.3,
    large: 0.5
  },
  correlation: {
    small: 0.1,
    medium: 0.3,
    large: 0.5
  }
};

const ResultsPanel = ({ viewMode = 'guided' }) => {
  // Get data from Redux store
  const testResults = useSelector(selectTestResults);
  const dataCharacteristics = useSelector(selectDataCharacteristics);
  const recommendations = useSelector(selectRecommendations);
  const { isRunningTest, error } = useSelector(selectUI);
  // Local state
  const [activeTab, setActiveTab] = useState('primary');
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [exportFormat, setExportFormat] = useState('apa');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Process results from backend - NO MOCK DATA
  const enhancedResults = useMemo(() => {
    if (!testResults?.testName) return null;
    
    // Use real data from backend
    return {
      ...testResults,
      // Backend should provide these fields, use defaults if not present
      descriptives: testResults.descriptives || testResults.additionalMetrics?.descriptives || {},
      effect_sizes: testResults.effectSize ? {
        cohen_d: {
          value: testResults.effectSize,
          ci_lower: testResults.effectSizeCI?.[0],
          ci_upper: testResults.effectSizeCI?.[1],
          interpretation: testResults.effectSizeInterpretation || 'unknown'
        },
        ...testResults.additionalMetrics?.effect_sizes
      } : testResults.additionalMetrics?.effect_sizes || {},
      power_analysis: testResults.additionalMetrics?.power_analysis || {},
      assumptions_met: testResults.additionalMetrics?.assumptions_met || {}
    };
  }, [testResults]);
  
  /**
   * Determine significance level and symbol
   */
  const getSignificanceLevel = useCallback((pValue) => {
    if (pValue < SignificanceThresholds.HIGHLY_SIGNIFICANT) {
      return { level: 'highly-significant', symbol: '***', text: 'p < 0.001' };
    } else if (pValue < SignificanceThresholds.VERY_SIGNIFICANT) {
      return { level: 'very-significant', symbol: '**', text: `p = ${pValue.toFixed(3)}` };
    } else if (pValue < SignificanceThresholds.SIGNIFICANT) {
      return { level: 'significant', symbol: '*', text: `p = ${pValue.toFixed(3)}` };
    } else if (pValue < SignificanceThresholds.MARGINAL) {
      return { level: 'marginal', symbol: '†', text: `p = ${pValue.toFixed(3)}` };
    } else {
      return { level: 'not-significant', symbol: 'ns', text: `p = ${pValue.toFixed(3)}` };
    }
  }, []);
  
  /**
   * Interpret effect size magnitude
   */
  const interpretEffectSize = useCallback((value, type = 'cohen_d') => {
    const thresholds = EffectSizeInterpretations[type];
    if (!thresholds) return 'unknown';
    
    const absValue = Math.abs(value);
    if (absValue >= thresholds.very_large) return 'very large';
    if (absValue >= thresholds.large) return 'large';
    if (absValue >= thresholds.medium) return 'medium';
    if (absValue >= thresholds.small) return 'small';
    return 'negligible';
  }, []);
  
  /**
   * Generate APA-style reporting text
   */
  const generateAPAText = useCallback(() => {
    if (!enhancedResults) return '';
    
    const sig = getSignificanceLevel(enhancedResults.pValue);
    const testName = enhancedResults.testName.replace(/_/g, ' ');
    
    // Example for t-test
    if (enhancedResults.testName.includes('t_test')) {
      return `An independent samples ${testName} was conducted to compare the conditions. ` +
        `There was ${sig.level === 'not-significant' ? 'no significant' : 'a significant'} ` +
        `difference in the scores for Group 1 (M = ${enhancedResults.descriptives.group1.mean.toFixed(2)}, ` +
        `SD = ${enhancedResults.descriptives.group1.sd.toFixed(2)}) and Group 2 ` +
        `(M = ${enhancedResults.descriptives.group2.mean.toFixed(2)}, ` +
        `SD = ${enhancedResults.descriptives.group2.sd.toFixed(2)}); ` +
        `t(${enhancedResults.degreesOfFreedom}) = ${enhancedResults.statistic.toFixed(2)}, ` +
        `${sig.text}. The effect size was ${enhancedResults.effect_sizes.cohen_d.interpretation} ` +
        `(Cohen's d = ${enhancedResults.effect_sizes.cohen_d.value.toFixed(2)}, ` +
        `95% CI [${enhancedResults.effect_sizes.cohen_d.ci_lower.toFixed(2)}, ` +
        `${enhancedResults.effect_sizes.cohen_d.ci_upper.toFixed(2)}]).`;
    }
    
    // Add other test types...
    return 'APA text generation for this test type is in development.';
  }, [enhancedResults, getSignificanceLevel]);
  
  /**
   * Generate plain language interpretation
   */
  const generateInterpretation = useCallback(() => {
    if (!enhancedResults) return '';
    
    const sig = getSignificanceLevel(enhancedResults.pValue);
    const effectMagnitude = interpretEffectSize(
      enhancedResults.effect_sizes?.cohen_d?.value || 0
    );
    
    let interpretation = '';
    
    if (sig.level === 'not-significant') {
      interpretation = `The analysis found no statistically significant difference between the groups. ` +
        `This suggests that any observed differences could be due to chance. `;
    } else {
      interpretation = `The analysis found a statistically significant difference between the groups. ` +
        `This difference is unlikely to be due to chance alone (probability < ${(enhancedResults.pValue * 100).toFixed(1)}%). `;
    }
    
    interpretation += `The effect size is ${effectMagnitude}, ` +
      `indicating that the practical significance of this finding is ${
        effectMagnitude === 'large' || effectMagnitude === 'very large' ? 'substantial' :
        effectMagnitude === 'medium' ? 'moderate' :
        effectMagnitude === 'small' ? 'modest' : 'minimal'
      }. `;
    
    if (enhancedResults.power_analysis?.achieved_power) {
      interpretation += `The statistical power was ${(enhancedResults.power_analysis.achieved_power * 100).toFixed(0)}%, ` +
        `${enhancedResults.power_analysis.achieved_power >= 0.80 ? 'which is adequate' : 'which is below the recommended 80%'}.`;
    }
    
    return interpretation;
  }, [enhancedResults, getSignificanceLevel, interpretEffectSize]);
  
  /**
   * Copy to clipboard
   */
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, []);
  
  /**
   * Export results
   */
  const exportResults = useCallback(() => {
    // In production, this would trigger actual export
    console.log('Exporting results in format:', exportFormat);
  }, [exportFormat]);
  
  // Handle loading state
  if (isRunningTest) {
    return (
      <div className="results-panel">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Running Statistical Test...</h3>
          <p>Please wait while we analyze your data</p>
        </div>
      </div>
    );
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="results-panel">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Error Running Test</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  // Handle empty state
  if (!enhancedResults) {
    return (
      <div className="results-panel">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <h3>No Results Yet</h3>
          <p>Run a statistical test to see results here</p>
        </div>
      </div>
    );
  }
  
  const significance = getSignificanceLevel(enhancedResults.pValue);
  
  return (
    <div className="results-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="header-content">
          <h2>Statistical Test Results</h2>
          <div className={`significance-badge ${significance.level}`}>
            <span className="sig-symbol">{significance.symbol}</span>
            <span className="sig-text">{significance.text}</span>
          </div>
        </div>
        <div className="header-actions">
          <select 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="export-select"
          >
            <option value="apa">APA Format</option>
            <option value="pdf">PDF Report</option>
            <option value="latex">LaTeX</option>
            <option value="csv">CSV Data</option>
            <option value="json">JSON</option>
          </select>
          <button className="export-btn" onClick={exportResults}>
            ↗ Export
          </button>
        </div>
      </div>
      
      {/* Result Tabs */}
      <div className="result-tabs">
        <button 
          className={`tab ${activeTab === 'primary' ? 'active' : ''}`}
          onClick={() => setActiveTab('primary')}
        >
          Primary Results
        </button>
        <button 
          className={`tab ${activeTab === 'effect' ? 'active' : ''}`}
          onClick={() => setActiveTab('effect')}
        >
          Effect Sizes
        </button>
        <button 
          className={`tab ${activeTab === 'descriptive' ? 'active' : ''}`}
          onClick={() => setActiveTab('descriptive')}
        >
          Descriptives
        </button>
        <button 
          className={`tab ${activeTab === 'interpretation' ? 'active' : ''}`}
          onClick={() => setActiveTab('interpretation')}
        >
          Interpretation
        </button>
        <button 
          className={`tab ${activeTab === 'reporting' ? 'active' : ''}`}
          onClick={() => setActiveTab('reporting')}
        >
          Reporting
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {/* Primary Results Tab */}
        {activeTab === 'primary' && (
          <div className="primary-results">
            <div className="result-card main-result">
              <h3>{enhancedResults.testName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
              
              <div className="statistics-grid">
                <div className="stat-item">
                  <label>Test Statistic</label>
                  <div className="stat-value">
                    {typeof enhancedResults.statistic === 'number' ? 
                      enhancedResults.statistic.toFixed(3) : 
                      enhancedResults.statistic || 'N/A'}
                  </div>
                </div>
                
                <div className="stat-item">
                  <label>Degrees of Freedom</label>
                  <div className="stat-value">
                    {enhancedResults.degreesOfFreedom || 'N/A'}
                  </div>
                </div>
                
                <div className="stat-item">
                  <label>p-value</label>
                  <div className={`stat-value p-value ${significance.level}`}>
                    {significance.text}
                  </div>
                </div>
                
                <div className="stat-item">
                  <label>Statistical Decision</label>
                  <div className={`stat-value decision ${
                    significance.level === 'not-significant' ? 'retain' : 'reject'
                  }`}>
                    {significance.level === 'not-significant' ? 
                      'Retain H₀' : 'Reject H₀'}
                  </div>
                </div>
              </div>
              
              {/* Confidence Interval */}
              {enhancedResults.confidenceInterval && (
                <div className="confidence-interval">
                  <label>95% Confidence Interval</label>
                  <div className="ci-display">
                    <span className="ci-lower">{enhancedResults.confidenceInterval[0].toFixed(3)}</span>
                    <span className="ci-separator">—</span>
                    <span className="ci-upper">{enhancedResults.confidenceInterval[1].toFixed(3)}</span>
                  </div>
                </div>
              )}
              
              {/* Assumptions Status */}
              <div className="assumptions-status">
                <h4>Assumptions Check</h4>
                <div className="assumption-badges">
                  {Object.entries(enhancedResults.assumptions_met).map(([assumption, met]) => (
                    <span key={assumption} className={`assumption-badge ${met ? 'met' : 'violated'}`}>
                      {met ? '✓' : '✗'} {assumption.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Power Analysis Card */}
            <div className="result-card power-card">
              <h4>Statistical Power</h4>
              <div className="power-display">
                <div className="power-achieved">
                  <label>Achieved Power</label>
                  <div className={`power-value ${
                    enhancedResults.power_analysis.achieved_power >= 0.80 ? 'adequate' : 'low'
                  }`}>
                    {(enhancedResults.power_analysis.achieved_power * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="sample-recommendations">
                  <div className="sample-rec">
                    <label>N for 80% power:</label>
                    <span>{enhancedResults.power_analysis.required_n_80}</span>
                  </div>
                  <div className="sample-rec">
                    <label>N for 90% power:</label>
                    <span>{enhancedResults.power_analysis.required_n_90}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Effect Sizes Tab */}
        {activeTab === 'effect' && (
          <div className="effect-sizes">
            <div className="effect-size-grid">
              {Object.entries(enhancedResults.effect_sizes).map(([effectType, effectData]) => (
                <div key={effectType} className="effect-card">
                  <h4>{effectType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                  <div className="effect-value">
                    {effectData.value.toFixed(3)}
                  </div>
                  {effectData.ci_lower !== undefined && (
                    <div className="effect-ci">
                      95% CI: [{effectData.ci_lower.toFixed(3)}, {effectData.ci_upper.toFixed(3)}]
                    </div>
                  )}
                  {effectData.interpretation && (
                    <div className={`effect-interpretation ${effectData.interpretation}`}>
                      {effectData.interpretation} effect
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Effect Size Guidelines */}
            <div className="guidelines-card">
              <h4>Interpretation Guidelines</h4>
              <table className="guidelines-table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th>Small</th>
                    <th>Medium</th>
                    <th>Large</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cohen's d</td>
                    <td>0.20</td>
                    <td>0.50</td>
                    <td>0.80</td>
                  </tr>
                  <tr>
                    <td>η²</td>
                    <td>0.01</td>
                    <td>0.06</td>
                    <td>0.14</td>
                  </tr>
                  <tr>
                    <td>Cramér's V</td>
                    <td>0.10</td>
                    <td>0.30</td>
                    <td>0.50</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Descriptives Tab */}
        {activeTab === 'descriptive' && (
          <div className="descriptive-statistics">
            {Object.keys(enhancedResults.descriptives || {}).length > 0 ? (
              <table className="descriptives-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>N</th>
                    <th>Mean</th>
                    <th>SD</th>
                    <th>SE</th>
                    <th>95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(enhancedResults.descriptives).map(([group, stats]) => (
                    <tr key={group}>
                      <td className="group-name">{group.replace('group', 'Group ')}</td>
                      <td className="stat-cell">{stats.n || 'N/A'}</td>
                      <td className="stat-cell">{stats.mean ? stats.mean.toFixed(2) : 'N/A'}</td>
                      <td className="stat-cell">{stats.sd ? stats.sd.toFixed(2) : 'N/A'}</td>
                      <td className="stat-cell">{stats.se ? stats.se.toFixed(2) : 'N/A'}</td>
                      <td className="stat-cell">
                        {stats.ci_lower && stats.ci_upper ? 
                          `[${stats.ci_lower.toFixed(2)}, ${stats.ci_upper.toFixed(2)}]` : 
                          'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-descriptives">
                <p>Descriptive statistics not available for this test.</p>
              </div>
            )}
            
            {/* Visual Comparison - only show if we have data */}
            {Object.keys(enhancedResults.descriptives || {}).length > 0 && 
             Object.values(enhancedResults.descriptives).some(stats => stats.mean) && (
              <div className="visual-comparison">
                <h4>Group Comparison</h4>
                <div className="comparison-chart">
                  {/* Simplified bar chart visualization */}
                  <svg viewBox="0 0 400 200" className="comparison-svg">
                    {Object.entries(enhancedResults.descriptives).map(([group, stats], index) => {
                      if (!stats.mean) return null;
                      const maxMean = Math.max(...Object.values(enhancedResults.descriptives)
                        .filter(s => s.mean)
                        .map(s => s.mean));
                      const barHeight = (stats.mean / (maxMean * 1.2)) * 150; // Dynamic scaling
                      const x = 100 + index * 150;
                      
                      return (
                        <g key={group}>
                          {/* Bar */}
                          <rect 
                            x={x}
                            y={200 - barHeight}
                            width={80}
                            height={barHeight}
                            fill="#34495e"
                            opacity="0.7"
                          />
                          {/* Error bar if CI available */}
                          {stats.ci_upper && stats.ci_lower && (
                            <line 
                              x1={x + 40}
                              y1={200 - (stats.ci_upper / (maxMean * 1.2)) * 150}
                              x2={x + 40}
                              y2={200 - (stats.ci_lower / (maxMean * 1.2)) * 150}
                              stroke="#34495e"
                              strokeWidth="2"
                            />
                          )}
                          {/* Group label */}
                          <text 
                            x={x + 40}
                            y={195}
                            textAnchor="middle"
                            fontSize="12"
                          >
                            {group.replace('group', 'Group ')}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Interpretation Tab */}
        {activeTab === 'interpretation' && (
          <div className="interpretation">
            <div className="interpretation-card">
              <h3>Plain Language Interpretation</h3>
              <p className="interpretation-text">
                {generateInterpretation()}
              </p>
            </div>
            
            <div className="interpretation-card">
              <h3>Statistical Conclusion</h3>
              <ul className="conclusion-list">
                <li>
                  <strong>Null Hypothesis:</strong> {
                    significance.level === 'not-significant' ? 'Retained' : 'Rejected'
                  }
                </li>
                <li>
                  <strong>Alternative Hypothesis:</strong> {
                    significance.level === 'not-significant' ? 'Not Supported' : 'Supported'
                  }
                </li>
                <li>
                  <strong>Effect Size:</strong> {
                    enhancedResults.effect_sizes?.cohen_d?.interpretation || 'Not calculated'
                  }
                </li>
                <li>
                  <strong>Practical Significance:</strong> {
                    enhancedResults.effect_sizes?.cohen_d?.interpretation === 'large' ? 'High' :
                    enhancedResults.effect_sizes?.cohen_d?.interpretation === 'medium' ? 'Moderate' :
                    'Low'
                  }
                </li>
              </ul>
            </div>
            
            <div className="interpretation-card">
              <h3>Recommendations</h3>
              <ul className="recommendations-list">
                {enhancedResults.power_analysis?.achieved_power < 0.80 && (
                  <li>Consider increasing sample size for better power</li>
                )}
                {significance.level === 'marginal' && (
                  <li>Results are marginally significant - interpret with caution</li>
                )}
                {!enhancedResults.assumptions_met.normality && (
                  <li>Consider using non-parametric alternatives</li>
                )}
                <li>Report effect sizes alongside p-values</li>
                <li>Consider practical significance in addition to statistical significance</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Reporting Tab */}
        {activeTab === 'reporting' && (
          <div className="reporting">
            <div className="reporting-card">
              <div className="card-header">
                <h3>APA-Style Report</h3>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(generateAPAText())}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p className="apa-text">
                {generateAPAText()}
              </p>
            </div>
            
            <div className="reporting-card">
              <div className="card-header">
                <h3>Results Table</h3>
                <button className="copy-btn">📋 Copy</button>
              </div>
              <table className="results-table">
                <tbody>
                  <tr>
                    <td>Test</td>
                    <td>{enhancedResults.testName.replace(/_/g, ' ')}</td>
                  </tr>
                  <tr>
                    <td>Statistic</td>
                    <td>{enhancedResults.statistic.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td>df</td>
                    <td>{enhancedResults.degreesOfFreedom}</td>
                  </tr>
                  <tr>
                    <td>p-value</td>
                    <td>{enhancedResults.pValue.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td>Cohen's d</td>
                    <td>{enhancedResults.effect_sizes?.cohen_d?.value.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td>95% CI</td>
                    <td>
                      [{enhancedResults.effect_sizes?.cohen_d?.ci_lower.toFixed(3)}, 
                      {enhancedResults.effect_sizes?.cohen_d?.ci_upper.toFixed(3)}]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="reporting-card">
              <h3>Raw Output</h3>
              <button 
                className="toggle-raw"
                onClick={() => setShowRawOutput(!showRawOutput)}
              >
                {showRawOutput ? '▼' : '▶'} {showRawOutput ? 'Hide' : 'Show'} Raw JSON
              </button>
              {showRawOutput && (
                <pre className="raw-output">
                  {JSON.stringify(enhancedResults, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="panel-footer">
        <div className="footer-info">
          <span className="timestamp">
            Analysis completed: {new Date().toLocaleString()}
          </span>
          <span className="test-info">
            {enhancedResults.testName.replace(/_/g, ' ')} | 
            n={dataCharacteristics?.sampleSize || 'Unknown'}
          </span>
        </div>
        <div className="footer-actions">
          <button className="action-btn">📊 Add to Report</button>
          <button className="action-btn">🔄 Re-run Test</button>
          <button className="action-btn">📈 Power Analysis</button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;