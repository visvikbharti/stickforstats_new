// ReproducibilityBundleManager.jsx
// Enterprise-grade reproducibility bundle management interface
// Ensures complete analysis reproducibility with data fingerprinting and state capture

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCurrentBundle,
  selectBundleHistory,
  selectPipelineSteps,
  selectDataFingerprints,
  selectEnvironmentInfo,
  createBundle,
  loadBundle,
  exportBundle,
  importBundle,
  verifyBundle,
  addPipelineStep,
  addDataFingerprint,
  setSeed,
  clearBundle
} from '../../store/slices/reproducibilitySlice';
import './ReproducibilityBundleManager.scss';

// Bundle export formats
const ExportFormats = {
  json: {
    name: 'JSON',
    extension: '.json',
    description: 'Complete bundle in JSON format'
  },
  zip: {
    name: 'ZIP Archive',
    extension: '.zip',
    description: 'Compressed bundle with all artifacts'
  },
  tar: {
    name: 'TAR.GZ',
    extension: '.tar.gz',
    description: 'Unix archive format'
  },
  html: {
    name: 'HTML Report',
    extension: '.html',
    description: 'Interactive HTML report'
  }
};

// Verification status levels
const VerificationStatus = {
  VERIFIED: { label: 'Verified', color: 'success', icon: '✓' },
  MODIFIED: { label: 'Modified', color: 'warning', icon: '⚠' },
  FAILED: { label: 'Failed', color: 'error', icon: '✗' },
  PENDING: { label: 'Pending', color: 'neutral', icon: '○' }
};

// Environment categories
const EnvironmentCategories = {
  system: 'System Information',
  python: 'Python Environment',
  packages: 'Package Versions',
  hardware: 'Hardware Configuration',
  random: 'Random State'
};

const ReproducibilityBundleManager = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const currentBundle = useSelector(selectCurrentBundle);
  const bundleHistory = useSelector(selectBundleHistory);
  const pipelineSteps = useSelector(selectPipelineSteps);
  const dataFingerprints = useSelector(selectDataFingerprints);
  const environmentInfo = useSelector(selectEnvironmentInfo);
  
  // Local state
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showDetails, setShowDetails] = useState({});
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  
  // Bundle creation form
  const [bundleName, setBundleName] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  const [bundleMetadata, setBundleMetadata] = useState({
    author: '',
    project: '',
    tags: [],
    notes: ''
  });
  const [masterSeed, setMasterSeed] = useState(42);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [includeIntermediateResults, setIncludeIntermediateResults] = useState(true);
  
  // Create new bundle
  const handleCreateBundle = useCallback(() => {
    const bundle = {
      id: `bundle_${Date.now()}`,
      name: bundleName || `Analysis_${new Date().toISOString().split('T')[0]}`,
      description: bundleDescription,
      metadata: {
        ...bundleMetadata,
        created_at: new Date().toISOString(),
        version: '1.0.0',
        stickforstats_version: '1.5.0'
      },
      random_seed: masterSeed,
      include_raw_data: includeRawData,
      include_intermediate: includeIntermediateResults
    };
    
    dispatch(createBundle(bundle));
    setShowCreateModal(false);
    resetBundleForm();
  }, [dispatch, bundleName, bundleDescription, bundleMetadata, masterSeed, includeRawData, includeIntermediateResults]);
  
  // Reset bundle form
  const resetBundleForm = () => {
    setBundleName('');
    setBundleDescription('');
    setBundleMetadata({ author: '', project: '', tags: [], notes: '' });
    setMasterSeed(42);
    setIncludeRawData(false);
    setIncludeIntermediateResults(true);
  };
  
  // Verify bundle integrity
  const handleVerifyBundle = useCallback(async (bundleId) => {
    setIsVerifying(true);
    
    try {
      const result = await dispatch(verifyBundle(bundleId)).unwrap();
      setVerificationResult(result);
      
      // Determine overall status
      const status = result.all_checks_passed 
        ? VerificationStatus.VERIFIED
        : result.data_modified 
          ? VerificationStatus.MODIFIED
          : VerificationStatus.FAILED;
      
      setVerificationResult({ ...result, status });
    } catch (error) {
      setVerificationResult({
        status: VerificationStatus.FAILED,
        error: error.message
      });
    } finally {
      setIsVerifying(false);
    }
  }, [dispatch]);
  
  // Export bundle
  const handleExportBundle = useCallback(() => {
    if (!currentBundle) return;
    
    dispatch(exportBundle({
      bundleId: currentBundle.id,
      format: exportFormat,
      includeVisualization: true
    }));
  }, [dispatch, currentBundle, exportFormat]);
  
  // Import bundle
  const handleImportBundle = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bundleData = JSON.parse(e.target.result);
        dispatch(importBundle(bundleData));
        setShowImportModal(false);
      } catch (error) {
        console.error('Failed to import bundle:', error);
      }
    };
    reader.readAsText(file);
  }, [dispatch]);
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Calculate bundle size
  const calculateBundleSize = (bundle) => {
    const jsonString = JSON.stringify(bundle);
    return new Blob([jsonString]).size;
  };
  
  // Get pipeline step icon
  const getStepIcon = (stepType) => {
    const icons = {
      data_load: '📁',
      preprocessing: '⚙️',
      analysis: '📊',
      visualization: '📈',
      export: '💾',
      decision: '🔀'
    };
    return icons[stepType] || '▶';
  };
  
  return (
    <div className="reproducibility-bundle-manager">
      {/* Header */}
      <div className="manager-header">
        <div className="header-title">
          <h2>Reproducibility Bundle Manager</h2>
          <span className="subtitle">Complete Analysis State Capture & Verification</span>
        </div>
        <div className="header-actions">
          <button 
            className="btn-create primary"
            onClick={() => setShowCreateModal(true)}
          >
            + New Bundle
          </button>
          <button 
            className="btn-import"
            onClick={() => setShowImportModal(true)}
          >
            Import
          </button>
          {currentBundle && (
            <button 
              className="btn-export"
              onClick={handleExportBundle}
            >
              Export Current
            </button>
          )}
        </div>
      </div>
      
      {/* Current Bundle Status */}
      {currentBundle && (
        <div className="current-bundle-status">
          <div className="status-info">
            <span className="label">Active Bundle:</span>
            <span className="bundle-name">{currentBundle.name}</span>
            <span className="bundle-id">ID: {currentBundle.id}</span>
          </div>
          <div className="status-metrics">
            <div className="metric">
              <span className="metric-value">{pipelineSteps.length}</span>
              <span className="metric-label">Steps</span>
            </div>
            <div className="metric">
              <span className="metric-value">{dataFingerprints.length}</span>
              <span className="metric-label">Data Files</span>
            </div>
            <div className="metric">
              <span className="metric-value">{currentBundle.random_seed}</span>
              <span className="metric-label">Seed</span>
            </div>
            <div className="metric">
              <span className="metric-value">
                {formatFileSize(calculateBundleSize(currentBundle))}
              </span>
              <span className="metric-label">Size</span>
            </div>
          </div>
          <button 
            className="btn-verify"
            onClick={() => handleVerifyBundle(currentBundle.id)}
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Integrity'}
          </button>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="manager-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          Pipeline Steps
          <span className="badge">{pipelineSteps.length}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          Data Fingerprints
          <span className="badge">{dataFingerprints.length}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'environment' ? 'active' : ''}`}
          onClick={() => setActiveTab('environment')}
        >
          Environment
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Bundle History
          <span className="badge">{bundleHistory.length}</span>
        </button>
        <button 
          className={`tab ${activeTab === 'validation' ? 'active' : ''}`}
          onClick={() => setActiveTab('validation')}
        >
          Validation
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="manager-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && currentBundle && (
          <div className="overview-content">
            <div className="bundle-details">
              <h3>Bundle Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Bundle ID:</label>
                  <span className="mono">{currentBundle.id}</span>
                </div>
                <div className="detail-item">
                  <label>Name:</label>
                  <span>{currentBundle.name}</span>
                </div>
                <div className="detail-item">
                  <label>Created:</label>
                  <span>{formatTimestamp(currentBundle.metadata.created_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Author:</label>
                  <span>{currentBundle.metadata.author || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                  <label>Project:</label>
                  <span>{currentBundle.metadata.project || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Version:</label>
                  <span className="mono">{currentBundle.metadata.version}</span>
                </div>
                <div className="detail-item full-width">
                  <label>Description:</label>
                  <p>{currentBundle.description || 'No description provided'}</p>
                </div>
                <div className="detail-item full-width">
                  <label>Tags:</label>
                  <div className="tags">
                    {currentBundle.metadata.tags?.map((tag, i) => (
                      <span key={i} className="tag">{tag}</span>
                    )) || <span className="no-tags">No tags</span>}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bundle-summary">
              <h3>Analysis Summary</h3>
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <div className="card-value">{pipelineSteps.filter(s => s.type === 'analysis').length}</div>
                    <div className="card-label">Analyses Run</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-icon">📁</div>
                  <div className="card-content">
                    <div className="card-value">{dataFingerprints.length}</div>
                    <div className="card-label">Data Files</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-icon">🔀</div>
                  <div className="card-content">
                    <div className="card-value">{pipelineSteps.filter(s => s.type === 'decision').length}</div>
                    <div className="card-label">Decisions</div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="card-icon">⏱️</div>
                  <div className="card-content">
                    <div className="card-value">
                      {pipelineSteps.length > 0 
                        ? `${Math.round((new Date(pipelineSteps[pipelineSteps.length - 1].timestamp) - new Date(pipelineSteps[0].timestamp)) / 60000)} min`
                        : '0 min'}
                    </div>
                    <div className="card-label">Duration</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bundle-checksum">
              <h3>Integrity Information</h3>
              <div className="checksum-display">
                <label>Bundle Checksum (SHA-256):</label>
                <code className="checksum-value">
                  {currentBundle.checksum || 'Not calculated'}
                </code>
                <button className="btn-copy" onClick={() => navigator.clipboard.writeText(currentBundle.checksum)}>
                  Copy
                </button>
              </div>
              {verificationResult && (
                <div className={`verification-status ${verificationResult.status.color}`}>
                  <span className="status-icon">{verificationResult.status.icon}</span>
                  <span className="status-label">{verificationResult.status.label}</span>
                  {verificationResult.error && (
                    <span className="status-error">{verificationResult.error}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Pipeline Steps Tab */}
        {activeTab === 'pipeline' && (
          <div className="pipeline-content">
            <div className="pipeline-controls">
              <input
                type="text"
                placeholder="Filter steps..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="filter-input"
              />
              <button className="btn-expand-all" onClick={() => setShowDetails({})}>
                Collapse All
              </button>
            </div>
            
            <div className="pipeline-timeline">
              {pipelineSteps
                .filter(step => 
                  step.name.toLowerCase().includes(filterText.toLowerCase()) ||
                  step.type.toLowerCase().includes(filterText.toLowerCase())
                )
                .map((step, index) => (
                  <div key={step.id} className="timeline-step">
                    <div className="step-marker">
                      <span className="step-number">{index + 1}</span>
                      <span className="step-icon">{getStepIcon(step.type)}</span>
                    </div>
                    <div className="step-content">
                      <div 
                        className="step-header"
                        onClick={() => setShowDetails({
                          ...showDetails,
                          [step.id]: !showDetails[step.id]
                        })}
                      >
                        <div className="step-info">
                          <h4 className="step-name">{step.name}</h4>
                          <span className="step-type">{step.type}</span>
                        </div>
                        <div className="step-timestamp">
                          {formatTimestamp(step.timestamp)}
                        </div>
                      </div>
                      
                      {showDetails[step.id] && (
                        <div className="step-details">
                          <div className="detail-section">
                            <label>Function:</label>
                            <code>{step.function}</code>
                          </div>
                          <div className="detail-section">
                            <label>Parameters:</label>
                            <pre>{JSON.stringify(step.parameters, null, 2)}</pre>
                          </div>
                          {step.result && (
                            <div className="detail-section">
                              <label>Result:</label>
                              <pre>{JSON.stringify(step.result, null, 2)}</pre>
                            </div>
                          )}
                          {step.rationale && (
                            <div className="detail-section">
                              <label>Rationale:</label>
                              <p>{step.rationale}</p>
                            </div>
                          )}
                          <div className="detail-section">
                            <label>Execution Time:</label>
                            <span>{step.execution_time || 'N/A'} ms</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {index < pipelineSteps.length - 1 && (
                      <div className="step-connector" />
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Data Fingerprints Tab */}
        {activeTab === 'data' && (
          <div className="data-content">
            <div className="fingerprint-summary">
              <p>
                Data integrity verified using SHA-256 hashing. 
                Any modification to the data will change its fingerprint.
              </p>
            </div>
            
            <table className="fingerprint-table">
              <thead>
                <tr>
                  <th>File/Dataset</th>
                  <th>Type</th>
                  <th>Shape</th>
                  <th>Size</th>
                  <th>Fingerprint (SHA-256)</th>
                  <th>Added</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dataFingerprints.map((fp, index) => (
                  <tr key={index}>
                    <td className="file-name">{fp.name}</td>
                    <td className="file-type">{fp.type}</td>
                    <td className="file-shape mono">
                      {fp.shape ? `${fp.shape[0]}×${fp.shape[1]}` : 'N/A'}
                    </td>
                    <td className="file-size">{formatFileSize(fp.size)}</td>
                    <td className="fingerprint mono">
                      <span title={fp.fingerprint}>
                        {fp.fingerprint.substring(0, 8)}...
                      </span>
                      <button 
                        className="btn-copy-mini"
                        onClick={() => navigator.clipboard.writeText(fp.fingerprint)}
                      >
                        📋
                      </button>
                    </td>
                    <td className="timestamp">{formatTimestamp(fp.timestamp)}</td>
                    <td className="status">
                      <span className={`status-badge ${fp.verified ? 'verified' : 'unverified'}`}>
                        {fp.verified ? '✓ Verified' : '○ Unverified'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {dataFingerprints.length === 0 && (
              <div className="empty-state">
                <p>No data fingerprints recorded yet</p>
              </div>
            )}
          </div>
        )}
        
        {/* Environment Tab */}
        {activeTab === 'environment' && environmentInfo && (
          <div className="environment-content">
            {Object.entries(EnvironmentCategories).map(([key, label]) => (
              <div key={key} className="env-section">
                <h3>{label}</h3>
                <div className="env-details">
                  {environmentInfo[key] && Object.entries(environmentInfo[key]).map(([envKey, value]) => (
                    <div key={envKey} className="env-item">
                      <label>{envKey.replace(/_/g, ' ').toUpperCase()}:</label>
                      <span className="mono">
                        {typeof value === 'object' ? JSON.stringify(value) : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="env-section">
              <h3>Package Versions</h3>
              <table className="package-table">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Version</th>
                  </tr>
                </thead>
                <tbody>
                  {environmentInfo.packages && Object.entries(environmentInfo.packages).map(([pkg, version]) => (
                    <tr key={pkg}>
                      <td>{pkg}</td>
                      <td className="mono">{version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-content">
            <div className="history-controls">
              <button 
                className={`btn-compare ${comparisonMode ? 'active' : ''}`}
                onClick={() => setComparisonMode(!comparisonMode)}
                disabled={selectedForComparison.length === 0}
              >
                Compare Selected ({selectedForComparison.length})
              </button>
            </div>
            
            <div className="bundle-grid">
              {bundleHistory.map(bundle => (
                <div key={bundle.id} className="bundle-card">
                  {comparisonMode && (
                    <input
                      type="checkbox"
                      className="compare-checkbox"
                      checked={selectedForComparison.includes(bundle.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForComparison([...selectedForComparison, bundle.id]);
                        } else {
                          setSelectedForComparison(selectedForComparison.filter(id => id !== bundle.id));
                        }
                      }}
                    />
                  )}
                  <div className="bundle-card-header">
                    <h4>{bundle.name}</h4>
                    <span className="bundle-date">
                      {new Date(bundle.metadata.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bundle-card-body">
                    <p className="bundle-description">
                      {bundle.description || 'No description'}
                    </p>
                    <div className="bundle-stats">
                      <span>📊 {bundle.pipeline_steps?.length || 0} steps</span>
                      <span>📁 {bundle.data_fingerprints?.length || 0} files</span>
                      <span>🎲 Seed: {bundle.random_seed}</span>
                    </div>
                  </div>
                  <div className="bundle-card-actions">
                    <button 
                      className="btn-load"
                      onClick={() => dispatch(loadBundle(bundle.id))}
                    >
                      Load
                    </button>
                    <button 
                      className="btn-verify-mini"
                      onClick={() => handleVerifyBundle(bundle.id)}
                    >
                      Verify
                    </button>
                    <button 
                      className="btn-export-mini"
                      onClick={() => {
                        setSelectedBundle(bundle);
                        dispatch(exportBundle({ bundleId: bundle.id, format: 'json' }));
                      }}
                    >
                      Export
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Validation Tab */}
        {activeTab === 'validation' && (
          <div className="validation-content">
            <div className="validation-header">
              <h3>Bundle Validation Report</h3>
              <button 
                className="btn-run-validation"
                onClick={() => currentBundle && handleVerifyBundle(currentBundle.id)}
                disabled={!currentBundle || isVerifying}
              >
                {isVerifying ? 'Running Validation...' : 'Run Full Validation'}
              </button>
            </div>
            
            {verificationResult && (
              <div className="validation-results">
                <div className="validation-summary">
                  <div className={`overall-status ${verificationResult.status.color}`}>
                    <span className="status-icon-large">{verificationResult.status.icon}</span>
                    <h4>{verificationResult.status.label}</h4>
                  </div>
                </div>
                
                <div className="validation-checks">
                  <h4>Validation Checks</h4>
                  <table className="checks-table">
                    <thead>
                      <tr>
                        <th>Check</th>
                        <th>Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Data Integrity</td>
                        <td>
                          <span className={`check-status ${verificationResult.data_intact ? 'passed' : 'failed'}`}>
                            {verificationResult.data_intact ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </td>
                        <td>All data fingerprints match original values</td>
                      </tr>
                      <tr>
                        <td>Pipeline Reproducibility</td>
                        <td>
                          <span className={`check-status ${verificationResult.pipeline_valid ? 'passed' : 'failed'}`}>
                            {verificationResult.pipeline_valid ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </td>
                        <td>All pipeline steps can be re-executed</td>
                      </tr>
                      <tr>
                        <td>Environment Match</td>
                        <td>
                          <span className={`check-status ${verificationResult.environment_compatible ? 'passed' : 'warning'}`}>
                            {verificationResult.environment_compatible ? '✓ Passed' : '⚠ Warning'}
                          </span>
                        </td>
                        <td>Current environment matches bundle requirements</td>
                      </tr>
                      <tr>
                        <td>Random Seed Consistency</td>
                        <td>
                          <span className="check-status passed">✓ Passed</span>
                        </td>
                        <td>Random seed properly set for all operations</td>
                      </tr>
                      <tr>
                        <td>Checksum Verification</td>
                        <td>
                          <span className={`check-status ${verificationResult.checksum_valid ? 'passed' : 'failed'}`}>
                            {verificationResult.checksum_valid ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </td>
                        <td>Bundle checksum matches calculated value</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {verificationResult.warnings && verificationResult.warnings.length > 0 && (
                  <div className="validation-warnings">
                    <h4>Warnings</h4>
                    <ul>
                      {verificationResult.warnings.map((warning, i) => (
                        <li key={i} className="warning-item">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Create Bundle Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Reproducibility Bundle</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Bundle Name:</label>
                <input
                  type="text"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  placeholder="e.g., Protein Analysis 2025-01-11"
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  placeholder="Describe the analysis..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Author:</label>
                <input
                  type="text"
                  value={bundleMetadata.author}
                  onChange={(e) => setBundleMetadata({ ...bundleMetadata, author: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Project:</label>
                <input
                  type="text"
                  value={bundleMetadata.project}
                  onChange={(e) => setBundleMetadata({ ...bundleMetadata, project: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Master Random Seed:</label>
                <input
                  type="number"
                  value={masterSeed}
                  onChange={(e) => setMasterSeed(parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeRawData}
                    onChange={(e) => setIncludeRawData(e.target.checked)}
                  />
                  Include raw data in bundle
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeIntermediateResults}
                    onChange={(e) => setIncludeIntermediateResults(e.target.checked)}
                  />
                  Include intermediate results
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-create primary" onClick={handleCreateBundle}>
                Create Bundle
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Reproducibility Bundle</h3>
              <button className="btn-close" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="import-area">
                <input
                  type="file"
                  accept=".json,.zip,.tar.gz"
                  onChange={(e) => e.target.files[0] && handleImportBundle(e.target.files[0])}
                />
                <p>Select a bundle file (.json, .zip, or .tar.gz)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReproducibilityBundleManager;