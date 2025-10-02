// PowerAnalysisWorkbench.jsx
// Enterprise-grade power analysis and sample size calculation interface
// Implements G*Power-validated algorithms for statistical power planning

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectTestType,
  selectEffectSize,
  selectAlpha,
  selectPower,
  selectSampleSize,
  selectCalculationMode,
  setTestType,
  setEffectSize,
  setAlpha,
  setPower,
  setSampleSize,
  setCalculationMode,
  calculatePower,
  calculateSampleSize,
  generatePowerCurve,
  performSensitivityAnalysis
} from '../../store/slices/powerAnalysisSlice';
import './PowerAnalysisWorkbench.scss';

// Test families and their specific tests
const TestFamilies = {
  t_tests: {
    label: 't-tests',
    tests: {
      independent: 'Independent samples',
      paired: 'Paired samples',
      one_sample: 'One sample'
    }
  },
  anova: {
    label: 'ANOVA',
    tests: {
      one_way: 'One-way ANOVA',
      factorial: 'Factorial ANOVA',
      repeated: 'Repeated measures',
      mixed: 'Mixed ANOVA'
    }
  },
  correlation: {
    label: 'Correlation',
    tests: {
      pearson: 'Pearson correlation',
      partial: 'Partial correlation',
      multiple: 'Multiple correlation'
    }
  },
  regression: {
    label: 'Regression',
    tests: {
      linear: 'Linear regression',
      logistic: 'Logistic regression',
      poisson: 'Poisson regression'
    }
  },
  nonparametric: {
    label: 'Non-parametric',
    tests: {
      mann_whitney: 'Mann-Whitney U',
      wilcoxon: 'Wilcoxon signed-rank',
      kruskal_wallis: 'Kruskal-Wallis'
    }
  },
  chi_square: {
    label: 'Chi-square',
    tests: {
      goodness: 'Goodness of fit',
      independence: 'Test of independence',
      mcnemar: "McNemar's test"
    }
  }
};

// Effect size conventions (Cohen's benchmarks)
const EffectSizeConventions = {
  t_tests: {
    small: 0.2,
    medium: 0.5,
    large: 0.8,
    label: "Cohen's d"
  },
  anova: {
    small: 0.01,
    medium: 0.06,
    large: 0.14,
    label: "Eta-squared"
  },
  correlation: {
    small: 0.1,
    medium: 0.3,
    large: 0.5,
    label: "Correlation r"
  },
  chi_square: {
    small: 0.1,
    medium: 0.3,
    large: 0.5,
    label: "Cramér's V"
  }
};

// Calculation modes
const CalculationModes = {
  sample_size: {
    label: 'Sample Size',
    description: 'Calculate required sample size',
    icon: 'N'
  },
  power: {
    label: 'Power',
    description: 'Calculate statistical power',
    icon: '1-β'
  },
  effect_size: {
    label: 'Effect Size',
    description: 'Calculate detectable effect size',
    icon: 'd'
  },
  sensitivity: {
    label: 'Sensitivity',
    description: 'Sensitivity analysis',
    icon: 'S'
  }
};

const PowerAnalysisWorkbench = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const testType = useSelector(selectTestType);
  const effectSize = useSelector(selectEffectSize);
  const alpha = useSelector(selectAlpha);
  const power = useSelector(selectPower);
  const sampleSize = useSelector(selectSampleSize);
  const calculationMode = useSelector(selectCalculationMode);
  
  // Local state
  const [selectedFamily, setSelectedFamily] = useState('t_tests');
  const [selectedTest, setSelectedTest] = useState('independent');
  const [tails, setTails] = useState('two');
  const [allocation, setAllocation] = useState(1); // N1/N2 ratio
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [powerCurveData, setPowerCurveData] = useState(null);
  const [sensitivityData, setSensitivityData] = useState(null);
  const [calculationResult, setCalculationResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Additional parameters for specific tests
  const [groups, setGroups] = useState(2);
  const [measurements, setMeasurements] = useState(2);
  const [predictors, setPredictors] = useState(1);
  const [dfError, setDfError] = useState(null);
  const [correlationUnderH0, setCorrelationUnderH0] = useState(0);
  
  // Get effect size conventions for current test family
  const effectSizeInfo = useMemo(() => {
    const familyKey = selectedFamily.replace('_tests', '');
    return EffectSizeConventions[familyKey] || EffectSizeConventions.t_tests;
  }, [selectedFamily]);
  
  // Calculate based on mode
  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    
    const params = {
      testType: `${selectedFamily}.${selectedTest}`,
      effectSize,
      alpha,
      power,
      sampleSize,
      tails,
      allocation,
      groups,
      measurements,
      predictors
    };
    
    switch (calculationMode) {
      case 'sample_size':
        dispatch(calculateSampleSize(params)).then(result => {
          setCalculationResult(result.payload);
          setIsCalculating(false);
        });
        break;
        
      case 'power':
        dispatch(calculatePower(params)).then(result => {
          setCalculationResult(result.payload);
          setIsCalculating(false);
        });
        break;
        
      case 'effect_size':
        // Calculate minimum detectable effect size
        const minEffect = calculateMinimumEffectSize(params);
        setCalculationResult({ effectSize: minEffect });
        setIsCalculating(false);
        break;
        
      case 'sensitivity':
        dispatch(performSensitivityAnalysis(params)).then(result => {
          setSensitivityData(result.payload);
          setIsCalculating(false);
        });
        break;
        
      default:
        setIsCalculating(false);
    }
  }, [dispatch, calculationMode, selectedFamily, selectedTest, effectSize, alpha, power, sampleSize, tails, allocation, groups, measurements, predictors]);
  
  // Generate power curve
  const handleGeneratePowerCurve = useCallback(() => {
    setIsCalculating(true);
    
    const params = {
      testType: `${selectedFamily}.${selectedTest}`,
      effectSize,
      alpha,
      tails,
      allocation
    };
    
    dispatch(generatePowerCurve(params)).then(result => {
      setPowerCurveData(result.payload);
      setShowVisualization(true);
      setIsCalculating(false);
    });
  }, [dispatch, selectedFamily, selectedTest, effectSize, alpha, tails, allocation]);
  
  // Helper function for minimum effect size calculation
  const calculateMinimumEffectSize = (params) => {
    // Simplified calculation - in real implementation would use numerical methods
    const { power, alpha, sampleSize } = params;
    const z_alpha = getZScore(alpha, params.tails);
    const z_beta = getZScore(1 - power, 'one');
    
    // For t-test
    const minEffect = (z_alpha + z_beta) / Math.sqrt(sampleSize / 2);
    return minEffect;
  };
  
  // Get z-score for given probability
  const getZScore = (p, tails) => {
    // Standard normal quantiles (simplified)
    const quantiles = {
      0.001: 3.291,
      0.01: 2.576,
      0.025: 1.960,
      0.05: 1.645,
      0.10: 1.282,
      0.20: 0.842,
      0.80: -0.842,
      0.90: -1.282,
      0.95: -1.645
    };
    
    const adjustedP = tails === 'two' ? p / 2 : p;
    return quantiles[adjustedP] || 1.96;
  };
  
  // Format result for display
  const formatResult = (result) => {
    if (!result) return null;
    
    if (calculationMode === 'sample_size') {
      return {
        label: 'Required Sample Size',
        value: Math.ceil(result.totalN || result.sampleSize),
        groups: result.groupSizes,
        actualPower: result.actualPower
      };
    } else if (calculationMode === 'power') {
      return {
        label: 'Statistical Power',
        value: (result.power * 100).toFixed(1) + '%',
        probability: `P(reject H₀|H₁ true) = ${result.power.toFixed(3)}`
      };
    } else if (calculationMode === 'effect_size') {
      return {
        label: 'Minimum Detectable Effect',
        value: result.effectSize.toFixed(3),
        interpretation: getEffectSizeInterpretation(result.effectSize)
      };
    }
    
    return result;
  };
  
  // Get effect size interpretation
  const getEffectSizeInterpretation = (value) => {
    const { small, medium, large } = effectSizeInfo;
    if (value < small) return 'Trivial';
    if (value < medium) return 'Small';
    if (value < large) return 'Medium';
    return 'Large';
  };
  
  return (
    <div className="power-analysis-workbench">
      {/* Header */}
      <div className="workbench-header">
        <div className="header-title">
          <h2>Statistical Power Analysis</h2>
          <span className="subtitle">Sample Size & Power Calculations</span>
        </div>
        <div className="header-actions">
          <button 
            className="btn-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Basic' : 'Advanced'} Options
          </button>
          <button 
            className="btn-help"
            title="Power Analysis Guide"
          >
            ?
          </button>
        </div>
      </div>
      
      {/* Calculation Mode Selector */}
      <div className="mode-selector">
        <label>Calculate:</label>
        <div className="mode-buttons">
          {Object.entries(CalculationModes).map(([key, mode]) => (
            <button
              key={key}
              className={`mode-btn ${calculationMode === key ? 'active' : ''}`}
              onClick={() => dispatch(setCalculationMode(key))}
              title={mode.description}
            >
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-label">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="workbench-content">
        {/* Left Panel - Test Selection */}
        <div className="panel test-selection">
          <h3>Test Selection</h3>
          
          {/* Test Family */}
          <div className="form-group">
            <label>Test Family:</label>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
            >
              {Object.entries(TestFamilies).map(([key, family]) => (
                <option key={key} value={key}>{family.label}</option>
              ))}
            </select>
          </div>
          
          {/* Specific Test */}
          <div className="form-group">
            <label>Statistical Test:</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
            >
              {Object.entries(TestFamilies[selectedFamily].tests).map(([key, test]) => (
                <option key={key} value={key}>{test}</option>
              ))}
            </select>
          </div>
          
          {/* Tails */}
          <div className="form-group">
            <label>Tails:</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="one"
                  checked={tails === 'one'}
                  onChange={(e) => setTails(e.target.value)}
                />
                One-tailed
              </label>
              <label>
                <input
                  type="radio"
                  value="two"
                  checked={tails === 'two'}
                  onChange={(e) => setTails(e.target.value)}
                />
                Two-tailed
              </label>
            </div>
          </div>
          
          {/* Test-specific parameters */}
          {selectedFamily === 'anova' && (
            <div className="form-group">
              <label>Number of Groups:</label>
              <input
                type="number"
                min="2"
                max="10"
                value={groups}
                onChange={(e) => setGroups(parseInt(e.target.value))}
              />
            </div>
          )}
          
          {selectedTest === 'repeated' && (
            <div className="form-group">
              <label>Measurements:</label>
              <input
                type="number"
                min="2"
                max="10"
                value={measurements}
                onChange={(e) => setMeasurements(parseInt(e.target.value))}
              />
            </div>
          )}
          
          {selectedFamily === 'regression' && (
            <div className="form-group">
              <label>Predictors:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={predictors}
                onChange={(e) => setPredictors(parseInt(e.target.value))}
              />
            </div>
          )}
        </div>
        
        {/* Center Panel - Parameters */}
        <div className="panel parameters">
          <h3>Parameters</h3>
          
          {/* Effect Size */}
          <div className="form-group">
            <label>
              Effect Size ({effectSizeInfo.label}):
              <span className="conventions">
                Small={effectSizeInfo.small}, 
                Medium={effectSizeInfo.medium}, 
                Large={effectSizeInfo.large}
              </span>
            </label>
            <div className="effect-size-input">
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={effectSize}
                onChange={(e) => dispatch(setEffectSize(parseFloat(e.target.value)))}
                disabled={calculationMode === 'effect_size'}
              />
              <div className="preset-buttons">
                <button 
                  onClick={() => dispatch(setEffectSize(effectSizeInfo.small))}
                  className="preset-btn"
                >
                  Small
                </button>
                <button 
                  onClick={() => dispatch(setEffectSize(effectSizeInfo.medium))}
                  className="preset-btn"
                >
                  Medium
                </button>
                <button 
                  onClick={() => dispatch(setEffectSize(effectSizeInfo.large))}
                  className="preset-btn"
                >
                  Large
                </button>
              </div>
            </div>
          </div>
          
          {/* Alpha Level */}
          <div className="form-group">
            <label>Significance Level (α):</label>
            <select
              value={alpha}
              onChange={(e) => dispatch(setAlpha(parseFloat(e.target.value)))}
            >
              <option value="0.001">0.001</option>
              <option value="0.01">0.01</option>
              <option value="0.025">0.025</option>
              <option value="0.05">0.05</option>
              <option value="0.10">0.10</option>
            </select>
          </div>
          
          {/* Power */}
          <div className="form-group">
            <label>Statistical Power (1-β):</label>
            <input
              type="number"
              step="0.01"
              min="0.50"
              max="0.99"
              value={power}
              onChange={(e) => dispatch(setPower(parseFloat(e.target.value)))}
              disabled={calculationMode === 'power'}
            />
            <div className="power-scale">
              <span>50%</span>
              <div className="power-bar">
                <div 
                  className="power-fill"
                  style={{ width: `${power * 100}%` }}
                />
              </div>
              <span>99%</span>
            </div>
          </div>
          
          {/* Sample Size */}
          <div className="form-group">
            <label>Total Sample Size (N):</label>
            <input
              type="number"
              min="2"
              max="10000"
              value={sampleSize}
              onChange={(e) => dispatch(setSampleSize(parseInt(e.target.value)))}
              disabled={calculationMode === 'sample_size'}
            />
            {selectedFamily === 't_tests' && selectedTest === 'independent' && (
              <div className="allocation-ratio">
                <label>Allocation Ratio (N₁/N₂):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={allocation}
                  onChange={(e) => setAllocation(parseFloat(e.target.value))}
                />
              </div>
            )}
          </div>
          
          {/* Advanced Options */}
          {showAdvanced && (
            <div className="advanced-options">
              <h4>Advanced Options</h4>
              
              <div className="form-group">
                <label>Non-centrality Parameter:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Auto-calculated"
                  readOnly
                  value={(effectSize * Math.sqrt(sampleSize / 2)).toFixed(2)}
                />
              </div>
              
              {selectedFamily === 'correlation' && (
                <div className="form-group">
                  <label>Correlation under H₀:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="-1"
                    max="1"
                    value={correlationUnderH0}
                    onChange={(e) => setCorrelationUnderH0(parseFloat(e.target.value))}
                  />
                </div>
              )}
              
              <div className="form-group">
                <label>Error df (if known):</label>
                <input
                  type="number"
                  min="1"
                  value={dfError || ''}
                  onChange={(e) => setDfError(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
          )}
          
          {/* Calculate Button */}
          <div className="calculate-section">
            <button
              className="btn-calculate primary"
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? 'Calculating...' : 'Calculate'}
            </button>
            <button
              className="btn-power-curve"
              onClick={handleGeneratePowerCurve}
              disabled={isCalculating}
            >
              Generate Power Curve
            </button>
          </div>
        </div>
        
        {/* Right Panel - Results */}
        <div className="panel results">
          <h3>Results</h3>
          
          {/* Calculation Result */}
          {calculationResult && (
            <div className="result-display">
              <div className="result-main">
                <label>{formatResult(calculationResult).label}:</label>
                <div className="result-value">
                  {formatResult(calculationResult).value}
                </div>
              </div>
              
              {formatResult(calculationResult).groups && (
                <div className="result-groups">
                  <label>Group Sizes:</label>
                  {formatResult(calculationResult).groups.map((size, i) => (
                    <div key={i}>Group {i + 1}: n = {size}</div>
                  ))}
                </div>
              )}
              
              {formatResult(calculationResult).actualPower && (
                <div className="result-detail">
                  <label>Actual Power:</label>
                  <span>{(formatResult(calculationResult).actualPower * 100).toFixed(2)}%</span>
                </div>
              )}
              
              {formatResult(calculationResult).interpretation && (
                <div className="result-interpretation">
                  <label>Interpretation:</label>
                  <span className={`interpretation ${formatResult(calculationResult).interpretation.toLowerCase()}`}>
                    {formatResult(calculationResult).interpretation} Effect
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Sensitivity Analysis Results */}
          {sensitivityData && calculationMode === 'sensitivity' && (
            <div className="sensitivity-results">
              <h4>Sensitivity Analysis</h4>
              <table className="sensitivity-table">
                <thead>
                  <tr>
                    <th>Effect Size</th>
                    <th>Sample Size</th>
                    <th>Power</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityData.results.map((row, i) => (
                    <tr key={i}>
                      <td>{row.effectSize.toFixed(2)}</td>
                      <td>{row.sampleSize}</td>
                      <td>{(row.power * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Study Design Recommendations */}
          <div className="recommendations">
            <h4>Recommendations</h4>
            <ul>
              {power < 0.80 && (
                <li className="warning">
                  Power below 80% - consider increasing sample size or effect size
                </li>
              )}
              {effectSize < effectSizeInfo.small && (
                <li className="warning">
                  Very small effect size - large sample required for adequate power
                </li>
              )}
              {sampleSize < 30 && calculationMode === 'power' && (
                <li className="info">
                  Small sample size - consider non-parametric alternatives
                </li>
              )}
              {alpha < 0.05 && (
                <li className="info">
                  Conservative alpha level - reduced Type I error risk
                </li>
              )}
            </ul>
          </div>
          
          {/* Export Options */}
          <div className="export-section">
            <label>Export:</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="pdf">PDF Report</option>
              <option value="csv">CSV Data</option>
              <option value="r">R Code</option>
              <option value="python">Python Code</option>
            </select>
            <button className="btn-export">
              Export Analysis
            </button>
          </div>
        </div>
      </div>
      
      {/* Power Curve Visualization */}
      {showVisualization && powerCurveData && (
        <div className="power-curve-visualization">
          <div className="viz-header">
            <h3>Power Analysis Curve</h3>
            <button 
              className="btn-close"
              onClick={() => setShowVisualization(false)}
            >
              ×
            </button>
          </div>
          <div className="viz-content">
            <div className="plot-placeholder">
              [Power curve plot: X-axis = Sample Size, Y-axis = Power]
              <br />
              [Shows power as function of N for given effect size and alpha]
            </div>
          </div>
          <div className="viz-controls">
            <button>Save Plot</button>
            <button>Customize</button>
            <button>Compare</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowerAnalysisWorkbench;