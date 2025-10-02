import React, { useState, useMemo, useEffect } from 'react';
import './AlphaSpendingCalculator.scss';

const AlphaSpendingCalculator = ({ 
  totalAlpha = 0.05,
  numberOfLooks = 5,
  sampleSizes = [],
  onBoundariesCalculated,
  className = '' 
}) => {
  const [spendingFunction, setSpendingFunction] = useState('obrien_fleming');
  const [customFunction, setCustomFunction] = useState('');
  const [informationFractions, setInformationFractions] = useState([]);
  const [boundaries, setBoundaries] = useState([]);
  const [cumulativeAlpha, setCumulativeAlpha] = useState([]);
  const [showVisualization, setShowVisualization] = useState(true);
  const [showFormulas, setShowFormulas] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // Spending function definitions
  const SpendingFunctions = {
    obrien_fleming: {
      name: "O'Brien-Fleming",
      abbreviation: 'OBF',
      description: 'Conservative early, preserves alpha for final analysis',
      formula: 'α(t) = 2 - 2Φ(z_{α/2} / √t)',
      characteristics: {
        early_stopping: 'Very conservative',
        final_analysis: 'Near nominal alpha',
        use_case: 'Phase III trials, regulatory submissions'
      },
      calculate: (t, alpha) => {
        // O'Brien-Fleming: α(t) = 2 - 2Φ(z_α/2 / √t)
        const z_alpha = normalQuantile(1 - alpha / 2);
        return 2 * (1 - normalCDF(z_alpha / Math.sqrt(t)));
      }
    },
    pocock: {
      name: 'Pocock',
      abbreviation: 'POC',
      description: 'Equal alpha spending at each look',
      formula: 'α(t) = α × log(1 + (e - 1) × t)',
      characteristics: {
        early_stopping: 'Liberal',
        final_analysis: 'Reduced alpha',
        use_case: 'Early phase trials, futility stopping'
      },
      calculate: (t, alpha) => {
        // Pocock: α(t) = α × log(1 + (e - 1) × t)
        return alpha * Math.log(1 + (Math.E - 1) * t);
      }
    },
    lan_demets_obf: {
      name: 'Lan-DeMets (OBF-like)',
      abbreviation: 'LD-OBF',
      description: 'Approximates O\'Brien-Fleming boundaries',
      formula: 'α(t) = 2 - 2Φ(z_{α/2} / √t)',
      characteristics: {
        early_stopping: 'Conservative',
        final_analysis: 'Near nominal',
        use_case: 'Flexible timing of analyses'
      },
      calculate: (t, alpha) => {
        const z_alpha = normalQuantile(1 - alpha / 2);
        return 2 * (1 - normalCDF(z_alpha / Math.sqrt(t)));
      }
    },
    lan_demets_poc: {
      name: 'Lan-DeMets (Pocock-like)',
      abbreviation: 'LD-POC',
      description: 'Approximates Pocock boundaries',
      formula: 'α(t) = α × log(1 + (e - 1) × t)',
      characteristics: {
        early_stopping: 'Liberal',
        final_analysis: 'Reduced',
        use_case: 'Early stopping emphasis'
      },
      calculate: (t, alpha) => {
        return alpha * Math.log(1 + (Math.E - 1) * t);
      }
    },
    hwang_shih_decani: {
      name: 'Hwang-Shih-DeCani',
      abbreviation: 'HSD',
      description: 'Flexible gamma family',
      formula: 'α(t) = α × (1 - e^(-γt)) / (1 - e^(-γ))',
      characteristics: {
        early_stopping: 'Adjustable via γ',
        final_analysis: 'Flexible',
        use_case: 'Custom stopping requirements'
      },
      gamma: -4, // Default gamma value
      calculate: (t, alpha, gamma = -4) => {
        if (gamma === 0) {
          return alpha * t; // Linear spending when γ = 0
        }
        return alpha * (1 - Math.exp(-gamma * t)) / (1 - Math.exp(-gamma));
      }
    },
    kim_demets: {
      name: 'Kim-DeMets (Power)',
      abbreviation: 'KD',
      description: 'Power family spending function',
      formula: 'α(t) = α × t^ρ',
      characteristics: {
        early_stopping: 'Controlled by ρ',
        final_analysis: 'Flexible',
        use_case: 'General purpose'
      },
      rho: 1, // Default rho value
      calculate: (t, alpha, rho = 1) => {
        return alpha * Math.pow(t, rho);
      }
    }
  };

  // Statistical functions
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
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;
    
    const y = 1.0 - (((((a5 * t5 + a4 * t4) + a3 * t3) + a2 * t2) + a1 * t) * Math.exp(-x * x));
    
    return 0.5 * (1.0 + sign * y);
  }

  function normalQuantile(p) {
    // Approximation of inverse normal CDF
    const a0 = 2.50662823884;
    const a1 = -18.61500062529;
    const a2 = 41.39119773534;
    const a3 = -25.44106049637;
    
    const b0 = -8.47351093090;
    const b1 = 23.08336743743;
    const b2 = -21.06224101826;
    const b3 = 3.13082909833;
    
    const c0 = 0.3374754822726147;
    const c1 = 0.9761690190917186;
    const c2 = 0.1607979714918209;
    const c3 = 0.0276438810333863;
    const c4 = 0.0038405729373609;
    const c5 = 0.0003951896511919;
    const c6 = 0.0000321767881768;
    const c7 = 0.0000002888167364;
    const c8 = 0.0000003960315187;
    
    const y = p - 0.5;
    if (Math.abs(y) < 0.42) {
      const r = y * y;
      return y * (((a3 * r + a2) * r + a1) * r + a0) / ((((b3 * r + b2) * r + b1) * r + b0) * r + 1);
    } else {
      let r = p;
      if (y > 0) r = 1 - p;
      r = Math.log(-Math.log(r));
      let x = c0 + r * (c1 + r * (c2 + r * (c3 + r * (c4 + r * (c5 + r * (c6 + r * (c7 + r * c8)))))));
      if (y < 0) x = -x;
      return x;
    }
  }

  // Calculate information fractions
  useEffect(() => {
    if (sampleSizes && sampleSizes.length > 0) {
      const totalSampleSize = sampleSizes[sampleSizes.length - 1];
      const fractions = sampleSizes.map(n => n / totalSampleSize);
      setInformationFractions(fractions);
    } else {
      // Equal spacing if no sample sizes provided
      const fractions = Array.from({ length: numberOfLooks }, (_, i) => 
        (i + 1) / numberOfLooks
      );
      setInformationFractions(fractions);
    }
  }, [sampleSizes, numberOfLooks]);

  // Calculate boundaries
  useEffect(() => {
    if (informationFractions.length === 0) return;

    const func = SpendingFunctions[spendingFunction];
    const alphaSpent = [];
    const zBoundaries = [];
    const nominalPValues = [];
    
    let previousAlpha = 0;
    
    informationFractions.forEach((fraction, i) => {
      let currentAlpha;
      
      if (spendingFunction === 'hwang_shih_decani') {
        currentAlpha = func.calculate(fraction, totalAlpha, func.gamma);
      } else if (spendingFunction === 'kim_demets') {
        currentAlpha = func.calculate(fraction, totalAlpha, func.rho);
      } else {
        currentAlpha = func.calculate(fraction, totalAlpha);
      }
      
      const incrementalAlpha = currentAlpha - previousAlpha;
      alphaSpent.push(incrementalAlpha);
      
      // Calculate Z-boundary for this look
      const cumulativeAlphaAtLook = alphaSpent.reduce((sum, a) => sum + a, 0);
      const zBoundary = normalQuantile(1 - cumulativeAlphaAtLook / 2);
      zBoundaries.push(zBoundary);
      
      // Calculate nominal p-value boundary
      const nominalP = 2 * (1 - normalCDF(Math.abs(zBoundary)));
      nominalPValues.push(nominalP);
      
      previousAlpha = currentAlpha;
    });
    
    const boundaryData = informationFractions.map((fraction, i) => ({
      look: i + 1,
      informationFraction: fraction,
      sampleSize: sampleSizes[i] || Math.round(fraction * 1000),
      alphaSpent: alphaSpent[i],
      cumulativeAlpha: alphaSpent.slice(0, i + 1).reduce((sum, a) => sum + a, 0),
      zBoundary: zBoundaries[i],
      nominalPValue: nominalPValues[i],
      efficacyBoundary: zBoundaries[i],
      futilityBoundary: -zBoundaries[i] * 0.5 // Symmetric futility boundary at 50%
    }));
    
    setBoundaries(boundaryData);
    setCumulativeAlpha(boundaryData.map(b => b.cumulativeAlpha));
    
    if (onBoundariesCalculated) {
      onBoundariesCalculated(boundaryData);
    }
  }, [informationFractions, spendingFunction, totalAlpha, sampleSizes, onBoundariesCalculated]);

  // Export boundaries
  const exportBoundaries = () => {
    let content = '';
    const headers = ['Look', 'Info Fraction', 'Sample Size', 'Alpha Spent', 
                    'Cumulative Alpha', 'Z-Boundary', 'Nominal p-value'];

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n';
      boundaries.forEach(b => {
        content += [
          b.look,
          b.informationFraction.toFixed(4),
          b.sampleSize,
          b.alphaSpent.toFixed(6),
          b.cumulativeAlpha.toFixed(6),
          b.zBoundary.toFixed(4),
          b.nominalPValue.toFixed(6)
        ].join(',') + '\n';
      });
    } else if (exportFormat === 'r') {
      content = `# Alpha Spending Boundaries - ${SpendingFunctions[spendingFunction].name}\n`;
      content += `alpha <- ${totalAlpha}\n`;
      content += `looks <- ${numberOfLooks}\n`;
      content += `info_fractions <- c(${informationFractions.map(f => f.toFixed(4)).join(', ')})\n`;
      content += `z_boundaries <- c(${boundaries.map(b => b.zBoundary.toFixed(4)).join(', ')})\n`;
      content += `nominal_p <- c(${boundaries.map(b => b.nominalPValue.toFixed(6)).join(', ')})\n`;
    }

    const blob = new Blob([content], { 
      type: exportFormat === 'csv' ? 'text/csv' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alpha_spending_${spendingFunction}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Boundary visualization
  const BoundaryPlot = () => {
    const plotWidth = 600;
    const plotHeight = 300;
    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const innerWidth = plotWidth - margin.left - margin.right;
    const innerHeight = plotHeight - margin.top - margin.bottom;

    const maxZ = Math.max(...boundaries.map(b => Math.abs(b.zBoundary))) * 1.2;
    const xScale = (fraction) => margin.left + (fraction * innerWidth);
    const yScale = (z) => margin.top + ((maxZ - z) / (2 * maxZ)) * innerHeight;

    return (
      <svg width={plotWidth} height={plotHeight} className="boundary-plot">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => (
          <line
            key={`grid-x-${fraction}`}
            x1={xScale(fraction)}
            y1={margin.top}
            x2={xScale(fraction)}
            y2={margin.top + innerHeight}
            stroke="#e0e0e0"
            strokeDasharray="2,2"
          />
        ))}
        
        {[-maxZ, -maxZ/2, 0, maxZ/2, maxZ].map(z => (
          <line
            key={`grid-y-${z}`}
            x1={margin.left}
            y1={yScale(z)}
            x2={margin.left + innerWidth}
            y2={yScale(z)}
            stroke="#e0e0e0"
            strokeDasharray="2,2"
          />
        ))}

        {/* Axes */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + innerHeight}
          stroke="#424242"
          strokeWidth="2"
        />
        <line
          x1={margin.left}
          y1={margin.top + innerHeight}
          x2={margin.left + innerWidth}
          y2={margin.top + innerHeight}
          stroke="#424242"
          strokeWidth="2"
        />

        {/* Efficacy boundaries */}
        <polyline
          points={boundaries.map(b => 
            `${xScale(b.informationFraction)},${yScale(b.efficacyBoundary)}`
          ).join(' ')}
          fill="none"
          stroke="#4caf50"
          strokeWidth="2"
        />
        
        {/* Futility boundaries */}
        <polyline
          points={boundaries.map(b => 
            `${xScale(b.informationFraction)},${yScale(b.futilityBoundary)}`
          ).join(' ')}
          fill="none"
          stroke="#f44336"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Boundary points */}
        {boundaries.map((b, i) => (
          <g key={`point-${i}`}>
            <circle
              cx={xScale(b.informationFraction)}
              cy={yScale(b.efficacyBoundary)}
              r="4"
              fill="#4caf50"
            />
            <circle
              cx={xScale(b.informationFraction)}
              cy={yScale(b.futilityBoundary)}
              r="4"
              fill="#f44336"
            />
            <text
              x={xScale(b.informationFraction)}
              y={margin.top - 5}
              textAnchor="middle"
              fontSize="10"
              fill="#666"
            >
              {b.look}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={margin.left + innerWidth / 2}
          y={plotHeight - 5}
          textAnchor="middle"
          fontSize="12"
          fill="#424242"
        >
          Information Fraction
        </text>
        <text
          x={15}
          y={margin.top + innerHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#424242"
          transform={`rotate(-90, 15, ${margin.top + innerHeight / 2})`}
        >
          Z-Score
        </text>

        {/* Legend */}
        <g transform={`translate(${plotWidth - 100}, ${margin.top})`}>
          <rect x="0" y="0" width="80" height="40" fill="#ffffff" stroke="#e0e0e0" />
          <line x1="5" y1="10" x2="25" y2="10" stroke="#4caf50" strokeWidth="2" />
          <text x="30" y="14" fontSize="10" fill="#666">Efficacy</text>
          <line x1="5" y1="25" x2="25" y2="25" stroke="#f44336" strokeWidth="2" strokeDasharray="5,5" />
          <text x="30" y="29" fontSize="10" fill="#666">Futility</text>
        </g>
      </svg>
    );
  };

  return (
    <div className={`alpha-spending-calculator ${className}`}>
      <div className="calculator-header">
        <h3>Alpha Spending Calculator</h3>
        <div className="header-info">
          <span className="alpha-badge">α = {totalAlpha}</span>
          <span className="looks-badge">{numberOfLooks} looks</span>
        </div>
      </div>

      <div className="calculator-controls">
        <div className="function-selector">
          <label>Spending Function:</label>
          <select 
            value={spendingFunction}
            onChange={(e) => setSpendingFunction(e.target.value)}
          >
            {Object.entries(SpendingFunctions).map(([key, func]) => (
              <option key={key} value={key}>
                {func.name} ({func.abbreviation})
              </option>
            ))}
          </select>
        </div>

        <div className="view-controls">
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={showVisualization}
              onChange={(e) => setShowVisualization(e.target.checked)}
            />
            Show Plot
          </label>
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={showFormulas}
              onChange={(e) => setShowFormulas(e.target.checked)}
            />
            Show Formulas
          </label>
        </div>

        <div className="export-controls">
          <select 
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="r">R Code</option>
          </select>
          <button className="btn-export" onClick={exportBoundaries}>
            Export
          </button>
        </div>
      </div>

      <div className="function-details">
        <div className="details-header">
          <h4>{SpendingFunctions[spendingFunction].name}</h4>
          <span className="function-abbr">{SpendingFunctions[spendingFunction].abbreviation}</span>
        </div>
        <p className="function-description">
          {SpendingFunctions[spendingFunction].description}
        </p>
        
        {showFormulas && (
          <div className="formula-section">
            <div className="formula">
              <label>Spending Function:</label>
              <code>{SpendingFunctions[spendingFunction].formula}</code>
            </div>
            <div className="characteristics">
              <h5>Characteristics:</h5>
              <ul>
                {Object.entries(SpendingFunctions[spendingFunction].characteristics).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key.replace('_', ' ')}:</strong> {value}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {showVisualization && boundaries.length > 0 && (
        <div className="visualization-section">
          <h4>Boundary Plot</h4>
          <BoundaryPlot />
        </div>
      )}

      <div className="boundaries-table">
        <h4>Stopping Boundaries</h4>
        <table>
          <thead>
            <tr>
              <th>Look</th>
              <th>Info Fraction</th>
              <th>Sample Size</th>
              <th>α Spent</th>
              <th>Cumulative α</th>
              <th>Z-Boundary</th>
              <th>Nominal p</th>
              <th>Efficacy</th>
              <th>Futility</th>
            </tr>
          </thead>
          <tbody>
            {boundaries.map((boundary, index) => (
              <tr key={index} className={index === boundaries.length - 1 ? 'final-look' : ''}>
                <td className="look-number">{boundary.look}</td>
                <td>{boundary.informationFraction.toFixed(3)}</td>
                <td>{boundary.sampleSize}</td>
                <td className="alpha-spent">{boundary.alphaSpent.toFixed(5)}</td>
                <td className="cumulative-alpha">{boundary.cumulativeAlpha.toFixed(5)}</td>
                <td className="z-boundary">{boundary.zBoundary.toFixed(3)}</td>
                <td className="p-value">{boundary.nominalPValue.toFixed(5)}</td>
                <td className="efficacy">
                  <span className="boundary-value positive">
                    {boundary.efficacyBoundary.toFixed(3)}
                  </span>
                </td>
                <td className="futility">
                  <span className="boundary-value negative">
                    {boundary.futilityBoundary.toFixed(3)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="calculator-footer">
        <div className="summary">
          <div className="summary-item">
            <label>Total α spent:</label>
            <span>{cumulativeAlpha[cumulativeAlpha.length - 1]?.toFixed(5) || '0.00000'}</span>
          </div>
          <div className="summary-item">
            <label>Final boundary:</label>
            <span>{boundaries[boundaries.length - 1]?.zBoundary.toFixed(3) || 'N/A'}</span>
          </div>
          <div className="summary-item">
            <label>Method:</label>
            <span>{SpendingFunctions[spendingFunction].abbreviation}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlphaSpendingCalculator;