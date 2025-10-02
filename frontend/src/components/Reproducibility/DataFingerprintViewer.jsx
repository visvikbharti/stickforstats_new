import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './DataFingerprintViewer.scss';

// Fingerprint generation algorithms
const FingerprintAlgorithms = {
  MD5: {
    id: 'md5',
    name: 'MD5',
    bits: 128,
    security: 'Deprecated (collision vulnerable)',
    speed: 'Very Fast',
    use: 'Legacy compatibility only'
  },
  SHA1: {
    id: 'sha1', 
    name: 'SHA-1',
    bits: 160,
    security: 'Deprecated (collision found)',
    speed: 'Fast',
    use: 'Git compatibility'
  },
  SHA256: {
    id: 'sha256',
    name: 'SHA-256',
    bits: 256,
    security: 'Secure',
    speed: 'Fast',
    use: 'Recommended for general use'
  },
  SHA512: {
    id: 'sha512',
    name: 'SHA-512',
    bits: 512,
    security: 'Very Secure',
    speed: 'Moderate',
    use: 'High security requirements'
  },
  BLAKE2B: {
    id: 'blake2b',
    name: 'BLAKE2b',
    bits: 512,
    security: 'Very Secure',
    speed: 'Very Fast',
    use: 'Modern, high-performance'
  }
};

// Data characteristics to track
const DataCharacteristics = {
  STRUCTURE: {
    rows: 'Number of rows',
    columns: 'Number of columns',
    dtypes: 'Data types',
    shape: 'Data shape',
    size: 'Memory size'
  },
  CONTENT: {
    nulls: 'Null values count',
    unique: 'Unique values per column',
    duplicates: 'Duplicate rows',
    encoding: 'Character encoding',
    format: 'File format'
  },
  STATISTICS: {
    mean: 'Column means',
    std: 'Column std deviations',
    min: 'Column minimums',
    max: 'Column maximums',
    quartiles: 'Column quartiles'
  },
  METADATA: {
    created: 'Creation timestamp',
    modified: 'Last modified',
    source: 'Data source',
    version: 'Data version',
    tags: 'Data tags'
  }
};

const DataFingerprintViewer = () => {
  const dispatch = useDispatch();
  const currentData = useSelector(state => state.data?.currentDataset);
  
  // State management
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('sha256');
  const [viewMode, setViewMode] = useState('current'); // current, compare, history, lineage
  const [compareData, setCompareData] = useState(null);
  const [fingerprints, setFingerprints] = useState({});
  const [characteristics, setCharacteristics] = useState({});
  const [dataHistory, setDataHistory] = useState([]);
  const [lineageGraph, setLineageGraph] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    fingerprint: true,
    structure: true,
    content: false,
    statistics: false,
    metadata: false
  });
  
  // Canvas refs for visualizations
  const lineageCanvasRef = useRef(null);
  const integrityCanvasRef = useRef(null);
  
  // Generate fingerprint using Web Crypto API
  const generateFingerprint = useCallback(async (data, algorithm = 'SHA-256') => {
    if (!data) return null;
    
    try {
      // Convert data to string representation
      let dataString;
      if (typeof data === 'object') {
        // Sort keys for consistent hashing
        dataString = JSON.stringify(data, Object.keys(data).sort());
      } else {
        dataString = String(data);
      }
      
      // Convert string to buffer
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      
      // Generate hash
      const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
      
      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Fingerprint generation failed:', error);
      return null;
    }
  }, []);
  
  // Calculate data characteristics
  const calculateCharacteristics = useCallback((data) => {
    if (!data || !Array.isArray(data)) return {};
    
    const chars = {
      structure: {},
      content: {},
      statistics: {},
      metadata: {}
    };
    
    // Structure characteristics
    chars.structure.rows = data.length;
    chars.structure.columns = data.length > 0 ? Object.keys(data[0]).length : 0;
    chars.structure.size = new Blob([JSON.stringify(data)]).size;
    
    if (data.length > 0) {
      // Data types
      const dtypes = {};
      Object.keys(data[0]).forEach(col => {
        const sample = data.find(row => row[col] != null)?.[col];
        dtypes[col] = sample != null ? typeof sample : 'null';
      });
      chars.structure.dtypes = dtypes;
      
      // Content characteristics
      const nullCounts = {};
      const uniqueValues = {};
      
      Object.keys(data[0]).forEach(col => {
        nullCounts[col] = data.filter(row => row[col] == null).length;
        uniqueValues[col] = new Set(data.map(row => row[col])).size;
      });
      
      chars.content.nulls = nullCounts;
      chars.content.unique = uniqueValues;
      chars.content.duplicates = data.length - new Set(data.map(row => JSON.stringify(row))).size;
      
      // Statistical characteristics for numeric columns
      const stats = {};
      Object.keys(data[0]).forEach(col => {
        const values = data
          .map(row => row[col])
          .filter(v => v != null && typeof v === 'number');
        
        if (values.length > 0) {
          values.sort((a, b) => a - b);
          
          stats[col] = {
            mean: values.reduce((sum, v) => sum + v, 0) / values.length,
            min: values[0],
            max: values[values.length - 1],
            q1: values[Math.floor(values.length * 0.25)],
            median: values[Math.floor(values.length * 0.5)],
            q3: values[Math.floor(values.length * 0.75)],
            std: Math.sqrt(
              values.reduce((sum, v) => {
                const diff = v - (values.reduce((s, x) => s + x, 0) / values.length);
                return sum + diff * diff;
              }, 0) / values.length
            )
          };
        }
      });
      chars.statistics = stats;
    }
    
    // Metadata
    chars.metadata.generated = new Date().toISOString();
    chars.metadata.recordCount = data.length;
    chars.metadata.fieldCount = chars.structure.columns;
    
    return chars;
  }, []);
  
  // Generate comprehensive fingerprint
  const generateComprehensiveFingerprint = useCallback(async () => {
    if (!currentData) return;
    
    setIsCalculating(true);
    
    try {
      const fps = {};
      
      // Generate fingerprints with multiple algorithms
      for (const [key, algo] of Object.entries(FingerprintAlgorithms)) {
        const algorithmName = algo.name.replace('-', '');
        fps[key] = await generateFingerprint(currentData, algorithmName);
      }
      
      // Add specialized fingerprints
      fps.structural = await generateFingerprint(
        Object.keys(currentData[0] || {}).sort().join(',')
      );
      
      // Column-wise fingerprints
      const columnFingerprints = {};
      if (currentData.length > 0) {
        for (const col of Object.keys(currentData[0])) {
          const columnData = currentData.map(row => row[col]);
          columnFingerprints[col] = await generateFingerprint(columnData);
        }
      }
      fps.columns = columnFingerprints;
      
      // Row sampling fingerprints (for large datasets)
      const sampleIndices = [0, Math.floor(currentData.length / 2), currentData.length - 1]
        .filter(i => i >= 0 && i < currentData.length);
      const sampleFingerprints = {};
      for (const idx of sampleIndices) {
        sampleFingerprints[`row_${idx}`] = await generateFingerprint(currentData[idx]);
      }
      fps.samples = sampleFingerprints;
      
      setFingerprints(fps);
      
      // Calculate characteristics
      const chars = calculateCharacteristics(currentData);
      setCharacteristics(chars);
      
      // Add to history
      const historyEntry = {
        timestamp: new Date().toISOString(),
        algorithm: selectedAlgorithm,
        fingerprint: fps[selectedAlgorithm],
        characteristics: chars,
        action: 'Generated'
      };
      setDataHistory(prev => [...prev, historyEntry]);
      
    } catch (error) {
      console.error('Comprehensive fingerprint generation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [currentData, selectedAlgorithm, generateFingerprint, calculateCharacteristics]);
  
  // Verify data integrity
  const verifyIntegrity = useCallback(async (expectedFingerprint) => {
    if (!currentData || !expectedFingerprint) return;
    
    setIsCalculating(true);
    
    try {
      const currentFingerprint = await generateFingerprint(
        currentData,
        FingerprintAlgorithms[selectedAlgorithm].name.replace('-', '')
      );
      
      const isValid = currentFingerprint === expectedFingerprint;
      
      setVerificationStatus({
        valid: isValid,
        expected: expectedFingerprint,
        actual: currentFingerprint,
        algorithm: selectedAlgorithm,
        timestamp: new Date().toISOString()
      });
      
      // Add to history
      const historyEntry = {
        timestamp: new Date().toISOString(),
        algorithm: selectedAlgorithm,
        fingerprint: currentFingerprint,
        action: isValid ? 'Verified (Match)' : 'Verified (Mismatch)',
        expected: expectedFingerprint
      };
      setDataHistory(prev => [...prev, historyEntry]);
      
    } catch (error) {
      console.error('Integrity verification failed:', error);
      setVerificationStatus({
        valid: false,
        error: error.message
      });
    } finally {
      setIsCalculating(false);
    }
  }, [currentData, selectedAlgorithm, generateFingerprint]);
  
  // Draw data lineage graph
  const drawLineageGraph = useCallback(() => {
    const canvas = lineageCanvasRef.current;
    if (!canvas || !lineageGraph) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set styles
    ctx.font = '11px IBM Plex Sans';
    ctx.textAlign = 'center';
    
    // Calculate node positions
    const nodes = lineageGraph.nodes || [];
    const edges = lineageGraph.edges || [];
    
    const nodeWidth = 120;
    const nodeHeight = 60;
    const levelHeight = 100;
    
    // Group nodes by level
    const levels = {};
    nodes.forEach(node => {
      const level = node.level || 0;
      if (!levels[level]) levels[level] = [];
      levels[level].push(node);
    });
    
    // Position nodes
    const nodePositions = {};
    Object.entries(levels).forEach(([level, levelNodes]) => {
      const y = 50 + parseInt(level) * levelHeight;
      const spacing = width / (levelNodes.length + 1);
      
      levelNodes.forEach((node, index) => {
        const x = spacing * (index + 1);
        nodePositions[node.id] = { x, y };
        
        // Draw node
        ctx.fillStyle = node.verified ? '#27ae60' : '#e74c3c';
        ctx.fillRect(x - nodeWidth/2, y - nodeHeight/2, nodeWidth, nodeHeight);
        
        ctx.fillStyle = 'white';
        ctx.fillText(node.name, x, y - 10);
        ctx.font = '10px IBM Plex Mono';
        ctx.fillText(
          node.fingerprint ? node.fingerprint.substring(0, 8) + '...' : 'No hash',
          x, y + 5
        );
        ctx.font = '10px IBM Plex Sans';
        ctx.fillText(node.timestamp || '', x, y + 20);
        ctx.font = '11px IBM Plex Sans';
      });
    });
    
    // Draw edges
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    edges.forEach(edge => {
      const from = nodePositions[edge.from];
      const to = nodePositions[edge.to];
      
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y + nodeHeight/2);
        ctx.lineTo(to.x, to.y - nodeHeight/2);
        ctx.stroke();
        
        // Draw arrow
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowSize = 8;
        
        ctx.beginPath();
        ctx.moveTo(to.x, to.y - nodeHeight/2);
        ctx.lineTo(
          to.x - arrowSize * Math.cos(angle - Math.PI/6),
          to.y - nodeHeight/2 - arrowSize * Math.sin(angle - Math.PI/6)
        );
        ctx.moveTo(to.x, to.y - nodeHeight/2);
        ctx.lineTo(
          to.x - arrowSize * Math.cos(angle + Math.PI/6),
          to.y - nodeHeight/2 - arrowSize * Math.sin(angle + Math.PI/6)
        );
        ctx.stroke();
        
        // Draw transformation label
        if (edge.transformation) {
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          
          ctx.fillStyle = 'white';
          ctx.fillRect(midX - 30, midY - 8, 60, 16);
          
          ctx.fillStyle = '#34495e';
          ctx.font = '10px IBM Plex Sans';
          ctx.fillText(edge.transformation, midX, midY + 3);
          ctx.font = '11px IBM Plex Sans';
        }
      }
    });
  }, [lineageGraph]);
  
  // Draw integrity visualization
  const drawIntegrityVisualization = useCallback(() => {
    const canvas = integrityCanvasRef.current;
    if (!canvas || !characteristics.structure) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw integrity ring
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ecf0f1';
    ctx.fill();
    
    // Integrity segments
    const segments = [
      { label: 'Structure', value: 1, color: '#3498db' },
      { label: 'Content', value: characteristics.content?.duplicates ? 0.8 : 1, color: '#27ae60' },
      { label: 'Statistics', value: 0.9, color: '#e67e22' },
      { label: 'Metadata', value: 1, color: '#9b59b6' }
    ];
    
    let currentAngle = -Math.PI / 2;
    const segmentAngle = (2 * Math.PI) / segments.length;
    
    segments.forEach(segment => {
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(
        centerX, centerY,
        radius * segment.value,
        currentAngle,
        currentAngle + segmentAngle
      );
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Draw label
      const labelAngle = currentAngle + segmentAngle / 2;
      const labelRadius = radius + 20;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;
      
      ctx.fillStyle = '#34495e';
      ctx.font = '11px IBM Plex Sans';
      ctx.textAlign = 'center';
      ctx.fillText(segment.label, labelX, labelY);
      
      currentAngle += segmentAngle;
    });
    
    // Center text
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Data Integrity', centerX, centerY - 5);
    
    ctx.font = '12px IBM Plex Sans';
    ctx.fillStyle = verificationStatus?.valid ? '#27ae60' : '#34495e';
    ctx.fillText(
      verificationStatus ? (verificationStatus.valid ? 'Verified' : 'Modified') : 'Not Verified',
      centerX, centerY + 10
    );
  }, [characteristics, verificationStatus]);
  
  // Handle file comparison
  const handleCompareFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        setCompareData(data);
        
        // Generate fingerprint for comparison
        const compareFp = await generateFingerprint(data, 
          FingerprintAlgorithms[selectedAlgorithm].name.replace('-', '')
        );
        
        const compareChars = calculateCharacteristics(data);
        
        // Update comparison view
        setViewMode('compare');
        
      } catch (error) {
        console.error('Failed to load comparison file:', error);
      }
    };
    reader.readAsText(file);
  }, [selectedAlgorithm, generateFingerprint, calculateCharacteristics]);
  
  // Export fingerprint report
  const exportFingerprintReport = useCallback(() => {
    const report = {
      generated: new Date().toISOString(),
      algorithm: selectedAlgorithm,
      fingerprints,
      characteristics,
      history: dataHistory,
      verification: verificationStatus
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fingerprint_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedAlgorithm, fingerprints, characteristics, dataHistory, verificationStatus]);
  
  // Effects
  useEffect(() => {
    if (currentData) {
      generateComprehensiveFingerprint();
    }
  }, [currentData]);
  
  useEffect(() => {
    drawLineageGraph();
  }, [lineageGraph, drawLineageGraph]);
  
  useEffect(() => {
    drawIntegrityVisualization();
  }, [characteristics, verificationStatus, drawIntegrityVisualization]);
  
  return (
    <div className="data-fingerprint-viewer">
      <div className="viewer-header">
        <h2>Data Fingerprint Viewer</h2>
        <div className="header-controls">
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value)}
            className="algorithm-select"
          >
            {Object.entries(FingerprintAlgorithms).map(([key, algo]) => (
              <option key={key} value={key}>
                {algo.name} ({algo.bits} bits)
              </option>
            ))}
          </select>
          
          <div className="view-tabs">
            <button
              className={viewMode === 'current' ? 'active' : ''}
              onClick={() => setViewMode('current')}
            >
              Current
            </button>
            <button
              className={viewMode === 'compare' ? 'active' : ''}
              onClick={() => setViewMode('compare')}
            >
              Compare
            </button>
            <button
              className={viewMode === 'history' ? 'active' : ''}
              onClick={() => setViewMode('history')}
            >
              History
            </button>
            <button
              className={viewMode === 'lineage' ? 'active' : ''}
              onClick={() => setViewMode('lineage')}
            >
              Lineage
            </button>
          </div>
          
          <button
            className="generate-btn"
            onClick={generateComprehensiveFingerprint}
            disabled={isCalculating || !currentData}
          >
            {isCalculating ? 'Calculating...' : 'Generate'}
          </button>
        </div>
      </div>
      
      <div className="viewer-body">
        <div className="fingerprint-panel">
          <div className="panel-section">
            <div 
              className="section-header"
              onClick={() => setExpandedSections(prev => ({
                ...prev,
                fingerprint: !prev.fingerprint
              }))}
            >
              <span className="section-icon">
                {expandedSections.fingerprint ? '▼' : '▶'}
              </span>
              <h3>Fingerprints</h3>
              {fingerprints[selectedAlgorithm] && (
                <span className="primary-hash">
                  {fingerprints[selectedAlgorithm].substring(0, 16)}...
                </span>
              )}
            </div>
            
            {expandedSections.fingerprint && (
              <div className="section-content">
                {Object.entries(FingerprintAlgorithms).map(([key, algo]) => (
                  <div key={key} className="fingerprint-item">
                    <div className="algorithm-info">
                      <span className="algorithm-name">{algo.name}</span>
                      <span className="algorithm-security">{algo.security}</span>
                    </div>
                    <div className="fingerprint-value">
                      {fingerprints[key] ? (
                        <code>{fingerprints[key]}</code>
                      ) : (
                        <span className="not-calculated">Not calculated</span>
                      )}
                    </div>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        if (fingerprints[key]) {
                          navigator.clipboard.writeText(fingerprints[key]);
                        }
                      }}
                      disabled={!fingerprints[key]}
                    >
                      Copy
                    </button>
                  </div>
                ))}
                
                {fingerprints.structural && (
                  <div className="fingerprint-item structural">
                    <div className="algorithm-info">
                      <span className="algorithm-name">Structural Hash</span>
                      <span className="algorithm-security">Schema fingerprint</span>
                    </div>
                    <div className="fingerprint-value">
                      <code>{fingerprints.structural}</code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {Object.entries(DataCharacteristics).map(([category, items]) => (
            <div key={category} className="panel-section">
              <div 
                className="section-header"
                onClick={() => setExpandedSections(prev => ({
                  ...prev,
                  [category.toLowerCase()]: !prev[category.toLowerCase()]
                }))}
              >
                <span className="section-icon">
                  {expandedSections[category.toLowerCase()] ? '▼' : '▶'}
                </span>
                <h3>{category.charAt(0) + category.slice(1).toLowerCase()}</h3>
              </div>
              
              {expandedSections[category.toLowerCase()] && (
                <div className="section-content">
                  {characteristics[category.toLowerCase()] && (
                    <div className="characteristics-grid">
                      {Object.entries(characteristics[category.toLowerCase()]).map(([key, value]) => (
                        <div key={key} className="characteristic-item">
                          <span className="char-label">{items[key] || key}:</span>
                          <span className="char-value">
                            {typeof value === 'object' 
                              ? Object.keys(value).length + ' items'
                              : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="visualization-panel">
          {viewMode === 'current' && (
            <>
              <div className="integrity-visualization">
                <h3>Data Integrity</h3>
                <canvas
                  ref={integrityCanvasRef}
                  width={300}
                  height={300}
                />
              </div>
              
              {verificationStatus && (
                <div className={`verification-status ${verificationStatus.valid ? 'valid' : 'invalid'}`}>
                  <h4>Verification Status</h4>
                  <div className="status-details">
                    <div className="status-item">
                      <span>Result:</span>
                      <strong>{verificationStatus.valid ? 'Valid' : 'Invalid'}</strong>
                    </div>
                    <div className="status-item">
                      <span>Algorithm:</span>
                      <span>{FingerprintAlgorithms[verificationStatus.algorithm].name}</span>
                    </div>
                    <div className="status-item">
                      <span>Expected:</span>
                      <code>{verificationStatus.expected?.substring(0, 32)}...</code>
                    </div>
                    <div className="status-item">
                      <span>Actual:</span>
                      <code>{verificationStatus.actual?.substring(0, 32)}...</code>
                    </div>
                    <div className="status-item">
                      <span>Verified:</span>
                      <span>{verificationStatus.timestamp}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {fingerprints.columns && (
                <div className="column-fingerprints">
                  <h4>Column Fingerprints</h4>
                  <div className="column-list">
                    {Object.entries(fingerprints.columns).map(([col, fp]) => (
                      <div key={col} className="column-item">
                        <span className="column-name">{col}</span>
                        <code className="column-hash">{fp.substring(0, 16)}...</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          {viewMode === 'compare' && (
            <div className="compare-view">
              <div className="compare-controls">
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleCompareFile}
                  className="compare-input"
                />
              </div>
              
              {compareData && (
                <div className="comparison-results">
                  <h3>Comparison Results</h3>
                  <div className="comparison-grid">
                    <div className="compare-column">
                      <h4>Current Data</h4>
                      <div className="compare-details">
                        <div>Rows: {characteristics.structure?.rows}</div>
                        <div>Columns: {characteristics.structure?.columns}</div>
                        <div>Hash: {fingerprints[selectedAlgorithm]?.substring(0, 16)}...</div>
                      </div>
                    </div>
                    <div className="compare-column">
                      <h4>Comparison Data</h4>
                      <div className="compare-details">
                        {/* Comparison details would be calculated here */}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {viewMode === 'history' && (
            <div className="history-view">
              <h3>Fingerprint History</h3>
              <div className="history-list">
                {dataHistory.map((entry, index) => (
                  <div key={index} className="history-item">
                    <div className="history-timestamp">{entry.timestamp}</div>
                    <div className="history-action">{entry.action}</div>
                    <div className="history-algorithm">
                      {FingerprintAlgorithms[entry.algorithm]?.name}
                    </div>
                    <div className="history-fingerprint">
                      <code>{entry.fingerprint?.substring(0, 32)}...</code>
                    </div>
                    {entry.expected && (
                      <div className="history-expected">
                        Expected: <code>{entry.expected.substring(0, 32)}...</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'lineage' && (
            <div className="lineage-view">
              <h3>Data Lineage</h3>
              <canvas
                ref={lineageCanvasRef}
                width={600}
                height={400}
                className="lineage-canvas"
              />
              <div className="lineage-controls">
                <button onClick={() => {
                  // Add sample lineage for demonstration
                  setLineageGraph({
                    nodes: [
                      { id: 'raw', name: 'Raw Data', level: 0, verified: true,
                        fingerprint: 'a1b2c3d4', timestamp: '2024-01-01 10:00' },
                      { id: 'cleaned', name: 'Cleaned', level: 1, verified: true,
                        fingerprint: 'e5f6g7h8', timestamp: '2024-01-01 10:30' },
                      { id: 'transformed', name: 'Transformed', level: 2, verified: false,
                        fingerprint: 'i9j0k1l2', timestamp: '2024-01-01 11:00' }
                    ],
                    edges: [
                      { from: 'raw', to: 'cleaned', transformation: 'Clean' },
                      { from: 'cleaned', to: 'transformed', transformation: 'Transform' }
                    ]
                  });
                }}>
                  Sample Lineage
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="viewer-footer">
        <div className="footer-controls">
          <button onClick={exportFingerprintReport}>
            Export Report
          </button>
          <button
            onClick={() => {
              const hash = prompt('Enter expected fingerprint to verify:');
              if (hash) verifyIntegrity(hash);
            }}
            disabled={!currentData}
          >
            Verify Integrity
          </button>
        </div>
        
        <div className="footer-info">
          {currentData ? (
            <span>Data loaded: {characteristics.structure?.rows || 0} rows</span>
          ) : (
            <span>No data loaded</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataFingerprintViewer;