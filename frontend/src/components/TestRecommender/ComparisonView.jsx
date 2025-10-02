// ComparisonView.jsx
// Enterprise-grade side-by-side statistical test comparison
// Allows comparison of 2-4 tests simultaneously with synchronized views

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectComparisonTests,
  selectComparisonData,
  selectSyncScroll,
  addTestToComparison,
  removeTestFromComparison,
  setSyncScroll,
  exportComparison
} from '../../store/slices/testRecommenderSlice';
import './ComparisonView.scss';

// Available statistical tests for comparison
const AvailableTests = {
  parametric: {
    label: 'Parametric Tests',
    tests: {
      student_t: "Student's t-test",
      welch_t: "Welch's t-test",
      paired_t: 'Paired t-test',
      one_way_anova: 'One-way ANOVA',
      two_way_anova: 'Two-way ANOVA',
      repeated_anova: 'Repeated measures ANOVA',
      pearson: 'Pearson correlation',
      linear_regression: 'Linear regression'
    }
  },
  nonparametric: {
    label: 'Non-parametric Tests',
    tests: {
      mann_whitney: 'Mann-Whitney U',
      wilcoxon_signed: 'Wilcoxon signed-rank',
      wilcoxon_rank: 'Wilcoxon rank-sum',
      kruskal_wallis: 'Kruskal-Wallis',
      friedman: 'Friedman test',
      spearman: 'Spearman correlation',
      kendall: "Kendall's tau"
    }
  },
  categorical: {
    label: 'Categorical Tests',
    tests: {
      chi_square: 'Chi-square test',
      fisher_exact: "Fisher's exact test",
      mcnemar: "McNemar's test",
      cochran_q: "Cochran's Q test"
    }
  }
};

// Test comparison criteria
const ComparisonCriteria = {
  assumptions: {
    label: 'Assumptions',
    subcriteria: ['Normality', 'Homoscedasticity', 'Independence', 'Sample Size']
  },
  power: {
    label: 'Statistical Power',
    subcriteria: ['Small Effects', 'Medium Effects', 'Large Effects', 'Robustness']
  },
  interpretation: {
    label: 'Interpretation',
    subcriteria: ['Ease of Understanding', 'Clinical Relevance', 'Effect Size', 'Confidence Intervals']
  },
  applicability: {
    label: 'Applicability',
    subcriteria: ['Missing Data', 'Outliers', 'Multiple Groups', 'Repeated Measures']
  }
};

// Scoring system for comparison
const ScoringLevels = {
  excellent: { value: 5, color: '#2e7d32', label: 'Excellent' },
  good: { value: 4, color: '#388e3c', label: 'Good' },
  moderate: { value: 3, color: '#f57c00', label: 'Moderate' },
  poor: { value: 2, color: '#d32f2f', label: 'Poor' },
  na: { value: 0, color: '#9e9e9e', label: 'N/A' }
};

const ComparisonView = () => {
  const dispatch = useDispatch();
  const comparisonTests = useSelector(selectComparisonTests);
  const comparisonData = useSelector(selectComparisonData);
  const syncScroll = useSelector(selectSyncScroll);
  
  // Local state
  const [selectedTests, setSelectedTests] = useState([]);
  const [activeView, setActiveView] = useState('side-by-side'); // 'side-by-side', 'matrix', 'report'
  const [highlightDifferences, setHighlightDifferences] = useState(true);
  const [comparisonLayout, setComparisonLayout] = useState(2); // 2, 3, or 4 panels
  const [expandedSections, setExpandedSections] = useState({});
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Refs for synchronized scrolling
  const panelRefs = useRef([]);
  const isScrolling = useRef(false);
  
  // Maximum tests for comparison
  const MAX_COMPARISON_TESTS = 4;
  
  // Add test to comparison
  const handleAddTest = useCallback((testId) => {
    if (selectedTests.length < MAX_COMPARISON_TESTS) {
      setSelectedTests([...selectedTests, testId]);
      dispatch(addTestToComparison(testId));
    }
  }, [dispatch, selectedTests]);
  
  // Remove test from comparison
  const handleRemoveTest = useCallback((testId) => {
    setSelectedTests(selectedTests.filter(id => id !== testId));
    dispatch(removeTestFromComparison(testId));
  }, [dispatch, selectedTests]);
  
  // Handle synchronized scrolling
  const handleScroll = useCallback((sourceIndex, event) => {
    if (!syncScroll || isScrolling.current) return;
    
    isScrolling.current = true;
    const sourceScrollTop = event.target.scrollTop;
    const sourceScrollLeft = event.target.scrollLeft;
    
    panelRefs.current.forEach((ref, index) => {
      if (index !== sourceIndex && ref) {
        ref.scrollTop = sourceScrollTop;
        ref.scrollLeft = sourceScrollLeft;
      }
    });
    
    setTimeout(() => {
      isScrolling.current = false;
    }, 10);
  }, [syncScroll]);
  
  // Toggle section expansion
  const toggleSection = (testId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${testId}-${section}`]: !prev[`${testId}-${section}`]
    }));
  };
  
  // Calculate comparison scores
  const calculateComparisonScores = useCallback(() => {
    const scores = {};
    
    selectedTests.forEach(testId => {
      scores[testId] = {};
      
      Object.entries(ComparisonCriteria).forEach(([criterion, details]) => {
        scores[testId][criterion] = {};
        
        details.subcriteria.forEach(subcriterion => {
          // Calculate score based on test characteristics
          scores[testId][criterion][subcriterion] = calculateScore(testId, criterion, subcriterion);
        });
      });
    });
    
    return scores;
  }, [selectedTests]);
  
  // Calculate individual score (simplified logic)
  const calculateScore = (testId, criterion, subcriterion) => {
    // This would be replaced with actual scoring logic based on test characteristics
    const scoreMap = {
      'student_t': {
        'assumptions': { 'Normality': 'poor', 'Homoscedasticity': 'poor', 'Independence': 'excellent', 'Sample Size': 'good' },
        'power': { 'Small Effects': 'moderate', 'Medium Effects': 'good', 'Large Effects': 'excellent', 'Robustness': 'poor' }
      },
      'mann_whitney': {
        'assumptions': { 'Normality': 'excellent', 'Homoscedasticity': 'excellent', 'Independence': 'excellent', 'Sample Size': 'good' },
        'power': { 'Small Effects': 'poor', 'Medium Effects': 'moderate', 'Large Effects': 'good', 'Robustness': 'excellent' }
      }
      // Add more test mappings
    };
    
    return ScoringLevels[scoreMap[testId]?.[criterion]?.[subcriterion] || 'moderate'];
  };
  
  // Generate comparison matrix data
  const generateMatrixData = () => {
    const scores = calculateComparisonScores();
    const matrix = [];
    
    Object.entries(ComparisonCriteria).forEach(([criterion, details]) => {
      details.subcriteria.forEach(subcriterion => {
        const row = {
          criterion,
          subcriterion,
          scores: {}
        };
        
        selectedTests.forEach(testId => {
          row.scores[testId] = scores[testId]?.[criterion]?.[subcriterion] || ScoringLevels.na;
        });
        
        matrix.push(row);
      });
    });
    
    return matrix;
  };
  
  // Export comparison
  const handleExport = useCallback(() => {
    const exportData = {
      tests: selectedTests,
      scores: calculateComparisonScores(),
      matrix: generateMatrixData(),
      timestamp: new Date().toISOString()
    };
    
    dispatch(exportComparison({ data: exportData, format: exportFormat }));
  }, [dispatch, selectedTests, exportFormat]);
  
  // Render test panel content
  const renderTestPanel = (testId, index) => {
    const testData = comparisonData[testId] || {};
    const testInfo = getTestInfo(testId);
    
    return (
      <div 
        key={testId}
        className="comparison-panel"
        ref={el => panelRefs.current[index] = el}
        onScroll={(e) => handleScroll(index, e)}
        style={{ width: `${100 / comparisonLayout}%` }}
      >
        <div className="panel-header">
          <h4>{testInfo.name}</h4>
          <button 
            className="remove-btn"
            onClick={() => handleRemoveTest(testId)}
            title="Remove from comparison"
          >
            ×
          </button>
        </div>
        
        <div className="panel-content">
          {/* Test Overview */}
          <div className={`section ${expandedSections[`${testId}-overview`] ? 'expanded' : ''}`}>
            <div 
              className="section-header"
              onClick={() => toggleSection(testId, 'overview')}
            >
              <span className="section-title">Overview</span>
              <span className="toggle-icon">{expandedSections[`${testId}-overview`] ? '−' : '+'}</span>
            </div>
            {expandedSections[`${testId}-overview`] !== false && (
              <div className="section-content">
                <div className="info-row">
                  <label>Type:</label>
                  <span>{testInfo.type}</span>
                </div>
                <div className="info-row">
                  <label>Use Case:</label>
                  <span>{testInfo.useCase}</span>
                </div>
                <div className="info-row">
                  <label>Data Requirements:</label>
                  <span>{testInfo.dataRequirements}</span>
                </div>
                <div className="info-row">
                  <label>Reference:</label>
                  <cite>{testInfo.reference}</cite>
                </div>
              </div>
            )}
          </div>
          
          {/* Assumptions */}
          <div className={`section ${expandedSections[`${testId}-assumptions`] ? 'expanded' : ''}`}>
            <div 
              className="section-header"
              onClick={() => toggleSection(testId, 'assumptions')}
            >
              <span className="section-title">Assumptions</span>
              <span className="toggle-icon">{expandedSections[`${testId}-assumptions`] ? '−' : '+'}</span>
            </div>
            {expandedSections[`${testId}-assumptions`] !== false && (
              <div className="section-content">
                {testInfo.assumptions.map((assumption, idx) => (
                  <div key={idx} className={`assumption-item ${highlightDifferences ? 'highlight' : ''}`}>
                    <span className="assumption-status">
                      {testData.assumptionsMet?.[assumption] ? '✓' : '✗'}
                    </span>
                    <span className="assumption-name">{assumption}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Statistical Power */}
          <div className={`section ${expandedSections[`${testId}-power`] ? 'expanded' : ''}`}>
            <div 
              className="section-header"
              onClick={() => toggleSection(testId, 'power')}
            >
              <span className="section-title">Statistical Power</span>
              <span className="toggle-icon">{expandedSections[`${testId}-power`] ? '−' : '+'}</span>
            </div>
            {expandedSections[`${testId}-power`] !== false && (
              <div className="section-content">
                <div className="power-display">
                  <div className="power-metric">
                    <label>Estimated Power:</label>
                    <span className="power-value">{testData.power || '0.80'}</span>
                  </div>
                  <div className="power-metric">
                    <label>Sample Size Required:</label>
                    <span className="sample-size">{testData.requiredN || 'N/A'}</span>
                  </div>
                  <div className="power-metric">
                    <label>Detectable Effect:</label>
                    <span className="effect-size">{testData.detectableEffect || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Advantages & Limitations */}
          <div className={`section ${expandedSections[`${testId}-pros-cons`] ? 'expanded' : ''}`}>
            <div 
              className="section-header"
              onClick={() => toggleSection(testId, 'pros-cons')}
            >
              <span className="section-title">Advantages & Limitations</span>
              <span className="toggle-icon">{expandedSections[`${testId}-pros-cons`] ? '−' : '+'}</span>
            </div>
            {expandedSections[`${testId}-pros-cons`] !== false && (
              <div className="section-content">
                <div className="pros-cons-grid">
                  <div className="pros">
                    <h5>Advantages</h5>
                    <ul>
                      {testInfo.advantages.map((adv, idx) => (
                        <li key={idx}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="cons">
                    <h5>Limitations</h5>
                    <ul>
                      {testInfo.limitations.map((lim, idx) => (
                        <li key={idx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Results Preview */}
          <div className={`section ${expandedSections[`${testId}-results`] ? 'expanded' : ''}`}>
            <div 
              className="section-header"
              onClick={() => toggleSection(testId, 'results')}
            >
              <span className="section-title">Results Preview</span>
              <span className="toggle-icon">{expandedSections[`${testId}-results`] ? '−' : '+'}</span>
            </div>
            {expandedSections[`${testId}-results`] !== false && (
              <div className="section-content">
                <div className="results-preview">
                  <div className="result-item">
                    <label>Test Statistic:</label>
                    <span className="mono">{testData.statistic || 'Not calculated'}</span>
                  </div>
                  <div className="result-item">
                    <label>p-value:</label>
                    <span className="mono">{testData.pValue || 'Not calculated'}</span>
                  </div>
                  <div className="result-item">
                    <label>Effect Size:</label>
                    <span className="mono">{testData.effectSize || 'Not calculated'}</span>
                  </div>
                  <div className="result-item">
                    <label>95% CI:</label>
                    <span className="mono">{testData.ci || 'Not calculated'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Get test information
  const getTestInfo = (testId) => {
    // This would be replaced with actual test metadata
    const testDatabase = {
      student_t: {
        name: "Student's t-test",
        type: 'Parametric',
        useCase: 'Compare means of two independent groups',
        dataRequirements: 'Continuous data, normal distribution',
        reference: 'Student (1908). Biometrika, 6(1), 1-25.',
        assumptions: ['Normality', 'Equal variances', 'Independence', 'Random sampling'],
        advantages: [
          'Well-understood and widely accepted',
          'Exact test under normality',
          'Efficient for normal data',
          'Clear interpretation'
        ],
        limitations: [
          'Sensitive to outliers',
          'Requires normality assumption',
          'Assumes equal variances',
          'Not robust to violations'
        ]
      },
      mann_whitney: {
        name: 'Mann-Whitney U Test',
        type: 'Non-parametric',
        useCase: 'Compare distributions of two independent groups',
        dataRequirements: 'Ordinal or continuous data',
        reference: 'Mann & Whitney (1947). Annals of Mathematical Statistics.',
        assumptions: ['Independence', 'Random sampling', 'Ordinal scale'],
        advantages: [
          'No normality assumption',
          'Robust to outliers',
          'Works with ordinal data',
          'Distribution-free'
        ],
        limitations: [
          'Less power than t-test for normal data',
          'Tests stochastic dominance, not means',
          'Interpretation can be complex',
          'Requires larger sample sizes'
        ]
      }
      // Add more test information
    };
    
    return testDatabase[testId] || {
      name: 'Unknown Test',
      type: 'Unknown',
      useCase: 'Not specified',
      dataRequirements: 'Not specified',
      reference: 'Not available',
      assumptions: [],
      advantages: [],
      limitations: []
    };
  };
  
  return (
    <div className="comparison-view">
      {/* Header Controls */}
      <div className="comparison-header">
        <div className="header-left">
          <h3>Statistical Test Comparison</h3>
          <span className="comparison-count">
            {selectedTests.length} of {MAX_COMPARISON_TESTS} tests selected
          </span>
        </div>
        <div className="header-controls">
          <div className="view-selector">
            <button 
              className={`view-btn ${activeView === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setActiveView('side-by-side')}
            >
              Side by Side
            </button>
            <button 
              className={`view-btn ${activeView === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveView('matrix')}
            >
              Comparison Matrix
            </button>
            <button 
              className={`view-btn ${activeView === 'report' ? 'active' : ''}`}
              onClick={() => setActiveView('report')}
            >
              Report View
            </button>
          </div>
          <div className="comparison-options">
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => dispatch(setSyncScroll(e.target.checked))}
              />
              <span>Sync Scroll</span>
            </label>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={highlightDifferences}
                onChange={(e) => setHighlightDifferences(e.target.checked)}
              />
              <span>Highlight Differences</span>
            </label>
          </div>
          <div className="layout-selector">
            <label>Panels:</label>
            <select 
              value={comparisonLayout}
              onChange={(e) => setComparisonLayout(parseInt(e.target.value))}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Test Selection Bar */}
      <div className="test-selection-bar">
        <div className="available-tests">
          {Object.entries(AvailableTests).map(([category, data]) => (
            <div key={category} className="test-category">
              <span className="category-label">{data.label}:</span>
              <div className="test-buttons">
                {Object.entries(data.tests).map(([testId, testName]) => (
                  <button
                    key={testId}
                    className={`test-btn ${selectedTests.includes(testId) ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedTests.includes(testId)) {
                        handleRemoveTest(testId);
                      } else {
                        handleAddTest(testId);
                      }
                    }}
                    disabled={!selectedTests.includes(testId) && selectedTests.length >= MAX_COMPARISON_TESTS}
                  >
                    {testName}
                    {selectedTests.includes(testId) && <span className="selected-indicator">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Comparison Content */}
      <div className="comparison-content">
        {selectedTests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h4>No Tests Selected</h4>
            <p>Select up to {MAX_COMPARISON_TESTS} statistical tests from above to compare their characteristics, assumptions, and applicability.</p>
          </div>
        ) : (
          <>
            {/* Side-by-Side View */}
            {activeView === 'side-by-side' && (
              <div className="side-by-side-view">
                <div className="panels-container">
                  {selectedTests.slice(0, comparisonLayout).map((testId, index) => 
                    renderTestPanel(testId, index)
                  )}
                </div>
              </div>
            )}
            
            {/* Matrix View */}
            {activeView === 'matrix' && (
              <div className="matrix-view">
                <table className="comparison-matrix">
                  <thead>
                    <tr>
                      <th className="criterion-header">Criterion</th>
                      <th className="subcriterion-header">Aspect</th>
                      {selectedTests.map(testId => (
                        <th key={testId} className="test-header">
                          {getTestInfo(testId).name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {generateMatrixData().map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'even' : 'odd'}>
                        {idx === 0 || generateMatrixData()[idx - 1].criterion !== row.criterion ? (
                          <td className="criterion-cell" rowSpan={
                            generateMatrixData().filter(r => r.criterion === row.criterion).length
                          }>
                            {ComparisonCriteria[row.criterion].label}
                          </td>
                        ) : null}
                        <td className="subcriterion-cell">{row.subcriterion}</td>
                        {selectedTests.map(testId => (
                          <td key={testId} className="score-cell">
                            <div 
                              className="score-indicator"
                              style={{ backgroundColor: row.scores[testId].color }}
                              title={row.scores[testId].label}
                            >
                              {row.scores[testId].value}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="matrix-legend">
                  <span className="legend-title">Score Legend:</span>
                  {Object.entries(ScoringLevels).map(([key, level]) => (
                    <span key={key} className="legend-item">
                      <span 
                        className="legend-color"
                        style={{ backgroundColor: level.color }}
                      />
                      {level.label} ({level.value})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Report View */}
            {activeView === 'report' && (
              <div className="report-view">
                <div className="report-header">
                  <h4>Comparative Analysis Report</h4>
                  <p className="report-date">Generated: {new Date().toLocaleString()}</p>
                </div>
                
                <div className="report-section">
                  <h5>Executive Summary</h5>
                  <p>
                    This report compares {selectedTests.length} statistical tests: {
                      selectedTests.map(id => getTestInfo(id).name).join(', ')
                    }. The analysis evaluates each test across multiple criteria including assumptions, 
                    statistical power, interpretability, and applicability.
                  </p>
                </div>
                
                <div className="report-section">
                  <h5>Recommendation</h5>
                  <div className="recommendation-box">
                    <p>
                      Based on the comparison, <strong>{getTestInfo(selectedTests[0]).name}</strong> is 
                      recommended for normal data with equal variances, while 
                      <strong> {getTestInfo(selectedTests[1] || selectedTests[0]).name}</strong> provides 
                      a robust alternative when assumptions are violated.
                    </p>
                  </div>
                </div>
                
                <div className="report-section">
                  <h5>Detailed Comparison</h5>
                  {selectedTests.map(testId => {
                    const testInfo = getTestInfo(testId);
                    return (
                      <div key={testId} className="test-report-section">
                        <h6>{testInfo.name}</h6>
                        <div className="test-details">
                          <p><strong>Type:</strong> {testInfo.type}</p>
                          <p><strong>Use Case:</strong> {testInfo.useCase}</p>
                          <p><strong>Key Advantages:</strong></p>
                          <ul>
                            {testInfo.advantages.slice(0, 3).map((adv, idx) => (
                              <li key={idx}>{adv}</li>
                            ))}
                          </ul>
                          <p><strong>Key Limitations:</strong></p>
                          <ul>
                            {testInfo.limitations.slice(0, 3).map((lim, idx) => (
                              <li key={idx}>{lim}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="report-section">
                  <h5>References</h5>
                  <ol className="references-list">
                    {selectedTests.map(testId => {
                      const testInfo = getTestInfo(testId);
                      return (
                        <li key={testId}>
                          <cite>{testInfo.reference}</cite>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Export Controls */}
      {selectedTests.length > 0 && (
        <div className="export-controls">
          <div className="export-options">
            <label>Export Format:</label>
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="pdf">PDF Report</option>
              <option value="excel">Excel Comparison</option>
              <option value="latex">LaTeX Table</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
          <button className="export-btn primary" onClick={handleExport}>
            Export Comparison
          </button>
        </div>
      )}
    </div>
  );
};

export default ComparisonView;