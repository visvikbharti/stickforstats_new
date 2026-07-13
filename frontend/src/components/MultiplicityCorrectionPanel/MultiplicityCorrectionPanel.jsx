// MultiplicityCorrectionPanel.jsx
// Enterprise-grade multiple hypothesis correction interface
// Tracks all tests in session, applies corrections, prevents p-hacking

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  exportRegistry
} from '../../store/slices/multiplicityCorrectionSlice';
import { getApiUrl } from '../../config/apiConfig';
import './MultiplicityCorrectionPanel.scss';

// This panel's method ids -> the backend's CorrectionMethod values.
const BACKEND_METHOD = {
  bonferroni: 'bonferroni',
  holm: 'holm',
  hochberg: 'hochberg',
  hommel: 'hommel',
  sidak: 'sidak',
  benjamini_hochberg: 'fdr_bh',
  benjamini_yekutieli: 'fdr_by',
  storey: 'qvalue'
};

// Which procedures bound the false discovery rate rather than the familywise error rate.
// The two guarantees are not interchangeable and the panel must not conflate them.
const FDR_METHODS = new Set(['benjamini_hochberg', 'benjamini_yekutieli', 'storey']);

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
    formula: 'p_adj[i] = min(max_{j<=i} p[j] * (m-j+1), 1)  — the running maximum is what makes it step-down',
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
    formula: 'p_adj[i] = min(min_{j>=i} p[j] * m/j, 1)  — the running minimum is what makes it step-up',
    conservative: false,
    reference: 'Benjamini & Hochberg (1995). JRSS-B, 57(1), 289-300',
    whenToUse: 'Many tests (>20), exploratory analysis'
  },
  benjamini_yekutieli: {
    name: 'Benjamini-Yekutieli',
    description: 'FDR control for dependent tests',
    formula: 'p_adj[i] = BH_adj[i] * c(m),  c(m) = 1 + 1/2 + … + 1/m',
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
    name: 'Pocock',
    description: 'Equal spending at each look',
    formula: 'α(t) = α * log(1 + (e-1)t)'
  },
  obrien_fleming: {
    name: "O'Brien-Fleming",
    description: 'Conservative early, liberal late',
    formula: 'α(t) = 2 - 2Φ(z_α/2 / √t)'
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHypothesis, setNewHypothesis] = useState({
    description: '',
    testName: '',
    pValue: '',
    effectSize: ''
  });

  // Corrected p-values come from the backend, NOT from JavaScript.
  //
  // This block used to reimplement every correction procedure in the browser, and got the
  // two most-used ones wrong:
  //
  //   * Holm computed p_(i) * (m - i) ELEMENTWISE, with no step-down stopping rule and no
  //     running maximum. On p = [0.030, 0.031] at alpha = 0.05 it reported the first as NOT
  //     significant (adj 0.060) and the second as SIGNIFICANT (adj 0.031) -- rejecting a
  //     hypothesis with a LARGER raw p-value than one it had just spared. That is a direct
  //     familywise-error-rate violation, i.e. a false positive the method exists to prevent.
  //
  //   * Benjamini-Hochberg computed p_(i) * m / i elementwise with no step-up running
  //     minimum, so on the same input it MISSED a discovery the method would have made
  //     (correct BH adjusts both to 0.031; the JS gave 0.060 and 0.031).
  //
  //   * Hommel derived its adjusted p-values from alphaLevel. A Hommel adjusted p-value is
  //     alpha-free by construction; only the rejection depends on alpha.
  //
  // The backend has a tested MultiplicityCorrector that agrees with statsmodels on all seven
  // procedures. There is now exactly one correction engine and it is the tested one.
  //
  // Deliberately NO local fallback: if the correction cannot be computed, the panel says so.
  // Silently substituting a wrong answer for an unavailable one is how this started.
  const [correctedResults, setCorrectedResults] = useState([]);
  const [correcting, setCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState(null);

  useEffect(() => {
    if (!hypotheses.length) {
      setCorrectedResults([]);
      setCorrectionError(null);
      return undefined;
    }

    // Step procedures operate on the ordered p-values, and the table reads best sorted.
    const sorted = [...hypotheses].sort((a, b) => a.pValue - b.pValue);
    let cancelled = false;

    setCorrecting(true);
    setCorrectionError(null);

    fetch(getApiUrl('/multiplicity/correct/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_values: sorted.map((h) => h.pValue),
        method: BACKEND_METHOD[correctionMethod] || correctionMethod,
        alpha: alphaLevel
      })
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Correction failed (HTTP ${response.status})`);
        }
        return response.json();
      })
      .then((body) => {
        if (cancelled) return;
        const adjusted = body.p_values_adjusted || body.adjusted_p_values || [];
        const rejected = body.rejected || [];
        setCorrectedResults(
          sorted.map((h, i) => ({
            ...h,
            adjustedP: adjusted[i],
            significant: Boolean(rejected[i])
          }))
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setCorrectedResults([]);
        setCorrectionError(err.message || 'Could not apply the multiplicity correction.');
      })
      .finally(() => {
        if (!cancelled) setCorrecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hypotheses, correctionMethod, alphaLevel]);
  
  // What the correction actually buys you.
  //
  // The three cards here used to show invented numbers:
  //   * "FWER" was 1 - (1 - alpha)^m -- the familywise error rate you would have WITHOUT any
  //     correction. Displaying that as the FWER, right beside a method whose entire job is to
  //     hold the FWER at alpha, told the user their corrected analysis had a 40% false-positive
  //     rate when in fact it had at most 5%. Exactly backwards.
  //   * "FDR" was alpha * m / R, which is not the false discovery rate or any other quantity.
  //   * "Power" was R / m -- the proportion of hypotheses rejected. Power cannot be computed
  //     from p-values alone; it needs effect sizes and sample sizes, neither of which this
  //     panel has. So that card is gone rather than guessed.
  const errorRates = useMemo(() => {
    const rejected = correctedResults.filter(r => r.significant).length;
    const total = correctedResults.length;
    const controlsFdr = FDR_METHODS.has(correctionMethod);

    return {
      // The guarantee the chosen procedure gives, and the name of the rate it bounds.
      controlledRate: controlsFdr ? 'FDR' : 'FWER',
      controlledAt: alphaLevel,
      // The familywise error rate you WOULD face if you ran these m tests uncorrected --
      // the thing the correction is protecting you from. Labelled as such.
      uncorrectedFwer: total ? 1 - Math.pow(1 - alphaLevel, total) : 0,
      rejectedCount: rejected,
      totalCount: total
    };
  }, [correctedResults, alphaLevel, correctionMethod]);
  
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
    dispatch(exportRegistry());
  }, [dispatch]);
  
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
      
      {correcting && (
        <div className="correction-status">Applying the {CorrectionMethods[correctionMethod].name} correction…</div>
      )}

      {correctionError && (
        <div className="correction-error" role="alert">
          <strong>Could not apply the correction:</strong> {correctionError}
          <div>
            No adjusted p-values are shown. The raw p-values below are <em>uncorrected</em> and must not be
            read as significant.
          </div>
        </div>
      )}

      {/* Error rate summary */}
      <div className="error-rate-summary">
        <div className="rate-card">
          <label>{errorRates.controlledRate} controlled at</label>
          <span className="rate-value">{(errorRates.controlledAt * 100).toFixed(0)}%</span>
        </div>
        <div className="rate-card">
          <label>FWER without correction</label>
          <span className="rate-value">{(errorRates.uncorrectedFwer * 100).toFixed(1)}%</span>
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
                onClick={() => setShowAddModal(true)}
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
                <li>
                  {errorRates.controlledRate} controlled at α = {alphaLevel} by the{' '}
                  {CorrectionMethods[correctionMethod].name} procedure
                </li>
                <li>
                  Uncorrected, {hypotheses.length} independent tests at α = {alphaLevel} would carry a{' '}
                  {(errorRates.uncorrectedFwer * 100).toFixed(1)}% chance of at least one false positive
                </li>
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

      {/* Add Hypothesis Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Add Hypothesis</h4>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  placeholder="e.g., Treatment group has higher mean than control"
                  value={newHypothesis.description}
                  onChange={(e) => setNewHypothesis({ ...newHypothesis, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Test Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Independent t-test"
                  value={newHypothesis.testName}
                  onChange={(e) => setNewHypothesis({ ...newHypothesis, testName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>P-value *</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  placeholder="e.g., 0.0312"
                  value={newHypothesis.pValue}
                  onChange={(e) => setNewHypothesis({ ...newHypothesis, pValue: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Effect Size (optional)</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="e.g., 0.45"
                  value={newHypothesis.effectSize}
                  onChange={(e) => setNewHypothesis({ ...newHypothesis, effectSize: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button
                className="submit-btn"
                disabled={!newHypothesis.description || !newHypothesis.testName || !newHypothesis.pValue}
                onClick={() => {
                  handleAddHypothesis({
                    description: newHypothesis.description,
                    testName: newHypothesis.testName,
                    pValue: parseFloat(newHypothesis.pValue),
                    effectSize: newHypothesis.effectSize ? parseFloat(newHypothesis.effectSize) : null
                  });
                  setNewHypothesis({ description: '', testName: '', pValue: '', effectSize: '' });
                  setShowAddModal(false);
                }}
              >
                Add Hypothesis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplicityCorrectionPanel;