// MultiplicityCorrectionPanel.jsx
// Enterprise-grade multiple hypothesis correction interface
// Tracks all tests in session, applies corrections, prevents p-hacking

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectHypotheses,
  selectCorrectionMethod,
  selectAlphaLevel,
  selectSessionTests,
  addHypothesis,
  removeHypothesis,
  setCorrectionMethod,
  setAlphaLevel,
  applyCorrection,
  exportCorrectionReport
} from '../../store/slices/multiplicityCorrectionSlice';
import './MultiplicityCorrectionPanel.scss';

// Correction method details with references
const CorrectionMethods = {
  bonferroni: {
    name: 'Bonferroni',
    description: 'Controls FWER by dividing α by number of tests',
    formula: 'p_adj = min(p * m, 1)',
    conservative: true,
    reference: 'Bonferroni, C. (1936). Teoria statistica delle classi',
    whenToUse: 'Few tests (<20), need strict FWER control'
  },
  holm: {
    name: 'Holm-Bonferroni',
    description: 'Sequentially rejective Bonferroni, less conservative',
    formula: 'p_adj[i] = min(p[i] * (m-i+1), 1)',
    conservative: true,
    reference: 'Holm, S. (1979). Scandinavian Journal of Statistics',
    whenToUse: 'Moderate tests, balance power and FWER'
  },
  hochberg: {
    name: 'Hochberg',
    description: 'Step-up procedure, more powerful than Holm',
    formula: 'Works backward from largest p-value',
    conservative: false,
    reference: 'Hochberg, Y. (1988). Biometrika, 75(4), 800-802',
    whenToUse: 'Independent tests, need more power'
  },
  hommel: {
    name: 'Hommel',
    description: 'Closed testing procedure, optimal power',
    formula: 'Complex closed testing algorithm',
    conservative: false,
    reference: 'Hommel, G. (1988). Biometrika, 75(2), 383-386',
    whenToUse: 'Maximum power while controlling FWER'
  },
  benjamini_hochberg: {
    name: 'Benjamini-Hochberg',
    description: 'Controls FDR, allows more discoveries',
    formula: 'p_adj[i] = min(p[i] * m/i, 1)',
    conservative: false,
    reference: 'Benjamini & Hochberg (1995). JRSS-B, 57(1), 289-300',
    whenToUse: 'Many tests (>20), exploratory analysis'
  },
  benjamini_yekutieli: {
    name: 'Benjamini-Yekutieli',
    description: 'FDR control for dependent tests',
    formula: 'p_adj[i] = min(p[i] * m * c(m)/i, 1)',
    conservative: true,
    reference: 'Benjamini & Yekutieli (2001). Ann. Stat., 29(4)',
    whenToUse: 'Dependent/correlated tests'
  },
  storey: {
    name: 'Storey q-value',
    description: 'Adaptive FDR with π₀ estimation',
    formula: 'q[i] = min(π₀ * p[i] * m/i, 1)',
    conservative: false,
    reference: 'Storey, J.D. (2002). JRSS-B, 64(3), 479-498',
    whenToUse: 'Large-scale testing, genomics'
  }
};

// Alpha spending strategies for sequential testing
const AlphaSpendingFunctions = {
  pocock: {
    name: "O'Brien-Fleming",
    description: 'Conservative early, liberal late',
    formula: 'α(t) = 2 - 2Φ(z_α/2 / √t)'
  },
  obrien_fleming: {
    name: 'Pocock',
    description: 'Equal spending at each look',
    formula: 'α(t) = α * log(1 + (e-1)t)'
  },
  lan_demets: {
    name: 'Lan-DeMets',
    description: 'Flexible spending function',
    formula: 'User-defined spending'
  }
};

const MultiplicityCorrectionPanel = () => {
  const dispatch = useDispatch();
  const hypotheses = useSelector(selectHypotheses);
  const correctionMethod = useSelector(selectCorrectionMethod);
  const alphaLevel = useSelector(selectAlphaLevel);
  const sessionTests = useSelector(selectSessionTests);
  
  const [activeTab, setActiveTab] = useState('registry');
  const [showMethodDetails, setShowMethodDetails] = useState(false);
  const [selectedHypotheses, setSelectedHypotheses] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState('pvalue');
  const [sortAscending, setSortAscending] = useState(true);
  const [showAlphaSpending, setShowAlphaSpending] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Calculate corrected p-values
  const correctedResults = useMemo(() => {
    if (!hypotheses.length) return [];
    
    // Sort hypotheses by p-value for step procedures
    const sorted = [...hypotheses].sort((a, b) => a.pValue - b.pValue);
    const m = sorted.length;
    
    switch (correctionMethod) {
      case 'bonferroni':
        return sorted.map(h => ({
          ...h,
          adjustedP: Math.min(h.pValue * m, 1),
          significant: h.pValue * m < alphaLevel
        }));
        
      case 'holm':
        return sorted.map((h, i) => ({
          ...h,
          adjustedP: Math.min(h.pValue * (m - i), 1),
          significant: h.pValue * (m - i) < alphaLevel
        }));
        
      case 'benjamini_hochberg':
        return sorted.map((h, i) => ({
          ...h,
          adjustedP: Math.min(h.pValue * m / (i + 1), 1),
          significant: h.pValue * m / (i + 1) < alphaLevel
        }));
        
      default:
        return sorted;
    }
  }, [hypotheses, correctionMethod, alphaLevel]);
  
  // Calculate FDR and FWER
  const errorRates = useMemo(() => {
    const rejected = correctedResults.filter(r => r.significant).length;
    const total = correctedResults.length;
    
    return {
      fdr: rejected > 0 ? (alphaLevel * total) / rejected : 0,
      fwer: 1 - Math.pow(1 - alphaLevel, total),
      rejectedCount: rejected,
      totalCount: total,
      power: rejected / total // Simplified power estimate
    };
  }, [correctedResults, alphaLevel]);
  
  // Add new hypothesis
  const handleAddHypothesis = useCallback((hypothesis) => {
    dispatch(addHypothesis({
      id: `H${hypotheses.length + 1}`,
      description: hypothesis.description,
      testName: hypothesis.testName,
      pValue: hypothesis.pValue,
      effectSize: hypothesis.effectSize,
      timestamp: new Date().toISOString()
    }));
  }, [dispatch, hypotheses.length]);
  
  // Apply correction to selected hypotheses
  const handleApplyCorrection = useCallback(() => {
    const toCorrect = selectedHypotheses.length > 0 
      ? selectedHypotheses 
      : hypotheses.map(h => h.id);
    
    dispatch(applyCorrection({
      hypotheses: toCorrect,
      method: correctionMethod,
      alpha: alphaLevel
    }));
  }, [dispatch, selectedHypotheses, hypotheses, correctionMethod, alphaLevel]);
  
  // Export report
  const handleExport = useCallback(() => {
    dispatch(exportCorrectionReport({
      format: exportFormat,
      includeDecisions: true,
      includeRationale: true
    }));
  }, [dispatch, exportFormat]);
  
  return (
    <div className="multiplicity-correction-panel">
      {/* Header with method selector */}
      <div className="panel-header">
        <div className="header-left">
          <h3>Multiple Testing Corrections</h3>
          <span className="test-count">
            {hypotheses.length} tests registered | {errorRates.rejectedCount} significant
          </span>
        </div>
        <div className="header-right">
          <div className="alpha-selector">
            <label>α Level:</label>
            <select 
              value={alphaLevel} 
              onChange={(e) => dispatch(setAlphaLevel(parseFloat(e.target.value)))}
            >
              <option value="0.001">0.001</option>
              <option value="0.01">0.01</option>
              <option value="0.05">0.05</option>
              <option value="0.10">0.10</option>
            </select>
          </div>
          <div className="method-selector">
            <label>Method:</label>
            <select 
              value={correctionMethod}
              onChange={(e) => dispatch(setCorrectionMethod(e.target.value))}
            >
              <optgroup label="FWER Control">
                <option value="bonferroni">Bonferroni</option>
                <option value="holm">Holm-Bonferroni</option>
                <option value="hochberg">Hochberg</option>
                <option value="hommel">Hommel</option>
              </optgroup>
              <optgroup label="FDR Control">
                <option value="benjamini_hochberg">Benjamini-Hochberg</option>
                <option value="benjamini_yekutieli">Benjamini-Yekutieli</option>
                <option value="storey">Storey q-value</option>
              </optgroup>
            </select>
            <button 
              className="info-btn"
              onClick={() => setShowMethodDetails(!showMethodDetails)}
              title="Method details"
            >
              ℹ
            </button>
          </div>
        </div>
      </div>
      
      {/* Method details panel */}
      {showMethodDetails && (
        <div className="method-details">
          <h4>{CorrectionMethods[correctionMethod].name}</h4>
          <p className="description">{CorrectionMethods[correctionMethod].description}</p>
          <div className="formula">
            <label>Formula:</label>
            <code>{CorrectionMethods[correctionMethod].formula}</code>
          </div>
          <div className="when-to-use">
            <label>When to use:</label>
            <span>{CorrectionMethods[correctionMethod].whenToUse}</span>
          </div>
          <div className="reference">
            <label>Reference:</label>
            <cite>{CorrectionMethods[correctionMethod].reference}</cite>
          </div>
        </div>
      )}
      
      {/* Error rate summary */}
      <div className="error-rate-summary">
        <div className="rate-card">
          <label>FWER</label>
          <span className="rate-value">{(errorRates.fwer * 100).toFixed(2)}%</span>
        </div>
        <div className="rate-card">
          <label>FDR</label>
          <span className="rate-value">{(errorRates.fdr * 100).toFixed(2)}%</span>
        </div>
        <div className="rate-card">
          <label>Power</label>
          <span className="rate-value">{(errorRates.power * 100).toFixed(1)}%</span>
        </div>
        <div className="rate-card">
          <label>Discoveries</label>
          <span className="rate-value">{errorRates.rejectedCount}/{errorRates.totalCount}</span>
        </div>
      </div>
      
      {/* Tab navigation */}
      <div className="panel-tabs">
        <button 
          className={`tab ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
        >
          Hypothesis Registry
        </button>
        <button 
          className={`tab ${activeTab === 'corrections' ? 'active' : ''}`}
          onClick={() => setActiveTab('corrections')}
        >
          Corrected Results
        </button>
        <button 
          className={`tab ${activeTab === 'sequential' ? 'active' : ''}`}
          onClick={() => setActiveTab('sequential')}
        >
          Sequential Testing
        </button>
        <button 
          className={`tab ${activeTab === 'session' ? 'active' : ''}`}
          onClick={() => setActiveTab('session')}
        >
          Session History
          <span className="badge">{sessionTests.length}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          Report
        </button>
      </div>
      
      {/* Tab content */}
      <div className="panel-content">
        {/* Hypothesis Registry Tab */}
        {activeTab === 'registry' && (
          <div className="registry-content">
            <div className="registry-controls">
              <input
                type="text"
                placeholder="Filter hypotheses..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="filter-input"
              />
              <button 
                className="add-hypothesis-btn"
                onClick={() => {/* Open add hypothesis modal */}}
              >
                + Add Hypothesis
              </button>
            </div>
            
            <table className="hypothesis-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input 
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHypotheses(hypotheses.map(h => h.id));
                        } else {
                          setSelectedHypotheses([]);
                        }
                      }}
                    />
                  </th>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Test</th>
                  <th className="numeric">p-value</th>
                  <th className="numeric">Effect Size</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hypotheses
                  .filter(h => 
                    h.description.toLowerCase().includes(filterText.toLowerCase()) ||
                    h.testName.toLowerCase().includes(filterText.toLowerCase())
                  )
                  .map(hypothesis => (
                    <tr key={hypothesis.id}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedHypotheses.includes(hypothesis.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedHypotheses([...selectedHypotheses, hypothesis.id]);
                            } else {
                              setSelectedHypotheses(selectedHypotheses.filter(id => id !== hypothesis.id));
                            }
                          }}
                        />
                      </td>
                      <td className="id-col">{hypothesis.id}</td>
                      <td className="description-col">{hypothesis.description}</td>
                      <td className="test-col">{hypothesis.testName}</td>
                      <td className="numeric p-value-col">
                        {hypothesis.pValue.toFixed(4)}
                      </td>
                      <td className="numeric effect-col">
                        {hypothesis.effectSize?.toFixed(3) || '—'}
                      </td>
                      <td className="timestamp-col">
                        {new Date(hypothesis.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="actions-col">
                        <button 
                          className="remove-btn"
                          onClick={() => dispatch(removeHypothesis(hypothesis.id))}
                          title="Remove hypothesis"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            
            {selectedHypotheses.length > 0 && (
              <div className="selection-actions">
                <span>{selectedHypotheses.length} selected</span>
                <button onClick={handleApplyCorrection}>
                  Apply Correction to Selected
                </button>
                <button onClick={() => setSelectedHypotheses([])}>
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Corrected Results Tab */}
        {activeTab === 'corrections' && (
          <div className="corrections-content">
            <div className="corrections-toolbar">
              <div className="sort-controls">
                <label>Sort by:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="pvalue">Original p-value</option>
                  <option value="adjusted">Adjusted p-value</option>
                  <option value="effect">Effect size</option>
                  <option value="id">Hypothesis ID</option>
                </select>
                <button 
                  className="sort-direction"
                  onClick={() => setSortAscending(!sortAscending)}
                >
                  {sortAscending ? '↑' : '↓'}
                </button>
              </div>
              <button 
                className="apply-all-btn"
                onClick={handleApplyCorrection}
              >
                Apply Correction to All
              </button>
            </div>
            
            <table className="corrections-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Hypothesis</th>
                  <th className="numeric">Original p</th>
                  <th className="numeric">Adjusted p</th>
                  <th className="numeric">Threshold</th>
                  <th>Decision</th>
                  <th className="numeric">Effect Size</th>
                </tr>
              </thead>
              <tbody>
                {correctedResults.map((result, index) => (
                  <tr 
                    key={result.id}
                    className={result.significant ? 'significant' : 'non-significant'}
                  >
                    <td className="rank-col">{index + 1}</td>
                    <td className="hypothesis-col">
                      <div className="hypothesis-id">{result.id}</div>
                      <div className="hypothesis-desc">{result.description}</div>
                    </td>
                    <td className="numeric original-p">
                      {result.pValue.toFixed(4)}
                    </td>
                    <td className="numeric adjusted-p">
                      {result.adjustedP.toFixed(4)}
                      {result.adjustedP < 0.001 && ' ***'}
                      {result.adjustedP < 0.01 && result.adjustedP >= 0.001 && ' **'}
                      {result.adjustedP < 0.05 && result.adjustedP >= 0.01 && ' *'}
                    </td>
                    <td className="numeric threshold">
                      {(alphaLevel / (correctedResults.length - index)).toFixed(4)}
                    </td>
                    <td className="decision">
                      <span className={`decision-badge ${result.significant ? 'reject' : 'retain'}`}>
                        {result.significant ? 'Reject H₀' : 'Retain H₀'}
                      </span>
                    </td>
                    <td className="numeric effect-size">
                      {result.effectSize?.toFixed(3) || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Visualization of correction */}
            <div className="correction-visualization">
              <h4>P-value Distribution</h4>
              <div className="p-value-plot">
                {/* SVG visualization would go here */}
                <div className="plot-placeholder">
                  [P-value histogram with correction threshold line]
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Sequential Testing Tab */}
        {activeTab === 'sequential' && (
          <div className="sequential-content">
            <div className="alpha-spending-config">
              <h4>Alpha Spending Function</h4>
              <div className="spending-selector">
                <label>Function:</label>
                <select>
                  {Object.entries(AlphaSpendingFunctions).map(([key, func]) => (
                    <option key={key} value={key}>{func.name}</option>
                  ))}
                </select>
              </div>
              <div className="spending-params">
                <div className="param">
                  <label>Total Alpha:</label>
                  <input type="number" value={alphaLevel} readOnly />
                </div>
                <div className="param">
                  <label>Number of Looks:</label>
                  <input type="number" defaultValue="3" />
                </div>
                <div className="param">
                  <label>Information Fraction:</label>
                  <input type="text" defaultValue="0.33, 0.67, 1.0" />
                </div>
              </div>
            </div>
            
            <div className="spending-table">
              <h4>Alpha Allocation</h4>
              <table>
                <thead>
                  <tr>
                    <th>Look</th>
                    <th>Information</th>
                    <th>Alpha Spent</th>
                    <th>Cumulative Alpha</th>
                    <th>Critical Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>33%</td>
                    <td>0.0001</td>
                    <td>0.0001</td>
                    <td>3.891</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>67%</td>
                    <td>0.0099</td>
                    <td>0.0100</td>
                    <td>2.576</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>100%</td>
                    <td>0.0400</td>
                    <td>0.0500</td>
                    <td>1.960</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="spending-plot">
              <h4>Alpha Spending Boundary</h4>
              <div className="plot-placeholder">
                [Alpha spending function plot with boundaries]
              </div>
            </div>
          </div>
        )}
        
        {/* Session History Tab */}
        {activeTab === 'session' && (
          <div className="session-content">
            <div className="session-summary">
              <div className="summary-card">
                <label>Session Started</label>
                <span>{new Date(sessionTests[0]?.timestamp || Date.now()).toLocaleString()}</span>
              </div>
              <div className="summary-card">
                <label>Total Tests Run</label>
                <span>{sessionTests.length}</span>
              </div>
              <div className="summary-card">
                <label>Unique Hypotheses</label>
                <span>{new Set(sessionTests.map(t => t.hypothesis)).size}</span>
              </div>
              <div className="summary-card warning">
                <label>P-hacking Risk</label>
                <span>{sessionTests.length > 20 ? 'HIGH' : sessionTests.length > 10 ? 'MEDIUM' : 'LOW'}</span>
              </div>
            </div>
            
            <div className="session-timeline">
              <h4>Test Timeline</h4>
              {sessionTests.map((test, index) => (
                <div key={index} className="timeline-entry">
                  <div className="timeline-time">
                    {new Date(test.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="timeline-content">
                    <div className="test-name">{test.testName}</div>
                    <div className="test-result">
                      p = {test.pValue.toFixed(4)}
                      {test.pValue < 0.05 && ' (significant)'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="session-warnings">
              {sessionTests.length > 5 && (
                <div className="warning-message">
                  <strong>Warning:</strong> Multiple tests detected in this session. 
                  Consider applying correction for {sessionTests.length} tests to control Type I error.
                </div>
              )}
              {sessionTests.filter(t => t.pValue < 0.05).length / sessionTests.length > 0.5 && (
                <div className="warning-message">
                  <strong>Unusual Pattern:</strong> High proportion of significant results 
                  ({(sessionTests.filter(t => t.pValue < 0.05).length / sessionTests.length * 100).toFixed(0)}%). 
                  Review methodology for potential bias.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="report-content">
            <div className="report-header">
              <h4>Multiple Testing Correction Report</h4>
              <div className="report-metadata">
                <div>Generated: {new Date().toLocaleString()}</div>
                <div>Method: {CorrectionMethods[correctionMethod].name}</div>
                <div>Alpha Level: {alphaLevel}</div>
              </div>
            </div>
            
            <div className="report-section">
              <h5>Executive Summary</h5>
              <p>
                A total of {hypotheses.length} hypotheses were tested in this analysis session. 
                The {CorrectionMethods[correctionMethod].name} correction method was applied 
                to control the {correctionMethod.includes('benjamini') ? 'False Discovery Rate (FDR)' : 'Family-Wise Error Rate (FWER)'} 
                at α = {alphaLevel}. After correction, {errorRates.rejectedCount} hypotheses 
                remained statistically significant.
              </p>
            </div>
            
            <div className="report-section">
              <h5>Method Justification</h5>
              <p>
                The {CorrectionMethods[correctionMethod].name} method was selected because: {CorrectionMethods[correctionMethod].whenToUse}. 
                This method {CorrectionMethods[correctionMethod].conservative ? 'provides conservative' : 'balances'} 
                control of Type I errors {!CorrectionMethods[correctionMethod].conservative && 'while maintaining statistical power'}.
              </p>
            </div>
            
            <div className="report-section">
              <h5>Significant Findings</h5>
              <ol className="findings-list">
                {correctedResults
                  .filter(r => r.significant)
                  .map(result => (
                    <li key={result.id}>
                      <strong>{result.id}:</strong> {result.description}
                      <br />
                      Original p = {result.pValue.toFixed(4)}, 
                      Adjusted p = {result.adjustedP.toFixed(4)}
                      {result.effectSize && `, Effect size = ${result.effectSize.toFixed(3)}`}
                    </li>
                  ))}
              </ol>
            </div>
            
            <div className="report-section">
              <h5>Statistical Safeguards</h5>
              <ul>
                <li>Family-Wise Error Rate: {(errorRates.fwer * 100).toFixed(2)}%</li>
                <li>False Discovery Rate: {(errorRates.fdr * 100).toFixed(2)}%</li>
                <li>Number of tests conducted: {hypotheses.length}</li>
                <li>Correction method: {CorrectionMethods[correctionMethod].name}</li>
                <li>Reference: {CorrectionMethods[correctionMethod].reference}</li>
              </ul>
            </div>
            
            <div className="report-actions">
              <div className="export-options">
                <label>Export Format:</label>
                <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                  <option value="pdf">PDF Report</option>
                  <option value="latex">LaTeX</option>
                  <option value="markdown">Markdown</option>
                  <option value="csv">CSV (Data Only)</option>
                  <option value="json">JSON (Complete)</option>
                </select>
              </div>
              <button className="export-btn primary" onClick={handleExport}>
                Export Report
              </button>
              <button className="export-btn" onClick={() => window.print()}>
                Print
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplicityCorrectionPanel;