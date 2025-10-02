// EffectSizeCalculator.jsx
// Enterprise-grade effect size calculation and interpretation interface
// Implements multiple effect size measures with confidence intervals

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTestType,
  selectEffectSizeType,
  selectRawData,
  selectSummaryStats,
  selectCalculatedEffectSizes,
  setTestType,
  setEffectSizeType,
  setRawData,
  setSummaryStats,
  calculateEffectSize,
  calculateConfidenceInterval,
  performBootstrap,
  exportResults
} from '../../store/slices/effectSizeSlice';
import './EffectSizeCalculator.scss';

// Effect size measures by test type
const EffectSizeMeasures = {
  t_test: {
    cohens_d: {
      name: "Cohen's d",
      formula: 'd = (M₁ - M₂) / SD_pooled',
      interpretation: { small: 0.2, medium: 0.5, large: 0.8 },
      reference: 'Cohen, J. (1988). Statistical Power Analysis'
    },
    hedges_g: {
      name: "Hedges' g",
      formula: 'g = d × (1 - 3/(4(n₁+n₂-2)))',
      interpretation: { small: 0.2, medium: 0.5, large: 0.8 },
      reference: 'Hedges, L.V. (1981). Journal of Educational Statistics'
    },
    glass_delta: {
      name: "Glass's Δ",
      formula: 'Δ = (M₁ - M₂) / SD_control',
      interpretation: { small: 0.2, medium: 0.5, large: 0.8 },
      reference: 'Glass, G.V. (1976). Educational Researcher'
    }
  },
  anova: {
    eta_squared: {
      name: 'Eta-squared (η²)',
      formula: 'η² = SS_effect / SS_total',
      interpretation: { small: 0.01, medium: 0.06, large: 0.14 },
      reference: 'Cohen, J. (1973). Psychological Bulletin'
    },
    partial_eta: {
      name: 'Partial η²',
      formula: 'η²_p = SS_effect / (SS_effect + SS_error)',
      interpretation: { small: 0.01, medium: 0.06, large: 0.14 },
      reference: 'Richardson, J.T.E. (2011). Educational Psychology Review'
    },
    omega_squared: {
      name: 'Omega-squared (ω²)',
      formula: 'ω² = (SS_effect - df_effect × MS_error) / (SS_total + MS_error)',
      interpretation: { small: 0.01, medium: 0.06, large: 0.14 },
      reference: 'Kirk, R.E. (1996). Practical significance'
    },
    epsilon_squared: {
      name: 'Epsilon-squared (ε²)',
      formula: 'ε² = (SS_effect - df_effect × MS_error) / SS_total',
      interpretation: { small: 0.01, medium: 0.06, large: 0.14 },
      reference: 'Kelley, K. (1935). Harvard Educational Review'
    }
  },
  correlation: {
    pearson_r: {
      name: 'Pearson r',
      formula: 'r = Σ[(x-x̄)(y-ȳ)] / √[Σ(x-x̄)² × Σ(y-ȳ)²]',
      interpretation: { small: 0.1, medium: 0.3, large: 0.5 },
      reference: 'Cohen, J. (1988). Statistical Power Analysis'
    },
    r_squared: {
      name: 'R-squared',
      formula: 'R² = r²',
      interpretation: { small: 0.01, medium: 0.09, large: 0.25 },
      reference: 'Proportion of variance explained'
    },
    fischers_z: {
      name: "Fisher's z",
      formula: 'z = 0.5 × ln[(1+r)/(1-r)]',
      interpretation: null,
      reference: 'Fisher, R.A. (1915). Biometrika'
    }
  },
  chi_square: {
    cramers_v: {
      name: "Cramér's V",
      formula: 'V = √(χ²/(n × min(r-1, c-1)))',
      interpretation: { small: 0.1, medium: 0.3, large: 0.5 },
      reference: 'Cramér, H. (1946). Mathematical Methods of Statistics'
    },
    phi: {
      name: 'Phi coefficient (φ)',
      formula: 'φ = √(χ²/n)',
      interpretation: { small: 0.1, medium: 0.3, large: 0.5 },
      reference: 'For 2×2 tables only'
    },
    contingency_c: {
      name: 'Contingency coefficient',
      formula: 'C = √(χ²/(χ²+n))',
      interpretation: null,
      reference: 'Pearson, K. (1904). Mathematical contributions'
    },
    odds_ratio: {
      name: 'Odds Ratio',
      formula: 'OR = (a×d)/(b×c)',
      interpretation: { small: 1.5, medium: 2.5, large: 4.0 },
      reference: 'For 2×2 tables'
    }
  },
  nonparametric: {
    rank_biserial: {
      name: 'Rank-biserial correlation',
      formula: 'r_rb = 1 - (2U)/(n₁×n₂)',
      interpretation: { small: 0.1, medium: 0.3, large: 0.5 },
      reference: 'Kerby, D.S. (2014). Comprehensive Psychology'
    },
    cliff_delta: {
      name: "Cliff's delta",
      formula: 'δ = (|#(x₁>x₂)| - |#(x₁<x₂)|)/(n₁×n₂)',
      interpretation: { negligible: 0.147, small: 0.33, medium: 0.474, large: 1.0 },
      reference: 'Cliff, N. (1993). Psychological Bulletin'
    },
    vargha_delaney: {
      name: 'Vargha-Delaney A',
      formula: 'A = P(X₁ > X₂) + 0.5×P(X₁ = X₂)',
      interpretation: { small: 0.56, medium: 0.64, large: 0.71 },
      reference: 'Vargha & Delaney (2000). Psychological Methods'
    }
  }
};

