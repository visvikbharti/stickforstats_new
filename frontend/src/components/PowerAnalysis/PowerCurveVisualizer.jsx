import React, { useState, useEffect, useMemo, useRef } from 'react';
import './PowerCurveVisualizer.scss';

const PowerCurveVisualizer = ({ 
  testType = 't_test',
  initialParameters = {},
  onExport,
  className = '' 
}) => {
  // Visualization parameters
  const [parameters, setParameters] = useState({
    alpha: 0.05,
    sampleSizeMin: 10,
    sampleSizeMax: 200,
    effectSizes: [0.2, 0.5, 0.8],
    tails: 2,
    allocationRatio: 1,
    ...initialParameters
  });

  const [curves, setCurves] = useState([]);
  const [selectedCurve, setSelectedCurve] = useState(null);
  const [viewMode, setViewMode] = useState('power_vs_n'); // power_vs_n, power_vs_effect, n_vs_effect
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [exportFormat, setExportFormat] = useState('svg');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef(null);
  const chartDimensions = {
    width: 800,
    height: 500,
    margin: { top: 40, right: 120, bottom: 60, left: 70 }
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

  // Power calculation for different tests
  const calculatePower = (n, effectSize, alpha, tails) => {
    const za = normalQuantile(1 - alpha / tails);
    
    switch (testType) {
      case 't_test':
        // Two-sample t-test power
        const ncp = effectSize * Math.sqrt(n / 2);
        const power = 1 - normalCDF(za - ncp) + normalCDF(-za - ncp);
        return Math.min(Math.max(power, 0), 1);
        
      case 'anova':
        // One-way ANOVA power approximation
        const lambda = n * effectSize * effectSize;
        const fcrit = za * za;
        const ncpF = lambda;
        const powerF = 1 - normalCDF(Math.sqrt(fcrit) - Math.sqrt(ncpF));
        return Math.min(Math.max(powerF, 0), 1);
        
      case 'correlation':
        // Correlation power
        const z = 0.5 * Math.log((1 + effectSize) / (1 - effectSize));
        const se = 1 / Math.sqrt(n - 3);
        const powerR = normalCDF((Math.abs(z) - za * se) / se);
        return Math.min(Math.max(powerR, 0), 1);
        
      default:
        return 0;
    }
  };

  // Generate curve data
  const generateCurves = useMemo(() => {
    const curveData = [];
    
    if (viewMode === 'power_vs_n') {
      // Power vs Sample Size curves for different effect sizes
      parameters.effectSizes.forEach((effectSize, index) => {
        const points = [];
        for (let n = parameters.sampleSizeMin; n <= parameters.sampleSizeMax; n += 2) {
          const power = calculatePower(n, effectSize, parameters.alpha, parameters.tails);
          points.push({ x: n, y: power });
        }
        
        curveData.push({
          id: `curve_${index}`,
          name: `d = ${effectSize}`,
          effectSize,
          color: getColorForEffectSize(effectSize),
          points,
          type: 'power_vs_n'
        });
      });
    } else if (viewMode === 'power_vs_effect') {
      // Power vs Effect Size curves for different sample sizes
      const sampleSizes = [20, 50, 100, 200];
      sampleSizes.forEach((n, index) => {
        const points = [];
        for (let d = 0; d <= 2; d += 0.02) {
          const power = calculatePower(n, d, parameters.alpha, parameters.tails);
          points.push({ x: d, y: power });
        }
        
        curveData.push({
          id: `curve_${index}`,
          name: `n = ${n}`,
          sampleSize: n,
          color: getColorForSampleSize(n),
          points,
          type: 'power_vs_effect'
        });
      });
    } else if (viewMode === 'n_vs_effect') {
      // Sample Size vs Effect Size curves for different power levels
      const powerLevels = [0.7, 0.8, 0.9, 0.95];
      powerLevels.forEach((targetPower, index) => {
        const points = [];
        for (let d = 0.1; d <= 2; d += 0.02) {
          const n = calculateRequiredSampleSize(d, targetPower, parameters.alpha, parameters.tails);
          if (n <= 1000) {
            points.push({ x: d, y: n });
          }
        }
        
        curveData.push({
          id: `curve_${index}`,
          name: `Power = ${targetPower}`,
          targetPower,
          color: getColorForPower(targetPower),
          points,
          type: 'n_vs_effect'
        });
      });
    }
    
    return curveData;
  }, [parameters, viewMode, testType]);

  // Calculate required sample size for given effect and power
  const calculateRequiredSampleSize = (effectSize, targetPower, alpha, tails) => {
    const za = normalQuantile(1 - alpha / tails);
    const zb = normalQuantile(targetPower);
    
    switch (testType) {
      case 't_test':
        return Math.ceil(2 * Math.pow((za + zb) / effectSize, 2));
      case 'anova':
        return Math.ceil(Math.pow((za + zb) / effectSize, 2));
      case 'correlation':
        const z = 0.5 * Math.log((1 + effectSize) / (1 - effectSize));
        return Math.ceil(Math.pow((za + zb) / z, 2) + 3);
      default:
        return 100;
    }
  };

  // Color schemes
  const getColorForEffectSize = (d) => {
    if (d <= 0.2) return '#ff9800'; // Small - Orange
    if (d <= 0.5) return '#2196f3'; // Medium - Blue
    return '#4caf50'; // Large - Green
  };

  const getColorForSampleSize = (n) => {
    const colors = ['#e91e63', '#9c27b0', '#3f51b5', '#00bcd4'];
    const index = Math.min(Math.floor(n / 50), 3);
    return colors[index];
  };

  const getColorForPower = (power) => {
    const intensity = Math.floor(power * 255);
    return `rgb(${255 - intensity}, ${intensity}, 0)`;
  };

  // Update curves when parameters change
  useEffect(() => {
    setCurves(generateCurves);
  }, [generateCurves]);

  // Handle mouse events for pan and zoom
  const handleMouseDown = (e) => {
    if (e.shiftKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * delta)));
    }
  };

  // Export functionality
  const exportChart = () => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    
    if (exportFormat === 'svg') {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `power_curve_${new Date().toISOString().split('T')[0]}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'png') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = chartDimensions.width;
        canvas.height = chartDimensions.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `power_curve_${new Date().toISOString().split('T')[0]}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    }
    
    if (onExport) {
      onExport(curves, exportFormat);
    }
  };

  // Calculate scales
  const scales = useMemo(() => {
    const innerWidth = chartDimensions.width - chartDimensions.margin.left - chartDimensions.margin.right;
    const innerHeight = chartDimensions.height - chartDimensions.margin.top - chartDimensions.margin.bottom;
    
    let xDomain, yDomain, xLabel, yLabel;
    
    switch (viewMode) {
      case 'power_vs_n':
        xDomain = [parameters.sampleSizeMin, parameters.sampleSizeMax];
        yDomain = [0, 1];
        xLabel = 'Sample Size (n)';
        yLabel = 'Statistical Power (1-β)';
        break;
      case 'power_vs_effect':
        xDomain = [0, 2];
        yDomain = [0, 1];
        xLabel = 'Effect Size';
        yLabel = 'Statistical Power (1-β)';
        break;
      case 'n_vs_effect':
        xDomain = [0.1, 2];
        yDomain = [0, 500];
        xLabel = 'Effect Size';
        yLabel = 'Required Sample Size';
        break;
      default:
        xDomain = [0, 100];
        yDomain = [0, 1];
    }
    
    const xScale = (value) => {
      const normalized = (value - xDomain[0]) / (xDomain[1] - xDomain[0]);
      return chartDimensions.margin.left + normalized * innerWidth * zoomLevel + panOffset.x;
    };
    
    const yScale = (value) => {
      const normalized = (value - yDomain[0]) / (yDomain[1] - yDomain[0]);
      return chartDimensions.margin.top + (1 - normalized) * innerHeight * zoomLevel + panOffset.y;
    };
    
    return { xScale, yScale, xDomain, yDomain, xLabel, yLabel };
  }, [viewMode, parameters, chartDimensions, zoomLevel, panOffset]);

  // Add/remove effect sizes
  const addEffectSize = () => {
    const newSize = parseFloat(prompt('Enter effect size (0-2):', '0.6'));
    if (!isNaN(newSize) && newSize > 0 && newSize <= 2) {
      setParameters({
        ...parameters,
        effectSizes: [...parameters.effectSizes, newSize].sort((a, b) => a - b)
      });
    }
  };

  const removeEffectSize = (index) => {
    if (parameters.effectSizes.length > 1) {
      setParameters({
        ...parameters,
        effectSizes: parameters.effectSizes.filter((_, i) => i !== index)
      });
    }
  };

  return (
    <div className={`power-curve-visualizer ${className}`}>
      <div className="visualizer-header">
        <h3>Power Curve Visualization</h3>
        <div className="header-controls">
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="power_vs_n">Power vs Sample Size</option>
            <option value="power_vs_effect">Power vs Effect Size</option>
            <option value="n_vs_effect">Sample Size vs Effect Size</option>
          </select>
          
          <select 
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
          >
            <option value="t_test">T-Test</option>
            <option value="anova">ANOVA</option>
            <option value="correlation">Correlation</option>
          </select>
          
          <div className="export-controls">
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="svg">SVG</option>
              <option value="png">PNG</option>
            </select>
            <button className="btn-export" onClick={exportChart}>
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="visualizer-body">
        <div className="chart-controls">
          <div className="control-group">
            <label>Alpha (α)</label>
            <input 
              type="number"
              value={parameters.alpha}
              onChange={(e) => setParameters({...parameters, alpha: parseFloat(e.target.value)})}
              min="0.001"
              max="0.2"
              step="0.01"
            />
          </div>

          <div className="control-group">
            <label>Tails</label>
            <select 
              value={parameters.tails}
              onChange={(e) => setParameters({...parameters, tails: parseInt(e.target.value)})}
            >
              <option value="1">One-tailed</option>
              <option value="2">Two-tailed</option>
            </select>
          </div>

          {viewMode === 'power_vs_n' && (
            <>
              <div className="control-group">
                <label>Sample Size Range</label>
                <div className="range-inputs">
                  <input 
                    type="number"
                    value={parameters.sampleSizeMin}
                    onChange={(e) => setParameters({...parameters, sampleSizeMin: parseInt(e.target.value)})}
                    min="2"
                    max="1000"
                  />
                  <span>to</span>
                  <input 
                    type="number"
                    value={parameters.sampleSizeMax}
                    onChange={(e) => setParameters({...parameters, sampleSizeMax: parseInt(e.target.value)})}
                    min="2"
                    max="1000"
                  />
                </div>
              </div>

              <div className="control-group">
                <label>Effect Sizes</label>
                <div className="effect-sizes-list">
                  {parameters.effectSizes.map((size, index) => (
                    <div key={index} className="effect-size-item">
                      <span style={{color: getColorForEffectSize(size)}}>d={size}</span>
                      <button 
                        className="btn-remove"
                        onClick={() => removeEffectSize(index)}
                        disabled={parameters.effectSizes.length === 1}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button className="btn-add" onClick={addEffectSize}>+</button>
                </div>
              </div>
            </>
          )}

          <div className="view-options">
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
              />
              Legend
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
              />
              Markers
            </label>
          </div>

          <div className="zoom-controls">
            <button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}>−</button>
            <span>{(zoomLevel * 100).toFixed(0)}%</span>
            <button onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.1))}>+</button>
            <button onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}>Reset</button>
          </div>
        </div>

        <div 
          className="chart-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg 
            ref={svgRef}
            width={chartDimensions.width} 
            height={chartDimensions.height}
            className="power-curve-chart"
          >
            {/* Background */}
            <rect 
              width={chartDimensions.width} 
              height={chartDimensions.height} 
              fill="#ffffff" 
            />

            {/* Grid */}
            {showGrid && (
              <g className="grid">
                {/* X-axis grid lines */}
                {Array.from({ length: 11 }, (_, i) => {
                  const x = chartDimensions.margin.left + 
                           (i / 10) * (chartDimensions.width - chartDimensions.margin.left - chartDimensions.margin.right);
                  return (
                    <line
                      key={`grid-x-${i}`}
                      x1={x}
                      y1={chartDimensions.margin.top}
                      x2={x}
                      y2={chartDimensions.height - chartDimensions.margin.bottom}
                      stroke="#e0e0e0"
                      strokeDasharray="2,2"
                    />
                  );
                })}
                
                {/* Y-axis grid lines */}
                {Array.from({ length: 11 }, (_, i) => {
                  const y = chartDimensions.margin.top + 
                           (i / 10) * (chartDimensions.height - chartDimensions.margin.top - chartDimensions.margin.bottom);
                  return (
                    <line
                      key={`grid-y-${i}`}
                      x1={chartDimensions.margin.left}
                      y1={y}
                      x2={chartDimensions.width - chartDimensions.margin.right}
                      y2={y}
                      stroke="#e0e0e0"
                      strokeDasharray="2,2"
                    />
                  );
                })}
              </g>
            )}

            {/* Axes */}
            <g className="axes">
              {/* X-axis */}
              <line
                x1={chartDimensions.margin.left}
                y1={chartDimensions.height - chartDimensions.margin.bottom}
                x2={chartDimensions.width - chartDimensions.margin.right}
                y2={chartDimensions.height - chartDimensions.margin.bottom}
                stroke="#424242"
                strokeWidth="2"
              />
              
              {/* Y-axis */}
              <line
                x1={chartDimensions.margin.left}
                y1={chartDimensions.margin.top}
                x2={chartDimensions.margin.left}
                y2={chartDimensions.height - chartDimensions.margin.bottom}
                stroke="#424242"
                strokeWidth="2"
              />

              {/* X-axis label */}
              <text
                x={chartDimensions.margin.left + (chartDimensions.width - chartDimensions.margin.left - chartDimensions.margin.right) / 2}
                y={chartDimensions.height - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#424242"
              >
                {scales.xLabel}
              </text>

              {/* Y-axis label */}
              <text
                x={20}
                y={chartDimensions.margin.top + (chartDimensions.height - chartDimensions.margin.top - chartDimensions.margin.bottom) / 2}
                textAnchor="middle"
                fontSize="12"
                fill="#424242"
                transform={`rotate(-90, 20, ${chartDimensions.margin.top + (chartDimensions.height - chartDimensions.margin.top - chartDimensions.margin.bottom) / 2})`}
              >
                {scales.yLabel}
              </text>

              {/* X-axis ticks */}
              {Array.from({ length: 11 }, (_, i) => {
                const value = scales.xDomain[0] + (i / 10) * (scales.xDomain[1] - scales.xDomain[0]);
                const x = chartDimensions.margin.left + 
                         (i / 10) * (chartDimensions.width - chartDimensions.margin.left - chartDimensions.margin.right);
                return (
                  <g key={`tick-x-${i}`}>
                    <line
                      x1={x}
                      y1={chartDimensions.height - chartDimensions.margin.bottom}
                      x2={x}
                      y2={chartDimensions.height - chartDimensions.margin.bottom + 5}
                      stroke="#424242"
                    />
                    <text
                      x={x}
                      y={chartDimensions.height - chartDimensions.margin.bottom + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#424242"
                    >
                      {value.toFixed(viewMode === 'power_vs_n' ? 0 : 1)}
                    </text>
                  </g>
                );
              })}

              {/* Y-axis ticks */}
              {Array.from({ length: 11 }, (_, i) => {
                const value = scales.yDomain[0] + (i / 10) * (scales.yDomain[1] - scales.yDomain[0]);
                const y = chartDimensions.height - chartDimensions.margin.bottom - 
                         (i / 10) * (chartDimensions.height - chartDimensions.margin.top - chartDimensions.margin.bottom);
                return (
                  <g key={`tick-y-${i}`}>
                    <line
                      x1={chartDimensions.margin.left - 5}
                      y1={y}
                      x2={chartDimensions.margin.left}
                      y2={y}
                      stroke="#424242"
                    />
                    <text
                      x={chartDimensions.margin.left - 10}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#424242"
                    >
                      {value.toFixed(viewMode === 'n_vs_effect' ? 0 : 2)}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Power curves */}
            <g className="curves">
              {curves.map((curve) => (
                <g key={curve.id}>
                  {/* Curve line */}
                  <path
                    d={`M ${curve.points.map(p => `${scales.xScale(p.x)},${scales.yScale(p.y)}`).join(' L ')}`}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={selectedCurve?.id === curve.id ? 3 : 2}
                    opacity={selectedCurve && selectedCurve.id !== curve.id ? 0.3 : 1}
                    onMouseEnter={() => setSelectedCurve(curve)}
                    onMouseLeave={() => setSelectedCurve(null)}
                    style={{ cursor: 'pointer' }}
                  />
                  
                  {/* Markers */}
                  {showMarkers && curve.points.filter((_, i) => i % 10 === 0).map((point, i) => (
                    <circle
                      key={`marker-${curve.id}-${i}`}
                      cx={scales.xScale(point.x)}
                      cy={scales.yScale(point.y)}
                      r="3"
                      fill={curve.color}
                      opacity={selectedCurve && selectedCurve.id !== curve.id ? 0.3 : 1}
                    />
                  ))}
                </g>
              ))}
            </g>

            {/* Reference lines */}
            <g className="reference-lines">
              {/* 80% power line */}
              {(viewMode === 'power_vs_n' || viewMode === 'power_vs_effect') && (
                <line
                  x1={chartDimensions.margin.left}
                  y1={scales.yScale(0.8)}
                  x2={chartDimensions.width - chartDimensions.margin.right}
                  y2={scales.yScale(0.8)}
                  stroke="#ff9800"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
              )}

              {/* Effect size reference lines */}
              {viewMode === 'power_vs_effect' && (
                <>
                  <line
                    x1={scales.xScale(0.2)}
                    y1={chartDimensions.margin.top}
                    x2={scales.xScale(0.2)}
                    y2={chartDimensions.height - chartDimensions.margin.bottom}
                    stroke="#ff9800"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.5"
                  />
                  <line
                    x1={scales.xScale(0.5)}
                    y1={chartDimensions.margin.top}
                    x2={scales.xScale(0.5)}
                    y2={chartDimensions.height - chartDimensions.margin.bottom}
                    stroke="#2196f3"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.5"
                  />
                  <line
                    x1={scales.xScale(0.8)}
                    y1={chartDimensions.margin.top}
                    x2={scales.xScale(0.8)}
                    y2={chartDimensions.height - chartDimensions.margin.bottom}
                    stroke="#4caf50"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.5"
                  />
                </>
              )}
            </g>

            {/* Legend */}
            {showLegend && (
              <g className="legend" transform={`translate(${chartDimensions.width - 100}, ${chartDimensions.margin.top})`}>
                <rect 
                  x="-10" 
                  y="-5" 
                  width="105" 
                  height={curves.length * 25 + 10} 
                  fill="#ffffff" 
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
                {curves.map((curve, index) => (
                  <g key={curve.id} transform={`translate(0, ${index * 25 + 10})`}>
                    <line
                      x1="0"
                      y1="0"
                      x2="20"
                      y2="0"
                      stroke={curve.color}
                      strokeWidth="2"
                    />
                    <text
                      x="25"
                      y="4"
                      fontSize="11"
                      fill="#424242"
                    >
                      {curve.name}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Tooltip */}
            {selectedCurve && (
              <g className="tooltip" transform={`translate(${chartDimensions.width / 2}, 30)`}>
                <rect 
                  x="-60" 
                  y="-15" 
                  width="120" 
                  height="30" 
                  fill="#ffffff" 
                  stroke="#424242"
                  strokeWidth="1"
                  rx="3"
                />
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#424242"
                >
                  {selectedCurve.name}
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="chart-instructions">
          <p>📊 <strong>Navigation:</strong> Shift+Drag to pan, Ctrl+Scroll to zoom</p>
          <p>📈 <strong>Hover</strong> over curves to highlight</p>
        </div>
      </div>
    </div>
  );
};

export default PowerCurveVisualizer;