// HypothesisRegistry.jsx
// Central registry for tracking all hypotheses tested in a session
// Critical component for preventing p-hacking and maintaining statistical integrity

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAllHypotheses,
  selectHypothesisGroups,
  selectRegistrySettings,
  registerHypothesis,
  updateHypothesis,
  deleteHypothesis,
  groupHypotheses,
  tagHypothesis,
  lockHypothesis,
  exportRegistry
} from '../../store/slices/multiplicityCorrectionSlice';
import './HypothesisRegistry.scss';

// Hypothesis status types
const HypothesisStatus = {
  REGISTERED: { label: 'Registered', color: '#757575', icon: '○' },
  TESTING: { label: 'Testing', color: '#ef6c00', icon: '◐' },
  TESTED: { label: 'Tested', color: '#2e7d32', icon: '●' },
  LOCKED: { label: 'Locked', color: '#1a237e', icon: '🔒' },
  FLAGGED: { label: 'Flagged', color: '#c62828', icon: '⚠' }
};

// Pre-defined hypothesis categories
const HypothesisCategories = {
  primary: { label: 'Primary', color: '#1a237e', priority: 1 },
  secondary: { label: 'Secondary', color: '#283593', priority: 2 },
  exploratory: { label: 'Exploratory', color: '#3949ab', priority: 3 },
  post_hoc: { label: 'Post-hoc', color: '#ef6c00', priority: 4 },
  confirmatory: { label: 'Confirmatory', color: '#2e7d32', priority: 1 }
};

// Tag suggestions based on common research scenarios
const TagSuggestions = [
  'baseline', 'follow-up', 'interaction', 'main-effect', 
  'subgroup', 'sensitivity', 'robustness', 'replication',
  'dose-response', 'time-series', 'correlation', 'regression'
];

const HypothesisRegistry = () => {
  const dispatch = useDispatch();
  const allHypotheses = useSelector(selectAllHypotheses);
  const hypothesisGroups = useSelector(selectHypothesisGroups);
  const registrySettings = useSelector(selectRegistrySettings);
  
  // Local state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState(null);
  const [selectedHypotheses, setSelectedHypotheses] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortAscending, setSortAscending] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'cards', 'timeline'
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Form state for new/edit hypothesis
  const [formData, setFormData] = useState({
    id: '',
    description: '',
    nullHypothesis: '',
    alternativeHypothesis: '',
    category: 'primary',
    tags: [],
    testType: '',
    expectedEffect: '',
    powerAnalysis: {
      power: 0.80,
      alpha: 0.05,
      effectSize: '',
      sampleSize: ''
    },
    preRegistered: false,
    registrationUrl: '',
    notes: ''
  });
  
  // Statistics about the registry
  const registryStats = useMemo(() => {
    const total = allHypotheses.length;
    const tested = allHypotheses.filter(h => h.status === 'TESTED').length;
    const significant = allHypotheses.filter(h => h.pValue && h.pValue < 0.05).length;
    const locked = allHypotheses.filter(h => h.status === 'LOCKED').length;
    const flagged = allHypotheses.filter(h => h.status === 'FLAGGED').length;
    
    return {
      total,
      tested,
      significant,
      locked,
      flagged,
      testingRate: total > 0 ? (tested / total * 100).toFixed(1) : 0,
      significanceRate: tested > 0 ? (significant / tested * 100).toFixed(1) : 0
    };
  }, [allHypotheses]);
  
  // Filter and sort hypotheses
  const filteredHypotheses = useMemo(() => {
    let filtered = [...allHypotheses];
    
    // Text filter
    if (filterText) {
      filtered = filtered.filter(h => 
        h.description.toLowerCase().includes(filterText.toLowerCase()) ||
        h.nullHypothesis?.toLowerCase().includes(filterText.toLowerCase()) ||
        h.tags?.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
      );
    }
    
    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(h => h.category === filterCategory);
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(h => h.status === filterStatus);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp) - new Date(b.timestamp);
          break;
        case 'description':
          compareValue = a.description.localeCompare(b.description);
          break;
        case 'category':
          compareValue = HypothesisCategories[a.category].priority - 
                        HypothesisCategories[b.category].priority;
          break;
        case 'pValue':
          compareValue = (a.pValue || 1) - (b.pValue || 1);
          break;
        default:
          compareValue = 0;
      }
      
      return sortAscending ? compareValue : -compareValue;
    });
    
    return filtered;
  }, [allHypotheses, filterText, filterCategory, filterStatus, sortBy, sortAscending]);
  
  // Handle hypothesis registration
  const handleRegister = useCallback(() => {
    const hypothesis = {
      ...formData,
      id: formData.id || `H${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'REGISTERED',
      version: 1
    };
    
    if (editingHypothesis) {
      dispatch(updateHypothesis(hypothesis));
    } else {
      dispatch(registerHypothesis(hypothesis));
    }
    
    setShowAddModal(false);
    setEditingHypothesis(null);
    resetForm();
  }, [dispatch, formData, editingHypothesis]);
  
  // Reset form
  const resetForm = () => {
    setFormData({
      id: '',
      description: '',
      nullHypothesis: '',
      alternativeHypothesis: '',
      category: 'primary',
      tags: [],
      testType: '',
      expectedEffect: '',
      powerAnalysis: {
        power: 0.80,
        alpha: 0.05,
        effectSize: '',
        sampleSize: ''
      },
      preRegistered: false,
      registrationUrl: '',
      notes: ''
    });
  };
  
  // Handle bulk actions
  const handleBulkAction = useCallback((action) => {
    switch (action) {
      case 'lock':
        selectedHypotheses.forEach(id => {
          dispatch(lockHypothesis(id));
        });
        break;
      case 'delete':
        if (window.confirm(`Delete ${selectedHypotheses.length} hypotheses?`)) {
          selectedHypotheses.forEach(id => {
            dispatch(deleteHypothesis(id));
          });
        }
        break;
      case 'group':
        const groupName = prompt('Enter group name:');
        if (groupName) {
          dispatch(groupHypotheses({ ids: selectedHypotheses, groupName }));
        }
        break;
      case 'export':
        dispatch(exportRegistry({ hypotheses: selectedHypotheses }));
        break;
      default:
        break;
    }
    
    setSelectedHypotheses([]);
    setShowBulkActions(false);
  }, [dispatch, selectedHypotheses]);
  
  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  
  // Add tag to hypothesis
  const addTag = (tag) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };
  
  // Remove tag from hypothesis
  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  // Edit hypothesis
  const handleEdit = (hypothesis) => {
    setFormData(hypothesis);
    setEditingHypothesis(hypothesis);
    setShowAddModal(true);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="hypothesis-registry">
      {/* Header */}
      <div className="registry-header">
        <div className="header-left">
          <h3>Hypothesis Registry</h3>
          <div className="registry-stats">
            <span className="stat">
              <span className="stat-value">{registryStats.total}</span>
              <span className="stat-label">Total</span>
            </span>
            <span className="stat">
              <span className="stat-value">{registryStats.tested}</span>
              <span className="stat-label">Tested</span>
            </span>
            <span className="stat significant">
              <span className="stat-value">{registryStats.significant}</span>
              <span className="stat-label">Significant</span>
            </span>
            <span className="stat rate">
              <span className="stat-value">{registryStats.significanceRate}%</span>
              <span className="stat-label">Sig. Rate</span>
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn-add primary"
            onClick={() => setShowAddModal(true)}
          >
            + Register Hypothesis
          </button>
          {selectedHypotheses.length > 0 && (
            <button 
              className="btn-bulk"
              onClick={() => setShowBulkActions(!showBulkActions)}
            >
              Bulk Actions ({selectedHypotheses.length})
            </button>
          )}
        </div>
      </div>
      
      {/* Filters and Controls */}
      <div className="registry-controls">
        <div className="filter-controls">
          <input
            type="text"
            placeholder="Search hypotheses..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="search-input"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {Object.entries(HypothesisCategories).map(([key, cat]) => (
              <option key={key} value={key}>{cat.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            {Object.entries(HypothesisStatus).map(([key, status]) => (
              <option key={key} value={key}>{status.label}</option>
            ))}
          </select>
        </div>
        
        <div className="view-controls">
          <div className="sort-controls">
            <label>Sort:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="timestamp">Date</option>
              <option value="description">Description</option>
              <option value="category">Category</option>
              <option value="pValue">P-value</option>
            </select>
            <button 
              className="sort-direction"
              onClick={() => setSortAscending(!sortAscending)}
            >
              {sortAscending ? '↑' : '↓'}
            </button>
          </div>
          
          <div className="view-mode">
            <button 
              className={`mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰
            </button>
            <button 
              className={`mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card View"
            >
              ⊞
            </button>
            <button 
              className={`mode-btn ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              title="Timeline View"
            >
              ⟿
            </button>
          </div>
        </div>
      </div>
      
      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bulk-actions-bar">
          <button onClick={() => handleBulkAction('lock')}>Lock Selected</button>
          <button onClick={() => handleBulkAction('group')}>Group Selected</button>
          <button onClick={() => handleBulkAction('export')}>Export Selected</button>
          <button onClick={() => handleBulkAction('delete')} className="danger">
            Delete Selected
          </button>
          <button onClick={() => setSelectedHypotheses([])}>Clear Selection</button>
        </div>
      )}
      
      {/* Main Content */}
      <div className="registry-content">
        {/* Table View */}
        {viewMode === 'table' && (
          <table className="hypothesis-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedHypotheses(filteredHypotheses.map(h => h.id));
                      } else {
                        setSelectedHypotheses([]);
                      }
                    }}
                    checked={selectedHypotheses.length === filteredHypotheses.length && filteredHypotheses.length > 0}
                  />
                </th>
                <th>ID</th>
                <th>Description</th>
                <th>Category</th>
                <th>Status</th>
                <th>Test Type</th>
                <th>p-value</th>
                <th>Tags</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHypotheses.map(hypothesis => (
                <tr key={hypothesis.id} className={hypothesis.status?.toLowerCase()}>
                  <td className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedHypotheses.includes(hypothesis.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHypotheses([...selectedHypotheses, hypothesis.id]);
                        } else {
                          setSelectedHypotheses(selectedHypotheses.filter(id => id !== hypothesis.id));
                        }
                      }}
                      disabled={hypothesis.status === 'LOCKED'}
                    />
                  </td>
                  <td className="id-col">
                    <span className="hypothesis-id">{hypothesis.id}</span>
                  </td>
                  <td className="description-col">
                    <div className="description-content">
                      <span className="description-text">{hypothesis.description}</span>
                      {hypothesis.preRegistered && (
                        <span className="pre-registered-badge" title="Pre-registered">
                          📋
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="category-col">
                    <span 
                      className="category-badge"
                      style={{ 
                        backgroundColor: HypothesisCategories[hypothesis.category]?.color 
                      }}
                    >
                      {HypothesisCategories[hypothesis.category]?.label}
                    </span>
                  </td>
                  <td className="status-col">
                    <span className="status-indicator">
                      <span className="status-icon">
                        {HypothesisStatus[hypothesis.status]?.icon}
                      </span>
                      <span className="status-label">
                        {HypothesisStatus[hypothesis.status]?.label}
                      </span>
                    </span>
                  </td>
                  <td className="test-type-col">{hypothesis.testType || '—'}</td>
                  <td className="p-value-col">
                    {hypothesis.pValue ? (
                      <span className={`p-value ${hypothesis.pValue < 0.05 ? 'significant' : ''}`}>
                        {hypothesis.pValue.toFixed(4)}
                        {hypothesis.pValue < 0.001 && ' ***'}
                        {hypothesis.pValue < 0.01 && hypothesis.pValue >= 0.001 && ' **'}
                        {hypothesis.pValue < 0.05 && hypothesis.pValue >= 0.01 && ' *'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="tags-col">
                    <div className="tags-list">
                      {hypothesis.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                      {hypothesis.tags?.length > 2 && (
                        <span className="tag more">+{hypothesis.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="timestamp-col">{formatTimestamp(hypothesis.timestamp)}</td>
                  <td className="actions-col">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(hypothesis)}
                      disabled={hypothesis.status === 'LOCKED'}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button 
                      className="action-btn lock"
                      onClick={() => dispatch(lockHypothesis(hypothesis.id))}
                      disabled={hypothesis.status === 'LOCKED'}
                      title="Lock"
                    >
                      🔒
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => {
                        if (window.confirm('Delete this hypothesis?')) {
                          dispatch(deleteHypothesis(hypothesis.id));
                        }
                      }}
                      disabled={hypothesis.status === 'LOCKED'}
                      title="Delete"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {/* Card View */}
        {viewMode === 'cards' && (
          <div className="hypothesis-cards">
            {filteredHypotheses.map(hypothesis => (
              <div key={hypothesis.id} className={`hypothesis-card ${hypothesis.status?.toLowerCase()}`}>
                <div className="card-header">
                  <span className="card-id">{hypothesis.id}</span>
                  <span 
                    className="card-category"
                    style={{ backgroundColor: HypothesisCategories[hypothesis.category]?.color }}
                  >
                    {HypothesisCategories[hypothesis.category]?.label}
                  </span>
                  <span className="card-status">
                    {HypothesisStatus[hypothesis.status]?.icon}
                  </span>
                </div>
                <div className="card-body">
                  <h4>{hypothesis.description}</h4>
                  {hypothesis.nullHypothesis && (
                    <div className="hypothesis-text">
                      <label>H₀:</label>
                      <span>{hypothesis.nullHypothesis}</span>
                    </div>
                  )}
                  {hypothesis.alternativeHypothesis && (
                    <div className="hypothesis-text">
                      <label>H₁:</label>
                      <span>{hypothesis.alternativeHypothesis}</span>
                    </div>
                  )}
                  {hypothesis.pValue && (
                    <div className="card-result">
                      <label>p-value:</label>
                      <span className={hypothesis.pValue < 0.05 ? 'significant' : ''}>
                        {hypothesis.pValue.toFixed(4)}
                      </span>
                    </div>
                  )}
                  <div className="card-tags">
                    {hypothesis.tags?.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="card-footer">
                  <span className="card-timestamp">{formatTimestamp(hypothesis.timestamp)}</span>
                  <div className="card-actions">
                    <button onClick={() => handleEdit(hypothesis)} disabled={hypothesis.status === 'LOCKED'}>
                      Edit
                    </button>
                    <button onClick={() => dispatch(lockHypothesis(hypothesis.id))} disabled={hypothesis.status === 'LOCKED'}>
                      Lock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="hypothesis-timeline">
            {filteredHypotheses.map((hypothesis, index) => (
              <div key={hypothesis.id} className="timeline-item">
                <div className="timeline-marker">
                  <span className="marker-icon">
                    {HypothesisStatus[hypothesis.status]?.icon}
                  </span>
                  {index < filteredHypotheses.length - 1 && <div className="timeline-line" />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-id">{hypothesis.id}</span>
                    <span className="timeline-time">{formatTimestamp(hypothesis.timestamp)}</span>
                  </div>
                  <div className="timeline-body">
                    <h4>{hypothesis.description}</h4>
                    <div className="timeline-meta">
                      <span className="category" style={{ color: HypothesisCategories[hypothesis.category]?.color }}>
                        {HypothesisCategories[hypothesis.category]?.label}
                      </span>
                      {hypothesis.testType && <span className="test-type">{hypothesis.testType}</span>}
                      {hypothesis.pValue && (
                        <span className={`p-value ${hypothesis.pValue < 0.05 ? 'significant' : ''}`}>
                          p = {hypothesis.pValue.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {filteredHypotheses.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h4>No Hypotheses Found</h4>
            <p>Start by registering your first hypothesis to begin tracking.</p>
            <button className="btn-add" onClick={() => setShowAddModal(true)}>
              Register First Hypothesis
            </button>
          </div>
        )}
      </div>
      
      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingHypothesis ? 'Edit Hypothesis' : 'Register New Hypothesis'}</h3>
              <button className="btn-close" onClick={() => {
                setShowAddModal(false);
                setEditingHypothesis(null);
                resetForm();
              }}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-section">
                <div className="form-group">
                  <label>Description *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the hypothesis"
                  />
                </div>
                
                <div className="form-group">
                  <label>Null Hypothesis (H₀)</label>
                  <textarea
                    value={formData.nullHypothesis}
                    onChange={(e) => setFormData({ ...formData, nullHypothesis: e.target.value })}
                    placeholder="State the null hypothesis"
                    rows="2"
                  />
                </div>
                
                <div className="form-group">
                  <label>Alternative Hypothesis (H₁)</label>
                  <textarea
                    value={formData.alternativeHypothesis}
                    onChange={(e) => setFormData({ ...formData, alternativeHypothesis: e.target.value })}
                    placeholder="State the alternative hypothesis"
                    rows="2"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {Object.entries(HypothesisCategories).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Test Type</label>
                    <input
                      type="text"
                      value={formData.testType}
                      onChange={(e) => setFormData({ ...formData, testType: e.target.value })}
                      placeholder="e.g., t-test, ANOVA"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Tags</label>
                  <div className="tag-input">
                    <div className="selected-tags">
                      {formData.tags.map(tag => (
                        <span key={tag} className="tag">
                          {tag}
                          <button onClick={() => removeTag(tag)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="tag-suggestions">
                      {TagSuggestions.filter(tag => !formData.tags.includes(tag)).map(tag => (
                        <button 
                          key={tag} 
                          className="suggestion"
                          onClick={() => addTag(tag)}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.preRegistered}
                      onChange={(e) => setFormData({ ...formData, preRegistered: e.target.checked })}
                    />
                    Pre-registered hypothesis
                  </label>
                </div>
                
                {formData.preRegistered && (
                  <div className="form-group">
                    <label>Registration URL</label>
                    <input
                      type="url"
                      value={formData.registrationUrl}
                      onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
                      placeholder="https://osf.io/..."
                    />
                  </div>
                )}
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or context"
                    rows="3"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingHypothesis(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-submit primary"
                onClick={handleRegister}
                disabled={!formData.description || !formData.category}
              >
                {editingHypothesis ? 'Update Hypothesis' : 'Register Hypothesis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HypothesisRegistry;