// Confidence interval methods
const CIMethods = {
  parametric: 'Parametric (Normal approximation)',
  bootstrap: 'Bootstrap (BCa)',
  exact: 'Exact (if available)',
  robust: 'Robust (trimmed means)'
};

const EffectSizeCalculator = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const testType = useSelector(selectTestType);
  const effectSizeType = useSelector(selectEffectSizeType);
  const rawData = useSelector(selectRawData);
  const summaryStats = useSelector(selectSummaryStats);
  const calculatedEffectSizes = useSelector(selectCalculatedEffectSizes);
  
  // Local state
  const [inputMode, setInputMode] = useState('summary'); // 'raw' or 'summary'
  const [selectedMeasures, setSelectedMeasures] = useState([]);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [ciMethod, setCiMethod] = useState('parametric');
  const [bootstrapIterations, setBootstrapIterations] = useState(5000);
  const [showFormulas, setShowFormulas] = useState(false);
  const [showInterpretation, setShowInterpretation] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Summary statistics inputs
  const [group1Mean, setGroup1Mean] = useState('');
  const [group1SD, setGroup1SD] = useState('');
  const [group1N, setGroup1N] = useState('');
  const [group2Mean, setGroup2Mean] = useState('');
  const [group2SD, setGroup2SD] = useState('');
  const [group2N, setGroup2N] = useState('');
  
  // ANOVA inputs
  const [ssEffect, setSSEffect] = useState('');
  const [ssError, setSSError] = useState('');
  const [ssTotal, setSSTotal] = useState('');
  const [dfEffect, setDfEffect] = useState('');
  const [dfError, setDfError] = useState('');
  
  // Correlation inputs
  const [correlationR, setCorrelationR] = useState('');
  const [correlationN, setCorrelationN] = useState('');
  
  // Chi-square inputs
  const [chiSquare, setChiSquare] = useState('');
  const [contingencyTable, setContingencyTable] = useState([]);
  const [totalN, setTotalN] = useState('');
  
  // Get available measures for selected test type
  const availableMeasures = useMemo(() => {
    return EffectSizeMeasures[testType] || {};
  }, [testType]);
  
  // Calculate effect sizes
  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    
    const params = {
      testType,
      measures: selectedMeasures,
      confidenceLevel,
      ciMethod,
      bootstrapIterations: ciMethod === 'bootstrap' ? bootstrapIterations : null
    };
    
    if (inputMode === 'summary') {
      params.summaryStats = getSummaryStatsObject();
    } else {
      params.rawData = rawData;
    }
    
    dispatch(calculateEffectSize(params)).then(result => {
      setResults(result.payload);
      setIsCalculating(false);
    });
  }, [dispatch, testType, selectedMeasures, confidenceLevel, ciMethod, bootstrapIterations, inputMode, rawData]);
  
  // Get summary statistics as object
  const getSummaryStatsObject = () => {
    switch (testType) {
      case 't_test':
        return {
          group1: {
            mean: parseFloat(group1Mean),
            sd: parseFloat(group1SD),
            n: parseInt(group1N)
          },
          group2: {
            mean: parseFloat(group2Mean),
            sd: parseFloat(group2SD),
            n: parseInt(group2N)
          }
        };
      case 'anova':
        return {
          ssEffect: parseFloat(ssEffect),
          ssError: parseFloat(ssError),
          ssTotal: parseFloat(ssTotal),
          dfEffect: parseInt(dfEffect),
          dfError: parseInt(dfError)
        };
      case 'correlation':
        return {
          r: parseFloat(correlationR),
          n: parseInt(correlationN)
        };
      case 'chi_square':
        return {
          chiSquare: parseFloat(chiSquare),
          n: parseInt(totalN),
          table: contingencyTable
        };
      default:
        return {};
    }
  };
  
  // Get interpretation for effect size
  const getInterpretation = (value, measure) => {
    const interpretation = measure.interpretation;
    if (!interpretation) return 'N/A';
    
    const absValue = Math.abs(value);
    
    if (interpretation.negligible && absValue < interpretation.negligible) return 'Negligible';
    if (absValue < interpretation.small) return 'Trivial';
    if (absValue < interpretation.medium) return 'Small';
    if (absValue < interpretation.large) return 'Medium';
    return 'Large';
  };
  
  // Format confidence interval
  const formatCI = (lower, upper) => {
    return `[${lower.toFixed(3)}, ${upper.toFixed(3)}]`;
  };
  
  // Handle measure selection
  const toggleMeasure = (measureKey) => {
    if (selectedMeasures.includes(measureKey)) {
      setSelectedMeasures(selectedMeasures.filter(m => m !== measureKey));
    } else {
      setSelectedMeasures([...selectedMeasures, measureKey]);
    }
  };
  
  return (
    <div className="effect-size-calculator">
      {/* Header */}
      <div className="calculator-header">
        <div className="header-title">
          <h2>Effect Size Calculator</h2>
          <span className="subtitle">Standardized Measures & Confidence Intervals</span>
        </div>
        <div className="header-actions">
          <button 
            className={`btn-toggle ${showFormulas ? 'active' : ''}`}
            onClick={() => setShowFormulas(!showFormulas)}
          >
            Show Formulas
          </button>
          <button 
            className={`btn-toggle ${showInterpretation ? 'active' : ''}`}
            onClick={() => setShowInterpretation(!showInterpretation)}
          >
            Interpretation Guide
          </button>
        </div>
      </div>
      
      {/* Test Type Selector */}
      <div className="test-type-selector">
        <label>Statistical Test:</label>
        <div className="test-buttons">
          {Object.keys(EffectSizeMeasures).map(type => (
            <button
              key={type}
              className={`test-btn ${testType === type ? 'active' : ''}`}
              onClick={() => dispatch(setTestType(type))}
            >
              {type.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="calculator-content">
        {/* Left Panel - Input */}
        <div className="panel input-panel">
          <h3>Data Input</h3>
          
          {/* Input Mode Toggle */}
          <div className="input-mode-toggle">
            <button
              className={`mode-btn ${inputMode === 'summary' ? 'active' : ''}`}
              onClick={() => setInputMode('summary')}
            >
              Summary Statistics
            </button>
            <button
              className={`mode-btn ${inputMode === 'raw' ? 'active' : ''}`}
              onClick={() => setInputMode('raw')}
            >
              Raw Data
            </button>
          </div>
          
          {/* Summary Statistics Input */}
          {inputMode === 'summary' && (
            <div className="summary-inputs">
              {testType === 't_test' && (
                <>
                  <div className="input-group">
                    <h4>Group 1</h4>
                    <div className="form-group">
                      <label>Mean:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={group1Mean}
                        onChange={(e) => setGroup1Mean(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>SD:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={group1SD}
                        onChange={(e) => setGroup1SD(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>N:</label>
                      <input
                        type="number"
                        value={group1N}
                        onChange={(e) => setGroup1N(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <h4>Group 2</h4>
                    <div className="form-group">
                      <label>Mean:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={group2Mean}
                        onChange={(e) => setGroup2Mean(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>SD:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={group2SD}
                        onChange={(e) => setGroup2SD(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>N:</label>
                      <input
                        type="number"
                        value={group2N}
                        onChange={(e) => setGroup2N(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
              
              {testType === 'anova' && (
                <div className="input-group">
                  <h4>ANOVA Statistics</h4>
                  <div className="form-group">
                    <label>SS Effect:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ssEffect}
                      onChange={(e) => setSSEffect(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>SS Error:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ssError}
                      onChange={(e) => setSSError(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>SS Total:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ssTotal}
                      onChange={(e) => setSSTotal(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>df Effect:</label>
                    <input
                      type="number"
                      value={dfEffect}
                      onChange={(e) => setDfEffect(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>df Error:</label>
                    <input
                      type="number"
                      value={dfError}
                      onChange={(e) => setDfError(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {testType === 'correlation' && (
                <div className="input-group">
                  <h4>Correlation Statistics</h4>
                  <div className="form-group">
                    <label>Correlation (r):</label>
                    <input
                      type="number"
                      step="0.001"
                      min="-1"
                      max="1"
                      value={correlationR}
                      onChange={(e) => setCorrelationR(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Sample Size (N):</label>
                    <input
                      type="number"
                      value={correlationN}
                      onChange={(e) => setCorrelationN(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {testType === 'chi_square' && (
                <div className="input-group">
                  <h4>Chi-square Statistics</h4>
                  <div className="form-group">
                    <label>Chi-square (χ²):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={chiSquare}
                      onChange={(e) => setChiSquare(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Total N:</label>
                    <input
                      type="number"
                      value={totalN}
                      onChange={(e) => setTotalN(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Raw Data Input */}
          {inputMode === 'raw' && (
            <div className="raw-data-input">
              <textarea
                placeholder="Paste data here (comma or tab separated)..."
                rows="10"
                onChange={(e) => dispatch(setRawData(e.target.value))}
              />
              <div className="data-format-info">
                <p>Format: Group1_values, Group2_values</p>
                <p>Or: x_values, y_values (for correlation)</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Center Panel - Effect Size Selection */}
        <div className="panel selection-panel">
          <h3>Effect Size Measures</h3>
          
          {/* Measure Selection */}
          <div className="measures-list">
            {Object.entries(availableMeasures).map(([key, measure]) => (
              <div key={key} className="measure-item">
                <label className="measure-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMeasures.includes(key)}
                    onChange={() => toggleMeasure(key)}
                  />
                  <span className="measure-name">{measure.name}</span>
                </label>
                {showFormulas && (
                  <div className="measure-formula">
                    <code>{measure.formula}</code>
                  </div>
                )}
                {showInterpretation && measure.interpretation && (
                  <div className="measure-interpretation">
                    <span className="interp-label">Benchmarks:</span>
                    <span className="interp-values">
                      Small={measure.interpretation.small}, 
                      Medium={measure.interpretation.medium}, 
                      Large={measure.interpretation.large}
                    </span>
                  </div>
                )}
                <div className="measure-reference">
                  <cite>{measure.reference}</cite>
                </div>
              </div>
            ))}
          </div>
          
          {/* Confidence Interval Settings */}
          <div className="ci-settings">
            <h4>Confidence Intervals</h4>
            <div className="form-group">
              <label>Confidence Level:</label>
              <select
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
              >
                <option value="0.90">90%</option>
                <option value="0.95">95%</option>
                <option value="0.99">99%</option>
              </select>
            </div>
            <div className="form-group">
              <label>CI Method:</label>
              <select
                value={ciMethod}
                onChange={(e) => setCiMethod(e.target.value)}
              >
                {Object.entries(CIMethods).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            {ciMethod === 'bootstrap' && (
              <div className="form-group">
                <label>Bootstrap Iterations:</label>
                <input
                  type="number"
                  min="1000"
                  max="10000"
                  step="1000"
                  value={bootstrapIterations}
                  onChange={(e) => setBootstrapIterations(parseInt(e.target.value))}
                />
              </div>
            )}
          </div>
          
          {/* Calculate Button */}
          <button
            className="btn-calculate primary"
            onClick={handleCalculate}
            disabled={isCalculating || selectedMeasures.length === 0}
          >
            {isCalculating ? 'Calculating...' : 'Calculate Effect Sizes'}
          </button>
        </div>
        
        {/* Right Panel - Results */}
        <div className="panel results-panel">
          <h3>Results</h3>
          
          {results && (
            <div className="results-display">
              {results.effectSizes.map((result, index) => (
                <div key={index} className="result-card">
                  <div className="result-header">
                    <h4>{availableMeasures[result.measure].name}</h4>
                    <span className={`interpretation ${getInterpretation(result.value, availableMeasures[result.measure]).toLowerCase()}`}>
                      {getInterpretation(result.value, availableMeasures[result.measure])}
                    </span>
                  </div>
                  <div className="result-value">
                    <span className="value">{result.value.toFixed(3)}</span>
                    <span className="ci">
                      {confidenceLevel * 100}% CI: {formatCI(result.ci.lower, result.ci.upper)}
                    </span>
                  </div>
                  <div className="result-details">
                    <div className="detail-item">
                      <label>SE:</label>
                      <span>{result.se.toFixed(4)}</span>
                    </div>
                    {result.ncp && (
                      <div className="detail-item">
                        <label>NCP:</label>
                        <span>{result.ncp.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Comparison Table */}
              {results.effectSizes.length > 1 && (
                <div className="comparison-table">
                  <h4>Effect Size Comparison</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Measure</th>
                        <th>Value</th>
                        <th>CI</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.effectSizes.map((result, index) => (
                        <tr key={index}>
                          <td>{availableMeasures[result.measure].name}</td>
                          <td className="numeric">{result.value.toFixed(3)}</td>
                          <td className="numeric">{formatCI(result.ci.lower, result.ci.upper)}</td>
                          <td>
                            <span className={`interpretation-badge ${getInterpretation(result.value, availableMeasures[result.measure]).toLowerCase()}`}>
                              {getInterpretation(result.value, availableMeasures[result.measure])}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Conversion Table */}
              <div className="conversion-section">
                <h4>Common Conversions</h4>
                <div className="conversions">
                  {results.conversions && Object.entries(results.conversions).map(([key, value]) => (
                    <div key={key} className="conversion-item">
                      <label>{key}:</label>
                      <span>{value.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Export Options */}
          <div className="export-section">
            <label>Export:</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="pdf">PDF Report</option>
              <option value="csv">CSV Table</option>
              <option value="latex">LaTeX Table</option>
              <option value="apa">APA Text</option>
            </select>
            <button 
              className="btn-export"
              disabled={!results}
              onClick={() => dispatch(exportResults({ format: exportFormat, results }))}
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectSizeCalculator;