/**
 * Test Recommender Workbench
 * ==========================
 * Enterprise-grade statistical test recommendation interface
 * Inspired by SPSS, SAS, and JMP professional interfaces
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  analyzeData,
  checkAssumptions,
  runRecommendedTest,
  setActiveStep,
  toggleSection,
  clearError,
  saveToHistory,
  resetAnalysis,
  selectDataCharacteristics,
  selectAssumptionChecks,
  selectRecommendations,
  selectTestResults,
  selectUI,
  selectHistory
} from '../../store/slices/testRecommenderSlice';
import DataInputPanel from './DataInputPanel';
import AssumptionChecksPanel from './AssumptionChecksPanel';
import TestSelectionPanel from './TestSelectionPanel';
import ResultsPanel from './ResultsPanel';
import './TestRecommenderWorkbench.scss';

// Icons - using Unicode symbols for enterprise look
const Icons = {
  data: '⊞',
  check: '✓',
  warning: '⚠',
  error: '✗',
  info: 'ℹ',
  play: '▶',
  reset: '↻',
  save: '💾',
  export: '↗',
  settings: '⚙',
  help: '?',
  collapse: '▼',
  expand: '▶',
  filter: '▽',
  sort: '↕',
  chart: '📊',
  table: '▦'
};

const TestRecommenderWorkbench = () => {
  const dispatch = useDispatch();
  const dataCharacteristics = useSelector(selectDataCharacteristics);
  const assumptionChecks = useSelector(selectAssumptionChecks);
  const recommendations = useSelector(selectRecommendations);
  const testResults = useSelector(selectTestResults);
  const ui = useSelector(selectUI);
  const history = useSelector(selectHistory);
  
  // Local state for advanced features
  const [viewMode, setViewMode] = useState('guided'); // 'guided' | 'expert' | 'comparison'
  const [showConsole, setShowConsole] = useState(false);
  const [selectedVariables, setSelectedVariables] = useState([]);
  const [dataPreview, setDataPreview] = useState(null);
  
  // Refs for keyboard navigation
  const workbenchRef = useRef(null);
  const consoleRef = useRef(null);
  
  // Workflow steps configuration
  const workflowSteps = [
    {
      id: 'data_input',
      label: 'Data Input',
      icon: Icons.data,
      description: 'Load and configure dataset'
    },
    {
      id: 'assumption_check',
      label: 'Assumption Checks',
      icon: Icons.check,
      description: 'Verify statistical assumptions'
    },
    {
      id: 'test_selection',
      label: 'Test Selection',
      icon: Icons.chart,
      description: 'Choose appropriate test'
    },
    {
      id: 'results',
      label: 'Results',
      icon: Icons.table,
      description: 'View analysis output'
    }
  ];
  
  // Get current step index
  const currentStepIndex = workflowSteps.findIndex(step => step.id === ui.activeStep);
  
  // Handle step navigation
  const handleStepClick = useCallback((stepId) => {
    dispatch(setActiveStep(stepId));
  }, [dispatch]);
  
  // Handle data analysis
  const handleAnalyzeData = useCallback((data, metadata) => {
    dispatch(analyzeData({ data, metadata }));
  }, [dispatch]);
  
  // Handle assumption checking
  const handleCheckAssumptions = useCallback((data, testType) => {
    dispatch(checkAssumptions({ data, testType }));
  }, [dispatch]);
  
  // Handle test execution
  const handleRunTest = useCallback((testName, data, parameters) => {
    dispatch(runRecommendedTest({ testName, data, parameters }));
  }, [dispatch]);
  
  // Handle saving to history
  const handleSaveAnalysis = useCallback(() => {
    dispatch(saveToHistory());
  }, [dispatch]);
  
  // Handle reset
  const handleReset = useCallback(() => {
    if (window.confirm('Reset all analysis? This cannot be undone.')) {
      dispatch(resetAnalysis());
    }
  }, [dispatch]);
  
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + R: Run analysis
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        // Trigger appropriate action based on current step
      }
      // Ctrl/Cmd + S: Save to history
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveAnalysis();
      }
      // F1: Toggle help
      if (e.key === 'F1') {
        e.preventDefault();
        setShowConsole(!showConsole);
      }
      // Tab: Navigate between panels
      if (e.key === 'Tab' && !e.shiftKey) {
        // Custom tab navigation logic
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSaveAnalysis, showConsole]);
  
  return (
    <div className="test-recommender-workbench" ref={workbenchRef}>
      {/* Top Toolbar */}
      <div className="workbench-toolbar">
        <div className="toolbar-section">
          <h1 className="workbench-title">Statistical Test Recommender</h1>
          <span className="version-badge">v1.5.0</span>
        </div>
        
        <div className="toolbar-section">
          <div className="view-mode-selector">
            <button 
              className={`mode-btn ${viewMode === 'guided' ? 'active' : ''}`}
              onClick={() => setViewMode('guided')}
              title="Guided Mode"
            >
              Guided
            </button>
            <button 
              className={`mode-btn ${viewMode === 'expert' ? 'active' : ''}`}
              onClick={() => setViewMode('expert')}
              title="Expert Mode"
            >
              Expert
            </button>
            <button 
              className={`mode-btn ${viewMode === 'comparison' ? 'active' : ''}`}
              onClick={() => setViewMode('comparison')}
              title="Comparison Mode"
            >
              Compare
            </button>
          </div>
        </div>
        
        <div className="toolbar-section toolbar-actions">
          <button 
            className="toolbar-btn"
            onClick={handleSaveAnalysis}
            disabled={!testResults.testName}
            title="Save Analysis (Ctrl+S)"
          >
            {Icons.save} Save
          </button>
          <button 
            className="toolbar-btn"
            onClick={() => {/* Export logic */}}
            disabled={!testResults.testName}
            title="Export Results"
          >
            {Icons.export} Export
          </button>
          <button 
            className="toolbar-btn danger"
            onClick={handleReset}
            title="Reset Analysis"
          >
            {Icons.reset} Reset
          </button>
          <button 
            className="toolbar-btn"
            onClick={() => setShowConsole(!showConsole)}
            title="Toggle Console (F1)"
          >
            {Icons.help} Console
          </button>
        </div>
      </div>
      
      {/* Workflow Progress Bar */}
      <div className="workflow-progress">
        {workflowSteps.map((step, index) => (
          <div 
            key={step.id}
            className={`workflow-step ${
              index <= currentStepIndex ? 'completed' : ''
            } ${step.id === ui.activeStep ? 'active' : ''}`}
            onClick={() => handleStepClick(step.id)}
          >
            <div className="step-indicator">
              <span className="step-icon">{step.icon}</span>
              <span className="step-number">{index + 1}</span>
            </div>
            <div className="step-info">
              <div className="step-label">{step.label}</div>
              <div className="step-description">{step.description}</div>
            </div>
            {index < workflowSteps.length - 1 && (
              <div className="step-connector" />
            )}
          </div>
        ))}
      </div>
      
      {/* Main Content Area */}
      <div className="workbench-content">
        {/* Left Sidebar - Data & Variables */}
        <aside className="workbench-sidebar">
          <div className="sidebar-panel">
            <div className="panel-header">
              <h3>Variables</h3>
              <button className="panel-action" title="Refresh">
                {Icons.reset}
              </button>
            </div>
            <div className="variable-list">
              {selectedVariables.length > 0 ? (
                selectedVariables.map((variable, index) => (
                  <div key={index} className="variable-item">
                    <span className="variable-type">
                      {variable.type === 'continuous' ? 'ℝ' : 'Σ'}
                    </span>
                    <span className="variable-name">{variable.name}</span>
                    <span className="variable-stats">
                      n={variable.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  No variables loaded
                </div>
              )}
            </div>
          </div>
          
          <div className="sidebar-panel">
            <div className="panel-header">
              <h3>History</h3>
              <span className="history-count">
                {history.analyses.length} saved
              </span>
            </div>
            <div className="history-list">
              {history.analyses.slice(0, 5).map((analysis, index) => (
                <div 
                  key={analysis.timestamp}
                  className="history-item"
                  onClick={() => {/* Load from history */}}
                >
                  <span className="history-time">
                    {new Date(analysis.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="history-test">
                    {analysis.testResults?.testName || 'Incomplete'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
        
        {/* Center - Main Panels */}
        <main className="workbench-main">
          {/* Data Input Panel */}
          {ui.activeStep === 'data_input' && (
            <DataInputPanel
              onAnalyze={handleAnalyzeData}
              onVariablesChange={setSelectedVariables}
              onPreviewChange={setDataPreview}
              viewMode={viewMode}
            />
          )}
          
          {/* Assumption Checks Panel */}
          {ui.activeStep === 'assumption_check' && (
            <AssumptionChecksPanel
              dataCharacteristics={dataCharacteristics}
              assumptionChecks={assumptionChecks}
              onCheckAssumptions={handleCheckAssumptions}
              viewMode={viewMode}
            />
          )}
          
          {/* Test Selection Panel */}
          {ui.activeStep === 'test_selection' && (
            <TestSelectionPanel
              recommendations={recommendations}
              assumptionChecks={assumptionChecks}
              onRunTest={handleRunTest}
              viewMode={viewMode}
            />
          )}
          
          {/* Results Panel */}
          {ui.activeStep === 'results' && (
            <ResultsPanel viewMode={viewMode} />
          )}
          
          {/* Error/Warning Display */}
          {ui.error && (
            <div className="alert alert-error">
              <span className="alert-icon">{Icons.error}</span>
              <span className="alert-message">{ui.error}</span>
              <button 
                className="alert-close"
                onClick={() => dispatch(clearError())}
              >
                ×
              </button>
            </div>
          )}
          
          {ui.warnings.length > 0 && (
            <div className="alert alert-warning">
              <span className="alert-icon">{Icons.warning}</span>
              <div className="alert-messages">
                {ui.warnings.map((warning, index) => (
                  <div key={index} className="warning-item">
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
        
        {/* Right Sidebar - Properties & Help */}
        <aside className="workbench-sidebar workbench-sidebar-right">
          <div className="sidebar-panel">
            <div className="panel-header">
              <h3>Properties</h3>
            </div>
            <div className="properties-list">
              <div className="property-group">
                <h4>Data Characteristics</h4>
                <dl className="property-list">
                  <dt>Sample Size</dt>
                  <dd>{dataCharacteristics.sampleSize || '—'}</dd>
                  <dt>Groups</dt>
                  <dd>{dataCharacteristics.numberOfGroups || '—'}</dd>
                  <dt>Type</dt>
                  <dd>{dataCharacteristics.dataType || '—'}</dd>
                </dl>
              </div>
              
              {assumptionChecks.normality.test && (
                <div className="property-group">
                  <h4>Assumptions</h4>
                  <dl className="property-list">
                    <dt>Normality</dt>
                    <dd className={assumptionChecks.normality.passed ? 'pass' : 'fail'}>
                      {assumptionChecks.normality.passed ? 'Passed' : 'Failed'}
                    </dd>
                    <dt>Homogeneity</dt>
                    <dd className={assumptionChecks.homogeneity.passed ? 'pass' : 'fail'}>
                      {assumptionChecks.homogeneity.passed ? 'Passed' : 'Failed'}
                    </dd>
                  </dl>
                </div>
              )}
            </div>
          </div>
          
          <div className="sidebar-panel">
            <div className="panel-header">
              <h3>Quick Help</h3>
            </div>
            <div className="help-content">
              <div className="help-item">
                <kbd>Ctrl+R</kbd> Run Analysis
              </div>
              <div className="help-item">
                <kbd>Ctrl+S</kbd> Save to History
              </div>
              <div className="help-item">
                <kbd>F1</kbd> Toggle Console
              </div>
            </div>
          </div>
        </aside>
      </div>
      
      {/* Console Panel (Hidden by default) */}
      {showConsole && (
        <div className="workbench-console" ref={consoleRef}>
          <div className="console-header">
            <h3>Analysis Console</h3>
            <button 
              className="console-close"
              onClick={() => setShowConsole(false)}
            >
              ×
            </button>
          </div>
          <div className="console-content">
            <pre className="console-output">
              {`> Test Recommender initialized
> Current step: ${ui.activeStep}
> Data loaded: ${dataCharacteristics.sampleSize ? 'Yes' : 'No'}
> Assumptions checked: ${assumptionChecks.normality.test ? 'Yes' : 'No'}
> Test recommended: ${recommendations.primary.testName || 'None'}
> Results available: ${testResults.testName ? 'Yes' : 'No'}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestRecommenderWorkbench;