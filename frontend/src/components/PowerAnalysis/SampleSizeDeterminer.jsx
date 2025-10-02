import React, { useState, useEffect, useMemo } from 'react';
import './SampleSizeDeterminer.scss';

const SampleSizeDeterminer = ({ 
  testType = 't_test',
  onDetermination,
  initialParameters = {},
  className = '' 
}) => {
  // Core parameters
  const [parameters, setParameters] = useState({
    alpha: 0.05,
    power: 0.80,
    effectSize: 0.5,
    allocationRatio: 1,
    tails: 2,
    dropoutRate: 0.1,
    costPerSubject1: 100,
    costPerSubject2: 100,
    totalBudget: 10000,
    endpoints: [{ name: 'Primary', alpha: 0.05, power: 0.80, effectSize: 0.5 }],
    adaptiveDesign: false,
    interimLooks: 2,
    futilityBound: 0.5,
    efficacyBound: 2.5,
    ...initialParameters
  });

  const [calculationMode, setCalculationMode] = useState('standard'); // standard, dropout, cost, multiple, adaptive
  const [results, setResults] = useState(null);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Sample size formulas for different tests
  const SampleSizeFormulas = {
    t_test: {
      independent: {
        formula: 'n = 2σ²(z_α + z_β)² / δ²',
        calculate: (params) => {
          const { alpha, power, effectSize, tails, allocationRatio } = params;
          const za = normalQuantile(1 - alpha / tails);
          const zb = normalQuantile(power);
          const k = allocationRatio;
          
          const n1 = (1 + 1/k) * Math.pow(za + zb, 2) / Math.pow(effectSize, 2);
          const n2 = n1 * k;
          
          return { n1: Math.ceil(n1), n2: Math.ceil(n2), total: Math.ceil(n1 + n2) };
        }
      },
      paired: {
        formula: 'n = σ²(z_α + z_β)² / δ²',
        calculate: (params) => {
          const { alpha, power, effectSize, tails } = params;
          const za = normalQuantile(1 - alpha / tails);
          const zb = normalQuantile(power);
          
          const n = Math.pow(za + zb, 2) / Math.pow(effectSize, 2);
          
          return { n: Math.ceil(n), total: Math.ceil(n) };
        }
      },
      one_sample: {
        formula: 'n = σ²(z_α + z_β)² / δ²',
        calculate: (params) => {
          const { alpha, power, effectSize, tails } = params;
          const za = normalQuantile(1 - alpha / tails);
          const zb = normalQuantile(power);
          
          const n = Math.pow(za + zb, 2) / Math.pow(effectSize, 2);
          
          return { n: Math.ceil(n), total: Math.ceil(n) };
        }
      }
    },
    anova: {
      one_way: {
        formula: 'n = λ / (k × f²)',
        calculate: (params) => {
          const { alpha, power, effectSize, groups } = params;
          const za = normalQuantile(1 - alpha);
          const zb = normalQuantile(power);
          
          const lambda = Math.pow(za + zb, 2);
          const n = lambda / (groups * Math.pow(effectSize, 2));
          
          return { 
            perGroup: Math.ceil(n), 
            total: Math.ceil(n * groups) 
          };
        }
      },
      factorial: {
        formula: 'n = λ / (ab × f²)',
        calculate: (params) => {
          const { alpha, power, effectSize, factorA, factorB } = params;
          const za = normalQuantile(1 - alpha);
          const zb = normalQuantile(power);
          
          const cells = (factorA || 2) * (factorB || 2);
          const lambda = Math.pow(za + zb, 2);
          const n = lambda / (cells * Math.pow(effectSize, 2));
          
          return { 
            perCell: Math.ceil(n), 
            total: Math.ceil(n * cells) 
          };
        }
      }
    },
    correlation: {
      pearson: {
        formula: 'n = [(z_α + z_β) / arctanh(r)]² + 3',
        calculate: (params) => {
          const { alpha, power, correlation, tails } = params;
          const za = normalQuantile(1 - alpha / tails);
          const zb = normalQuantile(power);
          const z = 0.5 * Math.log((1 + Math.abs(correlation)) / (1 - Math.abs(correlation)));
          
          const n = Math.pow((za + zb) / z, 2) + 3;
          
          return { n: Math.ceil(n), total: Math.ceil(n) };
        }
      }
    },
    regression: {
      multiple: {
        formula: 'n = λ / f² + p + 1',
        calculate: (params) => {
          const { alpha, power, effectSize, predictors } = params;
          const za = normalQuantile(1 - alpha);
          const zb = normalQuantile(power);
          
          const lambda = Math.pow(za + zb, 2);
          const f2 = Math.pow(effectSize, 2);
          const n = lambda / f2 + (predictors || 1) + 1;
          
          return { n: Math.ceil(n), total: Math.ceil(n) };
        }
      }
    },
    proportion: {
      two_sample: {
        formula: 'n = (z_α + z_β)²[p₁(1-p₁)/k + p₂(1-p₂)] / (p₁-p₂)²',
        calculate: (params) => {
          const { alpha, power, p1, p2, tails, allocationRatio } = params;
          const za = normalQuantile(1 - alpha / tails);
          const zb = normalQuantile(power);
          const k = allocationRatio;
          
          const numerator = Math.pow(za + zb, 2) * 
                           (p1 * (1 - p1) / k + p2 * (1 - p2));
          const denominator = Math.pow(p1 - p2, 2);
          
          const n1 = numerator / denominator;
          const n2 = n1 * k;
          
          return { n1: Math.ceil(n1), n2: Math.ceil(n2), total: Math.ceil(n1 + n2) };
        }
      }
    }
  };

  // Statistical functions
  function normalQuantile(p) {
    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
               0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
               0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
    
    let x, r;
    const y = p - 0.5;
    
    if (Math.abs(y) < 0.42) {
      r = y * y;
      x = y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0]) /
          ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
    } else {
      r = p > 0.5 ? 1 - p : p;
      r = Math.log(-Math.log(r));
      x = c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * 
          (c[4] + r * (c[5] + r * (c[6] + r * (c[7] + r * c[8])))))));
      if (p < 0.5) x = -x;
    }
    
    return x;
  }

  // Calculate basic sample size
  const calculateBasicSampleSize = () => {
    const testConfig = SampleSizeFormulas[testType];
    if (!testConfig) return null;
    
    const subtype = parameters.subtype || 'independent';
    const calculator = testConfig[subtype] || testConfig[Object.keys(testConfig)[0]];
    
    if (!calculator) return null;
    
    return calculator.calculate(parameters);
  };

  // Adjust for dropout
  const adjustForDropout = (baseSampleSize) => {
    const { dropoutRate } = parameters;
    if (dropoutRate === 0) return baseSampleSize;
    
    const adjustmentFactor = 1 / (1 - dropoutRate);
    
    if (baseSampleSize.n1 && baseSampleSize.n2) {
      return {
        n1: Math.ceil(baseSampleSize.n1 * adjustmentFactor),
        n2: Math.ceil(baseSampleSize.n2 * adjustmentFactor),
        total: Math.ceil(baseSampleSize.total * adjustmentFactor),
        dropoutAdjusted: true,
        expectedDropouts: Math.ceil(baseSampleSize.total * dropoutRate)
      };
    } else if (baseSampleSize.perGroup) {
      return {
        perGroup: Math.ceil(baseSampleSize.perGroup * adjustmentFactor),
        total: Math.ceil(baseSampleSize.total * adjustmentFactor),
        dropoutAdjusted: true,
        expectedDropouts: Math.ceil(baseSampleSize.total * dropoutRate)
      };
    } else {
      return {
        n: Math.ceil(baseSampleSize.n * adjustmentFactor),
        total: Math.ceil(baseSampleSize.total * adjustmentFactor),
        dropoutAdjusted: true,
        expectedDropouts: Math.ceil(baseSampleSize.total * dropoutRate)
      };
    }
  };

  // Cost optimization
  const optimizeForCost = () => {
    const { costPerSubject1, costPerSubject2, totalBudget, allocationRatio } = parameters;
    
    // Calculate optimal allocation ratio based on costs
    const optimalRatio = Math.sqrt(costPerSubject2 / costPerSubject1);
    
    // Calculate sample sizes with budget constraint
    const n1Budget = totalBudget / (costPerSubject1 + costPerSubject2 * optimalRatio);
    const n2Budget = n1Budget * optimalRatio;
    
    // Get required sample sizes for power
    const requiredSizes = calculateBasicSampleSize();
    
    // Check if budget sufficient
    const requiredCost = requiredSizes.n1 ? 
      (requiredSizes.n1 * costPerSubject1 + requiredSizes.n2 * costPerSubject2) :
      requiredSizes.total * costPerSubject1;
    
    const budgetSufficient = requiredCost <= totalBudget;
    
    return {
      optimalRatio,
      n1Optimal: Math.ceil(n1Budget),
      n2Optimal: Math.ceil(n2Budget),
      totalCost: Math.ceil(n1Budget) * costPerSubject1 + Math.ceil(n2Budget) * costPerSubject2,
      requiredCost,
      budgetSufficient,
      powerAchievable: budgetSufficient ? parameters.power : 
        calculatePowerForBudget(Math.floor(n1Budget), Math.floor(n2Budget))
    };
  };

  // Calculate power for given sample sizes
  const calculatePowerForBudget = (n1, n2) => {
    // Simplified power calculation for budget-constrained samples
    const { alpha, effectSize, tails } = parameters;
    const za = normalQuantile(1 - alpha / tails);
    const nHarmonic = (n1 * n2) / (n1 + n2);
    const delta = effectSize * Math.sqrt(nHarmonic / 2);
    const power = 1 - normalCDF(za - delta);
    return Math.max(0, Math.min(power, 1));
  };

  // Normal CDF for power calculation
  function normalCDF(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t ** 2 + a3) * t ** 3 + a2) * t ** 4 + a1) * t ** 5) * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }

  // Multiple endpoints calculation
  const calculateMultipleEndpoints = () => {
    const { endpoints } = parameters;
    const results = [];
    let maxSampleSize = 0;
    
    endpoints.forEach((endpoint, index) => {
      const endpointParams = {
        ...parameters,
        alpha: endpoint.alpha,
        power: endpoint.power,
        effectSize: endpoint.effectSize
      };
      
      const sampleSize = calculateBasicSampleSize(endpointParams);
      results.push({
        name: endpoint.name,
        priority: index === 0 ? 'Primary' : 'Secondary',
        requiredN: sampleSize.total,
        alpha: endpoint.alpha,
        power: endpoint.power,
        effectSize: endpoint.effectSize
      });
      
      maxSampleSize = Math.max(maxSampleSize, sampleSize.total);
    });
    
    return {
      endpoints: results,
      requiredSampleSize: maxSampleSize,
      primaryEndpoint: results[0]
    };
  };

  // Adaptive design calculations
  const calculateAdaptiveDesign = () => {
    const { interimLooks, futilityBound, efficacyBound } = parameters;
    const baseSampleSize = calculateBasicSampleSize();
    
    // Information fractions for interim analyses
    const informationFractions = Array.from({ length: interimLooks }, 
      (_, i) => (i + 1) / (interimLooks + 1));
    
    // Sample sizes at each look
    const sampleSizesAtLooks = informationFractions.map(fraction => ({
      look: informationFractions.indexOf(fraction) + 1,
      fraction,
      n: Math.ceil(baseSampleSize.total * fraction),
      futilityZ: futilityBound,
      efficacyZ: efficacyBound,
      stopProbability: calculateStopProbability(fraction, futilityBound, efficacyBound)
    }));
    
    // Expected sample size
    const expectedN = calculateExpectedSampleSize(sampleSizesAtLooks, baseSampleSize.total);
    
    return {
      maxSampleSize: baseSampleSize.total,
      expectedSampleSize: expectedN,
      interimLooks: sampleSizesAtLooks,
      savings: baseSampleSize.total - expectedN,
      savingsPercent: ((baseSampleSize.total - expectedN) / baseSampleSize.total * 100)
    };
  };

  // Calculate stopping probability
  const calculateStopProbability = (fraction, futility, efficacy) => {
    // Simplified calculation - in production would use more sophisticated methods
    const earlyStopProb = 0.3 * fraction; // Probability increases with information
    return Math.min(earlyStopProb, 0.5);
  };

  // Calculate expected sample size for adaptive design
  const calculateExpectedSampleSize = (looks, maxN) => {
    let expectedN = 0;
    let remainingProb = 1;
    
    looks.forEach(look => {
      expectedN += look.n * look.stopProbability * remainingProb;
      remainingProb *= (1 - look.stopProbability);
    });
    
    expectedN += maxN * remainingProb;
    
    return Math.ceil(expectedN);
  };

  // Main calculation function
  const calculate = () => {
    const warnings = [];
    
    // Validate inputs
    if (parameters.alpha <= 0 || parameters.alpha >= 1) {
      warnings.push('Alpha must be between 0 and 1');
    }
    if (parameters.power <= 0 || parameters.power >= 1) {
      warnings.push('Power must be between 0 and 1');
    }
    if (parameters.effectSize <= 0) {
      warnings.push('Effect size must be positive');
    }
    
    setValidationWarnings(warnings);
    
    if (warnings.length > 0) return;
    
    let finalResults = {};
    
    // Basic calculation
    const basicSampleSize = calculateBasicSampleSize();
    finalResults.basic = basicSampleSize;
    
    // Apply adjustments based on mode
    switch (calculationMode) {
      case 'dropout':
        finalResults.adjusted = adjustForDropout(basicSampleSize);
        break;
        
      case 'cost':
        finalResults.optimization = optimizeForCost();
        setOptimizationResults(finalResults.optimization);
        break;
        
      case 'multiple':
        finalResults.multipleEndpoints = calculateMultipleEndpoints();
        break;
        
      case 'adaptive':
        finalResults.adaptive = calculateAdaptiveDesign();
        break;
        
      default:
        finalResults.final = basicSampleSize;
    }
    
    setResults(finalResults);
    
    if (onDetermination) {
      onDetermination(finalResults);
    }
  };

  // Add endpoint
  const addEndpoint = () => {
    setParameters({
      ...parameters,
      endpoints: [
        ...parameters.endpoints,
        { 
          name: `Endpoint ${parameters.endpoints.length + 1}`, 
          alpha: 0.05, 
          power: 0.80, 
          effectSize: 0.5 
        }
      ]
    });
  };

  // Remove endpoint
  const removeEndpoint = (index) => {
    if (parameters.endpoints.length > 1) {
      setParameters({
        ...parameters,
        endpoints: parameters.endpoints.filter((_, i) => i !== index)
      });
    }
  };

  return (
    <div className={`sample-size-determiner ${className}`}>
      <div className="determiner-header">
        <h3>Sample Size Determination</h3>
        <div className="header-controls">
          <select 
            value={calculationMode}
            onChange={(e) => setCalculationMode(e.target.value)}
          >
            <option value="standard">Standard Calculation</option>
            <option value="dropout">With Dropout Adjustment</option>
            <option value="cost">Cost Optimization</option>
            <option value="multiple">Multiple Endpoints</option>
            <option value="adaptive">Adaptive Design</option>
          </select>
          
          <button 
            className="btn-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      <div className="determiner-body">
        <div className="parameters-section">
          <h4>Basic Parameters</h4>
          <div className="parameter-grid">
            <div className="parameter-group">
              <label>Test Type</label>
              <select 
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
              >
                <option value="t_test">T-Test</option>
                <option value="anova">ANOVA</option>
                <option value="correlation">Correlation</option>
                <option value="regression">Regression</option>
                <option value="proportion">Proportion Test</option>
              </select>
            </div>

            <div className="parameter-group">
              <label>Alpha (α)</label>
              <input 
                type="number"
                value={parameters.alpha}
                onChange={(e) => setParameters({...parameters, alpha: parseFloat(e.target.value)})}
                min="0.001"
                max="0.999"
                step="0.01"
              />
            </div>

            <div className="parameter-group">
              <label>Power (1-β)</label>
              <input 
                type="number"
                value={parameters.power}
                onChange={(e) => setParameters({...parameters, power: parseFloat(e.target.value)})}
                min="0.01"
                max="0.99"
                step="0.01"
              />
            </div>

            <div className="parameter-group">
              <label>Effect Size</label>
              <input 
                type="number"
                value={parameters.effectSize}
                onChange={(e) => setParameters({...parameters, effectSize: parseFloat(e.target.value)})}
                min="0"
                max="5"
                step="0.1"
              />
              <span className="effect-label">
                {parameters.effectSize < 0.3 ? 'Small' : 
                 parameters.effectSize < 0.6 ? 'Medium' : 'Large'}
              </span>
            </div>

            <div className="parameter-group">
              <label>Allocation Ratio</label>
              <input 
                type="number"
                value={parameters.allocationRatio}
                onChange={(e) => setParameters({...parameters, allocationRatio: parseFloat(e.target.value)})}
                min="0.1"
                max="10"
                step="0.1"
              />
              <span className="ratio-label">1:{parameters.allocationRatio}</span>
            </div>

            <div className="parameter-group">
              <label>Tails</label>
              <select 
                value={parameters.tails}
                onChange={(e) => setParameters({...parameters, tails: parseInt(e.target.value)})}
              >
                <option value="1">One-tailed</option>
                <option value="2">Two-tailed</option>
              </select>
            </div>
          </div>

          {calculationMode === 'dropout' && (
            <div className="dropout-section">
              <h4>Dropout Adjustment</h4>
              <div className="parameter-grid">
                <div className="parameter-group">
                  <label>Expected Dropout Rate</label>
                  <input 
                    type="number"
                    value={parameters.dropoutRate}
                    onChange={(e) => setParameters({...parameters, dropoutRate: parseFloat(e.target.value)})}
                    min="0"
                    max="0.9"
                    step="0.05"
                  />
                  <span className="percent-label">{(parameters.dropoutRate * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {calculationMode === 'cost' && (
            <div className="cost-section">
              <h4>Cost Optimization</h4>
              <div className="parameter-grid">
                <div className="parameter-group">
                  <label>Cost per Subject (Group 1)</label>
                  <input 
                    type="number"
                    value={parameters.costPerSubject1}
                    onChange={(e) => setParameters({...parameters, costPerSubject1: parseFloat(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
                
                <div className="parameter-group">
                  <label>Cost per Subject (Group 2)</label>
                  <input 
                    type="number"
                    value={parameters.costPerSubject2}
                    onChange={(e) => setParameters({...parameters, costPerSubject2: parseFloat(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
                
                <div className="parameter-group">
                  <label>Total Budget</label>
                  <input 
                    type="number"
                    value={parameters.totalBudget}
                    onChange={(e) => setParameters({...parameters, totalBudget: parseFloat(e.target.value)})}
                    min="0"
                    step="100"
                  />
                </div>
              </div>
            </div>
          )}

          {calculationMode === 'multiple' && (
            <div className="endpoints-section">
              <h4>Multiple Endpoints</h4>
              <div className="endpoints-list">
                {parameters.endpoints.map((endpoint, index) => (
                  <div key={index} className="endpoint-item">
                    <input 
                      type="text"
                      value={endpoint.name}
                      onChange={(e) => {
                        const newEndpoints = [...parameters.endpoints];
                        newEndpoints[index].name = e.target.value;
                        setParameters({...parameters, endpoints: newEndpoints});
                      }}
                      placeholder="Endpoint name"
                    />
                    <input 
                      type="number"
                      value={endpoint.alpha}
                      onChange={(e) => {
                        const newEndpoints = [...parameters.endpoints];
                        newEndpoints[index].alpha = parseFloat(e.target.value);
                        setParameters({...parameters, endpoints: newEndpoints});
                      }}
                      min="0.001"
                      max="0.999"
                      step="0.01"
                      placeholder="Alpha"
                    />
                    <input 
                      type="number"
                      value={endpoint.power}
                      onChange={(e) => {
                        const newEndpoints = [...parameters.endpoints];
                        newEndpoints[index].power = parseFloat(e.target.value);
                        setParameters({...parameters, endpoints: newEndpoints});
                      }}
                      min="0.01"
                      max="0.99"
                      step="0.01"
                      placeholder="Power"
                    />
                    <input 
                      type="number"
                      value={endpoint.effectSize}
                      onChange={(e) => {
                        const newEndpoints = [...parameters.endpoints];
                        newEndpoints[index].effectSize = parseFloat(e.target.value);
                        setParameters({...parameters, endpoints: newEndpoints});
                      }}
                      min="0"
                      max="5"
                      step="0.1"
                      placeholder="Effect"
                    />
                    <button 
                      className="btn-remove"
                      onClick={() => removeEndpoint(index)}
                      disabled={parameters.endpoints.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn-add-endpoint" onClick={addEndpoint}>
                + Add Endpoint
              </button>
            </div>
          )}

          {calculationMode === 'adaptive' && (
            <div className="adaptive-section">
              <h4>Adaptive Design</h4>
              <div className="parameter-grid">
                <div className="parameter-group">
                  <label>Interim Looks</label>
                  <input 
                    type="number"
                    value={parameters.interimLooks}
                    onChange={(e) => setParameters({...parameters, interimLooks: parseInt(e.target.value)})}
                    min="1"
                    max="5"
                    step="1"
                  />
                </div>
                
                <div className="parameter-group">
                  <label>Futility Bound (Z)</label>
                  <input 
                    type="number"
                    value={parameters.futilityBound}
                    onChange={(e) => setParameters({...parameters, futilityBound: parseFloat(e.target.value)})}
                    min="-3"
                    max="3"
                    step="0.1"
                  />
                </div>
                
                <div className="parameter-group">
                  <label>Efficacy Bound (Z)</label>
                  <input 
                    type="number"
                    value={parameters.efficacyBound}
                    onChange={(e) => setParameters({...parameters, efficacyBound: parseFloat(e.target.value)})}
                    min="1"
                    max="5"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}

          <button className="btn-calculate" onClick={calculate}>
            Determine Sample Size
          </button>
        </div>

        {validationWarnings.length > 0 && (
          <div className="validation-warnings">
            {validationWarnings.map((warning, index) => (
              <div key={index} className="warning-item">
                ⚠ {warning}
              </div>
            ))}
          </div>
        )}

        {results && (
          <div className="results-section">
            <h4>Sample Size Results</h4>
            
            {results.basic && (
              <div className="result-card basic">
                <h5>Basic Calculation</h5>
                {results.basic.n1 && results.basic.n2 ? (
                  <div className="result-details">
                    <div className="result-item">
                      <label>Group 1:</label>
                      <span className="result-value">{results.basic.n1}</span>
                    </div>
                    <div className="result-item">
                      <label>Group 2:</label>
                      <span className="result-value">{results.basic.n2}</span>
                    </div>
                    <div className="result-item total">
                      <label>Total:</label>
                      <span className="result-value">{results.basic.total}</span>
                    </div>
                  </div>
                ) : results.basic.perGroup ? (
                  <div className="result-details">
                    <div className="result-item">
                      <label>Per Group:</label>
                      <span className="result-value">{results.basic.perGroup}</span>
                    </div>
                    <div className="result-item total">
                      <label>Total:</label>
                      <span className="result-value">{results.basic.total}</span>
                    </div>
                  </div>
                ) : (
                  <div className="result-details">
                    <div className="result-item total">
                      <label>Sample Size:</label>
                      <span className="result-value">{results.basic.n || results.basic.total}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {results.adjusted && (
              <div className="result-card adjusted">
                <h5>Dropout-Adjusted</h5>
                <div className="result-details">
                  {results.adjusted.n1 && results.adjusted.n2 ? (
                    <>
                      <div className="result-item">
                        <label>Group 1 (adjusted):</label>
                        <span className="result-value">{results.adjusted.n1}</span>
                      </div>
                      <div className="result-item">
                        <label>Group 2 (adjusted):</label>
                        <span className="result-value">{results.adjusted.n2}</span>
                      </div>
                    </>
                  ) : results.adjusted.perGroup ? (
                    <div className="result-item">
                      <label>Per Group (adjusted):</label>
                      <span className="result-value">{results.adjusted.perGroup}</span>
                    </div>
                  ) : (
                    <div className="result-item">
                      <label>Sample Size (adjusted):</label>
                      <span className="result-value">{results.adjusted.n}</span>
                    </div>
                  )}
                  <div className="result-item total">
                    <label>Total Required:</label>
                    <span className="result-value">{results.adjusted.total}</span>
                  </div>
                  <div className="result-item">
                    <label>Expected Dropouts:</label>
                    <span className="result-value">{results.adjusted.expectedDropouts}</span>
                  </div>
                </div>
              </div>
            )}

            {results.multipleEndpoints && (
              <div className="result-card multiple">
                <h5>Multiple Endpoints</h5>
                <div className="endpoints-results">
                  {results.multipleEndpoints.endpoints.map((endpoint, index) => (
                    <div key={index} className="endpoint-result">
                      <span className="endpoint-name">{endpoint.name}</span>
                      <span className="endpoint-priority">{endpoint.priority}</span>
                      <span className="endpoint-n">n = {endpoint.requiredN}</span>
                    </div>
                  ))}
                  <div className="result-item total">
                    <label>Required Sample Size:</label>
                    <span className="result-value">{results.multipleEndpoints.requiredSampleSize}</span>
                  </div>
                </div>
              </div>
            )}

            {results.adaptive && (
              <div className="result-card adaptive">
                <h5>Adaptive Design</h5>
                <div className="result-details">
                  <div className="result-item">
                    <label>Maximum Sample Size:</label>
                    <span className="result-value">{results.adaptive.maxSampleSize}</span>
                  </div>
                  <div className="result-item">
                    <label>Expected Sample Size:</label>
                    <span className="result-value">{results.adaptive.expectedSampleSize}</span>
                  </div>
                  <div className="result-item">
                    <label>Expected Savings:</label>
                    <span className="result-value">
                      {results.adaptive.savings} ({results.adaptive.savingsPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="interim-looks">
                    <h6>Interim Analyses</h6>
                    {results.adaptive.interimLooks.map((look, index) => (
                      <div key={index} className="look-item">
                        <span>Look {look.look}:</span>
                        <span>n = {look.n}</span>
                        <span>Stop prob: {(look.stopProbability * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {optimizationResults && calculationMode === 'cost' && (
          <div className="optimization-results">
            <h4>Cost Optimization Results</h4>
            <div className={`optimization-card ${optimizationResults.budgetSufficient ? 'sufficient' : 'insufficient'}`}>
              <div className="optimization-details">
                <div className="result-item">
                  <label>Optimal Allocation Ratio:</label>
                  <span className="result-value">1:{optimizationResults.optimalRatio.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <label>Optimal n1:</label>
                  <span className="result-value">{optimizationResults.n1Optimal}</span>
                </div>
                <div className="result-item">
                  <label>Optimal n2:</label>
                  <span className="result-value">{optimizationResults.n2Optimal}</span>
                </div>
                <div className="result-item">
                  <label>Total Cost:</label>
                  <span className="result-value">${optimizationResults.totalCost.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <label>Required Cost for {parameters.power} Power:</label>
                  <span className="result-value">${optimizationResults.requiredCost.toFixed(2)}</span>
                </div>
                <div className={`budget-status ${optimizationResults.budgetSufficient ? 'sufficient' : 'insufficient'}`}>
                  {optimizationResults.budgetSufficient ? 
                    '✓ Budget sufficient for target power' : 
                    `⚠ Budget insufficient - achievable power: ${(optimizationResults.powerAchievable * 100).toFixed(1)}%`
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleSizeDeterminer;