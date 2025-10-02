import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './ConfidenceIntervalPlotter.scss';

const CIMethods = {
  NORMAL: {
    id: 'normal',
    name: 'Normal (Wald)',
    description: 'Based on normal distribution assumption',
    formula: 'x̄ ± z_(α/2) × SE',
    assumptions: ['Large sample size (n ≥ 30)', 'Known population variance or large n'],
    when_to_use: 'Large samples with approximately normal distribution'
  },
  T_DISTRIBUTION: {
    id: 't',
    name: 't-Distribution',
    description: 'Student\'s t-distribution for small samples',
    formula: 'x̄ ± t_(α/2,df) × SE',
    assumptions: ['Normal distribution', 'Unknown population variance'],
    when_to_use: 'Small samples (n < 30) from normal population'
  },
  BOOTSTRAP_PERCENTILE: {
    id: 'boot_percentile',
    name: 'Bootstrap Percentile',
    description: 'Empirical percentiles from bootstrap distribution',
    formula: '[B^(-1)(α/2), B^(-1)(1-α/2)]',
    assumptions: ['Representative sample', 'Sufficient bootstrap samples'],
    when_to_use: 'Non-normal distributions, complex statistics'
  },
  BOOTSTRAP_BCA: {
    id: 'boot_bca',
    name: 'Bootstrap BCa',
    description: 'Bias-corrected and accelerated bootstrap',
    formula: 'Adjusted percentiles with bias and acceleration',
    assumptions: ['Representative sample', 'Smooth statistic'],
    when_to_use: 'When bootstrap distribution is skewed'
  },
  WILSON: {
    id: 'wilson',
    name: 'Wilson Score',
    description: 'For proportions, better than Wald for extreme values',
    formula: '[p̃ - z×√(p̃(1-p̃)/n+z²/4n²)] / (1+z²/n)',
    assumptions: ['Binary outcomes', 'Independent observations'],
    when_to_use: 'Proportions, especially near 0 or 1'
  },
  AGRESTI_COULL: {
    id: 'agresti_coull',
    name: 'Agresti-Coull',
    description: 'Adjusted Wald interval for proportions',
    formula: 'p̃ ± z×√(p̃(1-p̃)/ñ)',
    assumptions: ['Binary outcomes', 'n ≥ 10'],
    when_to_use: 'Proportions with moderate sample sizes'
  },
  PROFILE_LIKELIHOOD: {
    id: 'profile',
    name: 'Profile Likelihood',
    description: 'Based on likelihood ratio test',
    formula: '{θ: -2ln(L(θ)/L(θ̂)) ≤ χ²_(1-α)}',
    assumptions: ['Likelihood function available', 'Regular conditions'],
    when_to_use: 'Maximum likelihood estimation'
  },
  BAYESIAN_CREDIBLE: {
    id: 'bayesian',
    name: 'Bayesian Credible',
    description: 'Highest posterior density interval',
    formula: 'P(θ ∈ CI | data) = 1-α',
    assumptions: ['Prior distribution specified', 'Posterior computable'],
    when_to_use: 'When prior information is available'
  }
};

const DataTypes = {
  MEAN: 'mean',
  PROPORTION: 'proportion',
  MEDIAN: 'median',
  CORRELATION: 'correlation',
  REGRESSION: 'regression',
  DIFFERENCE: 'difference',
  RATIO: 'ratio'
};

const PlotTypes = {
  FOREST: 'forest',
  ERROR_BAR: 'error_bar',
  COMPARISON: 'comparison',
  COVERAGE: 'coverage',
  WIDTH: 'width'
};

const ConfidenceIntervalPlotter = () => {
  const dispatch = useDispatch();
  const { currentProject } = useSelector(state => state.project || {});
  
  const [groups, setGroups] = useState([]);
  const [dataType, setDataType] = useState('mean');
  const [ciMethod, setCiMethod] = useState('t');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [plotType, setPlotType] = useState('forest');
  const [showComparison, setShowComparison] = useState(false);
  const [bootstrapSamples, setBootstrapSamples] = useState(1000);
  const [coverageSimulation, setCoverageSimulation] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const mainPlotRef = useRef(null);
  const comparisonPlotRef = useRef(null);

  // Add new group
  const addGroup = useCallback(() => {
    const newGroup = {
      id: Date.now(),
      name: `Group ${groups.length + 1}`,
      data: '',
      estimate: null,
      ci_lower: null,
      ci_upper: null,
      se: null,
      n: null,
      ci_width: null,
      color: `hsl(${(groups.length * 60) % 360}, 60%, 50%)`
    };
    setGroups([...groups, newGroup]);
  }, [groups]);

  // Remove group
  const removeGroup = useCallback((id) => {
    setGroups(groups.filter(g => g.id !== id));
  }, [groups]);

  // Update group
  const updateGroup = useCallback((id, field, value) => {
    setGroups(groups.map(group => 
      group.id === id ? { ...group, [field]: value } : group
    ));
  }, [groups]);

  // Parse group data
  const parseGroupData = useCallback((dataString) => {
    if (!dataString.trim()) return null;
    
    const numbers = dataString
      .split(/[\s,\n]+/)
      .map(s => s.trim())
      .filter(s => s)
      .map(s => parseFloat(s))
      .filter(n => !isNaN(n));
    
    return numbers.length > 0 ? numbers : null;
  }, []);

  // Calculate statistics for group
  const calculateGroupStatistics = useCallback((data) => {
    if (!data || data.length === 0) return null;
    
    const n = data.length;
    const mean = data.reduce((sum, x) => sum + x, 0) / n;
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const se = sd / Math.sqrt(n);
    
    const sorted = [...data].sort((a, b) => a - b);
    const median = n % 2 === 0 
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
      : sorted[Math.floor(n/2)];
    
    return { n, mean, median, sd, se, variance, min: sorted[0], max: sorted[n - 1] };
  }, []);

  // Calculate confidence interval
  const calculateCI = useCallback((data, stats, method, level) => {
    const alpha = 1 - level;
    const z = qnorm(1 - alpha / 2);
    const df = stats.n - 1;
    
    switch (method) {
      case 'normal':
        return {
          estimate: stats.mean,
          lower: stats.mean - z * stats.se,
          upper: stats.mean + z * stats.se,
          method: 'Normal'
        };
        
      case 't':
        const t = qt(1 - alpha / 2, df);
        return {
          estimate: stats.mean,
          lower: stats.mean - t * stats.se,
          upper: stats.mean + t * stats.se,
          method: 't-Distribution'
        };
        
      case 'boot_percentile':
        return bootstrapCI(data, 'percentile', bootstrapSamples, alpha);
        
      case 'boot_bca':
        return bootstrapCI(data, 'bca', bootstrapSamples, alpha);
        
      case 'wilson':
        // For proportions
        const p = stats.mean; // Assuming proportion
        const n = stats.n;
        const z2 = z * z;
        const denominator = 1 + z2 / n;
        const center = (p + z2 / (2 * n)) / denominator;
        const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / denominator;
        
        return {
          estimate: p,
          lower: Math.max(0, center - spread),
          upper: Math.min(1, center + spread),
          method: 'Wilson'
        };
        
      case 'agresti_coull':
        // Adjusted Wald
        const n_tilde = stats.n + z * z;
        const p_tilde = (stats.mean * stats.n + z * z / 2) / n_tilde;
        const se_tilde = Math.sqrt(p_tilde * (1 - p_tilde) / n_tilde);
        
        return {
          estimate: p_tilde,
          lower: Math.max(0, p_tilde - z * se_tilde),
          upper: Math.min(1, p_tilde + z * se_tilde),
          method: 'Agresti-Coull'
        };
        
      default:
        return calculateCI(data, stats, 't', level); // Default to t
    }
  }, [bootstrapSamples]);

  // Bootstrap confidence interval
  const bootstrapCI = (data, type, B, alpha) => {
    const n = data.length;
    const estimates = [];
    
    // Generate bootstrap samples
    for (let b = 0; b < B; b++) {
      const sample = [];
      for (let i = 0; i < n; i++) {
        sample.push(data[Math.floor(Math.random() * n)]);
      }
      estimates.push(sample.reduce((sum, x) => sum + x, 0) / n);
    }
    
    estimates.sort((a, b) => a - b);
    const originalEstimate = data.reduce((sum, x) => sum + x, 0) / n;
    
    if (type === 'percentile') {
      const lowerIdx = Math.floor(B * alpha / 2);
      const upperIdx = Math.floor(B * (1 - alpha / 2));
      
      return {
        estimate: originalEstimate,
        lower: estimates[lowerIdx],
        upper: estimates[upperIdx],
        method: 'Bootstrap Percentile'
      };
    } else if (type === 'bca') {
      // Bias-corrected and accelerated
      // Calculate bias correction
      const z0 = qnorm(estimates.filter(e => e < originalEstimate).length / B);
      
      // Calculate acceleration (jackknife)
      const jackknife = [];
      for (let i = 0; i < n; i++) {
        const jData = data.filter((_, idx) => idx !== i);
        jackknife.push(jData.reduce((sum, x) => sum + x, 0) / (n - 1));
      }
      
      const jMean = jackknife.reduce((sum, x) => sum + x, 0) / n;
      const num = jackknife.reduce((sum, x) => sum + Math.pow(x - jMean, 3), 0);
      const den = Math.pow(jackknife.reduce((sum, x) => sum + Math.pow(x - jMean, 2), 0), 1.5);
      const a = num / (6 * den);
      
      // Adjusted percentiles
      const z_alpha_2 = qnorm(alpha / 2);
      const z_1_alpha_2 = qnorm(1 - alpha / 2);
      
      const alpha1 = pnorm(z0 + (z0 + z_alpha_2) / (1 - a * (z0 + z_alpha_2)));
      const alpha2 = pnorm(z0 + (z0 + z_1_alpha_2) / (1 - a * (z0 + z_1_alpha_2)));
      
      const lowerIdx = Math.floor(B * alpha1);
      const upperIdx = Math.floor(B * alpha2);
      
      return {
        estimate: originalEstimate,
        lower: estimates[Math.max(0, lowerIdx)],
        upper: estimates[Math.min(B - 1, upperIdx)],
        method: 'Bootstrap BCa'
      };
    }
  };

  // Statistical distribution functions
  const qnorm = (p) => {
    // Inverse normal CDF (Beasley-Springer-Moro algorithm)
    const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
    const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833];
    const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
              0.0276438810333863, 0.0038405729373609, 0.0003951896511919,
              0.0000321767881768, 0.0000002888167364, 0.0000003960315187];
    
    const y = p - 0.5;
    if (Math.abs(y) < 0.42) {
      const z = y * y;
      return y * (((a[3] * z + a[2]) * z + a[1]) * z + a[0]) /
             ((((b[3] * z + b[2]) * z + b[1]) * z + b[0]) * z + 1);
    } else {
      let z = y > 0 ? -Math.log(1 - p) : -Math.log(p);
      let x = c[0];
      for (let i = 1; i < 9; i++) {
        x = x * z + c[i];
      }
      return y > 0 ? Math.sqrt(x) : -Math.sqrt(x);
    }
  };

  const pnorm = (z) => {
    // Normal CDF
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

  const qt = (p, df) => {
    // Inverse t-distribution (approximation)
    const z = qnorm(p);
    const g1 = (z * z - 1) / 4;
    const g2 = (5 * z * z * z * z - 16 * z * z + 3) / 96;
    const g3 = (3 * z * z * z * z * z * z - 19 * z * z * z * z + 17 * z * z - 3) / 384;
    
    return z + g1 / df + g2 / (df * df) + g3 / (df * df * df);
  };

  // Calculate all CIs for groups
  const calculateAllCIs = useCallback(() => {
    if (groups.length === 0) return;
    
    setIsCalculating(true);
    
    const updatedGroups = groups.map(group => {
      const data = parseGroupData(group.data);
      if (!data) return group;
      
      const stats = calculateGroupStatistics(data);
      const ci = calculateCI(data, stats, ciMethod, confidenceLevel);
      
      return {
        ...group,
        estimate: ci.estimate,
        ci_lower: ci.lower,
        ci_upper: ci.upper,
        se: stats.se,
        n: stats.n,
        ci_width: ci.upper - ci.lower
      };
    });
    
    setGroups(updatedGroups);
    setIsCalculating(false);
  }, [groups, ciMethod, confidenceLevel, parseGroupData, calculateGroupStatistics, calculateCI]);

  // Simulate coverage
  const simulateCoverage = useCallback(() => {
    if (groups.length === 0 || !groups[0].data) return;
    
    setIsCalculating(true);
    
    const data = parseGroupData(groups[0].data);
    if (!data) return;
    
    const stats = calculateGroupStatistics(data);
    const trueMean = stats.mean;
    const trueSD = stats.sd;
    const n = stats.n;
    
    const nSims = 1000;
    const methods = ['normal', 't', 'boot_percentile'];
    const results = {};
    
    methods.forEach(method => {
      let coverage = 0;
      const widths = [];
      
      for (let sim = 0; sim < nSims; sim++) {
        // Generate sample from normal distribution
        const sample = [];
        for (let i = 0; i < n; i++) {
          sample.push(trueMean + trueSD * qnorm(Math.random()));
        }
        
        const sampleStats = calculateGroupStatistics(sample);
        const ci = calculateCI(sample, sampleStats, method, confidenceLevel);
        
        if (ci.lower <= trueMean && trueMean <= ci.upper) {
          coverage++;
        }
        widths.push(ci.upper - ci.lower);
      }
      
      results[method] = {
        coverage: coverage / nSims,
        avgWidth: widths.reduce((sum, w) => sum + w, 0) / nSims,
        sdWidth: Math.sqrt(widths.reduce((sum, w) => {
          const diff = w - results[method].avgWidth;
          return sum + diff * diff;
        }, 0) / (nSims - 1))
      };
    });
    
    setCoverageSimulation(results);
    setIsCalculating(false);
  }, [groups, confidenceLevel, parseGroupData, calculateGroupStatistics, calculateCI]);

  // Draw forest plot
  const drawForestPlot = useCallback(() => {
    if (!mainPlotRef.current || groups.length === 0) return;
    
    const canvas = mainPlotRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const margin = { top: 40, right: 80, bottom: 60, left: 150 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Filter groups with CIs
    const validGroups = groups.filter(g => g.estimate !== null);
    if (validGroups.length === 0) return;
    
    // Calculate scale
    const allValues = [];
    validGroups.forEach(g => {
      allValues.push(g.estimate, g.ci_lower, g.ci_upper);
    });
    
    const xMin = Math.min(...allValues) * 0.9;
    const xMax = Math.max(...allValues) * 1.1;
    const xScale = plotWidth / (xMax - xMin);
    
    const yStep = plotHeight / (validGroups.length + 1);
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Reference line (if applicable)
    const refValue = dataType === 'difference' ? 0 : null;
    if (refValue !== null) {
      const refX = margin.left + (refValue - xMin) * xScale;
      ctx.strokeStyle = '#999';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(refX, margin.top);
      ctx.lineTo(refX, height - margin.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // X-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '11px IBM Plex Sans';
    ctx.textAlign = 'center';
    
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const value = xMin + (xMax - xMin) * i / xTicks;
      const x = margin.left + (value - xMin) * xScale;
      
      ctx.fillText(value.toFixed(2), x, height - margin.bottom + 20);
      
      // Tick marks
      ctx.beginPath();
      ctx.moveTo(x, height - margin.bottom);
      ctx.lineTo(x, height - margin.bottom + 5);
      ctx.stroke();
    }
    
    // Draw groups
    validGroups.forEach((group, i) => {
      const y = margin.top + (i + 1) * yStep;
      
      // Group name
      ctx.fillStyle = '#333';
      ctx.font = '12px IBM Plex Sans';
      ctx.textAlign = 'right';
      ctx.fillText(group.name, margin.left - 10, y + 4);
      
      // CI line
      const x1 = margin.left + (group.ci_lower - xMin) * xScale;
      const x2 = margin.left + (group.ci_upper - xMin) * xScale;
      
      ctx.strokeStyle = group.color || '#3498db';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      
      // CI endpoints
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y - 6);
      ctx.lineTo(x1, y + 6);
      ctx.moveTo(x2, y - 6);
      ctx.lineTo(x2, y + 6);
      ctx.stroke();
      
      // Point estimate
      const xEst = margin.left + (group.estimate - xMin) * xScale;
      ctx.fillStyle = group.color || '#3498db';
      ctx.beginPath();
      ctx.arc(xEst, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Values text
      ctx.fillStyle = '#333';
      ctx.font = '11px IBM Plex Mono';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${group.estimate.toFixed(2)} [${group.ci_lower.toFixed(2)}, ${group.ci_upper.toFixed(2)}]`,
        width - margin.right + 10,
        y + 4
      );
    });
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${(confidenceLevel * 100).toFixed(0)}% Confidence Intervals (${CIMethods[ciMethod.toUpperCase()]?.name || ciMethod})`,
      width / 2,
      25
    );
    
    // X-axis label
    ctx.font = '12px IBM Plex Sans';
    ctx.fillText(
      dataType === 'mean' ? 'Mean' : 
      dataType === 'proportion' ? 'Proportion' : 
      dataType === 'difference' ? 'Difference' : 'Estimate',
      width / 2,
      height - 10
    );
  }, [groups, dataType, ciMethod, confidenceLevel]);

  // Draw comparison plot
  const drawComparisonPlot = useCallback(() => {
    if (!comparisonPlotRef.current || groups.length === 0) return;
    
    const canvas = comparisonPlotRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const methods = ['normal', 't', 'boot_percentile'];
    const margin = { top: 40, right: 20, bottom: 60, left: 100 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Calculate CIs for all methods for first group
    const firstGroup = groups[0];
    const data = parseGroupData(firstGroup.data);
    if (!data) return;
    
    const stats = calculateGroupStatistics(data);
    const results = [];
    
    methods.forEach(method => {
      const ci = calculateCI(data, stats, method, confidenceLevel);
      results.push({
        method,
        name: CIMethods[method.toUpperCase()]?.name || method,
        ...ci
      });
    });
    
    // Calculate scale
    const allValues = [];
    results.forEach(r => {
      allValues.push(r.estimate, r.lower, r.upper);
    });
    
    const xMin = Math.min(...allValues) * 0.95;
    const xMax = Math.max(...allValues) * 1.05;
    const xScale = plotWidth / (xMax - xMin);
    
    const yStep = plotHeight / (methods.length + 1);
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Draw methods
    results.forEach((result, i) => {
      const y = margin.top + (i + 1) * yStep;
      
      // Method name
      ctx.fillStyle = '#333';
      ctx.font = '12px IBM Plex Sans';
      ctx.textAlign = 'right';
      ctx.fillText(result.name, margin.left - 10, y + 4);
      
      // CI line
      const x1 = margin.left + (result.lower - xMin) * xScale;
      const x2 = margin.left + (result.upper - xMin) * xScale;
      
      const colors = ['#3498db', '#e74c3c', '#27ae60'];
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      
      // Endpoints
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y - 8);
      ctx.lineTo(x1, y + 8);
      ctx.moveTo(x2, y - 8);
      ctx.lineTo(x2, y + 8);
      ctx.stroke();
      
      // Point estimate
      const xEst = margin.left + (result.estimate - xMin) * xScale;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(xEst, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Width annotation
      ctx.fillStyle = '#666';
      ctx.font = '10px IBM Plex Mono';
      ctx.textAlign = 'center';
      const width = result.upper - result.lower;
      ctx.fillText(
        `w=${width.toFixed(3)}`,
        (x1 + x2) / 2,
        y - 15
      );
    });
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText('CI Method Comparison', width / 2, 25);
  }, [groups, confidenceLevel, parseGroupData, calculateGroupStatistics, calculateCI]);

  // Update plots
  useEffect(() => {
    drawForestPlot();
  }, [groups, drawForestPlot]);

  useEffect(() => {
    if (showComparison) {
      drawComparisonPlot();
    }
  }, [groups, showComparison, drawComparisonPlot]);

  // Export results
  const exportResults = useCallback((format = 'csv') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `confidence_intervals_${timestamp}`;
    
    let content, mimeType;
    
    switch (format) {
      case 'csv':
        const headers = ['Group', 'N', 'Estimate', 'CI_Lower', 'CI_Upper', 'SE', 'Width', 'Method', 'Level'];
        const rows = groups
          .filter(g => g.estimate !== null)
          .map(g => [
            g.name,
            g.n,
            g.estimate?.toFixed(4),
            g.ci_lower?.toFixed(4),
            g.ci_upper?.toFixed(4),
            g.se?.toFixed(4),
            g.ci_width?.toFixed(4),
            CIMethods[ciMethod.toUpperCase()]?.name,
            (confidenceLevel * 100).toFixed(0) + '%'
          ]);
        
        content = [headers, ...rows].map(row => row.join(',')).join('\n');
        mimeType = 'text/csv';
        break;
        
      case 'json':
        content = JSON.stringify({
          groups: groups.filter(g => g.estimate !== null),
          method: ciMethod,
          level: confidenceLevel,
          dataType,
          coverageSimulation
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
  }, [groups, ciMethod, confidenceLevel, dataType, coverageSimulation]);

  return (
    <div className="confidence-interval-plotter">
      <div className="plotter-header">
        <h2>Confidence Interval Visualization</h2>
        <div className="header-controls">
          <div className="control-group">
            <label>Data Type:</label>
            <select value={dataType} onChange={(e) => setDataType(e.target.value)}>
              {Object.entries(DataTypes).map(([key, value]) => (
                <option key={key} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>CI Method:</label>
            <select value={ciMethod} onChange={(e) => setCiMethod(e.target.value)}>
              {Object.values(CIMethods).map(method => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Confidence Level:</label>
            <select 
              value={confidenceLevel} 
              onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
            >
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
              <option value={0.999}>99.9%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="plotter-body">
        <div className="input-section">
          <div className="groups-panel">
            <div className="panel-header">
              <h3>Data Groups</h3>
              <button className="add-group-btn" onClick={addGroup}>
                + Add Group
              </button>
            </div>
            
            <div className="groups-list">
              {groups.map(group => (
                <div key={group.id} className="group-card">
                  <div className="group-header">
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                      className="group-name"
                      placeholder="Group name"
                    />
                    <button 
                      className="remove-btn"
                      onClick={() => removeGroup(group.id)}
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    value={group.data}
                    onChange={(e) => updateGroup(group.id, 'data', e.target.value)}
                    placeholder="Enter data values (space or comma separated)..."
                    rows={3}
                  />
                  {group.estimate !== null && (
                    <div className="group-results">
                      <span>n={group.n}</span>
                      <span>Est: {group.estimate?.toFixed(3)}</span>
                      <span>CI: [{group.ci_lower?.toFixed(3)}, {group.ci_upper?.toFixed(3)}]</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="method-info">
            <h4>{CIMethods[ciMethod.toUpperCase()]?.name}</h4>
            <p className="description">{CIMethods[ciMethod.toUpperCase()]?.description}</p>
            <div className="formula">
              <strong>Formula:</strong> {CIMethods[ciMethod.toUpperCase()]?.formula}
            </div>
            <div className="assumptions">
              <strong>Assumptions:</strong>
              <ul>
                {CIMethods[ciMethod.toUpperCase()]?.assumptions.map((assumption, idx) => (
                  <li key={idx}>{assumption}</li>
                ))}
              </ul>
            </div>
            <div className="when-to-use">
              <strong>When to use:</strong> {CIMethods[ciMethod.toUpperCase()]?.when_to_use}
            </div>
          </div>

          {(ciMethod === 'boot_percentile' || ciMethod === 'boot_bca') && (
            <div className="bootstrap-settings">
              <label>Bootstrap Samples:</label>
              <input
                type="number"
                value={bootstrapSamples}
                onChange={(e) => setBootstrapSamples(parseInt(e.target.value))}
                min="100"
                max="10000"
                step="100"
              />
            </div>
          )}

          <div className="action-buttons">
            <button 
              className="calculate-btn"
              onClick={calculateAllCIs}
              disabled={groups.length === 0 || isCalculating}
            >
              {isCalculating ? 'Calculating...' : 'Calculate CIs'}
            </button>
            <button
              className="compare-btn"
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? 'Hide' : 'Show'} Method Comparison
            </button>
            <button
              className="simulate-btn"
              onClick={simulateCoverage}
              disabled={groups.length === 0 || !groups[0].data}
            >
              Simulate Coverage
            </button>
          </div>
        </div>

        <div className="visualization-section">
          <div className="main-plot">
            <canvas
              ref={mainPlotRef}
              width={700}
              height={400}
              className="forest-plot"
            />
          </div>

          {showComparison && (
            <div className="comparison-plot">
              <canvas
                ref={comparisonPlotRef}
                width={700}
                height={300}
                className="method-comparison"
              />
            </div>
          )}

          {coverageSimulation && (
            <div className="coverage-results">
              <h3>Coverage Simulation Results (1000 simulations)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Actual Coverage</th>
                    <th>Nominal Coverage</th>
                    <th>Coverage Error</th>
                    <th>Avg Width</th>
                    <th>Width SD</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(coverageSimulation).map(([method, results]) => (
                    <tr key={method}>
                      <td>{CIMethods[method.toUpperCase()]?.name || method}</td>
                      <td className={Math.abs(results.coverage - confidenceLevel) > 0.02 ? 'warning' : 'good'}>
                        {(results.coverage * 100).toFixed(1)}%
                      </td>
                      <td>{(confidenceLevel * 100).toFixed(0)}%</td>
                      <td className={Math.abs(results.coverage - confidenceLevel) > 0.02 ? 'warning' : ''}>
                        {((results.coverage - confidenceLevel) * 100).toFixed(1)}%
                      </td>
                      <td>{results.avgWidth.toFixed(4)}</td>
                      <td>{results.sdWidth?.toFixed(4) || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="coverage-interpretation">
                <strong>Interpretation:</strong> Methods with coverage close to nominal level 
                ({(confidenceLevel * 100).toFixed(0)}%) are performing well. 
                Deviations > 2% suggest violation of assumptions.
              </div>
            </div>
          )}

          {groups.filter(g => g.ci_width !== null).length > 1 && (
            <div className="width-comparison">
              <h3>CI Width Comparison</h3>
              <table>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Width</th>
                    <th>Relative to Narrowest</th>
                    <th>Precision Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {groups
                    .filter(g => g.ci_width !== null)
                    .sort((a, b) => a.ci_width - b.ci_width)
                    .map((group, idx) => {
                      const minWidth = Math.min(...groups.filter(g => g.ci_width !== null).map(g => g.ci_width));
                      return (
                        <tr key={group.id}>
                          <td>{group.name}</td>
                          <td>{group.ci_width.toFixed(4)}</td>
                          <td>{((group.ci_width / minWidth - 1) * 100).toFixed(1)}%</td>
                          <td>{idx + 1}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="plotter-footer">
        <div className="export-controls">
          <button onClick={() => exportResults('csv')}>Export CSV</button>
          <button onClick={() => exportResults('json')}>Export JSON</button>
        </div>
        <div className="info-text">
          Enter data for each group to visualize confidence intervals. 
          Compare different CI methods and assess coverage properties.
        </div>
      </div>
    </div>
  );
};

export default ConfidenceIntervalPlotter;