import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './InterpretationGuide.scss';

const DomainBenchmarks = {
  PSYCHOLOGY: {
    id: 'psychology',
    name: 'Psychology & Behavioral Sciences',
    description: 'Human behavior and cognitive processes',
    benchmarks: {
      cohens_d: {
        negligible: { min: 0, max: 0.01, label: 'Negligible', color: '#95a5a6' },
        very_small: { min: 0.01, max: 0.2, label: 'Very Small', color: '#3498db' },
        small: { min: 0.2, max: 0.5, label: 'Small', color: '#2ecc71' },
        medium: { min: 0.5, max: 0.8, label: 'Medium', color: '#f39c12' },
        large: { min: 0.8, max: 1.2, label: 'Large', color: '#e67e22' },
        very_large: { min: 1.2, max: 2.0, label: 'Very Large', color: '#e74c3c' },
        huge: { min: 2.0, max: Infinity, label: 'Huge', color: '#c0392b' }
      },
      correlation: {
        negligible: { min: 0, max: 0.1, label: 'Negligible' },
        small: { min: 0.1, max: 0.3, label: 'Small' },
        medium: { min: 0.3, max: 0.5, label: 'Medium' },
        large: { min: 0.5, max: 0.7, label: 'Large' },
        very_large: { min: 0.7, max: 0.9, label: 'Very Large' },
        near_perfect: { min: 0.9, max: 1.0, label: 'Near Perfect' }
      }
    },
    examples: [
      { effect: 0.2, description: 'Difference barely perceptible' },
      { effect: 0.5, description: 'Difference noticeable to careful observer' },
      { effect: 0.8, description: 'Difference obvious to casual observer' },
      { effect: 1.2, description: 'Groups barely overlap' }
    ]
  },
  MEDICINE: {
    id: 'medicine',
    name: 'Medicine & Clinical Research',
    description: 'Clinical trials and medical interventions',
    benchmarks: {
      cohens_d: {
        no_effect: { min: 0, max: 0.1, label: 'No Clinical Effect', color: '#95a5a6' },
        minimal: { min: 0.1, max: 0.3, label: 'Minimal', color: '#3498db' },
        small: { min: 0.3, max: 0.5, label: 'Small Clinical', color: '#2ecc71' },
        moderate: { min: 0.5, max: 0.7, label: 'Moderate Clinical', color: '#f39c12' },
        substantial: { min: 0.7, max: 1.0, label: 'Substantial', color: '#e67e22' },
        large: { min: 1.0, max: Infinity, label: 'Large Clinical', color: '#e74c3c' }
      },
      nnt: {
        excellent: { min: 1, max: 3, label: 'Excellent' },
        good: { min: 3, max: 7, label: 'Good' },
        moderate: { min: 7, max: 20, label: 'Moderate' },
        modest: { min: 20, max: 50, label: 'Modest' },
        minimal: { min: 50, max: Infinity, label: 'Minimal' }
      }
    },
    examples: [
      { effect: 0.2, description: 'Aspirin for heart attack prevention (NNT≈100)' },
      { effect: 0.5, description: 'Statins for cardiovascular disease (NNT≈20)' },
      { effect: 0.8, description: 'Antibiotics for bacterial infection (NNT≈4)' },
      { effect: 1.5, description: 'Epinephrine for anaphylaxis (NNT≈2)' }
    ]
  },
  EDUCATION: {
    id: 'education',
    name: 'Education & Learning',
    description: 'Educational interventions and student achievement',
    benchmarks: {
      cohens_d: {
        negligible: { min: 0, max: 0.05, label: 'Negligible', color: '#95a5a6' },
        small: { min: 0.05, max: 0.2, label: 'Small', color: '#3498db' },
        moderate: { min: 0.2, max: 0.4, label: 'Moderate', color: '#2ecc71' },
        educationally_significant: { min: 0.4, max: 0.7, label: 'Educationally Significant', color: '#f39c12' },
        large: { min: 0.7, max: 1.0, label: 'Large', color: '#e67e22' },
        very_large: { min: 1.0, max: Infinity, label: 'Very Large', color: '#e74c3c' }
      },
      months_progress: {
        formula: 'd × 8', // Approximate months of additional progress
        interpretation: 'Months of additional learning progress'
      }
    },
    examples: [
      { effect: 0.15, description: 'Homework in elementary school' },
      { effect: 0.4, description: 'Feedback on student work' },
      { effect: 0.7, description: 'Direct instruction methods' },
      { effect: 1.0, description: 'One-on-one tutoring' }
    ]
  },
  SOCIAL_SCIENCE: {
    id: 'social_science',
    name: 'Social Sciences',
    description: 'Sociology, economics, political science',
    benchmarks: {
      cohens_d: {
        trivial: { min: 0, max: 0.1, label: 'Trivial', color: '#95a5a6' },
        small: { min: 0.1, max: 0.3, label: 'Small', color: '#3498db' },
        moderate: { min: 0.3, max: 0.5, label: 'Moderate', color: '#2ecc71' },
        substantial: { min: 0.5, max: 0.8, label: 'Substantial', color: '#f39c12' },
        large: { min: 0.8, max: 1.2, label: 'Large', color: '#e67e22' },
        very_large: { min: 1.2, max: Infinity, label: 'Very Large', color: '#e74c3c' }
      },
      variance_explained: {
        small: { min: 0, max: 0.01, label: 'Small (< 1%)' },
        medium: { min: 0.01, max: 0.09, label: 'Medium (1-9%)' },
        large: { min: 0.09, max: 0.25, label: 'Large (9-25%)' },
        very_large: { min: 0.25, max: 1.0, label: 'Very Large (> 25%)' }
      }
    },
    examples: [
      { effect: 0.2, description: 'Gender differences in risk-taking' },
      { effect: 0.5, description: 'Education level on income' },
      { effect: 0.8, description: 'Social support on well-being' },
      { effect: 1.2, description: 'Cultural differences in collectivism' }
    ]
  }
};

const EffectSizeMetrics = {
  COHENS_D: {
    id: 'cohens_d',
    name: "Cohen's d",
    formula: 'd = (M₁ - M₂) / SD_pooled',
    range: [-3, 3],
    interpretation: 'Standardized mean difference'
  },
  HEDGES_G: {
    id: 'hedges_g',
    name: "Hedges' g",
    formula: 'g = d × (1 - 3/(4df - 1))',
    range: [-3, 3],
    interpretation: 'Bias-corrected standardized mean difference'
  },
  CORRELATION: {
    id: 'correlation',
    name: 'Correlation (r)',
    formula: 'r = cov(X,Y) / (σ_X × σ_Y)',
    range: [-1, 1],
    interpretation: 'Linear relationship strength'
  },
  ODDS_RATIO: {
    id: 'odds_ratio',
    name: 'Odds Ratio',
    formula: 'OR = (a×d) / (b×c)',
    range: [0, 10],
    interpretation: 'Ratio of odds between groups'
  },
  RISK_RATIO: {
    id: 'risk_ratio',
    name: 'Risk Ratio',
    formula: 'RR = P(event|exposed) / P(event|control)',
    range: [0, 5],
    interpretation: 'Relative risk between groups'
  },
  NNT: {
    id: 'nnt',
    name: 'Number Needed to Treat',
    formula: 'NNT = 1 / ARR',
    range: [1, 100],
    interpretation: 'Patients needed to prevent one event'
  }
};

const PracticalMetrics = {
  PROBABILITY_SUPERIORITY: {
    name: 'Probability of Superiority',
    formula: 'PS = Φ(d/√2)',
    interpretation: 'Probability that a random person from group 1 scores higher than group 2'
  },
  COMMON_LANGUAGE: {
    name: 'Common Language Effect Size',
    formula: 'CLES = Φ(d)',
    interpretation: 'Percentage of pairs where group 1 > group 2'
  },
  OVERLAP: {
    name: 'Overlap Coefficient',
    formula: 'OVL = 2×Φ(-|d|/2)',
    interpretation: 'Proportion of overlap between distributions'
  },
  COHEN_U3: {
    name: "Cohen's U₃",
    formula: 'U₃ = Φ(d)',
    interpretation: 'Percentage of group 2 below mean of group 1'
  }
};

const InterpretationGuide = () => {
  const dispatch = useDispatch();
  const { currentProject } = useSelector(state => state.project || {});
  
  const [selectedDomain, setSelectedDomain] = useState('psychology');
  const [effectSizeType, setEffectSizeType] = useState('cohens_d');
  const [effectSizeValue, setEffectSizeValue] = useState('');
  const [sampleSize, setSampleSize] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [interpretation, setInterpretation] = useState(null);
  const [practicalMetrics, setPracticalMetrics] = useState(null);
  const [visualMode, setVisualMode] = useState('scale'); // scale, distribution, comparison
  
  const scaleRef = useRef(null);
  const distributionRef = useRef(null);

  // Calculate practical metrics
  const calculatePracticalMetrics = useCallback((d) => {
    const absD = Math.abs(d);
    
    // Normal CDF approximation
    const phi = (z) => {
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
    
    return {
      probabilitySuperiority: phi(d / Math.sqrt(2)),
      commonLanguage: phi(d),
      overlap: 2 * phi(-absD / 2),
      cohenU3: phi(d),
      percentNonoverlap: (1 - 2 * phi(-absD / 2)) * 100,
      
      // Convert to other metrics
      correlation: d / Math.sqrt(d * d + 4),
      oddsRatio: Math.exp(d * Math.PI / Math.sqrt(3)),
      
      // NNT calculation (assuming binary outcome)
      nnt: baseRate ? Math.ceil(1 / (phi(d) - 0.5) / (parseFloat(baseRate) / 100)) : null
    };
  }, [baseRate]);

  // Get domain-specific interpretation
  const getDomainInterpretation = useCallback((value, domain, metric) => {
    const domainData = DomainBenchmarks[domain.toUpperCase()];
    if (!domainData) return null;
    
    const benchmarks = domainData.benchmarks[metric];
    if (!benchmarks) return null;
    
    const absValue = Math.abs(value);
    
    for (const [key, range] of Object.entries(benchmarks)) {
      if (absValue >= range.min && absValue < range.max) {
        return {
          category: range.label,
          color: range.color || '#3498db',
          range: range,
          examples: domainData.examples.filter(e => 
            Math.abs(e.effect) >= range.min && Math.abs(e.effect) < range.max
          )
        };
      }
    }
    
    return null;
  }, []);

  // Generate interpretation
  const generateInterpretation = useCallback(() => {
    const value = parseFloat(effectSizeValue);
    if (isNaN(value)) {
      alert('Please enter a valid effect size value');
      return;
    }
    
    const domainInterp = getDomainInterpretation(value, selectedDomain, effectSizeType);
    const practical = calculatePracticalMetrics(value);
    
    // Statistical significance check (if sample size provided)
    let significance = null;
    if (sampleSize) {
      const n = parseInt(sampleSize);
      const se = Math.sqrt(2 / n); // Approximate SE for Cohen's d
      const z = Math.abs(value) / se;
      const pValue = 2 * (1 - phi(z));
      
      significance = {
        z,
        pValue,
        significant: pValue < 0.05,
        ci_lower: value - 1.96 * se,
        ci_upper: value + 1.96 * se
      };
    }
    
    // Generate narrative interpretation
    const narrative = generateNarrative(value, domainInterp, practical, significance);
    
    setInterpretation({
      value,
      domain: selectedDomain,
      domainSpecific: domainInterp,
      significance,
      narrative
    });
    
    setPracticalMetrics(practical);
  }, [effectSizeValue, selectedDomain, effectSizeType, sampleSize, getDomainInterpretation, calculatePracticalMetrics]);

  // Helper for normal CDF
  const phi = (z) => {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    
    const t = 1 / (1 + p * z);
    const erf = 1 - (((((a5 * t * t * t * t * t + a4 * t * t * t * t) + a3 * t * t * t) + a2 * t * t) + a1 * t) * Math.exp(-z * z));
    
    return 0.5 * (1 + sign * erf);
  };

  // Generate narrative interpretation
  const generateNarrative = (value, domainInterp, practical, significance) => {
    const absValue = Math.abs(value);
    const direction = value > 0 ? 'favors treatment' : 'favors control';
    
    let narrative = [];
    
    // Effect size magnitude
    narrative.push(`An effect size of ${absValue.toFixed(2)} ${direction} and is considered ${domainInterp?.category || 'moderate'} in ${DomainBenchmarks[selectedDomain.toUpperCase()].name}.`);
    
    // Practical interpretation
    narrative.push(`This means that ${(practical.probabilitySuperiority * 100).toFixed(1)}% of the time, a randomly selected person from the treatment group will have a better outcome than someone from the control group.`);
    
    // Overlap
    narrative.push(`The two groups have ${(practical.overlap * 100).toFixed(1)}% overlap in their distributions.`);
    
    // Statistical significance
    if (significance) {
      if (significance.significant) {
        narrative.push(`With n=${sampleSize}, this effect is statistically significant (p=${significance.pValue.toFixed(4)}).`);
      } else {
        narrative.push(`With n=${sampleSize}, this effect is not statistically significant (p=${significance.pValue.toFixed(4)}). A larger sample may be needed.`);
      }
    }
    
    // Domain-specific examples
    if (domainInterp?.examples && domainInterp.examples.length > 0) {
      narrative.push(`Similar effect sizes in this field: ${domainInterp.examples[0].description}.`);
    }
    
    // Clinical/practical significance
    if (selectedDomain === 'medicine' && practical.nnt) {
      narrative.push(`Number Needed to Treat: ${practical.nnt} patients need to be treated to prevent one adverse outcome.`);
    }
    
    if (selectedDomain === 'education') {
      const monthsProgress = absValue * 8;
      narrative.push(`This represents approximately ${monthsProgress.toFixed(1)} months of additional learning progress.`);
    }
    
    return narrative;
  };

  // Draw effect size scale
  const drawEffectSizeScale = useCallback(() => {
    if (!scaleRef.current) return;
    
    const canvas = scaleRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const scaleWidth = width - margin.left - margin.right;
    const scaleHeight = 40;
    
    // Get domain benchmarks
    const domainData = DomainBenchmarks[selectedDomain.toUpperCase()];
    const benchmarks = domainData?.benchmarks[effectSizeType] || {};
    
    // Draw scale background
    const minValue = -2;
    const maxValue = 2;
    const range = maxValue - minValue;
    
    // Draw benchmark regions
    let lastX = margin.left;
    Object.entries(benchmarks).forEach(([key, benchmark]) => {
      if (benchmark.min === Infinity || benchmark.max === Infinity) return;
      
      const x1 = margin.left + ((benchmark.min - minValue) / range) * scaleWidth;
      const x2 = margin.left + ((Math.min(benchmark.max, maxValue) - minValue) / range) * scaleWidth;
      
      ctx.fillStyle = benchmark.color || '#e0e0e0';
      ctx.fillRect(x1, margin.top, x2 - x1, scaleHeight);
      
      // Label
      ctx.fillStyle = '#333';
      ctx.font = '10px IBM Plex Sans';
      ctx.textAlign = 'center';
      ctx.fillText(benchmark.label, (x1 + x2) / 2, margin.top - 5);
    });
    
    // Draw scale outline
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin.left, margin.top, scaleWidth, scaleHeight);
    
    // Draw tick marks and labels
    ctx.fillStyle = '#333';
    ctx.font = '11px IBM Plex Sans';
    ctx.textAlign = 'center';
    
    for (let value = minValue; value <= maxValue; value += 0.5) {
      const x = margin.left + ((value - minValue) / range) * scaleWidth;
      
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(x, margin.top + scaleHeight);
      ctx.lineTo(x, margin.top + scaleHeight + 5);
      ctx.stroke();
      
      // Label
      ctx.fillText(value.toFixed(1), x, margin.top + scaleHeight + 20);
    }
    
    // Draw current value indicator
    if (effectSizeValue) {
      const value = parseFloat(effectSizeValue);
      if (!isNaN(value) && value >= minValue && value <= maxValue) {
        const x = margin.left + ((value - minValue) / range) * scaleWidth;
        
        // Arrow
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x, margin.top - 15);
        ctx.lineTo(x - 8, margin.top - 25);
        ctx.lineTo(x + 8, margin.top - 25);
        ctx.closePath();
        ctx.fill();
        
        // Value label
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 12px IBM Plex Sans';
        ctx.fillText(value.toFixed(2), x, margin.top - 30);
      }
    }
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText(`Effect Size Scale - ${domainData?.name}`, width / 2, 20);
  }, [selectedDomain, effectSizeType, effectSizeValue]);

  // Draw distribution comparison
  const drawDistributionComparison = useCallback(() => {
    if (!distributionRef.current || !effectSizeValue) return;
    
    const canvas = distributionRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const d = parseFloat(effectSizeValue);
    if (isNaN(d)) return;
    
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Normal distribution function
    const normal = (x, mean, sd) => {
      return (1 / (sd * Math.sqrt(2 * Math.PI))) * 
             Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
    };
    
    // Draw distributions
    const xMin = -4;
    const xMax = 4;
    const points = 200;
    
    // Control group (mean = 0)
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const x = xMin + (xMax - xMin) * i / points;
      const y = normal(x, 0, 1);
      const px = margin.left + (i / points) * plotWidth;
      const py = margin.top + plotHeight - (y * plotHeight * 3);
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    
    // Treatment group (mean = d)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const x = xMin + (xMax - xMin) * i / points;
      const y = normal(x, d, 1);
      const px = margin.left + (i / points) * plotWidth;
      const py = margin.top + plotHeight - (y * plotHeight * 3);
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    
    // Fill overlap area
    ctx.fillStyle = 'rgba(149, 165, 166, 0.3)';
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const x = xMin + (xMax - xMin) * i / points;
      const y1 = normal(x, 0, 1);
      const y2 = normal(x, d, 1);
      const yMin = Math.min(y1, y2);
      
      const px = margin.left + (i / points) * plotWidth;
      const py = margin.top + plotHeight - (yMin * plotHeight * 3);
      
      if (i === 0) {
        ctx.moveTo(px, margin.top + plotHeight);
        ctx.lineTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.closePath();
    ctx.fill();
    
    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#3498db';
    ctx.font = '12px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Control', margin.left + plotWidth * 0.25, margin.top + plotHeight + 25);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('Treatment', margin.left + plotWidth * 0.75, margin.top + plotHeight + 25);
    
    // Overlap percentage
    if (practicalMetrics) {
      ctx.fillStyle = '#666';
      ctx.font = '11px IBM Plex Sans';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Overlap: ${(practicalMetrics.overlap * 100).toFixed(1)}%`,
        width / 2,
        margin.top + plotHeight + 25
      );
    }
    
    // Title
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Distribution Comparison', width / 2, 20);
  }, [effectSizeValue, practicalMetrics]);

  // Update visualizations
  useEffect(() => {
    drawEffectSizeScale();
  }, [selectedDomain, effectSizeType, effectSizeValue, drawEffectSizeScale]);

  useEffect(() => {
    if (visualMode === 'distribution') {
      drawDistributionComparison();
    }
  }, [visualMode, effectSizeValue, practicalMetrics, drawDistributionComparison]);

  return (
    <div className="interpretation-guide">
      <div className="guide-header">
        <h2>Effect Size Interpretation Guide</h2>
        <div className="header-subtitle">
          Context-specific interpretation across research domains
        </div>
      </div>

      <div className="guide-body">
        <div className="input-panel">
          <div className="domain-selector">
            <label>Research Domain:</label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
            >
              {Object.values(DomainBenchmarks).map(domain => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
            <p className="domain-description">
              {DomainBenchmarks[selectedDomain.toUpperCase()]?.description}
            </p>
          </div>

          <div className="metric-selector">
            <label>Effect Size Metric:</label>
            <select
              value={effectSizeType}
              onChange={(e) => setEffectSizeType(e.target.value)}
            >
              {Object.values(EffectSizeMetrics).map(metric => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                </option>
              ))}
            </select>
            <div className="metric-info">
              <div className="formula">
                {EffectSizeMetrics[effectSizeType.toUpperCase()]?.formula}
              </div>
              <div className="interpretation">
                {EffectSizeMetrics[effectSizeType.toUpperCase()]?.interpretation}
              </div>
            </div>
          </div>

          <div className="value-input">
            <label>Effect Size Value:</label>
            <input
              type="number"
              step="0.01"
              value={effectSizeValue}
              onChange={(e) => setEffectSizeValue(e.target.value)}
              placeholder="e.g., 0.5"
            />
          </div>

          <div className="optional-inputs">
            <div className="input-group">
              <label>Sample Size (optional):</label>
              <input
                type="number"
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder="For significance testing"
              />
            </div>
            <div className="input-group">
              <label>Base Rate % (for NNT):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                placeholder="Event rate in control"
              />
            </div>
          </div>

          <button
            className="interpret-btn"
            onClick={generateInterpretation}
            disabled={!effectSizeValue}
          >
            Generate Interpretation
          </button>

          {interpretation && (
            <div className="interpretation-result">
              <h3>Domain-Specific Interpretation</h3>
              <div className={`category-badge ${interpretation.domainSpecific?.category.toLowerCase().replace(/\s+/g, '-')}`}>
                {interpretation.domainSpecific?.category}
              </div>
              
              <div className="narrative">
                {interpretation.narrative.map((sentence, idx) => (
                  <p key={idx}>{sentence}</p>
                ))}
              </div>

              {interpretation.significance && (
                <div className="significance-info">
                  <h4>Statistical Significance</h4>
                  <div className="significance-grid">
                    <div className="stat-item">
                      <label>p-value:</label>
                      <span className={interpretation.significance.significant ? 'significant' : ''}>
                        {interpretation.significance.pValue < 0.001 ? '< 0.001' : 
                         interpretation.significance.pValue.toFixed(4)}
                      </span>
                    </div>
                    <div className="stat-item">
                      <label>95% CI:</label>
                      <span>
                        [{interpretation.significance.ci_lower.toFixed(2)}, 
                        {interpretation.significance.ci_upper.toFixed(2)}]
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="visualization-panel">
          <div className="viz-controls">
            <button
              className={`viz-btn ${visualMode === 'scale' ? 'active' : ''}`}
              onClick={() => setVisualMode('scale')}
            >
              Effect Scale
            </button>
            <button
              className={`viz-btn ${visualMode === 'distribution' ? 'active' : ''}`}
              onClick={() => setVisualMode('distribution')}
            >
              Distributions
            </button>
            <button
              className={`viz-btn ${visualMode === 'metrics' ? 'active' : ''}`}
              onClick={() => setVisualMode('metrics')}
            >
              Practical Metrics
            </button>
          </div>

          {visualMode === 'scale' && (
            <div className="scale-visualization">
              <canvas
                ref={scaleRef}
                width={600}
                height={150}
                className="effect-scale"
              />
              
              <div className="benchmark-examples">
                <h4>Examples in {DomainBenchmarks[selectedDomain.toUpperCase()]?.name}</h4>
                <div className="examples-list">
                  {DomainBenchmarks[selectedDomain.toUpperCase()]?.examples.map((example, idx) => (
                    <div key={idx} className="example-item">
                      <span className="effect-value">d = {example.effect}</span>
                      <span className="description">{example.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {visualMode === 'distribution' && (
            <div className="distribution-visualization">
              <canvas
                ref={distributionRef}
                width={600}
                height={300}
                className="distribution-plot"
              />
            </div>
          )}

          {visualMode === 'metrics' && practicalMetrics && (
            <div className="metrics-visualization">
              <h3>Practical Significance Metrics</h3>
              
              <div className="metrics-grid">
                <div className="metric-card">
                  <h4>Probability of Superiority</h4>
                  <div className="metric-value">
                    {(practicalMetrics.probabilitySuperiority * 100).toFixed(1)}%
                  </div>
                  <div className="metric-description">
                    Chance that treatment > control
                  </div>
                </div>

                <div className="metric-card">
                  <h4>Common Language ES</h4>
                  <div className="metric-value">
                    {(practicalMetrics.commonLanguage * 100).toFixed(1)}%
                  </div>
                  <div className="metric-description">
                    Percentage of paired comparisons favoring treatment
                  </div>
                </div>

                <div className="metric-card">
                  <h4>Overlap</h4>
                  <div className="metric-value">
                    {(practicalMetrics.overlap * 100).toFixed(1)}%
                  </div>
                  <div className="metric-description">
                    Distribution overlap between groups
                  </div>
                </div>

                <div className="metric-card">
                  <h4>Cohen's U₃</h4>
                  <div className="metric-value">
                    {(practicalMetrics.cohenU3 * 100).toFixed(1)}%
                  </div>
                  <div className="metric-description">
                    % of control below treatment mean
                  </div>
                </div>

                <div className="metric-card">
                  <h4>Non-overlap</h4>
                  <div className="metric-value">
                    {practicalMetrics.percentNonoverlap.toFixed(1)}%
                  </div>
                  <div className="metric-description">
                    Percentage of distributions not overlapping
                  </div>
                </div>

                {practicalMetrics.nnt && (
                  <div className="metric-card highlight">
                    <h4>Number Needed to Treat</h4>
                    <div className="metric-value">
                      {practicalMetrics.nnt}
                    </div>
                    <div className="metric-description">
                      Patients to treat for one success
                    </div>
                  </div>
                )}
              </div>

              <div className="conversions">
                <h4>Metric Conversions</h4>
                <table>
                  <tbody>
                    <tr>
                      <td>Correlation (r):</td>
                      <td>{practicalMetrics.correlation.toFixed(3)}</td>
                    </tr>
                    <tr>
                      <td>Odds Ratio:</td>
                      <td>{practicalMetrics.oddsRatio.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>Log Odds Ratio:</td>
                      <td>{Math.log(practicalMetrics.oddsRatio).toFixed(3)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="interpretation-tips">
            <h4>Important Considerations</h4>
            <ul>
              <li>Effect size alone doesn't determine importance - consider context</li>
              <li>Statistical significance ≠ practical significance</li>
              <li>Small effects can be important with large populations</li>
              <li>Large effects may not matter if the outcome is trivial</li>
              <li>Consider cost, feasibility, and ethical implications</li>
              <li>Domain-specific benchmarks are guidelines, not rules</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="guide-footer">
        <div className="references">
          <strong>References:</strong> Cohen (1988), Hattie (2009), Lipsey & Wilson (2001), 
          Valentine & Cooper (2003), What Works Clearinghouse Standards
        </div>
      </div>
    </div>
  );
};

export default InterpretationGuide;