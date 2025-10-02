/**
 * Test Selection Panel Component
 * ===============================
 * Professional statistical test selection and configuration interface
 * 
 * FEATURES:
 * - Intelligent test recommendations with confidence scores
 * - Side-by-side test comparison matrix
 * - Parameter configuration for each test type
 * - Automatic parameter validation
 * - Power and sample size preview
 * - Scientific references and citations
 * - Export test justification report
 * 
 * STATISTICAL TESTS SUPPORTED:
 * Parametric: t-tests, ANOVA, ANCOVA, MANOVA, Linear Regression, Mixed Models
 * Non-Parametric: Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman, Spearman
 * Categorical: Chi-square, Fisher's Exact, McNemar, Cochran Q
 * Time Series: ARIMA, Durbin-Watson, Ljung-Box
 * Specialized: Survival Analysis, Dose-Response, Equivalence Testing
 * 
 * DESIGN PHILOSOPHY:
 * - Show WHY a test is recommended (not just what)
 * - Provide confidence in the recommendation
 * - Allow expert override with warnings
 * - Full parameter transparency
 * - Educational without being condescending
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import './TestSelectionPanel.scss';

// Test categories and their properties
const TestCatalog = {
  // Parametric Tests
  student_t_test: {
    name: "Student's t-test",
    category: 'parametric',
    use_case: 'Compare means of two independent groups',
    assumptions: ['normality', 'homogeneity', 'independence'],
    parameters: {
      alternative: { type: 'select', options: ['two-sided', 'greater', 'less'], default: 'two-sided' },
      confidence_level: { type: 'number', min: 0.8, max: 0.999, default: 0.95 },
      equal_var: { type: 'boolean', default: true }
    },
    sample_size_req: { min: 20, optimal: 30 },
    power_estimate: 0.80,
    reference: 'Student (1908). Biometrika, 6(1), 1-25.'
  },
  
  welch_t_test: {
    name: "Welch's t-test",
    category: 'parametric',
    use_case: 'Compare means with unequal variances',
    assumptions: ['normality', 'independence'],
    parameters: {
      alternative: { type: 'select', options: ['two-sided', 'greater', 'less'], default: 'two-sided' },
      confidence_level: { type: 'number', min: 0.8, max: 0.999, default: 0.95 }
    },
    sample_size_req: { min: 15, optimal: 30 },
    power_estimate: 0.78,
    reference: 'Welch (1947). Biometrika, 34(1/2), 28-35.'
  },
  
  paired_t_test: {
    name: 'Paired t-test',
    category: 'parametric',
    use_case: 'Compare paired/matched samples',
    assumptions: ['normality_differences', 'independence_pairs'],
    parameters: {
      alternative: { type: 'select', options: ['two-sided', 'greater', 'less'], default: 'two-sided' },
      confidence_level: { type: 'number', min: 0.8, max: 0.999, default: 0.95 }
    },
    sample_size_req: { min: 15, optimal: 25 },
    power_estimate: 0.85,
    reference: 'Fisher (1925). Statistical Methods for Research Workers.'
  },
  
  one_way_anova: {
    name: 'One-Way ANOVA',
    category: 'parametric',
    use_case: 'Compare means of 3+ groups',
    assumptions: ['normality', 'homogeneity', 'independence'],
    parameters: {
      post_hoc: { type: 'select', options: ['tukey', 'bonferroni', 'scheffe', 'none'], default: 'tukey' },
      confidence_level: { type: 'number', min: 0.8, max: 0.999, default: 0.95 }
    },
    sample_size_req: { min: 30, optimal: 50 },
    power_estimate: 0.75,
    reference: 'Fisher (1921). Studies in Crop Variation.'
  },
  
  // Non-Parametric Tests
  mann_whitney_u: {
    name: 'Mann-Whitney U Test',
    category: 'nonparametric',
    use_case: 'Compare distributions of two groups',
    assumptions: ['independence', 'ordinal_scale'],
    parameters: {
      alternative: { type: 'select', options: ['two-sided', 'greater', 'less'], default: 'two-sided' },
      continuity_correction: { type: 'boolean', default: true },
      method: { type: 'select', options: ['auto', 'exact', 'asymptotic'], default: 'auto' }
    },
    sample_size_req: { min: 10, optimal: 20 },
    power_estimate: 0.75,
    reference: 'Mann & Whitney (1947). Annals of Mathematical Statistics, 18(1), 50-60.'
  },
  
  wilcoxon_signed_rank: {
    name: 'Wilcoxon Signed-Rank Test',
    category: 'nonparametric',
    use_case: 'Compare paired samples (non-normal)',
    assumptions: ['independence_pairs', 'symmetry'],
    parameters: {
      alternative: { type: 'select', options: ['two-sided', 'greater', 'less'], default: 'two-sided' },
      zero_method: { type: 'select', options: ['pratt', 'wilcox', 'zsplit'], default: 'pratt' },
      continuity_correction: { type: 'boolean', default: true }
    },
    sample_size_req: { min: 10, optimal: 20 },
    power_estimate: 0.72,
    reference: 'Wilcoxon (1945). Biometrics Bulletin, 1(6), 80-83.'
  },
  
  kruskal_wallis: {
    name: 'Kruskal-Wallis Test',
    category: 'nonparametric',
    use_case: 'Compare 3+ groups (non-normal)',
    assumptions: ['independence', 'ordinal_scale'],
    parameters: {
      post_hoc: { type: 'select', options: ['dunn', 'conover', 'nemenyi', 'none'], default: 'dunn' },
      p_adjust: { type: 'select', options: ['bonferroni', 'holm', 'fdr', 'none'], default: 'bonferroni' }
    },
    sample_size_req: { min: 15, optimal: 30 },
    power_estimate: 0.70,
    reference: 'Kruskal & Wallis (1952). JASA, 47(260), 583-621.'
  },
  
  // Categorical Tests
  chi_square: {
    name: 'Chi-Square Test',
    category: 'categorical',
    use_case: 'Test independence of categorical variables',
    assumptions: ['independence', 'expected_freq_5'],
    parameters: {
      yates_correction: { type: 'boolean', default: true },
      lambda_: { type: 'select', options: ['pearson', 'log-likelihood'], default: 'pearson' }
    },
    sample_size_req: { min: 20, optimal: 50 },
    power_estimate: 0.80,
    reference: 'Pearson (1900). Philosophical Magazine, 50(302), 157-175.'
  },
  
  fisher_exact: {
    name: "Fisher's Exact Test",
    category: 'categorical',
    use_case: 'Test independence (small samples)',
    assumptions: ['independence'],
    parameters: {
      alternative: { type: 'select', options: ['two-sided', 'greater', 'less'], default: 'two-sided' }
    },
    sample_size_req: { min: 5, optimal: 20 },
    power_estimate: 0.85,
    reference: 'Fisher (1922). J Royal Statistical Society, 85(1), 87-94.'
  }
};

// Assumption impact matrix
const AssumptionImpact = {
  normality: {
    severe_violation: ['student_t_test', 'one_way_anova', 'paired_t_test'],
    moderate_violation: ['welch_t_test'],
    robust_to: ['mann_whitney_u', 'wilcoxon_signed_rank', 'kruskal_wallis']
  },
  homogeneity: {
    severe_violation: ['student_t_test', 'one_way_anova'],
    moderate_violation: [],
    robust_to: ['welch_t_test', 'mann_whitney_u', 'kruskal_wallis']
  },
  independence: {
    severe_violation: ['all'], // All tests require independence
    moderate_violation: [],
    robust_to: []
  }
};

const TestSelectionPanel = ({
  recommendations,
  assumptionChecks,
  dataCharacteristics,
  onRunTest,
  viewMode = 'guided'
}) => {
  // Local state
  const [selectedTest, setSelectedTest] = useState(recommendations?.primary?.testName || null);
  const [testParameters, setTestParameters] = useState({});
  const [showComparison, setShowComparison] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [overrideWarnings, setOverrideWarnings] = useState(false);
  
  // Calculate test scores based on assumptions
  const testScores = useMemo(() => {
    if (!assumptionChecks) return {};
    
    const scores = {};
    Object.entries(TestCatalog).forEach(([testKey, test]) => {
      let score = 100;
      let violations = [];
      
      // Check each assumption
      test.assumptions.forEach(assumption => {
        const check = assumptionChecks[assumption.split('_')[0]]; // Get base assumption
        if (check && !check.passed) {
          const impact = AssumptionImpact[assumption.split('_')[0]];
          if (impact) {
            if (impact.severe_violation.includes(testKey)) {
              score -= 40;
              violations.push({ assumption, severity: 'severe' });
            } else if (impact.moderate_violation.includes(testKey)) {
              score -= 20;
              violations.push({ assumption, severity: 'moderate' });
            }
          }
        }
      });
      
      // Adjust for sample size
      const sampleSize = dataCharacteristics?.sampleSize || 0;
      if (sampleSize < test.sample_size_req.min) {
        score -= 30;
        violations.push({ type: 'sample_size', severity: 'severe' });
      } else if (sampleSize < test.sample_size_req.optimal) {
        score -= 10;
        violations.push({ type: 'sample_size', severity: 'moderate' });
      }
      
      scores[testKey] = {
        score: Math.max(0, score),
        violations,
        power: test.power_estimate * (score / 100)
      };
    });
    
    return scores;
  }, [assumptionChecks, dataCharacteristics]);
  
  // Get sorted test recommendations
  const sortedTests = useMemo(() => {
    return Object.entries(testScores)
      .sort((a, b) => b[1].score - a[1].score)
      .map(([key, scoreData]) => ({
        key,
        ...TestCatalog[key],
        ...scoreData
      }));
  }, [testScores]);
  
  // Handle test selection
  const handleTestSelect = useCallback((testKey) => {
    setSelectedTest(testKey);
    
    // Initialize parameters with defaults
    const test = TestCatalog[testKey];
    const defaultParams = {};
    Object.entries(test.parameters).forEach(([paramKey, paramConfig]) => {
      defaultParams[paramKey] = paramConfig.default;
    });
    setTestParameters(defaultParams);
  }, []);
  
  // Handle parameter change
  const handleParameterChange = useCallback((paramKey, value) => {
    setTestParameters(prev => ({
      ...prev,
      [paramKey]: value
    }));
  }, []);
  
  // Execute selected test
  const executeTest = useCallback(() => {
    if (!selectedTest) return;
    
    const testConfig = {
      test: selectedTest,
      parameters: testParameters,
      overrideWarnings,
      metadata: {
        confidence: testScores[selectedTest]?.score || 0,
        violations: testScores[selectedTest]?.violations || [],
        timestamp: new Date().toISOString()
      }
    };
    
    onRunTest(selectedTest, dataCharacteristics, testConfig);
  }, [selectedTest, testParameters, overrideWarnings, testScores, dataCharacteristics, onRunTest]);
  
  // Generate comparison matrix
  const generateComparisonMatrix = useCallback(() => {
    const topTests = sortedTests.slice(0, 5);
    const criteria = [
      'Confidence Score',
      'Power Estimate',
      'Sample Size',
      'Assumptions Met',
      'Complexity'
    ];
    
    return { tests: topTests, criteria };
  }, [sortedTests]);
  
  const comparisonMatrix = useMemo(() => generateComparisonMatrix(), [generateComparisonMatrix]);
  
  return (
    <div className="test-selection-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="header-content">
          <h2>Statistical Test Selection</h2>
          <div className="confidence-filter">
            <label>Min Confidence:</label>
            <input 
              type="range"
              min="0"
              max="100"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="confidence-slider"
            />
            <span className="confidence-value">{confidenceThreshold}%</span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`view-toggle ${showComparison ? 'active' : ''}`}
            onClick={() => setShowComparison(!showComparison)}
          >
            ⊞ Compare Tests
          </button>
          <button 
            className={`view-toggle ${showReferences ? 'active' : ''}`}
            onClick={() => setShowReferences(!showReferences)}
          >
            📚 References
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="panel-content">
        {/* Left: Test List */}
        <div className="test-list-container">
          <div className="list-header">
            <h3>Available Tests</h3>
            <span className="test-count">{sortedTests.length} tests</span>
          </div>
          
          <div className="test-list">
            {sortedTests.filter(test => test.score >= confidenceThreshold).map((test) => {
              const isSelected = selectedTest === test.key;
              const isPrimary = test.key === recommendations?.primary?.testName;
              
              return (
                <div 
                  key={test.key}
                  className={`test-item ${isSelected ? 'selected' : ''} ${
                    isPrimary ? 'primary' : ''
                  } confidence-${
                    test.score >= 80 ? 'high' : test.score >= 50 ? 'medium' : 'low'
                  }`}
                  onClick={() => handleTestSelect(test.key)}
                >
                  <div className="test-header">
                    <div className="test-name">
                      {isPrimary && <span className="primary-badge">★</span>}
                      {test.name}
                    </div>
                    <div className="test-score">
                      <div className="score-bar">
                        <div 
                          className="score-fill"
                          style={{ width: `${test.score}%` }}
                        />
                      </div>
                      <span className="score-value">{test.score}%</span>
                    </div>
                  </div>
                  
                  <div className="test-info">
                    <span className="test-category">{test.category}</span>
                    <span className="test-power">Power: {(test.power * 100).toFixed(0)}%</span>
                  </div>
                  
                  <div className="test-use-case">
                    {test.use_case}
                  </div>
                  
                  {test.violations.length > 0 && (
                    <div className="test-warnings">
                      {test.violations.map((v, i) => (
                        <span key={i} className={`warning-badge ${v.severity}`}>
                          {v.assumption || v.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Center: Test Configuration */}
        {selectedTest && (
          <div className="test-configuration">
            <div className="config-header">
              <h3>{TestCatalog[selectedTest].name}</h3>
              <div className="test-badges">
                <span className="category-badge">
                  {TestCatalog[selectedTest].category}
                </span>
                <span className="power-badge">
                  Power: {(testScores[selectedTest]?.power * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            {/* Test Description */}
            <div className="test-description">
              <h4>Use Case</h4>
              <p>{TestCatalog[selectedTest].use_case}</p>
              
              <h4>Assumptions</h4>
              <ul className="assumptions-list">
                {TestCatalog[selectedTest].assumptions.map(assumption => {
                  const check = assumptionChecks[assumption.split('_')[0]];
                  const passed = check?.passed ?? null;
                  
                  return (
                    <li key={assumption} className={passed === false ? 'violated' : ''}>
                      <span className="assumption-status">
                        {passed === true ? '✓' : passed === false ? '✗' : '○'}
                      </span>
                      {assumption.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {passed === false && (
                        <span className="violation-note">
                          (p = {check.pValue?.toFixed(4) || 'N/A'})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              
              <h4>Sample Size Requirements</h4>
              <div className="sample-size-info">
                <div className="size-requirement">
                  <span className="size-label">Minimum:</span>
                  <span className={`size-value ${
                    dataCharacteristics?.sampleSize >= TestCatalog[selectedTest].sample_size_req.min ? 
                    'met' : 'not-met'
                  }`}>
                    {TestCatalog[selectedTest].sample_size_req.min}
                    {dataCharacteristics?.sampleSize && (
                      <span className="current-size">
                        (Current: {dataCharacteristics.sampleSize})
                      </span>
                    )}
                  </span>
                </div>
                <div className="size-requirement">
                  <span className="size-label">Optimal:</span>
                  <span className={`size-value ${
                    dataCharacteristics?.sampleSize >= TestCatalog[selectedTest].sample_size_req.optimal ? 
                    'met' : 'not-met'
                  }`}>
                    {TestCatalog[selectedTest].sample_size_req.optimal}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Parameter Configuration */}
            <div className="parameter-configuration">
              <h4>Test Parameters</h4>
              {Object.entries(TestCatalog[selectedTest].parameters).map(([paramKey, paramConfig]) => (
                <div key={paramKey} className="parameter-item">
                  <label className="parameter-label">
                    {paramKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                  </label>
                  
                  {paramConfig.type === 'select' && (
                    <select 
                      value={testParameters[paramKey] || paramConfig.default}
                      onChange={(e) => handleParameterChange(paramKey, e.target.value)}
                      className="parameter-select"
                    >
                      {paramConfig.options.map(option => (
                        <option key={option} value={option}>
                          {option.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {paramConfig.type === 'number' && (
                    <input 
                      type="number"
                      min={paramConfig.min}
                      max={paramConfig.max}
                      step={0.01}
                      value={testParameters[paramKey] || paramConfig.default}
                      onChange={(e) => handleParameterChange(paramKey, Number(e.target.value))}
                      className="parameter-input"
                    />
                  )}
                  
                  {paramConfig.type === 'boolean' && (
                    <label className="parameter-checkbox">
                      <input 
                        type="checkbox"
                        checked={testParameters[paramKey] ?? paramConfig.default}
                        onChange={(e) => handleParameterChange(paramKey, e.target.checked)}
                      />
                      <span>Enable</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
            
            {/* Warnings and Override */}
            {testScores[selectedTest]?.violations.length > 0 && (
              <div className="warnings-section">
                <h4>⚠ Warnings</h4>
                <div className="warning-list">
                  {testScores[selectedTest].violations.map((violation, i) => (
                    <div key={i} className={`warning-item ${violation.severity}`}>
                      <span className="warning-icon">
                        {violation.severity === 'severe' ? '‼' : '⚠'}
                      </span>
                      <span className="warning-text">
                        {violation.assumption ? 
                          `${violation.assumption.replace(/_/g, ' ')} assumption violated` :
                          `Sample size below ${violation.severity === 'severe' ? 'minimum' : 'optimal'} requirement`
                        }
                      </span>
                    </div>
                  ))}
                </div>
                
                <label className="override-checkbox">
                  <input 
                    type="checkbox"
                    checked={overrideWarnings}
                    onChange={(e) => setOverrideWarnings(e.target.checked)}
                  />
                  <span>I understand the risks and want to proceed anyway</span>
                </label>
              </div>
            )}
            
            {/* Reference */}
            <div className="reference-section">
              <h4>Reference</h4>
              <cite>{TestCatalog[selectedTest].reference}</cite>
            </div>
            
            {/* Execute Button */}
            <div className="execute-section">
              <button 
                className="execute-btn"
                onClick={executeTest}
                disabled={
                  testScores[selectedTest]?.violations.some(v => v.severity === 'severe') && 
                  !overrideWarnings
                }
              >
                ▶ Run {TestCatalog[selectedTest].name}
              </button>
              {testScores[selectedTest]?.violations.some(v => v.severity === 'severe') && 
               !overrideWarnings && (
                <span className="execute-hint">
                  Enable override to proceed with violations
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Right: Comparison Matrix (if enabled) */}
        {showComparison && (
          <div className="comparison-matrix">
            <h3>Test Comparison</h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Test</th>
                  {comparisonMatrix.criteria.map(criterion => (
                    <th key={criterion}>{criterion}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonMatrix.tests.map(test => (
                  <tr key={test.key} className={selectedTest === test.key ? 'selected' : ''}>
                    <td className="test-name-cell">
                      {test.name}
                    </td>
                    <td className="score-cell">
                      <div className="mini-bar">
                        <div className="mini-fill" style={{ width: `${test.score}%` }} />
                        <span>{test.score}%</span>
                      </div>
                    </td>
                    <td className="power-cell">
                      {(test.power * 100).toFixed(0)}%
                    </td>
                    <td className="sample-cell">
                      {dataCharacteristics?.sampleSize >= test.sample_size_req.optimal ? '✓✓' :
                       dataCharacteristics?.sampleSize >= test.sample_size_req.min ? '✓' : '✗'}
                    </td>
                    <td className="assumptions-cell">
                      {test.violations.length === 0 ? '✓ All' :
                       `${test.assumptions.length - test.violations.length}/${test.assumptions.length}`}
                    </td>
                    <td className="complexity-cell">
                      {test.category === 'parametric' ? 'Low' :
                       test.category === 'nonparametric' ? 'Medium' : 'High'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="panel-status-bar">
        <div className="status-item">
          <span className="status-label">Selected:</span>
          <span className="status-value">
            {selectedTest ? TestCatalog[selectedTest].name : 'None'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Confidence:</span>
          <span className={`status-value ${
            selectedTest && testScores[selectedTest]?.score >= 80 ? 'high' :
            selectedTest && testScores[selectedTest]?.score >= 50 ? 'medium' : 'low'
          }`}>
            {selectedTest ? `${testScores[selectedTest]?.score}%` : '—'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Category:</span>
          <span className="status-value">
            {selectedTest ? TestCatalog[selectedTest].category : '—'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Power:</span>
          <span className="status-value">
            {selectedTest ? `${(testScores[selectedTest]?.power * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TestSelectionPanel;