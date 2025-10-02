import React, { useState, useEffect, useMemo, useRef } from 'react';
import './SensitivityAnalyzer.scss';

const SensitivityAnalyzer = ({ 
  baseParameters = {},
  testType = 't_test',
  onAnalysis,
  className = '' 
}) => {
  // Analysis configuration
  const [analysisType, setAnalysisType] = useState('one_way'); // one_way, two_way, monte_carlo, scenario
  const [parameters, setParameters] = useState({
    base: {
      alpha: 0.05,
      power: 0.80,
      effectSize: 0.5,
      sampleSize: 100,
      ...baseParameters
    },
    ranges: {
      alpha: { min: 0.01, max: 0.10, steps: 5, vary: false },
      power: { min: 0.70, max: 0.95, steps: 5, vary: false },
      effectSize: { min: 0.2, max: 0.8, steps: 7, vary: true },
      sampleSize: { min: 50, max: 200, steps: 6, vary: true },
      dropoutRate: { min: 0, max: 0.3, steps: 4, vary: false },
      allocationRatio: { min: 0.5, max: 2.0, steps: 5, vary: false }
    },
    monteCarlo: {
      iterations: 1000,
      distributions: {
        effectSize: { type: 'normal', mean: 0.5, sd: 0.1 },
        sampleSize: { type: 'uniform', min: 80, max: 120 },
        dropoutRate: { type: 'beta', alpha: 2, beta: 8 }
      },
      seed: 42
    },
    scenarios: [
      { name: 'Optimistic', effectSize: 0.8, sampleSize: 80, dropoutRate: 0.05 },
      { name: 'Realistic', effectSize: 0.5, sampleSize: 100, dropoutRate: 0.15 },
      { name: 'Pessimistic', effectSize: 0.3, sampleSize: 150, dropoutRate: 0.25 }
    ]
  });

  const [results, setResults] = useState(null);
  const [tornadoData, setTornadoData] = useState([]);
  const [heatMapData, setHeatMapData] = useState(null);
  const [monteCarloResults, setMonteCarloResults] = useState(null);
  const [scenarioComparison, setScenarioComparison] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showVisualization, setShowVisualization] = useState(true);
  const [exportFormat, setExportFormat] = useState('json');

  const svgRef = useRef(null);

  // Statistical calculations
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

  // Calculate outcome metric (power, sample size, etc.)
  const calculateOutcome = (params) => {
    const { alpha, power, effectSize, sampleSize, dropoutRate = 0 } = params;
    const adjustedN = sampleSize / (1 - dropoutRate);
    
    // Calculate power for given parameters
    const za = normalQuantile(1 - alpha / 2);
    const ncp = effectSize * Math.sqrt(adjustedN / 2);
    const calculatedPower = 1 - normalCDF(za - ncp) + normalCDF(-za - ncp);
    
    return {
      power: Math.min(Math.max(calculatedPower, 0), 1),
      effectiveSampleSize: adjustedN,
      requiredSampleSize: Math.ceil(2 * Math.pow((za + normalQuantile(power)) / effectSize, 2))
    };
  };

  // One-way sensitivity analysis
  const performOneWaySensitivity = () => {
    const results = [];
    const baseOutcome = calculateOutcome(parameters.base);
    
    Object.entries(parameters.ranges).forEach(([param, range]) => {
      if (!range.vary) return;
      
      const paramResults = {
        parameter: param,
        baseValue: parameters.base[param],
        values: [],
        outcomes: [],
        impact: 0
      };
      
      const step = (range.max - range.min) / range.steps;
      
      for (let i = 0; i <= range.steps; i++) {
        const value = range.min + i * step;
        const testParams = { ...parameters.base, [param]: value };
        const outcome = calculateOutcome(testParams);
        
        paramResults.values.push(value);
        paramResults.outcomes.push(outcome.power);
      }
      
      // Calculate impact (range of outcomes)
      const minOutcome = Math.min(...paramResults.outcomes);
      const maxOutcome = Math.max(...paramResults.outcomes);
      paramResults.impact = maxOutcome - minOutcome;
      
      results.push(paramResults);
    });
    
    // Sort by impact for tornado diagram
    results.sort((a, b) => b.impact - a.impact);
    
    return { 
      results, 
      baseOutcome,
      mostInfluential: results[0]?.parameter || 'none' 
    };
  };

  // Two-way sensitivity analysis (heat map)
  const performTwoWaySensitivity = () => {
    const varyingParams = Object.entries(parameters.ranges)
      .filter(([_, range]) => range.vary)
      .slice(0, 2); // Take first two varying parameters
    
    if (varyingParams.length < 2) {
      return null;
    }
    
    const [param1Name, param1Range] = varyingParams[0];
    const [param2Name, param2Range] = varyingParams[1];
    
    const heatMapData = {
      param1: param1Name,
      param2: param2Name,
      param1Values: [],
      param2Values: [],
      matrix: []
    };
    
    const step1 = (param1Range.max - param1Range.min) / param1Range.steps;
    const step2 = (param2Range.max - param2Range.min) / param2Range.steps;
    
    // Generate parameter values
    for (let i = 0; i <= param1Range.steps; i++) {
      heatMapData.param1Values.push(param1Range.min + i * step1);
    }
    
    for (let j = 0; j <= param2Range.steps; j++) {
      heatMapData.param2Values.push(param2Range.min + j * step2);
    }
    
    // Calculate outcome matrix
    heatMapData.param1Values.forEach(val1 => {
      const row = [];
      heatMapData.param2Values.forEach(val2 => {
        const testParams = {
          ...parameters.base,
          [param1Name]: val1,
          [param2Name]: val2
        };
        const outcome = calculateOutcome(testParams);
        row.push(outcome.power);
      });
      heatMapData.matrix.push(row);
    });
    
    return heatMapData;
  };

  // Monte Carlo simulation
  const performMonteCarloSimulation = () => {
    const { iterations, distributions } = parameters.monteCarlo;
    const results = [];
    
    // Random number generators
    const randomNormal = (mean, sd) => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mean + z * sd;
    };
    
    const randomUniform = (min, max) => {
      return min + Math.random() * (max - min);
    };
    
    const randomBeta = (alpha, beta) => {
      // Simplified beta distribution using acceptance-rejection
      let x;
      do {
        x = Math.random();
      } while (Math.random() > Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1));
      return x;
    };
    
    // Run simulations
    for (let i = 0; i < iterations; i++) {
      const simParams = { ...parameters.base };
      
      // Sample from distributions
      Object.entries(distributions).forEach(([param, dist]) => {
        if (dist.type === 'normal') {
          simParams[param] = Math.max(0, randomNormal(dist.mean, dist.sd));
        } else if (dist.type === 'uniform') {
          simParams[param] = randomUniform(dist.min, dist.max);
        } else if (dist.type === 'beta') {
          simParams[param] = randomBeta(dist.alpha, dist.beta);
        }
      });
      
      const outcome = calculateOutcome(simParams);
      results.push({
        iteration: i + 1,
        parameters: { ...simParams },
        power: outcome.power,
        sampleSize: outcome.effectiveSampleSize
      });
    }
    
    // Calculate statistics
    const powers = results.map(r => r.power);
    const mean = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    const variance = powers.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / powers.length;
    const sd = Math.sqrt(variance);
    
    powers.sort((a, b) => a - b);
    const percentiles = {
      p5: powers[Math.floor(iterations * 0.05)],
      p25: powers[Math.floor(iterations * 0.25)],
      p50: powers[Math.floor(iterations * 0.50)],
      p75: powers[Math.floor(iterations * 0.75)],
      p95: powers[Math.floor(iterations * 0.95)]
    };
    
    // Create histogram data
    const histogramBins = 20;
    const minPower = Math.min(...powers);
    const maxPower = Math.max(...powers);
    const binWidth = (maxPower - minPower) / histogramBins;
    
    const histogram = [];
    for (let i = 0; i < histogramBins; i++) {
      const binMin = minPower + i * binWidth;
      const binMax = binMin + binWidth;
      const count = powers.filter(p => p >= binMin && p < binMax).length;
      histogram.push({
        bin: i,
        range: `${binMin.toFixed(3)}-${binMax.toFixed(3)}`,
        count,
        frequency: count / iterations
      });
    }
    
    return {
      results: results.slice(0, 100), // Keep first 100 for display
      statistics: {
        mean,
        sd,
        min: minPower,
        max: maxPower,
        percentiles
      },
      histogram,
      probabilityPowerAbove80: powers.filter(p => p >= 0.8).length / iterations
    };
  };

  // Scenario comparison
  const performScenarioComparison = () => {
    const results = parameters.scenarios.map(scenario => {
      const scenarioParams = { ...parameters.base, ...scenario };
      const outcome = calculateOutcome(scenarioParams);
      
      return {
        name: scenario.name,
        parameters: scenarioParams,
        power: outcome.power,
        sampleSize: outcome.effectiveSampleSize,
        requiredN: outcome.requiredSampleSize,
        feasibility: outcome.power >= parameters.base.power ? 'Feasible' : 'Infeasible'
      };
    });
    
    return results;
  };

  // Main analysis function
  const runAnalysis = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      let analysisResults = {};
      
      switch (analysisType) {
        case 'one_way':
          const oneWay = performOneWaySensitivity();
          setTornadoData(oneWay.results);
          analysisResults = oneWay;
          break;
          
        case 'two_way':
          const heatMap = performTwoWaySensitivity();
          setHeatMapData(heatMap);
          analysisResults = { heatMap };
          break;
          
        case 'monte_carlo':
          const monteCarlo = performMonteCarloSimulation();
          setMonteCarloResults(monteCarlo);
          analysisResults = { monteCarlo };
          break;
          
        case 'scenario':
          const scenarios = performScenarioComparison();
          setScenarioComparison(scenarios);
          analysisResults = { scenarios };
          break;
          
        default:
          break;
      }
      
      setResults(analysisResults);
      setIsCalculating(false);
      
      if (onAnalysis) {
        onAnalysis(analysisResults);
      }
    }, 100);
  };

  // Tornado diagram component
  const TornadoDiagram = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 80, bottom: 40, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Calculate scales
    const maxImpact = Math.max(...data.map(d => d.impact));
    const barHeight = innerHeight / data.length;
    
    return (
      <svg width={width} height={height} className="tornado-diagram">
        <rect width={width} height={height} fill="#ffffff" />
        
        {/* Title */}
        <text x={width / 2} y={15} textAnchor="middle" fontSize="12" fontWeight="600">
          Tornado Diagram - Parameter Sensitivity
        </text>
        
        {/* Center line */}
        <line
          x1={margin.left + innerWidth / 2}
          y1={margin.top}
          x2={margin.left + innerWidth / 2}
          y2={margin.top + innerHeight}
          stroke="#757575"
          strokeDasharray="2,2"
        />
        
        {/* Bars */}
        {data.map((param, index) => {
          const y = margin.top + index * barHeight;
          const minOutcome = Math.min(...param.outcomes);
          const maxOutcome = Math.max(...param.outcomes);
          const centerValue = param.outcomes[Math.floor(param.outcomes.length / 2)];
          
          const leftWidth = (centerValue - minOutcome) / maxImpact * (innerWidth / 2);
          const rightWidth = (maxOutcome - centerValue) / maxImpact * (innerWidth / 2);
          
          return (
            <g key={param.parameter}>
              {/* Parameter label */}
              <text
                x={margin.left - 5}
                y={y + barHeight / 2}
                textAnchor="end"
                fontSize="11"
                alignmentBaseline="middle"
              >
                {param.parameter}
              </text>
              
              {/* Left bar (decrease) */}
              <rect
                x={margin.left + innerWidth / 2 - leftWidth}
                y={y + barHeight * 0.2}
                width={leftWidth}
                height={barHeight * 0.6}
                fill="#f44336"
                opacity="0.7"
              />
              
              {/* Right bar (increase) */}
              <rect
                x={margin.left + innerWidth / 2}
                y={y + barHeight * 0.2}
                width={rightWidth}
                height={barHeight * 0.6}
                fill="#4caf50"
                opacity="0.7"
              />
              
              {/* Impact value */}
              <text
                x={width - margin.right + 5}
                y={y + barHeight / 2}
                fontSize="10"
                alignmentBaseline="middle"
                fill="#666"
              >
                Δ = {param.impact.toFixed(3)}
              </text>
            </g>
          );
        })}
        
        {/* Axis labels */}
        <text
          x={margin.left}
          y={height - 10}
          fontSize="10"
          fill="#666"
        >
          Low
        </text>
        <text
          x={width - margin.right}
          y={height - 10}
          fontSize="10"
          fill="#666"
          textAnchor="end"
        >
          High
        </text>
      </svg>
    );
  };

  // Heat map component
  const HeatMap = ({ data }) => {
    if (!data) return null;
    
    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const cellWidth = innerWidth / data.param2Values.length;
    const cellHeight = innerHeight / data.param1Values.length;
    
    // Color scale
    const getColor = (value) => {
      if (value < 0.5) return '#ffcdd2';
      if (value < 0.7) return '#fff9c4';
      if (value < 0.8) return '#fff3e0';
      if (value < 0.9) return '#e8f5e9';
      return '#c8e6c9';
    };
    
    return (
      <svg width={width} height={height} className="heat-map">
        <rect width={width} height={height} fill="#ffffff" />
        
        {/* Title */}
        <text x={width / 2} y={20} textAnchor="middle" fontSize="12" fontWeight="600">
          Two-Way Sensitivity: {data.param1} vs {data.param2}
        </text>
        
        {/* Heat map cells */}
        {data.matrix.map((row, i) => 
          row.map((value, j) => (
            <rect
              key={`${i}-${j}`}
              x={margin.left + j * cellWidth}
              y={margin.top + i * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill={getColor(value)}
              stroke="#ffffff"
              strokeWidth="1"
            />
          ))
        )}
        
        {/* Value labels */}
        {data.matrix.map((row, i) => 
          row.map((value, j) => (
            <text
              key={`text-${i}-${j}`}
              x={margin.left + j * cellWidth + cellWidth / 2}
              y={margin.top + i * cellHeight + cellHeight / 2}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize="9"
              fill="#424242"
            >
              {value.toFixed(2)}
            </text>
          ))
        )}
        
        {/* X-axis labels */}
        {data.param2Values.map((value, i) => (
          <text
            key={`x-${i}`}
            x={margin.left + i * cellWidth + cellWidth / 2}
            y={height - margin.bottom + 15}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {value.toFixed(2)}
          </text>
        ))}
        
        {/* Y-axis labels */}
        {data.param1Values.map((value, i) => (
          <text
            key={`y-${i}`}
            x={margin.left - 10}
            y={margin.top + i * cellHeight + cellHeight / 2}
            textAnchor="end"
            alignmentBaseline="middle"
            fontSize="10"
            fill="#666"
          >
            {value.toFixed(2)}
          </text>
        ))}
        
        {/* Axis titles */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#424242"
        >
          {data.param2}
        </text>
        <text
          x={20}
          y={height / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#424242"
          transform={`rotate(-90, 20, ${height / 2})`}
        >
          {data.param1}
        </text>
        
        {/* Legend */}
        <g transform={`translate(${width - 60}, ${margin.top})`}>
          <text x="0" y="-5" fontSize="10" fontWeight="600" fill="#666">Power</text>
          {[0.9, 0.8, 0.7, 0.5].map((threshold, i) => (
            <g key={threshold} transform={`translate(0, ${i * 20})`}>
              <rect x="0" y="0" width="15" height="15" fill={getColor(threshold + 0.01)} stroke="#666" />
              <text x="20" y="12" fontSize="9" fill="#666">≥{threshold}</text>
            </g>
          ))}
        </g>
      </svg>
    );
  };

  // Export results
  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      analysisType,
      parameters: parameters.base,
      ranges: parameters.ranges,
      results
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensitivity_analysis_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add/update scenario
  const addScenario = () => {
    const newScenario = {
      name: `Scenario ${parameters.scenarios.length + 1}`,
      effectSize: 0.5,
      sampleSize: 100,
      dropoutRate: 0.1
    };
    
    setParameters({
      ...parameters,
      scenarios: [...parameters.scenarios, newScenario]
    });
  };

  const updateScenario = (index, field, value) => {
    const updatedScenarios = [...parameters.scenarios];
    updatedScenarios[index] = {
      ...updatedScenarios[index],
      [field]: field === 'name' ? value : parseFloat(value)
    };
    
    setParameters({
      ...parameters,
      scenarios: updatedScenarios
    });
  };

  const removeScenario = (index) => {
    setParameters({
      ...parameters,
      scenarios: parameters.scenarios.filter((_, i) => i !== index)
    });
  };

  return (
    <div className={`sensitivity-analyzer ${className}`}>
      <div className="analyzer-header">
        <h3>Sensitivity Analysis</h3>
        <div className="header-controls">
          <select 
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
          >
            <option value="one_way">One-Way Analysis</option>
            <option value="two_way">Two-Way Analysis</option>
            <option value="monte_carlo">Monte Carlo Simulation</option>
            <option value="scenario">Scenario Comparison</option>
          </select>
          
          <button 
            className="btn-visualize"
            onClick={() => setShowVisualization(!showVisualization)}
          >
            {showVisualization ? 'Hide' : 'Show'} Visualization
          </button>
        </div>
      </div>

      <div className="analyzer-body">
        {/* Base Parameters */}
        <div className="base-parameters">
          <h4>Base Case Parameters</h4>
          <div className="param-grid">
            <div className="param-item">
              <label>Alpha (α)</label>
              <input 
                type="number"
                value={parameters.base.alpha}
                onChange={(e) => setParameters({
                  ...parameters,
                  base: { ...parameters.base, alpha: parseFloat(e.target.value) }
                })}
                min="0.001"
                max="0.2"
                step="0.01"
              />
            </div>
            <div className="param-item">
              <label>Power (1-β)</label>
              <input 
                type="number"
                value={parameters.base.power}
                onChange={(e) => setParameters({
                  ...parameters,
                  base: { ...parameters.base, power: parseFloat(e.target.value) }
                })}
                min="0.5"
                max="0.99"
                step="0.01"
              />
            </div>
            <div className="param-item">
              <label>Effect Size</label>
              <input 
                type="number"
                value={parameters.base.effectSize}
                onChange={(e) => setParameters({
                  ...parameters,
                  base: { ...parameters.base, effectSize: parseFloat(e.target.value) }
                })}
                min="0"
                max="2"
                step="0.1"
              />
            </div>
            <div className="param-item">
              <label>Sample Size</label>
              <input 
                type="number"
                value={parameters.base.sampleSize}
                onChange={(e) => setParameters({
                  ...parameters,
                  base: { ...parameters.base, sampleSize: parseInt(e.target.value) }
                })}
                min="10"
                max="1000"
                step="10"
              />
            </div>
          </div>
        </div>

        {/* Parameter Ranges for One-Way/Two-Way */}
        {(analysisType === 'one_way' || analysisType === 'two_way') && (
          <div className="parameter-ranges">
            <h4>Parameter Ranges</h4>
            <div className="ranges-grid">
              {Object.entries(parameters.ranges).map(([param, range]) => (
                <div key={param} className="range-item">
                  <div className="range-header">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={range.vary}
                        onChange={(e) => {
                          const updatedRanges = { ...parameters.ranges };
                          updatedRanges[param].vary = e.target.checked;
                          setParameters({ ...parameters, ranges: updatedRanges });
                        }}
                      />
                      {param}
                    </label>
                  </div>
                  {range.vary && (
                    <div className="range-inputs">
                      <input 
                        type="number"
                        value={range.min}
                        onChange={(e) => {
                          const updatedRanges = { ...parameters.ranges };
                          updatedRanges[param].min = parseFloat(e.target.value);
                          setParameters({ ...parameters, ranges: updatedRanges });
                        }}
                        step="0.01"
                        placeholder="Min"
                      />
                      <span>to</span>
                      <input 
                        type="number"
                        value={range.max}
                        onChange={(e) => {
                          const updatedRanges = { ...parameters.ranges };
                          updatedRanges[param].max = parseFloat(e.target.value);
                          setParameters({ ...parameters, ranges: updatedRanges });
                        }}
                        step="0.01"
                        placeholder="Max"
                      />
                      <input 
                        type="number"
                        value={range.steps}
                        onChange={(e) => {
                          const updatedRanges = { ...parameters.ranges };
                          updatedRanges[param].steps = parseInt(e.target.value);
                          setParameters({ ...parameters, ranges: updatedRanges });
                        }}
                        min="2"
                        max="20"
                        placeholder="Steps"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monte Carlo Settings */}
        {analysisType === 'monte_carlo' && (
          <div className="monte-carlo-settings">
            <h4>Monte Carlo Settings</h4>
            <div className="mc-controls">
              <div className="control-item">
                <label>Iterations</label>
                <input 
                  type="number"
                  value={parameters.monteCarlo.iterations}
                  onChange={(e) => setParameters({
                    ...parameters,
                    monteCarlo: {
                      ...parameters.monteCarlo,
                      iterations: parseInt(e.target.value)
                    }
                  })}
                  min="100"
                  max="10000"
                  step="100"
                />
              </div>
              
              <div className="control-item">
                <label>Random Seed</label>
                <input 
                  type="number"
                  value={parameters.monteCarlo.seed}
                  onChange={(e) => setParameters({
                    ...parameters,
                    monteCarlo: {
                      ...parameters.monteCarlo,
                      seed: parseInt(e.target.value)
                    }
                  })}
                />
              </div>
            </div>

            <div className="distributions">
              <h5>Parameter Distributions</h5>
              {Object.entries(parameters.monteCarlo.distributions).map(([param, dist]) => (
                <div key={param} className="distribution-item">
                  <span className="param-name">{param}</span>
                  <select 
                    value={dist.type}
                    onChange={(e) => {
                      const updatedDist = { ...parameters.monteCarlo.distributions };
                      updatedDist[param].type = e.target.value;
                      setParameters({
                        ...parameters,
                        monteCarlo: {
                          ...parameters.monteCarlo,
                          distributions: updatedDist
                        }
                      });
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="uniform">Uniform</option>
                    <option value="beta">Beta</option>
                  </select>
                  {dist.type === 'normal' && (
                    <>
                      <input 
                        type="number"
                        value={dist.mean}
                        onChange={(e) => {
                          const updatedDist = { ...parameters.monteCarlo.distributions };
                          updatedDist[param].mean = parseFloat(e.target.value);
                          setParameters({
                            ...parameters,
                            monteCarlo: {
                              ...parameters.monteCarlo,
                              distributions: updatedDist
                            }
                          });
                        }}
                        step="0.01"
                        placeholder="Mean"
                      />
                      <input 
                        type="number"
                        value={dist.sd}
                        onChange={(e) => {
                          const updatedDist = { ...parameters.monteCarlo.distributions };
                          updatedDist[param].sd = parseFloat(e.target.value);
                          setParameters({
                            ...parameters,
                            monteCarlo: {
                              ...parameters.monteCarlo,
                              distributions: updatedDist
                            }
                          });
                        }}
                        step="0.01"
                        placeholder="SD"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenario Settings */}
        {analysisType === 'scenario' && (
          <div className="scenario-settings">
            <h4>Scenario Definitions</h4>
            <div className="scenarios-list">
              {parameters.scenarios.map((scenario, index) => (
                <div key={index} className="scenario-item">
                  <input 
                    type="text"
                    value={scenario.name}
                    onChange={(e) => updateScenario(index, 'name', e.target.value)}
                    placeholder="Scenario name"
                  />
                  <input 
                    type="number"
                    value={scenario.effectSize}
                    onChange={(e) => updateScenario(index, 'effectSize', e.target.value)}
                    step="0.1"
                    placeholder="Effect size"
                  />
                  <input 
                    type="number"
                    value={scenario.sampleSize}
                    onChange={(e) => updateScenario(index, 'sampleSize', e.target.value)}
                    step="10"
                    placeholder="Sample size"
                  />
                  <input 
                    type="number"
                    value={scenario.dropoutRate}
                    onChange={(e) => updateScenario(index, 'dropoutRate', e.target.value)}
                    step="0.05"
                    placeholder="Dropout rate"
                  />
                  <button 
                    className="btn-remove"
                    onClick={() => removeScenario(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-add-scenario" onClick={addScenario}>
              + Add Scenario
            </button>
          </div>
        )}

        <button 
          className="btn-analyze"
          onClick={runAnalysis}
          disabled={isCalculating}
        >
          {isCalculating ? 'Analyzing...' : 'Run Analysis'}
        </button>

        {/* Results Display */}
        {results && (
          <div className="results-section">
            <h4>Analysis Results</h4>
            
            {/* One-Way Results */}
            {analysisType === 'one_way' && tornadoData.length > 0 && (
              <div className="one-way-results">
                <div className="summary">
                  <div className="summary-item">
                    <label>Most Influential Parameter:</label>
                    <span>{tornadoData[0].parameter}</span>
                  </div>
                  <div className="summary-item">
                    <label>Impact Range:</label>
                    <span>{tornadoData[0].impact.toFixed(3)}</span>
                  </div>
                </div>
                
                {showVisualization && <TornadoDiagram data={tornadoData} />}
                
                <div className="parameter-impacts">
                  <h5>Parameter Impact Summary</h5>
                  <table>
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Base Value</th>
                        <th>Min Outcome</th>
                        <th>Max Outcome</th>
                        <th>Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tornadoData.map((param, index) => (
                        <tr key={index}>
                          <td>{param.parameter}</td>
                          <td>{param.baseValue.toFixed(3)}</td>
                          <td>{Math.min(...param.outcomes).toFixed(3)}</td>
                          <td>{Math.max(...param.outcomes).toFixed(3)}</td>
                          <td className="impact">{param.impact.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Two-Way Results */}
            {analysisType === 'two_way' && heatMapData && (
              <div className="two-way-results">
                {showVisualization && <HeatMap data={heatMapData} />}
                
                <div className="heat-map-summary">
                  <h5>Interaction Summary</h5>
                  <p>
                    Analyzing interaction between <strong>{heatMapData.param1}</strong> and{' '}
                    <strong>{heatMapData.param2}</strong>
                  </p>
                  <p>
                    Power ranges from{' '}
                    <span className="min-power">
                      {Math.min(...heatMapData.matrix.flat()).toFixed(3)}
                    </span>{' '}
                    to{' '}
                    <span className="max-power">
                      {Math.max(...heatMapData.matrix.flat()).toFixed(3)}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Monte Carlo Results */}
            {analysisType === 'monte_carlo' && monteCarloResults && (
              <div className="monte-carlo-results">
                <div className="mc-statistics">
                  <h5>Simulation Statistics</h5>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <label>Mean Power:</label>
                      <span>{monteCarloResults.statistics.mean.toFixed(3)}</span>
                    </div>
                    <div className="stat-item">
                      <label>SD:</label>
                      <span>{monteCarloResults.statistics.sd.toFixed(3)}</span>
                    </div>
                    <div className="stat-item">
                      <label>P(Power ≥ 0.80):</label>
                      <span>{(monteCarloResults.probabilityPowerAbove80 * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="percentiles">
                    <h6>Percentiles</h6>
                    <div className="percentile-row">
                      <span>5th: {monteCarloResults.statistics.percentiles.p5.toFixed(3)}</span>
                      <span>25th: {monteCarloResults.statistics.percentiles.p25.toFixed(3)}</span>
                      <span>50th: {monteCarloResults.statistics.percentiles.p50.toFixed(3)}</span>
                      <span>75th: {monteCarloResults.statistics.percentiles.p75.toFixed(3)}</span>
                      <span>95th: {monteCarloResults.statistics.percentiles.p95.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {showVisualization && (
                  <div className="histogram">
                    <h5>Power Distribution</h5>
                    <div className="histogram-bars">
                      {monteCarloResults.histogram.map((bin, index) => (
                        <div 
                          key={index}
                          className="histogram-bar"
                          style={{ 
                            height: `${bin.frequency * 300}px`,
                            width: `${100 / monteCarloResults.histogram.length}%`
                          }}
                          title={`${bin.range}: ${bin.count} iterations`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scenario Results */}
            {analysisType === 'scenario' && scenarioComparison.length > 0 && (
              <div className="scenario-results">
                <h5>Scenario Comparison</h5>
                <table>
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th>Effect Size</th>
                      <th>Sample Size</th>
                      <th>Dropout Rate</th>
                      <th>Power</th>
                      <th>Required N</th>
                      <th>Feasibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioComparison.map((scenario, index) => (
                      <tr key={index} className={scenario.feasibility === 'Feasible' ? 'feasible' : 'infeasible'}>
                        <td>{scenario.name}</td>
                        <td>{scenario.parameters.effectSize.toFixed(2)}</td>
                        <td>{scenario.parameters.sampleSize}</td>
                        <td>{(scenario.parameters.dropoutRate * 100).toFixed(0)}%</td>
                        <td className="power">{scenario.power.toFixed(3)}</td>
                        <td>{scenario.requiredN}</td>
                        <td className={`feasibility ${scenario.feasibility.toLowerCase()}`}>
                          {scenario.feasibility}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="export-section">
          <button className="btn-export" onClick={exportResults}>
            Export Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default SensitivityAnalyzer;