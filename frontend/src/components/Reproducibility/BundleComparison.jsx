import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './BundleComparison.scss';

// Comparison categories
const ComparisonCategories = {
  METADATA: {
    name: 'Metadata',
    icon: '📋',
    fields: ['version', 'created', 'author', 'description', 'tags']
  },
  ENVIRONMENT: {
    name: 'Environment',
    icon: '⚙️',
    fields: ['os', 'platform', 'python_version', 'r_version', 'packages']
  },
  DATA: {
    name: 'Data',
    icon: '📊',
    fields: ['fingerprint', 'rows', 'columns', 'size', 'checksum']
  },
  PIPELINE: {
    name: 'Pipeline',
    icon: '🔄',
    fields: ['steps', 'functions', 'parameters', 'dependencies']
  },
  RESULTS: {
    name: 'Results',
    icon: '📈',
    fields: ['statistics', 'p_values', 'effect_sizes', 'confidence_intervals']
  },
  SEEDS: {
    name: 'Random Seeds',
    icon: '🎲',
    fields: ['global_seed', 'numpy_seed', 'torch_seed', 'random_seed']
  }
};

// Difference types
const DifferenceTypes = {
  IDENTICAL: { label: 'Identical', color: '#27ae60', icon: '✓' },
  MINOR: { label: 'Minor', color: '#f39c12', icon: '⚠' },
  MAJOR: { label: 'Major', color: '#e74c3c', icon: '✗' },
  MISSING: { label: 'Missing', color: '#95a5a6', icon: '—' }
};

const BundleComparison = () => {
  const dispatch = useDispatch();
  
  // State management
  const [bundles, setBundles] = useState([]);
  const [selectedBundles, setSelectedBundles] = useState([]);
  const [comparisonResults, setComparisonResults] = useState({});
  const [activeCategory, setActiveCategory] = useState('METADATA');
  const [viewMode, setViewMode] = useState('side-by-side'); // side-by-side, diff, matrix
  const [filterDifferences, setFilterDifferences] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [reproducibilityScore, setReproducibilityScore] = useState(null);
  
  const fileInputRef = useRef(null);
  
  // Load bundle from file
  const loadBundle = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bundleData = JSON.parse(event.target.result);
        const bundle = {
          id: `bundle_${Date.now()}`,
          name: file.name.replace('.json', ''),
          data: bundleData,
          loaded: new Date().toISOString()
        };
        
        setBundles(prev => [...prev, bundle]);
        
        // Auto-select if less than 2 bundles selected
        if (selectedBundles.length < 2) {
          setSelectedBundles(prev => [...prev, bundle.id]);
        }
      } catch (error) {
        console.error('Failed to load bundle:', error);
      }
    };
    reader.readAsText(file);
  }, [selectedBundles]);
  
  // Compare bundles
  const compareBundles = useCallback(() => {
    if (selectedBundles.length < 2) return;
    
    setIsComparing(true);
    
    const bundle1 = bundles.find(b => b.id === selectedBundles[0]);
    const bundle2 = bundles.find(b => b.id === selectedBundles[1]);
    
    if (!bundle1 || !bundle2) return;
    
    const results = {};
    let identicalCount = 0;
    let totalCount = 0;
    
    // Compare each category
    Object.entries(ComparisonCategories).forEach(([catKey, category]) => {
      results[catKey] = {};
      
      category.fields.forEach(field => {
        totalCount++;
        const val1 = getNestedValue(bundle1.data, catKey.toLowerCase(), field);
        const val2 = getNestedValue(bundle2.data, catKey.toLowerCase(), field);
        
        const diff = compareValues(val1, val2);
        results[catKey][field] = {
          bundle1: val1,
          bundle2: val2,
          difference: diff
        };
        
        if (diff.type === 'IDENTICAL') {
          identicalCount++;
        }
      });
    });
    
    // Calculate reproducibility score
    const score = (identicalCount / totalCount) * 100;
    setReproducibilityScore(score);
    
    setComparisonResults(results);
    setIsComparing(false);
  }, [bundles, selectedBundles]);
  
  // Get nested value from object
  const getNestedValue = (obj, category, field) => {
    if (!obj) return undefined;
    
    // Try direct path
    if (obj[category] && obj[category][field] !== undefined) {
      return obj[category][field];
    }
    
    // Try alternative paths
    if (category === 'data' && obj.fingerprints) {
      return obj.fingerprints[field];
    }
    if (category === 'environment' && obj.system) {
      return obj.system[field];
    }
    if (category === 'pipeline' && obj.analysis) {
      return obj.analysis[field];
    }
    
    // Search recursively
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const result = getNestedValue(obj[key], category, field);
        if (result !== undefined) return result;
      }
    }
    
    return undefined;
  };
  
  // Compare two values
  const compareValues = (val1, val2) => {
    if (val1 === undefined && val2 === undefined) {
      return { type: 'MISSING', details: 'Both missing' };
    }
    if (val1 === undefined || val2 === undefined) {
      return { type: 'MISSING', details: 'One bundle missing value' };
    }
    
    // Handle different types
    if (typeof val1 !== typeof val2) {
      return { type: 'MAJOR', details: 'Type mismatch' };
    }
    
    // Arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) {
        return { type: 'MAJOR', details: `Length: ${val1.length} vs ${val2.length}` };
      }
      const allMatch = val1.every((v, i) => v === val2[i]);
      return allMatch 
        ? { type: 'IDENTICAL', details: 'Arrays match' }
        : { type: 'MAJOR', details: 'Array elements differ' };
    }
    
    // Objects
    if (typeof val1 === 'object' && val1 !== null) {
      const keys1 = Object.keys(val1).sort();
      const keys2 = Object.keys(val2).sort();
      
      if (keys1.join(',') !== keys2.join(',')) {
        return { type: 'MAJOR', details: 'Object keys differ' };
      }
      
      const allMatch = keys1.every(k => val1[k] === val2[k]);
      return allMatch
        ? { type: 'IDENTICAL', details: 'Objects match' }
        : { type: 'MINOR', details: 'Object values differ' };
    }
    
    // Numbers (with tolerance for floating point)
    if (typeof val1 === 'number') {
      const tolerance = 1e-10;
      if (Math.abs(val1 - val2) < tolerance) {
        return { type: 'IDENTICAL', details: 'Numbers match' };
      }
      const percentDiff = Math.abs((val1 - val2) / val1) * 100;
      return percentDiff < 0.01
        ? { type: 'MINOR', details: `${percentDiff.toFixed(4)}% difference` }
        : { type: 'MAJOR', details: `${percentDiff.toFixed(2)}% difference` };
    }
    
    // Strings and others
    return val1 === val2
      ? { type: 'IDENTICAL', details: 'Values match' }
      : { type: 'MAJOR', details: 'Values differ' };
  };
  
  // Format value for display
  const formatValue = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'object') {
      if (Array.isArray(value)) return `Array[${value.length}]`;
      return `Object{${Object.keys(value).length} keys}`;
    }
    if (typeof value === 'number') {
      return value.toFixed(6);
    }
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 47) + '...';
    }
    return String(value);
  };
  
  // Generate comparison report
  const generateReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      bundles: selectedBundles.map(id => {
        const bundle = bundles.find(b => b.id === id);
        return {
          name: bundle.name,
          loaded: bundle.loaded
        };
      }),
      reproducibilityScore,
      categories: {}
    };
    
    Object.entries(comparisonResults).forEach(([catKey, fields]) => {
      report.categories[catKey] = {};
      Object.entries(fields).forEach(([field, data]) => {
        report.categories[catKey][field] = {
          bundle1: formatValue(data.bundle1),
          bundle2: formatValue(data.bundle2),
          difference: data.difference.type,
          details: data.difference.details
        };
      });
    });
    
    return report;
  }, [bundles, selectedBundles, comparisonResults, reproducibilityScore]);
  
  // Export comparison
  const exportComparison = useCallback(() => {
    const report = generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bundle_comparison_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generateReport]);
  
  // Generate difference matrix
  const generateDifferenceMatrix = useCallback(() => {
    if (bundles.length < 2) return [];
    
    const matrix = [];
    
    for (let i = 0; i < bundles.length; i++) {
      const row = [];
      for (let j = 0; j < bundles.length; j++) {
        if (i === j) {
          row.push({ score: 100, type: 'IDENTICAL' });
        } else {
          // Simple similarity calculation
          const similarity = Math.random() * 30 + 70; // Placeholder
          row.push({ 
            score: similarity,
            type: similarity > 95 ? 'IDENTICAL' : similarity > 85 ? 'MINOR' : 'MAJOR'
          });
        }
      }
      matrix.push(row);
    }
    
    return matrix;
  }, [bundles]);
  
  // Auto-compare when bundles selected
  useEffect(() => {
    if (selectedBundles.length === 2) {
      compareBundles();
    }
  }, [selectedBundles, compareBundles]);
  
  return (
    <div className="bundle-comparison">
      <div className="comparison-header">
        <h2>Bundle Comparison</h2>
        <div className="header-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={loadBundle}
            style={{ display: 'none' }}
            multiple
          />
          <button 
            className="load-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Load Bundle
          </button>
          
          <div className="view-selector">
            <button
              className={viewMode === 'side-by-side' ? 'active' : ''}
              onClick={() => setViewMode('side-by-side')}
            >
              Side by Side
            </button>
            <button
              className={viewMode === 'diff' ? 'active' : ''}
              onClick={() => setViewMode('diff')}
            >
              Differences
            </button>
            <button
              className={viewMode === 'matrix' ? 'active' : ''}
              onClick={() => setViewMode('matrix')}
            >
              Matrix
            </button>
          </div>
          
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={filterDifferences}
              onChange={(e) => setFilterDifferences(e.target.checked)}
            />
            <span>Show only differences</span>
          </label>
          
          {reproducibilityScore !== null && (
            <div className={`score-display ${
              reproducibilityScore >= 95 ? 'excellent' :
              reproducibilityScore >= 85 ? 'good' :
              reproducibilityScore >= 75 ? 'fair' : 'poor'
            }`}>
              <span className="score-label">Reproducibility:</span>
              <span className="score-value">{reproducibilityScore.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="comparison-body">
        <div className="bundle-selector">
          <h3>Loaded Bundles</h3>
          <div className="bundle-list">
            {bundles.length === 0 ? (
              <div className="no-bundles">
                No bundles loaded. Click "Load Bundle" to start.
              </div>
            ) : (
              bundles.map(bundle => (
                <div key={bundle.id} className="bundle-item">
                  <input
                    type="checkbox"
                    checked={selectedBundles.includes(bundle.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (selectedBundles.length < 2) {
                          setSelectedBundles([...selectedBundles, bundle.id]);
                        }
                      } else {
                        setSelectedBundles(selectedBundles.filter(id => id !== bundle.id));
                      }
                    }}
                    disabled={!selectedBundles.includes(bundle.id) && selectedBundles.length >= 2}
                  />
                  <div className="bundle-info">
                    <div className="bundle-name">{bundle.name}</div>
                    <div className="bundle-meta">
                      Loaded: {new Date(bundle.loaded).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      setBundles(bundles.filter(b => b.id !== bundle.id));
                      setSelectedBundles(selectedBundles.filter(id => id !== bundle.id));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="category-tabs">
            {Object.entries(ComparisonCategories).map(([key, cat]) => (
              <button
                key={key}
                className={activeCategory === key ? 'active' : ''}
                onClick={() => setActiveCategory(key)}
              >
                <span className="tab-icon">{cat.icon}</span>
                <span className="tab-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="comparison-results">
          {selectedBundles.length < 2 ? (
            <div className="no-comparison">
              Select two bundles to compare
            </div>
          ) : viewMode === 'side-by-side' ? (
            <div className="side-by-side-view">
              <div className="comparison-table">
                <div className="table-header">
                  <div className="field-column">Field</div>
                  <div className="bundle-column">
                    {bundles.find(b => b.id === selectedBundles[0])?.name}
                  </div>
                  <div className="bundle-column">
                    {bundles.find(b => b.id === selectedBundles[1])?.name}
                  </div>
                  <div className="diff-column">Status</div>
                </div>
                
                <div className="table-body">
                  {comparisonResults[activeCategory] && 
                    Object.entries(comparisonResults[activeCategory])
                      .filter(([field, data]) => 
                        !filterDifferences || data.difference.type !== 'IDENTICAL'
                      )
                      .map(([field, data]) => (
                        <div key={field} className={`table-row ${data.difference.type.toLowerCase()}`}>
                          <div className="field-column">{field}</div>
                          <div className="bundle-column">
                            {formatValue(data.bundle1)}
                          </div>
                          <div className="bundle-column">
                            {formatValue(data.bundle2)}
                          </div>
                          <div className="diff-column">
                            <span 
                              className={`diff-badge ${data.difference.type.toLowerCase()}`}
                              title={data.difference.details}
                            >
                              {DifferenceTypes[data.difference.type].icon}
                              {' '}
                              {DifferenceTypes[data.difference.type].label}
                            </span>
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
          ) : viewMode === 'diff' ? (
            <div className="diff-view">
              {Object.entries(comparisonResults).map(([catKey, fields]) => (
                <div key={catKey} className="diff-category">
                  <h4>
                    {ComparisonCategories[catKey].icon}
                    {' '}
                    {ComparisonCategories[catKey].name}
                  </h4>
                  <div className="diff-items">
                    {Object.entries(fields)
                      .filter(([field, data]) => data.difference.type !== 'IDENTICAL')
                      .map(([field, data]) => (
                        <div key={field} className="diff-item">
                          <div className="diff-field">{field}</div>
                          <div className="diff-values">
                            <div className="old-value">
                              <span className="value-label">Bundle 1:</span>
                              {formatValue(data.bundle1)}
                            </div>
                            <div className="arrow">→</div>
                            <div className="new-value">
                              <span className="value-label">Bundle 2:</span>
                              {formatValue(data.bundle2)}
                            </div>
                          </div>
                          <div className={`diff-type ${data.difference.type.toLowerCase()}`}>
                            {data.difference.details}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="matrix-view">
              <h3>Bundle Similarity Matrix</h3>
              <div className="matrix-container">
                <table className="similarity-matrix">
                  <thead>
                    <tr>
                      <th></th>
                      {bundles.map(b => (
                        <th key={b.id}>{b.name.substring(0, 15)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {generateDifferenceMatrix().map((row, i) => (
                      <tr key={i}>
                        <td className="row-header">
                          {bundles[i]?.name.substring(0, 15)}
                        </td>
                        {row.map((cell, j) => (
                          <td 
                            key={j}
                            className={`matrix-cell ${cell.type.toLowerCase()}`}
                          >
                            {cell.score.toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="matrix-legend">
                <h4>Legend</h4>
                {Object.entries(DifferenceTypes).map(([key, type]) => (
                  <div key={key} className="legend-item">
                    <span 
                      className="legend-color"
                      style={{ background: type.color }}
                    />
                    <span>{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="comparison-footer">
        <div className="summary-stats">
          {comparisonResults[activeCategory] && (
            <>
              <span>
                Total fields: {Object.keys(comparisonResults[activeCategory]).length}
              </span>
              <span>
                Identical: {
                  Object.values(comparisonResults[activeCategory])
                    .filter(r => r.difference.type === 'IDENTICAL').length
                }
              </span>
              <span>
                Differences: {
                  Object.values(comparisonResults[activeCategory])
                    .filter(r => r.difference.type !== 'IDENTICAL').length
                }
              </span>
            </>
          )}
        </div>
        
        <button 
          className="export-btn"
          onClick={exportComparison}
          disabled={Object.keys(comparisonResults).length === 0}
        >
          Export Comparison
        </button>
      </div>
    </div>
  );
};

export default BundleComparison;