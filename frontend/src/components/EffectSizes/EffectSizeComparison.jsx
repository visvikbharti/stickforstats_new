import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './EffectSizeComparison.scss';

const StudyTypes = {
  INDEPENDENT_GROUPS: 'independent',
  PAIRED_SAMPLES: 'paired',
  CORRELATION: 'correlation',
  ANOVA: 'anova',
  REGRESSION: 'regression',
  CATEGORICAL: 'categorical'
};

const EffectSizeMetrics = {
  independent: {
    cohens_d: { name: "Cohen's d", range: [-3, 3], benchmarks: { small: 0.2, medium: 0.5, large: 0.8 } },
    hedges_g: { name: "Hedges' g", range: [-3, 3], benchmarks: { small: 0.2, medium: 0.5, large: 0.8 } },
    glass_delta: { name: "Glass's Δ", range: [-3, 3], benchmarks: { small: 0.2, medium: 0.5, large: 0.8 } }
  },
  correlation: {
    pearson_r: { name: "Pearson's r", range: [-1, 1], benchmarks: { small: 0.1, medium: 0.3, large: 0.5 } },
    r_squared: { name: "R²", range: [0, 1], benchmarks: { small: 0.01, medium: 0.09, large: 0.25 } },
    fishers_z: { name: "Fisher's z", range: [-3, 3], benchmarks: null }
  },
  anova: {
    eta_squared: { name: "η²", range: [0, 1], benchmarks: { small: 0.01, medium: 0.06, large: 0.14 } },
    partial_eta: { name: "Partial η²", range: [0, 1], benchmarks: { small: 0.01, medium: 0.06, large: 0.14 } },
    omega_squared: { name: "ω²", range: [0, 1], benchmarks: { small: 0.01, medium: 0.06, large: 0.14 } },
    cohens_f: { name: "Cohen's f", range: [0, 2], benchmarks: { small: 0.1, medium: 0.25, large: 0.4 } }
  }
};

const MetaAnalysisMethods = {
  FIXED_EFFECT: {
    id: 'fixed',
    name: 'Fixed-Effect Model',
    description: 'Assumes all studies estimate the same true effect',
    formula: 'θ_FE = Σ(w_i × θ_i) / Σw_i',
    when_to_use: 'Low heterogeneity (I² < 25%)'
  },
  RANDOM_EFFECTS: {
    id: 'random',
    name: 'Random-Effects Model',
    description: 'Assumes studies estimate different but related effects',
    formula: 'θ_RE = Σ(w*_i × θ_i) / Σw*_i',
    when_to_use: 'Moderate to high heterogeneity (I² > 25%)'
  },
  QUALITY_EFFECTS: {
    id: 'quality',
    name: 'Quality Effects Model',
    description: 'Weights studies by quality scores',
    formula: 'θ_QE = Σ(q_i × w_i × θ_i) / Σ(q_i × w_i)',
    when_to_use: 'Variable study quality'
  }
};

const HeterogeneityMetrics = {
  Q: {
    name: 'Cochran\'s Q',
    description: 'Tests whether studies share a common effect size',
    interpretation: 'p < 0.05 indicates significant heterogeneity'
  },
  I2: {
    name: 'I² statistic',
    description: 'Percentage of variance due to heterogeneity',
    interpretation: '0-25%: Low, 25-50%: Moderate, 50-75%: Substantial, >75%: Considerable'
  },
  tau2: {
    name: 'τ²',
    description: 'Between-study variance in random-effects model',
    interpretation: 'Higher values indicate greater heterogeneity'
  },
  H2: {
    name: 'H² statistic',
    description: 'Ratio of total variance to sampling variance',
    interpretation: 'H² > 1 indicates heterogeneity'
  }
};

const PublicationBiasTests = {
  funnel_plot: {
    name: 'Funnel Plot',
    description: 'Visual assessment of asymmetry',
    interpretation: 'Asymmetry suggests publication bias'
  },
  eggers_test: {
    name: "Egger's Test",
    description: 'Regression test for funnel plot asymmetry',
    interpretation: 'p < 0.05 suggests publication bias'
  },
  begg_test: {
    name: "Begg's Test",
    description: 'Rank correlation test',
    interpretation: 'p < 0.05 suggests publication bias'
  },
  trim_fill: {
    name: 'Trim and Fill',
    description: 'Estimates and adjusts for missing studies',
    interpretation: 'Adjusted estimate differs from original'
  },
  fail_safe_n: {
    name: 'Fail-Safe N',
    description: 'Number of null studies needed to nullify effect',
    interpretation: 'Large N suggests robust findings'
  }
};

const EffectSizeComparison = () => {
  const dispatch = useDispatch();
  const { currentProject } = useSelector(state => state.project || {});
  
  const [studies, setStudies] = useState([]);
  const [comparisonMode, setComparisonMode] = useState('individual'); // individual, meta-analysis, subgroup
  const [selectedMetric, setSelectedMetric] = useState('cohens_d');
  const [metaAnalysisMethod, setMetaAnalysisMethod] = useState('random');
  const [subgroupVariable, setSubgroupVariable] = useState(null);
  const [metaResults, setMetaResults] = useState(null);
  const [heterogeneity, setHeterogeneity] = useState(null);
  const [publicationBias, setPublicationBias] = useState(null);
  const [sensitivityAnalysis, setSensitivityAnalysis] = useState(null);
  const forestPlotRef = useRef(null);

  // Add new study
  const addStudy = useCallback(() => {
    const newStudy = {
      id: Date.now(),
      name: `Study ${studies.length + 1}`,
      author: '',
      year: new Date().getFullYear(),
      type: 'independent',
      effectSize: null,
      ci_lower: null,
      ci_upper: null,
      se: null,
      n1: null,
      n2: null,
      weight: null,
      quality: 5,
      subgroup: '',
      notes: ''
    };
    setStudies([...studies, newStudy]);
  }, [studies]);

  // Remove study
  const removeStudy = useCallback((id) => {
    setStudies(studies.filter(s => s.id !== id));
  }, [studies]);

  // Update study
  const updateStudy = useCallback((id, field, value) => {
    setStudies(studies.map(study => 
      study.id === id ? { ...study, [field]: value } : study
    ));
  }, [studies]);

  // Calculate standard error from CI
  const calculateSE = useCallback((ci_lower, ci_upper) => {
    if (ci_lower === null || ci_upper === null) return null;
    return (ci_upper - ci_lower) / (2 * 1.96);
  }, []);

  // Calculate weight for meta-analysis
  const calculateWeight = useCallback((se, method = 'inverse_variance') => {
    if (!se || se === 0) return 0;
    
    switch (method) {
      case 'inverse_variance':
        return 1 / (se * se);
      case 'sample_size':
        // Simplified - would need n1 and n2
        return 100; // Placeholder
      default:
        return 1 / (se * se);
    }
  }, []);

  // Perform meta-analysis
  const performMetaAnalysis = useCallback(() => {
    const validStudies = studies.filter(s => 
      s.effectSize !== null && s.se !== null && s.se > 0
    );
    
    if (validStudies.length < 2) {
      alert('Need at least 2 studies with effect sizes and standard errors');
      return;
    }
    
    // Calculate weights
    const weights = validStudies.map(s => calculateWeight(s.se));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    // Fixed-effect estimate
    const fixedEffect = weights.reduce((sum, w, i) => 
      sum + w * validStudies[i].effectSize, 0
    ) / totalWeight;
    
    const fixedSE = Math.sqrt(1 / totalWeight);
    
    // Calculate heterogeneity (Q statistic)
    const Q = weights.reduce((sum, w, i) => {
      const diff = validStudies[i].effectSize - fixedEffect;
      return sum + w * diff * diff;
    }, 0);
    
    const df = validStudies.length - 1;
    const Q_pvalue = 1 - chisquareCDF(Q, df);
    
    // I² statistic
    const I2 = Math.max(0, ((Q - df) / Q) * 100);
    
    // τ² (between-study variance) - DerSimonian-Laird
    const C = totalWeight - weights.reduce((sum, w) => sum + w * w, 0) / totalWeight;
    const tau2 = Math.max(0, (Q - df) / C);
    
    // Random-effects weights
    const reWeights = validStudies.map(s => 
      1 / (s.se * s.se + tau2)
    );
    const totalREWeight = reWeights.reduce((sum, w) => sum + w, 0);
    
    // Random-effects estimate
    const randomEffect = reWeights.reduce((sum, w, i) => 
      sum + w * validStudies[i].effectSize, 0
    ) / totalREWeight;
    
    const randomSE = Math.sqrt(1 / totalREWeight);
    
    // Prediction interval (for random-effects)
    const predictionInterval = {
      lower: randomEffect - 1.96 * Math.sqrt(randomSE * randomSE + tau2),
      upper: randomEffect + 1.96 * Math.sqrt(randomSE * randomSE + tau2)
    };
    
    // Set results
    setMetaResults({
      fixedEffect: {
        estimate: fixedEffect,
        se: fixedSE,
        ci_lower: fixedEffect - 1.96 * fixedSE,
        ci_upper: fixedEffect + 1.96 * fixedSE,
        z: fixedEffect / fixedSE,
        p: 2 * (1 - normalCDF(Math.abs(fixedEffect / fixedSE)))
      },
      randomEffect: {
        estimate: randomEffect,
        se: randomSE,
        ci_lower: randomEffect - 1.96 * randomSE,
        ci_upper: randomEffect + 1.96 * randomSE,
        z: randomEffect / randomSE,
        p: 2 * (1 - normalCDF(Math.abs(randomEffect / randomSE))),
        predictionInterval
      },
      studies: validStudies.length,
      participants: validStudies.reduce((sum, s) => sum + (s.n1 || 0) + (s.n2 || 0), 0)
    });
    
    setHeterogeneity({
      Q,
      Q_pvalue,
      I2,
      tau2,
      tau: Math.sqrt(tau2),
      H2: Q / df,
      H: Math.sqrt(Q / df)
    });
    
    // Publication bias tests
    performPublicationBiasTests(validStudies, weights);
    
    // Sensitivity analysis
    performSensitivityAnalysis(validStudies);
  }, [studies]);

  // Publication bias tests
  const performPublicationBiasTests = useCallback((validStudies, weights) => {
    const n = validStudies.length;
    
    // Egger's test (simplified)
    const precision = validStudies.map(s => 1 / s.se);
    const ses = validStudies.map(s => s.se);
    const effects = validStudies.map(s => s.effectSize);
    
    // Linear regression: effect/se ~ 1/se
    const x = precision;
    const y = effects.map((e, i) => e / ses[i]);
    
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    
    const ssXY = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const ssXX = x.reduce((sum, xi) => sum + (xi - meanX) * (xi - meanX), 0);
    
    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;
    
    // Standard error of intercept (simplified)
    const residuals = y.map((yi, i) => yi - (intercept + slope * x[i]));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2);
    const seIntercept = Math.sqrt(mse * (1/n + meanX * meanX / ssXX));
    
    const eggerT = intercept / seIntercept;
    const eggerP = 2 * (1 - tCDF(Math.abs(eggerT), n - 2));
    
    // Fail-safe N (Rosenthal)
    const zValues = effects.map((e, i) => e / ses[i]);
    const sumZ = zValues.reduce((sum, z) => sum + z, 0);
    const criticalZ = 1.96; // For p = 0.05
    const failSafeN = Math.max(0, (sumZ * sumZ) / (criticalZ * criticalZ) - n);
    
    setPublicationBias({
      egger: {
        intercept,
        se: seIntercept,
        t: eggerT,
        p: eggerP,
        significant: eggerP < 0.05
      },
      failSafeN: Math.round(failSafeN),
      interpretation: eggerP < 0.05 
        ? 'Evidence of publication bias detected'
        : 'No significant evidence of publication bias'
    });
  }, []);

  // Sensitivity analysis
  const performSensitivityAnalysis = useCallback((validStudies) => {
    const results = [];
    
    // Leave-one-out analysis
    for (let i = 0; i < validStudies.length; i++) {
      const subset = validStudies.filter((_, idx) => idx !== i);
      const weights = subset.map(s => calculateWeight(s.se));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      
      const estimate = weights.reduce((sum, w, idx) => 
        sum + w * subset[idx].effectSize, 0
      ) / totalWeight;
      
      results.push({
        omitted: validStudies[i].name,
        estimate,
        change: ((estimate - metaResults?.randomEffect?.estimate) || 0) * 100 / 
                (metaResults?.randomEffect?.estimate || 1)
      });
    }
    
    // Find most influential study
    const maxChange = Math.max(...results.map(r => Math.abs(r.change)));
    const influential = results.find(r => Math.abs(r.change) === maxChange);
    
    setSensitivityAnalysis({
      leaveOneOut: results,
      mostInfluential: influential,
      robust: maxChange < 10 // Less than 10% change
    });
  }, [metaResults, calculateWeight]);

  // Statistical helper functions
  const normalCDF = (z) => {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    
    const t = 1 / (1 + p * z);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;
    
    const erf = 1 - (((((a5 * t5 + a4 * t4) + a3 * t3) + a2 * t2) + a1 * t) * Math.exp(-z * z));
    
    return 0.5 * (1 + sign * erf);
  };

  const chisquareCDF = (x, df) => {
    if (x <= 0) return 0;
    return gammaCDF(x / 2, df / 2);
  };

  const gammaCDF = (x, a) => {
    // Simplified gamma CDF approximation
    if (x <= 0) return 0;
    if (x < a + 1) {
      // Series expansion
      let sum = 1;
      let term = 1;
      for (let n = 1; n < 100; n++) {
        term *= x / (a + n);
        sum += term;
        if (term < 1e-10) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
    } else {
      // Continued fraction
      return 1 - gammaCDF(x, a);
    }
  };

  const logGamma = (x) => {
    // Stirling's approximation
    return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI);
  };

  const tCDF = (t, df) => {
    // Approximation for t-distribution CDF
    const x = df / (df + t * t);
    return 1 - 0.5 * betaCDF(x, df / 2, 0.5);
  };

  const betaCDF = (x, a, b) => {
    // Simplified beta CDF
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Use normal approximation for large df
    const mean = a / (a + b);
    const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
    const z = (x - mean) / Math.sqrt(variance);
    return normalCDF(z);
  };

  // Generate forest plot
  const generateForestPlot = useCallback(() => {
    if (!forestPlotRef.current || studies.length === 0) return;
    
    const canvas = forestPlotRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Settings
    const margin = { top: 40, right: 80, bottom: 60, left: 200 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Filter valid studies
    const validStudies = studies.filter(s => s.effectSize !== null);
    if (validStudies.length === 0) return;
    
    // Calculate scale
    const allValues = [];
    validStudies.forEach(s => {
      if (s.effectSize !== null) allValues.push(s.effectSize);
      if (s.ci_lower !== null) allValues.push(s.ci_lower);
      if (s.ci_upper !== null) allValues.push(s.ci_upper);
    });
    
    const xMin = Math.min(...allValues, -1);
    const xMax = Math.max(...allValues, 1);
    const xScale = plotWidth / (xMax - xMin);
    
    const yStep = plotHeight / (validStudies.length + 2); // +2 for summary
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Y-axis (at effect = 0)
    const zeroX = margin.left + (0 - xMin) * xScale;
    ctx.strokeStyle = '#999';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(zeroX, margin.top);
    ctx.lineTo(zeroX, height - margin.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // X-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '11px IBM Plex Sans';
    ctx.textAlign = 'center';
    
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 0.5) {
      const xPos = margin.left + (x - xMin) * xScale;
      ctx.fillText(x.toFixed(1), xPos, height - margin.bottom + 20);
      
      // Tick marks
      ctx.beginPath();
      ctx.moveTo(xPos, height - margin.bottom);
      ctx.lineTo(xPos, height - margin.bottom + 5);
      ctx.stroke();
    }
    
    // Draw studies
    validStudies.forEach((study, i) => {
      const y = margin.top + (i + 1) * yStep;
      
      // Study name
      ctx.fillStyle = '#333';
      ctx.font = '12px IBM Plex Sans';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${study.name} (${study.year || 'n/a'})`,
        margin.left - 10,
        y + 4
      );
      
      // Confidence interval line
      if (study.ci_lower !== null && study.ci_upper !== null) {
        const x1 = margin.left + (study.ci_lower - xMin) * xScale;
        const x2 = margin.left + (study.ci_upper - xMin) * xScale;
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        
        // CI endpoints
        ctx.beginPath();
        ctx.moveTo(x1, y - 4);
        ctx.lineTo(x1, y + 4);
        ctx.moveTo(x2, y - 4);
        ctx.lineTo(x2, y + 4);
        ctx.stroke();
      }
      
      // Point estimate (square)
      if (study.effectSize !== null) {
        const x = margin.left + (study.effectSize - xMin) * xScale;
        const size = study.weight ? Math.sqrt(study.weight) * 2 + 4 : 8;
        
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - size/2, y - size/2, size, size);
      }
      
      // Effect size text
      if (study.effectSize !== null) {
        ctx.fillStyle = '#333';
        ctx.font = '11px IBM Plex Sans';
        ctx.textAlign = 'left';
        ctx.fillText(
          study.effectSize.toFixed(2),
          width - margin.right + 10,
          y + 4
        );
      }
    });
    
    // Draw summary diamond (if meta-analysis performed)
    if (metaResults) {
      const summaryY = margin.top + (validStudies.length + 1.5) * yStep;
      const effect = metaAnalysisMethod === 'fixed' 
        ? metaResults.fixedEffect 
        : metaResults.randomEffect;
      
      if (effect) {
        const x = margin.left + (effect.estimate - xMin) * xScale;
        const x1 = margin.left + (effect.ci_lower - xMin) * xScale;
        const x2 = margin.left + (effect.ci_upper - xMin) * xScale;
        
        // Diamond
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x, summaryY - 8);
        ctx.lineTo(x2, summaryY);
        ctx.lineTo(x, summaryY + 8);
        ctx.lineTo(x1, summaryY);
        ctx.closePath();
        ctx.fill();
        
        // Label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px IBM Plex Sans';
        ctx.textAlign = 'right';
        ctx.fillText(
          metaAnalysisMethod === 'fixed' ? 'Fixed Effect' : 'Random Effects',
          margin.left - 10,
          summaryY + 4
        );
        
        // Summary effect text
        ctx.font = 'bold 11px IBM Plex Sans';
        ctx.textAlign = 'left';
        ctx.fillText(
          effect.estimate.toFixed(2),
          width - margin.right + 10,
          summaryY + 4
        );
      }
    }
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Forest Plot', width / 2, 20);
    
    // X-axis label
    ctx.font = '12px IBM Plex Sans';
    ctx.fillText('Effect Size', width / 2, height - 10);
  }, [studies, metaResults, metaAnalysisMethod]);

  // Update forest plot when data changes
  useEffect(() => {
    generateForestPlot();
  }, [studies, metaResults, generateForestPlot]);

  // Export results
  const exportResults = useCallback((format = 'csv') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `effect_size_comparison_${timestamp}`;
    
    let content, mimeType;
    
    switch (format) {
      case 'csv':
        const headers = ['Study', 'Year', 'Effect Size', 'CI Lower', 'CI Upper', 'SE', 'N1', 'N2', 'Weight'];
        const rows = studies.map(s => [
          s.name,
          s.year,
          s.effectSize,
          s.ci_lower,
          s.ci_upper,
          s.se,
          s.n1,
          s.n2,
          s.weight
        ]);
        
        if (metaResults) {
          rows.push([]);
          rows.push(['Meta-Analysis Results']);
          rows.push(['Method', metaAnalysisMethod === 'fixed' ? 'Fixed-Effect' : 'Random-Effects']);
          rows.push(['Pooled Effect', metaResults[metaAnalysisMethod + 'Effect'].estimate.toFixed(3)]);
          rows.push(['95% CI', `[${metaResults[metaAnalysisMethod + 'Effect'].ci_lower.toFixed(3)}, ${metaResults[metaAnalysisMethod + 'Effect'].ci_upper.toFixed(3)}]`]);
          rows.push(['p-value', metaResults[metaAnalysisMethod + 'Effect'].p.toFixed(4)]);
          
          if (heterogeneity) {
            rows.push([]);
            rows.push(['Heterogeneity']);
            rows.push(['I²', heterogeneity.I2.toFixed(1) + '%']);
            rows.push(['τ²', heterogeneity.tau2.toFixed(3)]);
            rows.push(['Q', heterogeneity.Q.toFixed(2)]);
            rows.push(['Q p-value', heterogeneity.Q_pvalue.toFixed(4)]);
          }
        }
        
        content = [headers, ...rows].map(row => row.join(',')).join('\n');
        mimeType = 'text/csv';
        break;
        
      case 'json':
        content = JSON.stringify({
          studies,
          metaResults,
          heterogeneity,
          publicationBias,
          sensitivityAnalysis,
          method: metaAnalysisMethod,
          metric: selectedMetric
        }, null, 2);
        mimeType = 'application/json';
        break;
        
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [studies, metaResults, heterogeneity, publicationBias, sensitivityAnalysis, metaAnalysisMethod, selectedMetric]);

  return (
    <div className="effect-size-comparison">
      <div className="comparison-header">
        <h2>Effect Size Comparison & Meta-Analysis</h2>
        <div className="header-controls">
          <div className="mode-selector">
            <label>Mode:</label>
            <select 
              value={comparisonMode} 
              onChange={(e) => setComparisonMode(e.target.value)}
            >
              <option value="individual">Individual Studies</option>
              <option value="meta-analysis">Meta-Analysis</option>
              <option value="subgroup">Subgroup Analysis</option>
            </select>
          </div>
          <div className="metric-selector">
            <label>Metric:</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <optgroup label="Mean Differences">
                <option value="cohens_d">Cohen's d</option>
                <option value="hedges_g">Hedges' g</option>
                <option value="glass_delta">Glass's Δ</option>
              </optgroup>
              <optgroup label="Correlations">
                <option value="pearson_r">Pearson's r</option>
                <option value="fishers_z">Fisher's z</option>
              </optgroup>
              <optgroup label="ANOVA">
                <option value="eta_squared">η²</option>
                <option value="partial_eta">Partial η²</option>
                <option value="omega_squared">ω²</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <div className="comparison-body">
        <div className="studies-panel">
          <div className="panel-header">
            <h3>Studies</h3>
            <button className="add-study-btn" onClick={addStudy}>
              + Add Study
            </button>
          </div>
          
          <div className="studies-table">
            <table>
              <thead>
                <tr>
                  <th>Study Name</th>
                  <th>Year</th>
                  <th>Effect Size</th>
                  <th>95% CI</th>
                  <th>SE</th>
                  <th>N₁</th>
                  <th>N₂</th>
                  <th>Quality</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studies.map(study => (
                  <tr key={study.id}>
                    <td>
                      <input
                        type="text"
                        value={study.name}
                        onChange={(e) => updateStudy(study.id, 'name', e.target.value)}
                        placeholder="Study name"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={study.year || ''}
                        onChange={(e) => updateStudy(study.id, 'year', parseInt(e.target.value))}
                        placeholder="Year"
                        min="1900"
                        max="2030"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={study.effectSize || ''}
                        onChange={(e) => updateStudy(study.id, 'effectSize', parseFloat(e.target.value))}
                        placeholder="ES"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <div className="ci-inputs">
                        <input
                          type="number"
                          value={study.ci_lower || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateStudy(study.id, 'ci_lower', val);
                            if (study.ci_upper !== null) {
                              const se = calculateSE(val, study.ci_upper);
                              updateStudy(study.id, 'se', se);
                              updateStudy(study.id, 'weight', calculateWeight(se));
                            }
                          }}
                          placeholder="Lower"
                          step="0.01"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          value={study.ci_upper || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updateStudy(study.id, 'ci_upper', val);
                            if (study.ci_lower !== null) {
                              const se = calculateSE(study.ci_lower, val);
                              updateStudy(study.id, 'se', se);
                              updateStudy(study.id, 'weight', calculateWeight(se));
                            }
                          }}
                          placeholder="Upper"
                          step="0.01"
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={study.se !== null ? study.se.toFixed(3) : ''}
                        onChange={(e) => {
                          const se = parseFloat(e.target.value);
                          updateStudy(study.id, 'se', se);
                          updateStudy(study.id, 'weight', calculateWeight(se));
                        }}
                        placeholder="SE"
                        step="0.001"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={study.n1 || ''}
                        onChange={(e) => updateStudy(study.id, 'n1', parseInt(e.target.value))}
                        placeholder="N₁"
                        min="1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={study.n2 || ''}
                        onChange={(e) => updateStudy(study.id, 'n2', parseInt(e.target.value))}
                        placeholder="N₂"
                        min="1"
                      />
                    </td>
                    <td>
                      <select
                        value={study.quality}
                        onChange={(e) => updateStudy(study.id, 'quality', parseInt(e.target.value))}
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map(q => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button 
                        className="remove-btn"
                        onClick={() => removeStudy(study.id)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comparisonMode === 'meta-analysis' && (
            <div className="meta-controls">
              <div className="method-selector">
                <label>Meta-Analysis Method:</label>
                <select
                  value={metaAnalysisMethod}
                  onChange={(e) => setMetaAnalysisMethod(e.target.value)}
                >
                  <option value="fixed">Fixed-Effect Model</option>
                  <option value="random">Random-Effects Model</option>
                  <option value="quality">Quality Effects Model</option>
                </select>
              </div>
              <button 
                className="run-meta-btn"
                onClick={performMetaAnalysis}
                disabled={studies.filter(s => s.effectSize !== null && s.se !== null).length < 2}
              >
                Run Meta-Analysis
              </button>
            </div>
          )}
        </div>

        <div className="visualization-panel">
          <div className="forest-plot-container">
            <h3>Forest Plot</h3>
            <canvas 
              ref={forestPlotRef}
              width={800}
              height={500}
              className="forest-plot"
            />
          </div>

          {metaResults && (
            <div className="meta-results">
              <h3>Meta-Analysis Results</h3>
              <div className="results-grid">
                <div className="result-item">
                  <label>Model:</label>
                  <span>{metaAnalysisMethod === 'fixed' ? 'Fixed-Effect' : 'Random-Effects'}</span>
                </div>
                <div className="result-item">
                  <label>Studies:</label>
                  <span>{metaResults.studies}</span>
                </div>
                <div className="result-item">
                  <label>Total N:</label>
                  <span>{metaResults.participants}</span>
                </div>
                <div className="result-item highlight">
                  <label>Pooled Effect:</label>
                  <span>
                    {metaResults[metaAnalysisMethod + 'Effect'].estimate.toFixed(3)}
                    {' '}
                    [{metaResults[metaAnalysisMethod + 'Effect'].ci_lower.toFixed(3)}, 
                    {' '}
                    {metaResults[metaAnalysisMethod + 'Effect'].ci_upper.toFixed(3)}]
                  </span>
                </div>
                <div className="result-item">
                  <label>Z-value:</label>
                  <span>{metaResults[metaAnalysisMethod + 'Effect'].z.toFixed(3)}</span>
                </div>
                <div className="result-item">
                  <label>p-value:</label>
                  <span className={metaResults[metaAnalysisMethod + 'Effect'].p < 0.05 ? 'significant' : ''}>
                    {metaResults[metaAnalysisMethod + 'Effect'].p < 0.001 ? '< 0.001' : 
                     metaResults[metaAnalysisMethod + 'Effect'].p.toFixed(4)}
                  </span>
                </div>
                {metaAnalysisMethod === 'random' && metaResults.randomEffect.predictionInterval && (
                  <div className="result-item">
                    <label>95% Prediction Interval:</label>
                    <span>
                      [{metaResults.randomEffect.predictionInterval.lower.toFixed(3)}, 
                      {' '}
                      {metaResults.randomEffect.predictionInterval.upper.toFixed(3)}]
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {heterogeneity && (
            <div className="heterogeneity-results">
              <h3>Heterogeneity Assessment</h3>
              <div className="results-grid">
                <div className="result-item">
                  <label>I² statistic:</label>
                  <span className={`heterogeneity-${
                    heterogeneity.I2 < 25 ? 'low' : 
                    heterogeneity.I2 < 50 ? 'moderate' : 
                    heterogeneity.I2 < 75 ? 'substantial' : 'considerable'
                  }`}>
                    {heterogeneity.I2.toFixed(1)}%
                  </span>
                </div>
                <div className="result-item">
                  <label>τ² (tau-squared):</label>
                  <span>{heterogeneity.tau2.toFixed(4)}</span>
                </div>
                <div className="result-item">
                  <label>τ (tau):</label>
                  <span>{heterogeneity.tau.toFixed(3)}</span>
                </div>
                <div className="result-item">
                  <label>Cochran's Q:</label>
                  <span>{heterogeneity.Q.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <label>Q p-value:</label>
                  <span className={heterogeneity.Q_pvalue < 0.05 ? 'significant' : ''}>
                    {heterogeneity.Q_pvalue < 0.001 ? '< 0.001' : heterogeneity.Q_pvalue.toFixed(4)}
                  </span>
                </div>
                <div className="result-item">
                  <label>H² statistic:</label>
                  <span>{heterogeneity.H2.toFixed(2)}</span>
                </div>
              </div>
              <div className="interpretation">
                <strong>Interpretation:</strong> 
                {heterogeneity.I2 < 25 ? ' Low heterogeneity - studies are consistent.' :
                 heterogeneity.I2 < 50 ? ' Moderate heterogeneity - some variability between studies.' :
                 heterogeneity.I2 < 75 ? ' Substantial heterogeneity - consider subgroup analysis.' :
                 ' Considerable heterogeneity - results should be interpreted with caution.'}
              </div>
            </div>
          )}

          {publicationBias && (
            <div className="publication-bias-results">
              <h3>Publication Bias Assessment</h3>
              <div className="results-grid">
                <div className="result-item">
                  <label>Egger's Test:</label>
                  <span className={publicationBias.egger.significant ? 'warning' : 'good'}>
                    p = {publicationBias.egger.p.toFixed(4)}
                  </span>
                </div>
                <div className="result-item">
                  <label>Intercept:</label>
                  <span>{publicationBias.egger.intercept.toFixed(3)} (SE: {publicationBias.egger.se.toFixed(3)})</span>
                </div>
                <div className="result-item">
                  <label>Fail-Safe N:</label>
                  <span>{publicationBias.failSafeN}</span>
                </div>
              </div>
              <div className="interpretation">
                <strong>Interpretation:</strong> {publicationBias.interpretation}
              </div>
            </div>
          )}

          {sensitivityAnalysis && (
            <div className="sensitivity-results">
              <h3>Sensitivity Analysis</h3>
              <div className="leave-one-out">
                <h4>Leave-One-Out Analysis</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Study Omitted</th>
                      <th>New Estimate</th>
                      <th>% Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityAnalysis.leaveOneOut.map((result, idx) => (
                      <tr key={idx} className={Math.abs(result.change) > 10 ? 'influential' : ''}>
                        <td>{result.omitted}</td>
                        <td>{result.estimate.toFixed(3)}</td>
                        <td>{result.change > 0 ? '+' : ''}{result.change.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="interpretation">
                <strong>Most Influential Study:</strong> {sensitivityAnalysis.mostInfluential?.omitted}
                <br />
                <strong>Robustness:</strong> {sensitivityAnalysis.robust ? 
                  ' Results are robust to individual study removal.' : 
                  ' Results are sensitive to individual studies.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="comparison-footer">
        <div className="export-controls">
          <button onClick={() => exportResults('csv')}>Export CSV</button>
          <button onClick={() => exportResults('json')}>Export JSON</button>
        </div>
        <div className="help-text">
          Enter effect sizes and confidence intervals or standard errors. Meta-analysis requires at least 2 studies with complete data.
        </div>
      </div>
    </div>
  );
};

export default EffectSizeComparison;