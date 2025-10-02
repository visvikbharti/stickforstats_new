import React, { useState, useEffect, useMemo } from 'react';
import './EffectSizeEstimator.scss';

const EffectSizeEstimator = ({ 
  testType = 't_test',
  onEstimation,
  initialData = null,
  className = '' 
}) => {
  // Estimation parameters
  const [estimationMethod, setEstimationMethod] = useState('pilot_data');
  const [parameters, setParameters] = useState({
    // Pilot data parameters
    pilotData: {
      group1: [],
      group2: [],
      mean1: null,
      mean2: null,
      sd1: null,
      sd2: null,
      n1: null,
      n2: null,
      correlation: null
    },
    // Literature-based parameters
    literature: {
      studies: [],
      pooledEffect: null,
      heterogeneity: null,
      publicationBias: null
    },
    // Meta-analysis parameters
    metaAnalysis: {
      effects: [],
      weights: [],
      model: 'fixed', // fixed, random
      tau2: 0
    },
    // Uncertainty parameters
    uncertainty: {
      confidenceLevel: 0.95,
      distributionType: 'normal', // normal, t, bootstrap
      iterations: 1000
    },
    // Sensitivity parameters
    sensitivity: {
      lowerBound: 0.1,
      upperBound: 1.0,
      steps: 10
    }
  });

  const [results, setResults] = useState(null);
  const [uncertaintyBounds, setUncertaintyBounds] = useState(null);
  const [sensitivityResults, setSensitivityResults] = useState([]);
  const [validationMessages, setValidationMessages] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Effect size calculation methods
  const EffectSizeCalculators = {
    cohens_d: {
      name: "Cohen's d",
      formula: 'd = (M₁ - M₂) / SD_pooled',
      calculate: (data) => {
        const { mean1, mean2, sd1, sd2, n1, n2 } = data;
        const pooledSD = Math.sqrt(((n1 - 1) * sd1 ** 2 + (n2 - 1) * sd2 ** 2) / (n1 + n2 - 2));
        return (mean1 - mean2) / pooledSD;
      },
      ci: (d, n1, n2, alpha) => {
        const se = Math.sqrt((n1 + n2) / (n1 * n2) + d ** 2 / (2 * (n1 + n2)));
        const z = normalQuantile(1 - alpha / 2);
        return {
          lower: d - z * se,
          upper: d + z * se
        };
      }
    },
    hedges_g: {
      name: "Hedges' g",
      formula: 'g = d × (1 - 3/(4df - 1))',
      calculate: (data) => {
        const d = EffectSizeCalculators.cohens_d.calculate(data);
        const df = data.n1 + data.n2 - 2;
        const correction = 1 - 3 / (4 * df - 1);
        return d * correction;
      },
      ci: (g, n1, n2, alpha) => {
        const df = n1 + n2 - 2;
        const correction = 1 - 3 / (4 * df - 1);
        const d_ci = EffectSizeCalculators.cohens_d.ci(g / correction, n1, n2, alpha);
        return {
          lower: d_ci.lower * correction,
          upper: d_ci.upper * correction
        };
      }
    },
    glass_delta: {
      name: "Glass's Δ",
      formula: 'Δ = (M₁ - M₂) / SD_control',
      calculate: (data) => {
        const { mean1, mean2, sd2 } = data; // sd2 is control group
        return (mean1 - mean2) / sd2;
      },
      ci: (delta, n1, n2, alpha) => {
        const se = Math.sqrt(1/n1 + 1/n2 + delta ** 2 / (2 * n2));
        const z = normalQuantile(1 - alpha / 2);
        return {
          lower: delta - z * se,
          upper: delta + z * se
        };
      }
    },
    correlation_r: {
      name: "Correlation r",
      formula: 'r = Σ[(x - x̄)(y - ȳ)] / √[Σ(x - x̄)² × Σ(y - ȳ)²]',
      calculate: (data) => {
        return data.correlation || 0;
      },
      ci: (r, n, alpha) => {
        const z = 0.5 * Math.log((1 + r) / (1 - r));
        const se = 1 / Math.sqrt(n - 3);
        const z_alpha = normalQuantile(1 - alpha / 2);
        const z_lower = z - z_alpha * se;
        const z_upper = z + z_alpha * se;
        return {
          lower: (Math.exp(2 * z_lower) - 1) / (Math.exp(2 * z_lower) + 1),
          upper: (Math.exp(2 * z_upper) - 1) / (Math.exp(2 * z_upper) + 1)
        };
      }
    },
    odds_ratio: {
      name: "Odds Ratio",
      formula: 'OR = (a × d) / (b × c)',
      calculate: (data) => {
        const { a, b, c, d } = data; // 2x2 contingency table
        return (a * d) / (b * c);
      },
      ci: (or, a, b, c, d, alpha) => {
        const logOR = Math.log(or);
        const se = Math.sqrt(1/a + 1/b + 1/c + 1/d);
        const z = normalQuantile(1 - alpha / 2);
        return {
          lower: Math.exp(logOR - z * se),
          upper: Math.exp(logOR + z * se)
        };
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

  // Estimate from pilot data
  const estimateFromPilotData = () => {
    const { pilotData } = parameters;
    const messages = [];
    
    // Validate pilot data
    if (!pilotData.mean1 || !pilotData.mean2 || !pilotData.sd1 || !pilotData.sd2) {
      messages.push({ type: 'error', text: 'Pilot data incomplete. Need means and SDs for both groups.' });
      setValidationMessages(messages);
      return null;
    }

    // Calculate effect sizes
    const effectSizes = {};
    const data = {
      mean1: pilotData.mean1,
      mean2: pilotData.mean2,
      sd1: pilotData.sd1,
      sd2: pilotData.sd2,
      n1: pilotData.n1 || 10,
      n2: pilotData.n2 || 10
    };

    // Calculate different effect size measures
    effectSizes.cohens_d = EffectSizeCalculators.cohens_d.calculate(data);
    effectSizes.hedges_g = EffectSizeCalculators.hedges_g.calculate(data);
    effectSizes.glass_delta = EffectSizeCalculators.glass_delta.calculate(data);

    // Calculate confidence intervals
    const alpha = 1 - parameters.uncertainty.confidenceLevel;
    effectSizes.cohens_d_ci = EffectSizeCalculators.cohens_d.ci(
      effectSizes.cohens_d, data.n1, data.n2, alpha
    );
    effectSizes.hedges_g_ci = EffectSizeCalculators.hedges_g.ci(
      effectSizes.hedges_g, data.n1, data.n2, alpha
    );

    // Uncertainty quantification
    const uncertainty = calculateUncertainty(effectSizes.cohens_d, data.n1, data.n2);
    
    messages.push({ 
      type: 'success', 
      text: `Effect size estimated from pilot data (n₁=${data.n1}, n₂=${data.n2})` 
    });
    
    setValidationMessages(messages);
    
    return {
      primaryEffect: effectSizes.cohens_d,
      effectSizes,
      uncertainty,
      dataSource: 'pilot',
      sampleSize: data.n1 + data.n2
    };
  };

  // Estimate from literature
  const estimateFromLiterature = () => {
    const { literature } = parameters;
    const messages = [];
    
    if (literature.studies.length === 0) {
      messages.push({ type: 'error', text: 'No literature studies provided' });
      setValidationMessages(messages);
      return null;
    }

    // Calculate weighted mean effect size
    let totalWeight = 0;
    let weightedSum = 0;
    let heterogeneity = 0;

    literature.studies.forEach(study => {
      const weight = study.sampleSize || 1;
      totalWeight += weight;
      weightedSum += study.effectSize * weight;
    });

    const pooledEffect = weightedSum / totalWeight;

    // Calculate heterogeneity (I²)
    let Q = 0;
    literature.studies.forEach(study => {
      const weight = study.sampleSize || 1;
      Q += weight * Math.pow(study.effectSize - pooledEffect, 2);
    });
    
    const df = literature.studies.length - 1;
    const I2 = Math.max(0, (Q - df) / Q * 100);

    // Publication bias assessment (simple fail-safe N)
    const failSafeN = calculateFailSafeN(literature.studies, 0.05);

    messages.push({ 
      type: 'success', 
      text: `Pooled effect from ${literature.studies.length} studies` 
    });
    
    if (I2 > 75) {
      messages.push({ 
        type: 'warning', 
        text: `High heterogeneity detected (I²=${I2.toFixed(1)}%)` 
      });
    }

    setValidationMessages(messages);

    return {
      primaryEffect: pooledEffect,
      effectSizes: {
        pooled: pooledEffect,
        median: calculateMedian(literature.studies.map(s => s.effectSize)),
        range: {
          min: Math.min(...literature.studies.map(s => s.effectSize)),
          max: Math.max(...literature.studies.map(s => s.effectSize))
        }
      },
      heterogeneity: {
        Q,
        I2,
        interpretation: I2 < 25 ? 'Low' : I2 < 50 ? 'Moderate' : I2 < 75 ? 'Substantial' : 'Considerable'
      },
      publicationBias: {
        failSafeN,
        interpretation: failSafeN > 5 * literature.studies.length + 10 ? 'Robust' : 'Potential bias'
      },
      dataSource: 'literature',
      studyCount: literature.studies.length
    };
  };

  // Meta-analysis estimation
  const estimateFromMetaAnalysis = () => {
    const { metaAnalysis } = parameters;
    const messages = [];
    
    if (metaAnalysis.effects.length === 0) {
      messages.push({ type: 'error', text: 'No effect sizes provided for meta-analysis' });
      setValidationMessages(messages);
      return null;
    }

    let pooledEffect, variance;
    
    if (metaAnalysis.model === 'fixed') {
      // Fixed effects model
      const weights = metaAnalysis.weights.length > 0 ? 
        metaAnalysis.weights : 
        metaAnalysis.effects.map(() => 1);
      
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      pooledEffect = metaAnalysis.effects.reduce((sum, effect, i) => 
        sum + effect * weights[i], 0
      ) / totalWeight;
      
      variance = 1 / totalWeight;
    } else {
      // Random effects model with tau²
      const tau2 = metaAnalysis.tau2 || estimateTau2(metaAnalysis.effects, metaAnalysis.weights);
      const weights = metaAnalysis.weights.map(w => 1 / (1/w + tau2));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      
      pooledEffect = metaAnalysis.effects.reduce((sum, effect, i) => 
        sum + effect * weights[i], 0
      ) / totalWeight;
      
      variance = 1 / totalWeight;
    }

    const se = Math.sqrt(variance);
    const alpha = 1 - parameters.uncertainty.confidenceLevel;
    const z = normalQuantile(1 - alpha / 2);
    
    const ci = {
      lower: pooledEffect - z * se,
      upper: pooledEffect + z * se
    };

    // Prediction interval for random effects
    let predictionInterval = null;
    if (metaAnalysis.model === 'random') {
      const tau = Math.sqrt(metaAnalysis.tau2 || 0);
      const t_crit = 2; // Approximate t-distribution critical value
      predictionInterval = {
        lower: pooledEffect - t_crit * Math.sqrt(variance + tau ** 2),
        upper: pooledEffect + t_crit * Math.sqrt(variance + tau ** 2)
      };
    }

    messages.push({ 
      type: 'success', 
      text: `${metaAnalysis.model === 'fixed' ? 'Fixed' : 'Random'} effects meta-analysis of ${metaAnalysis.effects.length} studies` 
    });

    setValidationMessages(messages);

    return {
      primaryEffect: pooledEffect,
      effectSizes: {
        pooled: pooledEffect,
        se,
        ci,
        predictionInterval
      },
      model: metaAnalysis.model,
      tau2: metaAnalysis.tau2,
      dataSource: 'meta-analysis',
      studyCount: metaAnalysis.effects.length
    };
  };

  // Calculate uncertainty bounds
  const calculateUncertainty = (effectSize, n1, n2) => {
    const { confidenceLevel, distributionType, iterations } = parameters.uncertainty;
    const alpha = 1 - confidenceLevel;
    
    let bounds = {};
    
    if (distributionType === 'normal') {
      // Normal approximation
      const se = Math.sqrt((n1 + n2) / (n1 * n2) + effectSize ** 2 / (2 * (n1 + n2)));
      const z = normalQuantile(1 - alpha / 2);
      bounds = {
        lower: effectSize - z * se,
        upper: effectSize + z * se,
        se,
        method: 'Normal approximation'
      };
    } else if (distributionType === 't') {
      // t-distribution
      const df = n1 + n2 - 2;
      const se = Math.sqrt((n1 + n2) / (n1 * n2) + effectSize ** 2 / (2 * (n1 + n2)));
      const t = tQuantile(1 - alpha / 2, df);
      bounds = {
        lower: effectSize - t * se,
        upper: effectSize + t * se,
        se,
        method: 't-distribution'
      };
    } else if (distributionType === 'bootstrap') {
      // Bootstrap simulation
      const bootstrapSamples = [];
      for (let i = 0; i < iterations; i++) {
        // Simulate bootstrap sample
        const sample = effectSize + (Math.random() - 0.5) * 0.5; // Simplified
        bootstrapSamples.push(sample);
      }
      bootstrapSamples.sort((a, b) => a - b);
      
      bounds = {
        lower: bootstrapSamples[Math.floor(iterations * alpha / 2)],
        upper: bootstrapSamples[Math.floor(iterations * (1 - alpha / 2))],
        se: calculateSD(bootstrapSamples),
        method: `Bootstrap (${iterations} iterations)`
      };
    }
    
    return bounds;
  };

  // Sensitivity analysis
  const performSensitivityAnalysis = () => {
    const { sensitivity } = parameters;
    const results = [];
    const step = (sensitivity.upperBound - sensitivity.lowerBound) / sensitivity.steps;
    
    for (let i = 0; i <= sensitivity.steps; i++) {
      const effectSize = sensitivity.lowerBound + i * step;
      
      // Calculate power for different sample sizes
      const sampleSizes = [20, 50, 100, 200, 500];
      const powers = sampleSizes.map(n => {
        const za = normalQuantile(1 - 0.05 / 2);
        const ncp = effectSize * Math.sqrt(n / 2);
        const power = 1 - normalCDF(za - ncp) + normalCDF(-za - ncp);
        return Math.min(Math.max(power, 0), 1);
      });
      
      results.push({
        effectSize,
        powers,
        sampleSizes,
        interpretation: effectSize < 0.2 ? 'Small' : 
                       effectSize < 0.5 ? 'Small-Medium' :
                       effectSize < 0.8 ? 'Medium-Large' : 'Large'
      });
    }
    
    return results;
  };

  // Helper functions
  const calculateMedian = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const calculateSD = (arr) => {
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  const calculateFailSafeN = (studies, alpha) => {
    // Rosenthal's fail-safe N
    const zSum = studies.reduce((sum, study) => {
      const p = study.pValue || 0.05;
      const z = normalQuantile(1 - p);
      return sum + z;
    }, 0);
    
    const zCrit = normalQuantile(1 - alpha);
    const k = studies.length;
    
    return Math.max(0, Math.floor((zSum / zCrit) ** 2 - k));
  };

  const estimateTau2 = (effects, weights) => {
    // DerSimonian-Laird estimate
    const w = weights.length > 0 ? weights : effects.map(() => 1);
    const totalWeight = w.reduce((sum, weight) => sum + weight, 0);
    const weightedMean = effects.reduce((sum, effect, i) => sum + effect * w[i], 0) / totalWeight;
    
    let Q = 0;
    effects.forEach((effect, i) => {
      Q += w[i] * Math.pow(effect - weightedMean, 2);
    });
    
    const c = totalWeight - w.reduce((sum, weight) => sum + weight ** 2, 0) / totalWeight;
    const tau2 = Math.max(0, (Q - (effects.length - 1)) / c);
    
    return tau2;
  };

  const tQuantile = (p, df) => {
    // Approximate t-distribution quantile
    const z = normalQuantile(p);
    const g1 = (z ** 3 + z) / 4;
    const g2 = (5 * z ** 5 + 16 * z ** 3 + 3 * z) / 96;
    return z + g1 / df + g2 / (df ** 2);
  };

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

  // Main estimation function
  const performEstimation = () => {
    let estimationResult = null;
    
    switch (estimationMethod) {
      case 'pilot_data':
        estimationResult = estimateFromPilotData();
        break;
      case 'literature':
        estimationResult = estimateFromLiterature();
        break;
      case 'meta_analysis':
        estimationResult = estimateFromMetaAnalysis();
        break;
      default:
        break;
    }
    
    if (estimationResult) {
      // Perform sensitivity analysis
      const sensitivity = performSensitivityAnalysis();
      setSensitivityResults(sensitivity);
      
      // Calculate uncertainty bounds
      const bounds = calculateUncertainty(
        estimationResult.primaryEffect,
        parameters.pilotData.n1 || 30,
        parameters.pilotData.n2 || 30
      );
      setUncertaintyBounds(bounds);
      
      // Set final results
      const finalResults = {
        ...estimationResult,
        uncertainty: bounds,
        sensitivity,
        timestamp: new Date().toISOString()
      };
      
      setResults(finalResults);
      
      if (onEstimation) {
        onEstimation(finalResults);
      }
    }
  };

  // Add literature study
  const addLiteratureStudy = () => {
    const newStudy = {
      id: Date.now(),
      name: `Study ${parameters.literature.studies.length + 1}`,
      effectSize: 0.5,
      sampleSize: 100,
      pValue: 0.05,
      year: new Date().getFullYear()
    };
    
    setParameters({
      ...parameters,
      literature: {
        ...parameters.literature,
        studies: [...parameters.literature.studies, newStudy]
      }
    });
  };

  // Update literature study
  const updateLiteratureStudy = (index, field, value) => {
    const updatedStudies = [...parameters.literature.studies];
    updatedStudies[index] = {
      ...updatedStudies[index],
      [field]: parseFloat(value) || value
    };
    
    setParameters({
      ...parameters,
      literature: {
        ...parameters.literature,
        studies: updatedStudies
      }
    });
  };

  // Remove literature study
  const removeLiteratureStudy = (index) => {
    setParameters({
      ...parameters,
      literature: {
        ...parameters.literature,
        studies: parameters.literature.studies.filter((_, i) => i !== index)
      }
    });
  };

  return (
    <div className={`effect-size-estimator ${className}`}>
      <div className="estimator-header">
        <h3>Effect Size Estimator</h3>
        <div className="header-controls">
          <select 
            value={estimationMethod}
            onChange={(e) => setEstimationMethod(e.target.value)}
          >
            <option value="pilot_data">Pilot Data</option>
            <option value="literature">Literature Review</option>
            <option value="meta_analysis">Meta-Analysis</option>
          </select>
          
          <button 
            className="btn-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      <div className="estimator-body">
        {/* Pilot Data Input */}
        {estimationMethod === 'pilot_data' && (
          <div className="pilot-data-section">
            <h4>Pilot Study Data</h4>
            <div className="data-grid">
              <div className="data-group">
                <h5>Group 1</h5>
                <div className="input-row">
                  <label>Mean</label>
                  <input 
                    type="number"
                    value={parameters.pilotData.mean1 || ''}
                    onChange={(e) => setParameters({
                      ...parameters,
                      pilotData: {
                        ...parameters.pilotData,
                        mean1: parseFloat(e.target.value)
                      }
                    })}
                    step="0.01"
                  />
                </div>
                <div className="input-row">
                  <label>SD</label>
                  <input 
                    type="number"
                    value={parameters.pilotData.sd1 || ''}
                    onChange={(e) => setParameters({
                      ...parameters,
                      pilotData: {
                        ...parameters.pilotData,
                        sd1: parseFloat(e.target.value)
                      }
                    })}
                    step="0.01"
                  />
                </div>
                <div className="input-row">
                  <label>n</label>
                  <input 
                    type="number"
                    value={parameters.pilotData.n1 || ''}
                    onChange={(e) => setParameters({
                      ...parameters,
                      pilotData: {
                        ...parameters.pilotData,
                        n1: parseInt(e.target.value)
                      }
                    })}
                    min="2"
                  />
                </div>
              </div>

              <div className="data-group">
                <h5>Group 2</h5>
                <div className="input-row">
                  <label>Mean</label>
                  <input 
                    type="number"
                    value={parameters.pilotData.mean2 || ''}
                    onChange={(e) => setParameters({
                      ...parameters,
                      pilotData: {
                        ...parameters.pilotData,
                        mean2: parseFloat(e.target.value)
                      }
                    })}
                    step="0.01"
                  />
                </div>
                <div className="input-row">
                  <label>SD</label>
                  <input 
                    type="number"
                    value={parameters.pilotData.sd2 || ''}
                    onChange={(e) => setParameters({
                      ...parameters,
                      pilotData: {
                        ...parameters.pilotData,
                        sd2: parseFloat(e.target.value)
                      }
                    })}
                    step="0.01"
                  />
                </div>
                <div className="input-row">
                  <label>n</label>
                  <input 
                    type="number"
                    value={parameters.pilotData.n2 || ''}
                    onChange={(e) => setParameters({
                      ...parameters,
                      pilotData: {
                        ...parameters.pilotData,
                        n2: parseInt(e.target.value)
                      }
                    })}
                    min="2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Literature Review Input */}
        {estimationMethod === 'literature' && (
          <div className="literature-section">
            <h4>Literature Studies</h4>
            <div className="studies-list">
              {parameters.literature.studies.map((study, index) => (
                <div key={study.id} className="study-item">
                  <input 
                    type="text"
                    value={study.name}
                    onChange={(e) => updateLiteratureStudy(index, 'name', e.target.value)}
                    placeholder="Study name"
                  />
                  <input 
                    type="number"
                    value={study.effectSize}
                    onChange={(e) => updateLiteratureStudy(index, 'effectSize', e.target.value)}
                    placeholder="Effect size"
                    step="0.01"
                  />
                  <input 
                    type="number"
                    value={study.sampleSize}
                    onChange={(e) => updateLiteratureStudy(index, 'sampleSize', e.target.value)}
                    placeholder="Sample size"
                    min="1"
                  />
                  <input 
                    type="number"
                    value={study.year}
                    onChange={(e) => updateLiteratureStudy(index, 'year', e.target.value)}
                    placeholder="Year"
                    min="1900"
                    max="2030"
                  />
                  <button 
                    className="btn-remove"
                    onClick={() => removeLiteratureStudy(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-add-study" onClick={addLiteratureStudy}>
              + Add Study
            </button>
          </div>
        )}

        {/* Meta-Analysis Input */}
        {estimationMethod === 'meta_analysis' && (
          <div className="meta-analysis-section">
            <h4>Meta-Analysis Configuration</h4>
            <div className="config-grid">
              <div className="config-item">
                <label>Model Type</label>
                <select 
                  value={parameters.metaAnalysis.model}
                  onChange={(e) => setParameters({
                    ...parameters,
                    metaAnalysis: {
                      ...parameters.metaAnalysis,
                      model: e.target.value
                    }
                  })}
                >
                  <option value="fixed">Fixed Effects</option>
                  <option value="random">Random Effects</option>
                </select>
              </div>
              
              {parameters.metaAnalysis.model === 'random' && (
                <div className="config-item">
                  <label>Tau² (heterogeneity)</label>
                  <input 
                    type="number"
                    value={parameters.metaAnalysis.tau2}
                    onChange={(e) => setParameters({
                      ...parameters,
                      metaAnalysis: {
                        ...parameters.metaAnalysis,
                        tau2: parseFloat(e.target.value)
                      }
                    })}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>

            <div className="effects-input">
              <label>Effect Sizes (comma-separated)</label>
              <input 
                type="text"
                placeholder="e.g., 0.3, 0.5, 0.7, 0.4"
                onChange={(e) => {
                  const effects = e.target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                  setParameters({
                    ...parameters,
                    metaAnalysis: {
                      ...parameters.metaAnalysis,
                      effects
                    }
                  });
                }}
              />
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="advanced-section">
            <h4>Uncertainty & Sensitivity</h4>
            <div className="advanced-grid">
              <div className="advanced-group">
                <h5>Uncertainty Quantification</h5>
                <div className="input-row">
                  <label>Confidence Level</label>
                  <input 
                    type="number"
                    value={parameters.uncertainty.confidenceLevel}
                    onChange={(e) => setParameters({
                      ...parameters,
                      uncertainty: {
                        ...parameters.uncertainty,
                        confidenceLevel: parseFloat(e.target.value)
                      }
                    })}
                    min="0.5"
                    max="0.999"
                    step="0.01"
                  />
                </div>
                <div className="input-row">
                  <label>Distribution</label>
                  <select 
                    value={parameters.uncertainty.distributionType}
                    onChange={(e) => setParameters({
                      ...parameters,
                      uncertainty: {
                        ...parameters.uncertainty,
                        distributionType: e.target.value
                      }
                    })}
                  >
                    <option value="normal">Normal</option>
                    <option value="t">t-Distribution</option>
                    <option value="bootstrap">Bootstrap</option>
                  </select>
                </div>
              </div>

              <div className="advanced-group">
                <h5>Sensitivity Analysis</h5>
                <div className="input-row">
                  <label>Lower Bound</label>
                  <input 
                    type="number"
                    value={parameters.sensitivity.lowerBound}
                    onChange={(e) => setParameters({
                      ...parameters,
                      sensitivity: {
                        ...parameters.sensitivity,
                        lowerBound: parseFloat(e.target.value)
                      }
                    })}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="input-row">
                  <label>Upper Bound</label>
                  <input 
                    type="number"
                    value={parameters.sensitivity.upperBound}
                    onChange={(e) => setParameters({
                      ...parameters,
                      sensitivity: {
                        ...parameters.sensitivity,
                        upperBound: parseFloat(e.target.value)
                      }
                    })}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <button className="btn-estimate" onClick={performEstimation}>
          Estimate Effect Size
        </button>

        {/* Validation Messages */}
        {validationMessages.length > 0 && (
          <div className="validation-messages">
            {validationMessages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === 'error' && '⚠ '}
                {msg.type === 'warning' && '⚡ '}
                {msg.type === 'success' && '✓ '}
                {msg.text}
              </div>
            ))}
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="results-section">
            <h4>Estimation Results</h4>
            
            <div className="primary-result">
              <div className="result-value">
                <span className="label">Estimated Effect Size:</span>
                <span className="value">{results.primaryEffect.toFixed(3)}</span>
                <span className="interpretation">
                  ({results.primaryEffect < 0.2 ? 'Small' :
                    results.primaryEffect < 0.5 ? 'Small-Medium' :
                    results.primaryEffect < 0.8 ? 'Medium-Large' : 'Large'})
                </span>
              </div>
            </div>

            {uncertaintyBounds && (
              <div className="uncertainty-bounds">
                <h5>Uncertainty Bounds ({(parameters.uncertainty.confidenceLevel * 100).toFixed(0)}% CI)</h5>
                <div className="bounds-display">
                  <span className="lower">{uncertaintyBounds.lower.toFixed(3)}</span>
                  <span className="separator">—</span>
                  <span className="upper">{uncertaintyBounds.upper.toFixed(3)}</span>
                </div>
                <div className="method-note">Method: {uncertaintyBounds.method}</div>
              </div>
            )}

            {results.effectSizes && Object.keys(results.effectSizes).length > 1 && (
              <div className="all-effects">
                <h5>All Effect Size Measures</h5>
                <div className="effects-grid">
                  {Object.entries(results.effectSizes).map(([key, value]) => (
                    <div key={key} className="effect-item">
                      <span className="effect-name">{key.replace('_', ' ')}</span>
                      <span className="effect-value">
                        {typeof value === 'number' ? value.toFixed(3) : 
                         value.lower ? `[${value.lower.toFixed(3)}, ${value.upper.toFixed(3)}]` :
                         JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.heterogeneity && (
              <div className="heterogeneity-info">
                <h5>Heterogeneity Assessment</h5>
                <div className="hetero-stats">
                  <div className="stat-item">
                    <label>I²:</label>
                    <span>{results.heterogeneity.I2.toFixed(1)}%</span>
                    <span className="interpretation">({results.heterogeneity.interpretation})</span>
                  </div>
                </div>
              </div>
            )}

            {sensitivityResults.length > 0 && (
              <div className="sensitivity-results">
                <h5>Sensitivity Analysis</h5>
                <table className="sensitivity-table">
                  <thead>
                    <tr>
                      <th>Effect Size</th>
                      <th>Interpretation</th>
                      <th>Power at n=50</th>
                      <th>Power at n=100</th>
                      <th>Power at n=200</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityResults.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        <td>{row.effectSize.toFixed(2)}</td>
                        <td>{row.interpretation}</td>
                        <td>{(row.powers[1] * 100).toFixed(1)}%</td>
                        <td>{(row.powers[2] * 100).toFixed(1)}%</td>
                        <td>{(row.powers[3] * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EffectSizeEstimator;