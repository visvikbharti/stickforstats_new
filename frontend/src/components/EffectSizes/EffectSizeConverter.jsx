import React, { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './EffectSizeConverter.scss';

// Effect size types and their ranges
const EffectSizeTypes = {
  COHENS_D: { 
    name: "Cohen's d", 
    symbol: 'd', 
    range: [-Infinity, Infinity],
    description: 'Standardized mean difference'
  },
  PEARSON_R: { 
    name: "Pearson's r", 
    symbol: 'r', 
    range: [-1, 1],
    description: 'Correlation coefficient'
  },
  ETA_SQUARED: { 
    name: 'Eta squared', 
    symbol: 'η²', 
    range: [0, 1],
    description: 'Proportion of variance explained'
  },
  PARTIAL_ETA: { 
    name: 'Partial eta squared', 
    symbol: 'η²p', 
    range: [0, 1],
    description: 'Partial variance explained'
  },
  COHENS_F: { 
    name: "Cohen's f", 
    symbol: 'f', 
    range: [0, Infinity],
    description: 'Effect size for ANOVA'
  },
  COHENS_F2: { 
    name: "Cohen's f²", 
    symbol: 'f²', 
    range: [0, Infinity],
    description: 'Squared effect size for regression'
  },
  ODDS_RATIO: { 
    name: 'Odds Ratio', 
    symbol: 'OR', 
    range: [0, Infinity],
    description: 'Ratio of odds'
  },
  HEDGES_G: { 
    name: "Hedges' g", 
    symbol: 'g', 
    range: [-Infinity, Infinity],
    description: 'Bias-corrected Cohen\'s d'
  },
  GLASS_DELTA: { 
    name: "Glass's Δ", 
    symbol: 'Δ', 
    range: [-Infinity, Infinity],
    description: 'Using control group SD'
  }
};

// Conversion formulas
const ConversionFormulas = {
  // Cohen's d conversions
  d_to_r: (d, n1, n2) => {
    const n = n1 + n2;
    return d / Math.sqrt(d * d + (n * n) / (n1 * n2));
  },
  
  d_to_eta2: (d, n1, n2) => {
    const f = d / 2;
    return f * f / (f * f + 1);
  },
  
  d_to_f: (d) => Math.abs(d) / 2,
  
  d_to_g: (d, n1, n2) => {
    const df = n1 + n2 - 2;
    const J = 1 - (3 / (4 * df - 1));
    return d * J;
  },
  
  d_to_or: (d) => Math.exp(d * Math.PI / Math.sqrt(3)),
  
  // Pearson's r conversions
  r_to_d: (r, n1, n2) => {
    const n = n1 + n2;
    return 2 * r / Math.sqrt(1 - r * r) * Math.sqrt(n / (n1 * n2));
  },
  
  r_to_eta2: (r) => r * r,
  
  r_to_f: (r) => Math.abs(r) / Math.sqrt(1 - r * r),
  
  r_to_f2: (r) => r * r / (1 - r * r),
  
  r_to_z: (r) => 0.5 * Math.log((1 + r) / (1 - r)), // Fisher's z
  
  // Eta squared conversions
  eta2_to_d: (eta2, n1, n2) => {
    const f = Math.sqrt(eta2 / (1 - eta2));
    return 2 * f;
  },
  
  eta2_to_r: (eta2) => Math.sqrt(eta2),
  
  eta2_to_f: (eta2) => Math.sqrt(eta2 / (1 - eta2)),
  
  eta2_to_f2: (eta2) => eta2 / (1 - eta2),
  
  // Cohen's f conversions
  f_to_d: (f) => 2 * f,
  
  f_to_r: (f) => f / Math.sqrt(f * f + 1),
  
  f_to_eta2: (f) => f * f / (f * f + 1),
  
  f_to_f2: (f) => f * f,
  
  // Odds ratio conversions
  or_to_d: (or) => Math.log(or) * Math.sqrt(3) / Math.PI,
  
  or_to_r: (or) => {
    const d = Math.log(or) * Math.sqrt(3) / Math.PI;
    return d / Math.sqrt(d * d + 4);
  }
};

// Interpretation benchmarks
const InterpretationBenchmarks = {
  COHENS_D: [
    { threshold: 0.2, label: 'Small', color: '#3498db' },
    { threshold: 0.5, label: 'Medium', color: '#e67e22' },
    { threshold: 0.8, label: 'Large', color: '#e74c3c' },
    { threshold: 1.2, label: 'Very Large', color: '#c0392b' }
  ],
  PEARSON_R: [
    { threshold: 0.1, label: 'Small', color: '#3498db' },
    { threshold: 0.3, label: 'Medium', color: '#e67e22' },
    { threshold: 0.5, label: 'Large', color: '#e74c3c' },
    { threshold: 0.7, label: 'Very Large', color: '#c0392b' }
  ],
  ETA_SQUARED: [
    { threshold: 0.01, label: 'Small', color: '#3498db' },
    { threshold: 0.06, label: 'Medium', color: '#e67e22' },
    { threshold: 0.14, label: 'Large', color: '#e74c3c' }
  ],
  COHENS_F: [
    { threshold: 0.1, label: 'Small', color: '#3498db' },
    { threshold: 0.25, label: 'Medium', color: '#e67e22' },
    { threshold: 0.4, label: 'Large', color: '#e74c3c' }
  ]
};

const EffectSizeConverter = () => {
  const dispatch = useDispatch();
  
  // State management
  const [inputType, setInputType] = useState('COHENS_D');
  const [inputValue, setInputValue] = useState('');
  const [sampleSize1, setSampleSize1] = useState('');
  const [sampleSize2, setSampleSize2] = useState('');
  const [conversions, setConversions] = useState({});
  const [showFormulas, setShowFormulas] = useState(false);
  const [conversionHistory, setConversionHistory] = useState([]);
  
  // Validate input
  const validateInput = useCallback((value, type) => {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    
    const range = EffectSizeTypes[type].range;
    return num >= range[0] && num <= range[1];
  }, []);
  
  // Get interpretation
  const getInterpretation = useCallback((value, type) => {
    const benchmarks = InterpretationBenchmarks[type];
    if (!benchmarks) return { label: 'No interpretation available', color: '#7f8c8d' };
    
    const absValue = Math.abs(value);
    for (let i = benchmarks.length - 1; i >= 0; i--) {
      if (absValue >= benchmarks[i].threshold) {
        return benchmarks[i];
      }
    }
    return { label: 'Trivial', color: '#95a5a6' };
  }, []);
  
  // Perform conversions
  const performConversions = useCallback(() => {
    const value = parseFloat(inputValue);
    if (isNaN(value)) return;
    
    const n1 = parseInt(sampleSize1) || 50;
    const n2 = parseInt(sampleSize2) || 50;
    
    const results = {};
    
    // Convert from input type to all other types
    switch (inputType) {
      case 'COHENS_D':
        results.COHENS_D = value;
        results.PEARSON_R = ConversionFormulas.d_to_r(value, n1, n2);
        results.ETA_SQUARED = ConversionFormulas.d_to_eta2(value, n1, n2);
        results.COHENS_F = ConversionFormulas.d_to_f(value);
        results.COHENS_F2 = Math.pow(ConversionFormulas.d_to_f(value), 2);
        results.HEDGES_G = ConversionFormulas.d_to_g(value, n1, n2);
        results.ODDS_RATIO = ConversionFormulas.d_to_or(value);
        results.GLASS_DELTA = value; // Approximation
        break;
        
      case 'PEARSON_R':
        results.PEARSON_R = value;
        results.COHENS_D = ConversionFormulas.r_to_d(value, n1, n2);
        results.ETA_SQUARED = ConversionFormulas.r_to_eta2(value);
        results.COHENS_F = ConversionFormulas.r_to_f(value);
        results.COHENS_F2 = ConversionFormulas.r_to_f2(value);
        results.HEDGES_G = ConversionFormulas.d_to_g(ConversionFormulas.r_to_d(value, n1, n2), n1, n2);
        results.FISHER_Z = ConversionFormulas.r_to_z(value);
        break;
        
      case 'ETA_SQUARED':
        results.ETA_SQUARED = value;
        results.PARTIAL_ETA = value; // Approximation
        results.COHENS_D = ConversionFormulas.eta2_to_d(value, n1, n2);
        results.PEARSON_R = ConversionFormulas.eta2_to_r(value);
        results.COHENS_F = ConversionFormulas.eta2_to_f(value);
        results.COHENS_F2 = ConversionFormulas.eta2_to_f2(value);
        break;
        
      case 'COHENS_F':
        results.COHENS_F = value;
        results.COHENS_D = ConversionFormulas.f_to_d(value);
        results.PEARSON_R = ConversionFormulas.f_to_r(value);
        results.ETA_SQUARED = ConversionFormulas.f_to_eta2(value);
        results.COHENS_F2 = ConversionFormulas.f_to_f2(value);
        break;
        
      case 'ODDS_RATIO':
        results.ODDS_RATIO = value;
        results.COHENS_D = ConversionFormulas.or_to_d(value);
        results.PEARSON_R = ConversionFormulas.or_to_r(value);
        results.LOG_OR = Math.log(value);
        break;
        
      default:
        results[inputType] = value;
    }
    
    // Add interpretations
    Object.keys(results).forEach(key => {
      const interpretation = getInterpretation(results[key], key);
      results[key] = {
        value: results[key],
        interpretation
      };
    });
    
    setConversions(results);
    
    // Add to history
    setConversionHistory(prev => [{
      timestamp: new Date().toISOString(),
      input: { type: inputType, value },
      results: Object.keys(results).reduce((acc, key) => {
        acc[key] = results[key].value;
        return acc;
      }, {})
    }, ...prev.slice(0, 9)]);
  }, [inputType, inputValue, sampleSize1, sampleSize2, getInterpretation]);
  
  // Format value for display
  const formatValue = useCallback((value, precision = 4) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    if (!isFinite(value)) return value > 0 ? '∞' : '-∞';
    return value.toFixed(precision);
  }, []);
  
  // Get conversion formula
  const getFormula = useCallback((fromType, toType) => {
    const formulas = {
      COHENS_D: {
        PEARSON_R: 'd / √(d² + (n₁+n₂)²/(n₁×n₂))',
        ETA_SQUARED: 'f² / (f² + 1) where f = d/2',
        COHENS_F: '|d| / 2',
        HEDGES_G: 'd × J where J = 1 - 3/(4df - 1)',
        ODDS_RATIO: 'exp(d × π / √3)'
      },
      PEARSON_R: {
        COHENS_D: '2r / √(1 - r²) × √(n/(n₁×n₂))',
        ETA_SQUARED: 'r²',
        COHENS_F: '|r| / √(1 - r²)',
        COHENS_F2: 'r² / (1 - r²)',
        FISHER_Z: '0.5 × ln((1 + r) / (1 - r))'
      },
      ETA_SQUARED: {
        COHENS_D: '2√(η² / (1 - η²))',
        PEARSON_R: '√η²',
        COHENS_F: '√(η² / (1 - η²))',
        COHENS_F2: 'η² / (1 - η²)'
      }
    };
    
    return formulas[fromType]?.[toType] || 'Direct conversion not available';
  }, []);
  
  // Export conversions
  const exportConversions = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      input: {
        type: EffectSizeTypes[inputType].name,
        value: inputValue,
        sampleSize1,
        sampleSize2
      },
      conversions: Object.entries(conversions).map(([key, data]) => ({
        type: EffectSizeTypes[key]?.name || key,
        symbol: EffectSizeTypes[key]?.symbol || key,
        value: data.value,
        interpretation: data.interpretation?.label
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `effect_size_conversions_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [inputType, inputValue, sampleSize1, sampleSize2, conversions]);
  
  return (
    <div className="effect-size-converter">
      <div className="converter-header">
        <h2>Effect Size Converter</h2>
        <div className="header-controls">
          <button 
            className={`formula-toggle ${showFormulas ? 'active' : ''}`}
            onClick={() => setShowFormulas(!showFormulas)}
          >
            {showFormulas ? 'Hide' : 'Show'} Formulas
          </button>
          <button 
            className="export-btn"
            onClick={exportConversions}
            disabled={Object.keys(conversions).length === 0}
          >
            Export
          </button>
        </div>
      </div>
      
      <div className="converter-body">
        <div className="input-panel">
          <h3>Input</h3>
          
          <div className="input-controls">
            <div className="control-group">
              <label>Effect Size Type</label>
              <select 
                value={inputType}
                onChange={(e) => setInputType(e.target.value)}
              >
                {Object.entries(EffectSizeTypes).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.name} ({type.symbol})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="control-group">
              <label>Value</label>
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Enter ${EffectSizeTypes[inputType].symbol} value`}
                step="0.01"
              />
              {inputValue && !validateInput(inputValue, inputType) && (
                <span className="error">
                  Invalid range for {EffectSizeTypes[inputType].name}
                </span>
              )}
            </div>
            
            <div className="sample-sizes">
              <div className="control-group">
                <label>Sample Size 1 (n₁)</label>
                <input
                  type="number"
                  value={sampleSize1}
                  onChange={(e) => setSampleSize1(e.target.value)}
                  placeholder="50"
                  min="1"
                />
              </div>
              
              <div className="control-group">
                <label>Sample Size 2 (n₂)</label>
                <input
                  type="number"
                  value={sampleSize2}
                  onChange={(e) => setSampleSize2(e.target.value)}
                  placeholder="50"
                  min="1"
                />
              </div>
            </div>
            
            <button 
              className="convert-btn"
              onClick={performConversions}
              disabled={!inputValue || !validateInput(inputValue, inputType)}
            >
              Convert
            </button>
          </div>
          
          <div className="input-info">
            <h4>{EffectSizeTypes[inputType].name}</h4>
            <p>{EffectSizeTypes[inputType].description}</p>
            <div className="range-info">
              Range: [{formatValue(EffectSizeTypes[inputType].range[0])}, 
              {formatValue(EffectSizeTypes[inputType].range[1])}]
            </div>
          </div>
        </div>
        
        <div className="results-panel">
          <h3>Conversions</h3>
          
          {Object.keys(conversions).length === 0 ? (
            <div className="no-results">
              Enter a value and click Convert to see results
            </div>
          ) : (
            <div className="conversion-results">
              {Object.entries(conversions).map(([key, data]) => {
                const type = EffectSizeTypes[key];
                if (!type) return null;
                
                return (
                  <div key={key} className="result-item">
                    <div className="result-header">
                      <span className="result-name">{type.name}</span>
                      <span className="result-symbol">({type.symbol})</span>
                    </div>
                    
                    <div className="result-value">
                      {formatValue(data.value)}
                    </div>
                    
                    <div 
                      className="result-interpretation"
                      style={{ borderColor: data.interpretation?.color }}
                    >
                      {data.interpretation?.label}
                    </div>
                    
                    {showFormulas && inputType !== key && (
                      <div className="conversion-formula">
                        <span className="formula-label">Formula:</span>
                        <code>{getFormula(inputType, key)}</code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="interpretation-guide">
            <h4>Interpretation Guidelines</h4>
            <div className="benchmarks">
              {Object.entries(InterpretationBenchmarks).map(([type, benchmarks]) => (
                <div key={type} className="benchmark-row">
                  <span className="benchmark-type">
                    {EffectSizeTypes[type]?.symbol}:
                  </span>
                  <div className="benchmark-values">
                    {benchmarks.map((b, i) => (
                      <span 
                        key={i} 
                        className="benchmark-item"
                        style={{ color: b.color }}
                      >
                        {b.label} (≥{b.threshold})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="history-panel">
          <h3>Conversion History</h3>
          <div className="history-list">
            {conversionHistory.length === 0 ? (
              <div className="no-history">No conversions yet</div>
            ) : (
              conversionHistory.map((entry, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="history-input">
                    {EffectSizeTypes[entry.input.type]?.symbol}: {formatValue(entry.input.value)}
                  </div>
                  <div className="history-results">
                    {Object.entries(entry.results).slice(0, 3).map(([key, val]) => (
                      <span key={key}>
                        {EffectSizeTypes[key]?.symbol || key}: {formatValue(val, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectSizeConverter;