import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './SessionTracker.scss';

const SessionTracker = ({ 
  onTestDetected, 
  onRiskAssessment,
  onPatternWarning,
  className = ''
}) => {
  const dispatch = useDispatch();
  const sessionTests = useSelector(state => state.multiplicity?.sessionTests || []);
  const [viewMode, setViewMode] = useState('timeline'); // timeline, table, risk
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [riskLevel, setRiskLevel] = useState('low');
  const [warnings, setWarnings] = useState([]);
  const [filters, setFilters] = useState({
    testType: 'all',
    significance: 'all',
    timeRange: 'all',
    flagged: false
  });
  const [exportFormat, setExportFormat] = useState('json');
  const timelineRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // P-hacking risk indicators
  const RiskIndicators = {
    test_repetition: {
      label: 'Test Repetition',
      description: 'Same test run multiple times',
      threshold: 3,
      severity: 'medium'
    },
    selective_reporting: {
      label: 'Selective Reporting',
      description: 'Only significant results reported',
      threshold: 0.8, // ratio
      severity: 'high'
    },
    data_peeking: {
      label: 'Data Peeking',
      description: 'Testing after each data point',
      threshold: 5,
      severity: 'high'
    },
    p_value_fishing: {
      label: 'P-value Fishing',
      description: 'Multiple tests without correction',
      threshold: 10,
      severity: 'critical'
    },
    hypothesis_switching: {
      label: 'Hypothesis Switching',
      description: 'Post-hoc hypothesis changes',
      threshold: 2,
      severity: 'medium'
    },
    outlier_removal: {
      label: 'Outlier Removal',
      description: 'Selective data exclusion',
      threshold: 3,
      severity: 'medium'
    },
    multiple_comparisons: {
      label: 'Multiple Comparisons',
      description: 'Many pairwise comparisons',
      threshold: 15,
      severity: 'high'
    },
    optional_stopping: {
      label: 'Optional Stopping',
      description: 'Testing stopped when significant',
      threshold: 0.05,
      severity: 'critical'
    }
  };

  // Pattern detection algorithms
  const detectPatterns = useMemo(() => {
    const patterns = [];
    
    // Test repetition detection
    const testCounts = {};
    sessionTests.forEach(test => {
      const key = `${test.type}-${test.variables.join('-')}`;
      testCounts[key] = (testCounts[key] || 0) + 1;
    });
    
    Object.entries(testCounts).forEach(([key, count]) => {
      if (count >= RiskIndicators.test_repetition.threshold) {
        patterns.push({
          type: 'test_repetition',
          severity: RiskIndicators.test_repetition.severity,
          message: `Test "${key}" run ${count} times`,
          count,
          recommendation: 'Consider using correction for multiple testing'
        });
      }
    });

    // Selective reporting detection
    const significantCount = sessionTests.filter(t => t.pValue < 0.05).length;
    const totalCount = sessionTests.length;
    if (totalCount > 5) {
      const ratio = significantCount / totalCount;
      if (ratio > RiskIndicators.selective_reporting.threshold) {
        patterns.push({
          type: 'selective_reporting',
          severity: RiskIndicators.selective_reporting.severity,
          message: `${Math.round(ratio * 100)}% of tests significant`,
          ratio,
          recommendation: 'Review all tests, not just significant ones'
        });
      }
    }

    // Data peeking detection
    const timeGaps = [];
    for (let i = 1; i < sessionTests.length; i++) {
      const gap = new Date(sessionTests[i].timestamp) - new Date(sessionTests[i-1].timestamp);
      timeGaps.push(gap);
    }
    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    if (avgGap < 60000 && sessionTests.length > RiskIndicators.data_peeking.threshold) {
      patterns.push({
        type: 'data_peeking',
        severity: RiskIndicators.data_peeking.severity,
        message: 'Rapid sequential testing detected',
        avgGap: Math.round(avgGap / 1000),
        recommendation: 'Pre-specify stopping rules'
      });
    }

    // P-value fishing detection
    const uncorrectedTests = sessionTests.filter(t => !t.corrected).length;
    if (uncorrectedTests > RiskIndicators.p_value_fishing.threshold) {
      patterns.push({
        type: 'p_value_fishing',
        severity: RiskIndicators.p_value_fishing.severity,
        message: `${uncorrectedTests} tests without correction`,
        count: uncorrectedTests,
        recommendation: 'Apply multiple testing correction'
      });
    }

    // Multiple comparisons detection
    const comparisonTests = sessionTests.filter(t => 
      t.type.includes('pairwise') || t.type.includes('post-hoc')
    ).length;
    if (comparisonTests > RiskIndicators.multiple_comparisons.threshold) {
      patterns.push({
        type: 'multiple_comparisons',
        severity: RiskIndicators.multiple_comparisons.severity,
        message: `${comparisonTests} pairwise comparisons`,
        count: comparisonTests,
        recommendation: 'Use FWER or FDR control'
      });
    }

    return patterns;
  }, [sessionTests]);

  // Calculate risk level
  useEffect(() => {
    const severityScores = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const totalScore = detectPatterns.reduce((score, pattern) => {
      return score + severityScores[pattern.severity];
    }, 0);

    if (totalScore >= 10) {
      setRiskLevel('critical');
    } else if (totalScore >= 6) {
      setRiskLevel('high');
    } else if (totalScore >= 3) {
      setRiskLevel('medium');
    } else {
      setRiskLevel('low');
    }

    setWarnings(detectPatterns);
    
    if (onRiskAssessment) {
      onRiskAssessment(riskLevel, detectPatterns);
    }
    
    if (detectPatterns.length > 0 && onPatternWarning) {
      onPatternWarning(detectPatterns);
    }
  }, [detectPatterns, onRiskAssessment, onPatternWarning]);

  // Auto-scroll timeline to latest test
  useEffect(() => {
    if (autoScroll && timelineRef.current && sessionTests.length > 0) {
      timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
    }
  }, [sessionTests, autoScroll]);

  // Filter tests
  const filteredTests = useMemo(() => {
    return sessionTests.filter(test => {
      if (filters.testType !== 'all' && test.type !== filters.testType) return false;
      if (filters.significance === 'significant' && test.pValue >= 0.05) return false;
      if (filters.significance === 'not_significant' && test.pValue < 0.05) return false;
      if (filters.flagged && !test.flagged) return false;
      
      if (filters.timeRange !== 'all') {
        const now = new Date();
        const testTime = new Date(test.timestamp);
        const hoursDiff = (now - testTime) / (1000 * 60 * 60);
        
        if (filters.timeRange === 'last_hour' && hoursDiff > 1) return false;
        if (filters.timeRange === 'last_24h' && hoursDiff > 24) return false;
        if (filters.timeRange === 'last_week' && hoursDiff > 168) return false;
      }
      
      return true;
    });
  }, [sessionTests, filters]);

  // Session statistics
  const sessionStats = useMemo(() => {
    const stats = {
      total: sessionTests.length,
      significant: sessionTests.filter(t => t.pValue < 0.05).length,
      corrected: sessionTests.filter(t => t.corrected).length,
      flagged: sessionTests.filter(t => t.flagged).length,
      uniqueTests: new Set(sessionTests.map(t => t.type)).size,
      timeSpan: 0,
      avgPValue: 0,
      falseDiscoveryRate: 0
    };

    if (sessionTests.length > 0) {
      const firstTest = new Date(sessionTests[0].timestamp);
      const lastTest = new Date(sessionTests[sessionTests.length - 1].timestamp);
      stats.timeSpan = (lastTest - firstTest) / (1000 * 60); // minutes
      
      stats.avgPValue = sessionTests.reduce((sum, t) => sum + t.pValue, 0) / sessionTests.length;
      
      // Estimate FDR
      const alpha = 0.05;
      const m = sessionTests.length;
      const significantTests = stats.significant;
      stats.falseDiscoveryRate = Math.min((alpha * m) / Math.max(significantTests, 1), 1);
    }

    return stats;
  }, [sessionTests]);

  // Export session data
  const exportSession = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      session: {
        tests: filteredTests,
        statistics: sessionStats,
        patterns: detectPatterns,
        riskLevel
      },
      metadata: {
        version: '1.0',
        generator: 'StickForStats Session Tracker'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Risk gauge component
  const RiskGauge = () => {
    const riskColors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#b71c1c'
    };

    const riskAngles = {
      low: -45,
      medium: 0,
      high: 45,
      critical: 90
    };

    return (
      <div className="risk-gauge">
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Gauge arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="20"
          />
          
          {/* Risk zones */}
          <path
            d="M 20 100 A 80 80 0 0 1 60 40"
            fill="none"
            stroke="#4caf50"
            strokeWidth="18"
            opacity="0.5"
          />
          <path
            d="M 60 40 A 80 80 0 0 1 140 40"
            fill="none"
            stroke="#ff9800"
            strokeWidth="18"
            opacity="0.5"
          />
          <path
            d="M 140 40 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#f44336"
            strokeWidth="18"
            opacity="0.5"
          />
          
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            stroke={riskColors[riskLevel]}
            strokeWidth="3"
            transform={`rotate(${riskAngles[riskLevel]} 100 100)`}
          />
          <circle cx="100" cy="100" r="8" fill={riskColors[riskLevel]} />
          
          {/* Labels */}
          <text x="30" y="115" fontSize="10" fill="#666">Low</text>
          <text x="85" y="25" fontSize="10" fill="#666">Medium</text>
          <text x="155" y="115" fontSize="10" fill="#666">Critical</text>
        </svg>
        <div className="risk-label">
          <span className={`risk-level ${riskLevel}`}>{riskLevel.toUpperCase()}</span>
          <span className="risk-score">Risk Score</span>
        </div>
      </div>
    );
  };

  // Timeline visualization
  const TimelineView = () => {
    const getTestPosition = (test, index) => {
      const startTime = new Date(sessionTests[0]?.timestamp || new Date());
      const endTime = new Date(sessionTests[sessionTests.length - 1]?.timestamp || new Date());
      const totalDuration = endTime - startTime || 1;
      const testTime = new Date(test.timestamp);
      const position = ((testTime - startTime) / totalDuration) * 100;
      
      return {
        left: `${position}%`,
        top: `${(index % 3) * 35 + 20}px`
      };
    };

    return (
      <div className="timeline-view" ref={timelineRef}>
        <div className="timeline-header">
          <span className="timeline-start">
            {sessionTests[0] && new Date(sessionTests[0].timestamp).toLocaleTimeString()}
          </span>
          <span className="timeline-duration">
            {sessionStats.timeSpan.toFixed(0)} minutes
          </span>
          <span className="timeline-end">
            {sessionTests[sessionTests.length - 1] && 
             new Date(sessionTests[sessionTests.length - 1].timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="timeline-track">
          <div className="timeline-line" />
          
          {filteredTests.map((test, index) => {
            const position = getTestPosition(test, index);
            const isSignificant = test.pValue < 0.05;
            
            return (
              <div
                key={test.id}
                className={`timeline-point ${isSignificant ? 'significant' : ''} ${test.flagged ? 'flagged' : ''}`}
                style={position}
                onClick={() => setSelectedTest(test)}
                title={`${test.type}: p=${test.pValue.toFixed(4)}`}
              >
                <div className="point-marker" />
                <div className="point-label">
                  {test.type.substring(0, 3).toUpperCase()}
                </div>
              </div>
            );
          })}
          
          {/* Pattern warnings on timeline */}
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`timeline-warning severity-${warning.severity}`}
              style={{ left: `${(index + 1) * (100 / (warnings.length + 1))}%` }}
              title={warning.message}
            >
              ⚠
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Table view
  const TableView = () => (
    <div className="table-view">
      <table className="session-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Test Type</th>
            <th>Variables</th>
            <th>p-value</th>
            <th>Corrected</th>
            <th>Effect Size</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTests.map((test, index) => (
            <tr 
              key={test.id}
              className={`${test.pValue < 0.05 ? 'significant' : ''} ${test.flagged ? 'flagged' : ''}`}
              onClick={() => setSelectedTest(test)}
            >
              <td>{index + 1}</td>
              <td>{new Date(test.timestamp).toLocaleTimeString()}</td>
              <td>{test.type}</td>
              <td>{test.variables?.join(' vs ') || '-'}</td>
              <td className={test.pValue < 0.05 ? 'p-significant' : ''}>
                {test.pValue.toFixed(4)}
              </td>
              <td>
                {test.corrected ? (
                  <span className="corrected">✓ {test.correctionMethod}</span>
                ) : (
                  <span className="not-corrected">✗</span>
                )}
              </td>
              <td>{test.effectSize?.toFixed(3) || '-'}</td>
              <td>
                {test.flagged && <span className="flag-badge">⚠ Flagged</span>}
                {test.pValue < 0.05 && <span className="sig-badge">Sig.</span>}
              </td>
              <td>
                <button 
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Flag test for review
                    dispatch({
                      type: 'multiplicity/flagTest',
                      payload: test.id
                    });
                  }}
                >
                  🚩
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Risk view
  const RiskView = () => (
    <div className="risk-view">
      <div className="risk-overview">
        <RiskGauge />
        
        <div className="risk-stats">
          <div className="stat-card">
            <span className="stat-value">{sessionStats.total}</span>
            <span className="stat-label">Total Tests</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{sessionStats.significant}</span>
            <span className="stat-label">Significant</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{sessionStats.corrected}</span>
            <span className="stat-label">Corrected</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{(sessionStats.falseDiscoveryRate * 100).toFixed(1)}%</span>
            <span className="stat-label">Est. FDR</span>
          </div>
        </div>
      </div>

      <div className="risk-warnings">
        <h3>Pattern Detection Warnings</h3>
        {warnings.length === 0 ? (
          <div className="no-warnings">
            ✓ No concerning patterns detected
          </div>
        ) : (
          <div className="warning-list">
            {warnings.map((warning, index) => (
              <div key={index} className={`warning-card severity-${warning.severity}`}>
                <div className="warning-header">
                  <span className="warning-type">
                    {RiskIndicators[warning.type]?.label}
                  </span>
                  <span className={`severity-badge ${warning.severity}`}>
                    {warning.severity.toUpperCase()}
                  </span>
                </div>
                <div className="warning-message">{warning.message}</div>
                <div className="warning-recommendation">
                  💡 {warning.recommendation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="risk-recommendations">
        <h3>Recommendations</h3>
        <ul>
          {riskLevel === 'critical' && (
            <>
              <li>⚠️ Critical risk of false positives detected</li>
              <li>🔴 Stop testing and apply multiple testing corrections</li>
              <li>📊 Review all hypotheses and pre-register remaining tests</li>
            </>
          )}
          {riskLevel === 'high' && (
            <>
              <li>⚠️ High risk of p-hacking behaviors detected</li>
              <li>🟡 Apply FDR or FWER control methods</li>
              <li>📋 Document all tests in hypothesis registry</li>
            </>
          )}
          {riskLevel === 'medium' && (
            <>
              <li>ℹ️ Moderate testing activity detected</li>
              <li>🟢 Consider correction for multiple comparisons</li>
              <li>📝 Keep tracking all statistical tests</li>
            </>
          )}
          {riskLevel === 'low' && (
            <>
              <li>✅ Testing patterns appear appropriate</li>
              <li>👍 Continue with current approach</li>
              <li>📊 Maintain transparency in reporting</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );

  // Test details modal
  const TestDetailsModal = () => {
    if (!selectedTest) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedTest(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Test Details</h3>
            <button className="btn-close" onClick={() => setSelectedTest(null)}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="detail-grid">
              <div className="detail-item">
                <label>Test ID:</label>
                <span>{selectedTest.id}</span>
              </div>
              <div className="detail-item">
                <label>Timestamp:</label>
                <span>{new Date(selectedTest.timestamp).toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <label>Test Type:</label>
                <span>{selectedTest.type}</span>
              </div>
              <div className="detail-item">
                <label>Variables:</label>
                <span>{selectedTest.variables?.join(' vs ') || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>p-value:</label>
                <span className={selectedTest.pValue < 0.05 ? 'significant' : ''}>
                  {selectedTest.pValue.toFixed(6)}
                </span>
              </div>
              <div className="detail-item">
                <label>Effect Size:</label>
                <span>{selectedTest.effectSize?.toFixed(3) || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Sample Size:</label>
                <span>{selectedTest.sampleSize || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <label>Correction:</label>
                <span>
                  {selectedTest.corrected 
                    ? `${selectedTest.correctionMethod} (adj. p = ${selectedTest.adjustedPValue?.toFixed(4)})`
                    : 'None'
                  }
                </span>
              </div>
            </div>

            {selectedTest.assumptions && (
              <div className="assumptions-section">
                <h4>Assumptions Checked</h4>
                <ul>
                  {Object.entries(selectedTest.assumptions).map(([key, value]) => (
                    <li key={key}>
                      {key}: {value ? '✓ Passed' : '✗ Failed'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedTest.notes && (
              <div className="notes-section">
                <h4>Notes</h4>
                <p>{selectedTest.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`session-tracker ${className}`}>
      <div className="tracker-header">
        <h2>Session Tracker</h2>
        <div className="header-controls">
          <div className="view-switcher">
            <button 
              className={viewMode === 'timeline' ? 'active' : ''}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
            <button 
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button 
              className={viewMode === 'risk' ? 'active' : ''}
              onClick={() => setViewMode('risk')}
            >
              Risk Analysis
            </button>
          </div>
          
          <button className="btn-export" onClick={exportSession}>
            Export Session
          </button>
        </div>
      </div>

      <div className="tracker-filters">
        <select 
          value={filters.testType}
          onChange={(e) => setFilters({...filters, testType: e.target.value})}
        >
          <option value="all">All Tests</option>
          <option value="t-test">T-Tests</option>
          <option value="anova">ANOVA</option>
          <option value="correlation">Correlation</option>
          <option value="regression">Regression</option>
          <option value="chi-square">Chi-Square</option>
        </select>

        <select 
          value={filters.significance}
          onChange={(e) => setFilters({...filters, significance: e.target.value})}
        >
          <option value="all">All Results</option>
          <option value="significant">Significant Only</option>
          <option value="not_significant">Non-Significant</option>
        </select>

        <select 
          value={filters.timeRange}
          onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
        >
          <option value="all">All Time</option>
          <option value="last_hour">Last Hour</option>
          <option value="last_24h">Last 24 Hours</option>
          <option value="last_week">Last Week</option>
        </select>

        <label className="checkbox-label">
          <input 
            type="checkbox"
            checked={filters.flagged}
            onChange={(e) => setFilters({...filters, flagged: e.target.checked})}
          />
          Flagged Only
        </label>

        {viewMode === 'timeline' && (
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        )}
      </div>

      <div className="tracker-body">
        {viewMode === 'timeline' && <TimelineView />}
        {viewMode === 'table' && <TableView />}
        {viewMode === 'risk' && <RiskView />}
      </div>

      <div className="tracker-footer">
        <div className="session-summary">
          <span className="summary-item">
            <strong>{sessionStats.total}</strong> tests
          </span>
          <span className="summary-item">
            <strong>{sessionStats.significant}</strong> significant
          </span>
          <span className="summary-item">
            <strong>{sessionStats.uniqueTests}</strong> unique tests
          </span>
          <span className="summary-item">
            <strong>{Math.round(sessionStats.timeSpan)}</strong> minutes
          </span>
          <span className={`risk-indicator ${riskLevel}`}>
            Risk: {riskLevel.toUpperCase()}
          </span>
        </div>
      </div>

      {selectedTest && <TestDetailsModal />}
    </div>
  );
};

export default SessionTracker;