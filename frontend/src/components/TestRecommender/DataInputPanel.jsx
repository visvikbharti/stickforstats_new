/**
 * Data Input Panel Component
 * ==========================
 * Professional data loading and configuration interface
 * Mimics SPSS/SAS data input workflows
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Papa from 'papaparse';
import { uploadData, setSelectedVariables, getRecommendations } from '../../store/slices/testRecommenderSlice';
import './DataInputPanel.scss';

const DataInputPanel = ({ 
  onAnalyze, 
  onVariablesChange, 
  onPreviewChange,
  viewMode = 'guided' 
}) => {
  // Redux hooks
  const dispatch = useDispatch();
  const { 
    dataSummary, 
    variables: reduxVariables,
    uploadProgress,
    uploadStatus,
    uploadError
  } = useSelector(state => state.testRecommender);
  
  // State for data management
  const [rawData, setRawData] = useState(null);
  const [variables, setVariables] = useState([]);
  const [selectedVariables, setSelectedVariables] = useState({
    dependent: null,
    independent: [],
    grouping: null,
    covariates: []
  });
  const [dataSource, setDataSource] = useState('upload'); // 'upload', 'paste', 'sample'
  const [dataFormat, setDataFormat] = useState('csv');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);
  const [missingValueCode, setMissingValueCode] = useState('');
  const [transformations, setTransformations] = useState([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [previewRows, setPreviewRows] = useState(10);
  
  // Refs
  const fileInputRef = useRef(null);
  const pasteAreaRef = useRef(null);
  
  // Sample datasets for demonstration
  const sampleDatasets = [
    { id: 'iris', name: 'Fisher\'s Iris', description: 'Classic 3-group classification' },
    { id: 'clinical', name: 'Clinical Trial', description: 'Treatment vs Control' },
    { id: 'anova', name: 'One-Way ANOVA', description: '4 groups, continuous outcome' },
    { id: 'paired', name: 'Paired Samples', description: 'Before/After measurements' },
    { id: 'regression', name: 'Regression Data', description: 'Multiple predictors' }
  ];
  
  // Handle file upload with backend integration
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    setParseError(null);
    
    // Check file type
    const validExtensions = ['.csv', '.xlsx', '.xls', '.json', '.tsv', '.txt'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setParseError('Unsupported file format. Please use CSV, Excel, TSV, TXT, or JSON.');
      setIsLoading(false);
      return;
    }
    
    try {
      // Upload file to backend
      const result = await dispatch(uploadData({ 
        file,
        onProgress: (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      })).unwrap();
      
      // Update local state with backend response
      if (result) {
        setRawData(result.preview || []);
        
        // Convert backend variables to local format
        const extractedVars = result.variables.map((v, index) => ({
          name: v.name,
          index: index,
          type: v.type,
          stats: {
            missing: v.missing_count,
            unique: v.unique_count,
            samples: v.sample_values
          },
          role: 'none',
          transform: 'none'
        }));
        
        setVariables(extractedVars);
        if (onVariablesChange) onVariablesChange(extractedVars);
        if (onPreviewChange) onPreviewChange(result.preview || []);
      }
      
      setIsLoading(false);
    } catch (error) {
      setParseError(error.message || 'Failed to upload file');
      setIsLoading(false);
    }
  }, [dispatch, onVariablesChange, onPreviewChange]);
  
  // Handle pasted data
  const handlePasteData = useCallback(() => {
    const pastedText = pasteAreaRef.current?.value;
    if (!pastedText) return;
    
    setIsLoading(true);
    setParseError(null);
    
    Papa.parse(pastedText, {
      delimiter: delimiter,
      header: hasHeader,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        handleDataParsed(results);
        setIsLoading(false);
      },
      error: (error) => {
        setParseError(error.message);
        setIsLoading(false);
      }
    });
  }, [delimiter, hasHeader]);
  
  // Handle parsed data
  const handleDataParsed = useCallback((results) => {
    if (!results.data || results.data.length === 0) {
      setParseError('No data found in file');
      return;
    }
    
    setRawData(results.data);
    
    // Extract variables
    const extractedVars = [];
    if (hasHeader && results.meta.fields) {
      results.meta.fields.forEach((field, index) => {
        const column = results.data.map(row => row[field]);
        const type = detectVariableType(column);
        const stats = calculateBasicStats(column, type);
        
        extractedVars.push({
          name: field,
          index: index,
          type: type,
          stats: stats,
          role: 'none', // 'dependent', 'independent', 'grouping', 'covariate'
          transform: 'none'
        });
      });
    } else {
      // No header, generate variable names
      const numCols = results.data[0].length;
      for (let i = 0; i < numCols; i++) {
        const column = results.data.map(row => row[i]);
        const type = detectVariableType(column);
        const stats = calculateBasicStats(column, type);
        
        extractedVars.push({
          name: `Var${i + 1}`,
          index: i,
          type: type,
          stats: stats,
          role: 'none',
          transform: 'none'
        });
      }
    }
    
    setVariables(extractedVars);
    onVariablesChange(extractedVars);
    onPreviewChange(results.data.slice(0, previewRows));
  }, [hasHeader, previewRows, onVariablesChange, onPreviewChange]);
  
  // Handle JSON data
  const handleJSONData = useCallback((jsonData) => {
    // Convert JSON to tabular format
    let data = [];
    if (Array.isArray(jsonData)) {
      data = jsonData;
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
      data = jsonData.data;
    } else {
      setParseError('Invalid JSON structure. Expected array or object with data array.');
      return;
    }
    
    setRawData(data);
    
    // Extract variables from first object
    if (data.length > 0) {
      const extractedVars = Object.keys(data[0]).map((key, index) => {
        const column = data.map(row => row[key]);
        const type = detectVariableType(column);
        const stats = calculateBasicStats(column, type);
        
        return {
          name: key,
          index: index,
          type: type,
          stats: stats,
          role: 'none',
          transform: 'none'
        };
      });
      
      setVariables(extractedVars);
      onVariablesChange(extractedVars);
      onPreviewChange(data.slice(0, previewRows));
    }
  }, [previewRows, onVariablesChange, onPreviewChange]);
  
  // Load sample dataset
  const loadSampleDataset = useCallback((datasetId) => {
    setIsLoading(true);
    setParseError(null);
    
    // Simulate loading sample data
    // In production, this would fetch from backend
    setTimeout(() => {
      let sampleData = [];
      
      if (datasetId === 'iris') {
        // Generate iris-like data
        sampleData = generateIrisData();
      } else if (datasetId === 'clinical') {
        sampleData = generateClinicalData();
      }
      // Add other sample datasets...
      
      setRawData(sampleData);
      
      // Extract variables
      const extractedVars = Object.keys(sampleData[0]).map((key, index) => {
        const column = sampleData.map(row => row[key]);
        const type = detectVariableType(column);
        const stats = calculateBasicStats(column, type);
        
        return {
          name: key,
          index: index,
          type: type,
          stats: stats,
          role: 'none',
          transform: 'none'
        };
      });
      
      setVariables(extractedVars);
      onVariablesChange(extractedVars);
      onPreviewChange(sampleData.slice(0, previewRows));
      setIsLoading(false);
    }, 500);
  }, [previewRows, onVariablesChange, onPreviewChange]);
  
  // Detect variable type
  const detectVariableType = (column) => {
    const nonMissing = column.filter(v => v !== null && v !== undefined && v !== '');
    if (nonMissing.length === 0) return 'empty';
    
    const uniqueValues = new Set(nonMissing);
    const allNumbers = nonMissing.every(v => typeof v === 'number' || !isNaN(parseFloat(v)));
    
    if (allNumbers) {
      if (uniqueValues.size === 2) return 'binary';
      if (uniqueValues.size <= 10 && nonMissing.every(v => Number.isInteger(Number(v)))) {
        return 'ordinal';
      }
      return 'continuous';
    }
    
    if (uniqueValues.size === 2) return 'binary';
    if (uniqueValues.size <= 20) return 'categorical';
    return 'text';
  };
  
  // Calculate basic statistics
  const calculateBasicStats = (column, type) => {
    const nonMissing = column.filter(v => v !== null && v !== undefined && v !== '');
    const stats = {
      n: nonMissing.length,
      missing: column.length - nonMissing.length,
      unique: new Set(nonMissing).size
    };
    
    if (type === 'continuous' || type === 'ordinal') {
      const numbers = nonMissing.map(v => parseFloat(v)).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        stats.mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        stats.min = Math.min(...numbers);
        stats.max = Math.max(...numbers);
        stats.std = Math.sqrt(
          numbers.reduce((sq, n) => sq + Math.pow(n - stats.mean, 2), 0) / numbers.length
        );
      }
    }
    
    return stats;
  };
  
  // Generate sample data (simplified for demonstration)
  const generateIrisData = () => {
    const data = [];
    const species = ['setosa', 'versicolor', 'virginica'];
    for (let i = 0; i < 150; i++) {
      data.push({
        sepal_length: 4.5 + Math.random() * 3,
        sepal_width: 2 + Math.random() * 2,
        petal_length: 1 + Math.random() * 5,
        petal_width: 0.1 + Math.random() * 2,
        species: species[Math.floor(i / 50)]
      });
    }
    return data;
  };
  
  const generateClinicalData = () => {
    const data = [];
    for (let i = 0; i < 100; i++) {
      data.push({
        patient_id: `P${String(i + 1).padStart(3, '0')}`,
        age: 20 + Math.floor(Math.random() * 60),
        treatment: i < 50 ? 'Control' : 'Treatment',
        baseline: 70 + Math.random() * 30,
        outcome: (i < 50 ? 75 : 85) + Math.random() * 20,
        sex: Math.random() > 0.5 ? 'M' : 'F'
      });
    }
    return data;
  };
  
  // Handle variable role assignment
  const handleVariableRole = (varName, role) => {
    const updatedVars = variables.map(v => {
      if (v.name === varName) {
        return { ...v, role };
      }
      // Clear role if assigning to another variable
      if (role === 'dependent' || role === 'grouping') {
        if (v.role === role) {
          return { ...v, role: 'none' };
        }
      }
      return v;
    });
    
    setVariables(updatedVars);
    
    // Update selected variables
    const newSelection = { ...selectedVariables };
    if (role === 'dependent') {
      newSelection.dependent = varName;
    } else if (role === 'grouping') {
      newSelection.grouping = varName;
    } else if (role === 'independent') {
      if (!newSelection.independent.includes(varName)) {
        newSelection.independent.push(varName);
      }
    }
    setSelectedVariables(newSelection);
  };
  
  // Handle analysis trigger
  const handleAnalyze = () => {
    if (!rawData || rawData.length === 0) {
      setParseError('Please load data before analyzing');
      return;
    }
    
    const metadata = {
      variables: variables,
      selectedVariables: selectedVariables,
      sampleSize: rawData.length,
      dataSource: dataSource,
      transformations: transformations
    };
    
    onAnalyze(rawData, metadata);
  };
  
  return (
    <div className="data-input-panel">
      <div className="panel-header">
        <h2>Data Input & Configuration</h2>
        <div className="header-actions">
          <button 
            className="btn-text"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            {showAdvancedOptions ? '▼' : '▶'} Advanced Options
          </button>
        </div>
      </div>
      
      {/* Data Source Selector */}
      <div className="data-source-selector">
        <div className="source-tabs">
          <button 
            className={`source-tab ${dataSource === 'upload' ? 'active' : ''}`}
            onClick={() => setDataSource('upload')}
          >
            📁 Upload File
          </button>
          <button 
            className={`source-tab ${dataSource === 'paste' ? 'active' : ''}`}
            onClick={() => setDataSource('paste')}
          >
            📋 Paste Data
          </button>
          <button 
            className={`source-tab ${dataSource === 'sample' ? 'active' : ''}`}
            onClick={() => setDataSource('sample')}
          >
            📊 Sample Datasets
          </button>
        </div>
        
        {/* Upload Interface */}
        {dataSource === 'upload' && (
          <div className="upload-interface">
            <input 
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div 
              className="upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-content">
                <span className="upload-icon">📁</span>
                <p>Click to browse or drag file here</p>
                <small>Supports CSV, TSV, TXT, JSON</small>
              </div>
            </div>
            
            {showAdvancedOptions && (
              <div className="upload-options">
                <div className="option-group">
                  <label>
                    <input 
                      type="checkbox"
                      checked={hasHeader}
                      onChange={(e) => setHasHeader(e.target.checked)}
                    />
                    First row contains headers
                  </label>
                </div>
                <div className="option-group">
                  <label>Delimiter:</label>
                  <select 
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                  >
                    <option value=",">Comma (,)</option>
                    <option value="\t">Tab</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
                <div className="option-group">
                  <label>Missing value code:</label>
                  <input 
                    type="text"
                    value={missingValueCode}
                    onChange={(e) => setMissingValueCode(e.target.value)}
                    placeholder="e.g., NA, -999"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Paste Interface */}
        {dataSource === 'paste' && (
          <div className="paste-interface">
            <textarea 
              ref={pasteAreaRef}
              className="paste-area"
              placeholder="Paste your data here (CSV, TSV, or space-delimited)"
              rows={10}
            />
            <button 
              className="btn-primary"
              onClick={handlePasteData}
            >
              Parse Data
            </button>
          </div>
        )}
        
        {/* Sample Datasets */}
        {dataSource === 'sample' && (
          <div className="sample-datasets">
            {sampleDatasets.map(dataset => (
              <div 
                key={dataset.id}
                className="sample-dataset-card"
                onClick={() => loadSampleDataset(dataset.id)}
              >
                <h4>{dataset.name}</h4>
                <p>{dataset.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Error Display */}
      {parseError && (
        <div className="error-message">
          <span className="error-icon">⚠</span>
          {parseError}
        </div>
      )}
      
      {/* Variables Configuration */}
      {variables.length > 0 && (
        <div className="variables-configuration">
          <h3>Variable Configuration</h3>
          <div className="variables-table">
            <table>
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Type</th>
                  <th>N</th>
                  <th>Missing</th>
                  <th>Role</th>
                  <th>Transform</th>
                </tr>
              </thead>
              <tbody>
                {variables.map(variable => (
                  <tr key={variable.name}>
                    <td className="var-name">{variable.name}</td>
                    <td className="var-type">
                      <span className={`type-badge type-${variable.type}`}>
                        {variable.type}
                      </span>
                    </td>
                    <td className="var-stat">{variable.stats.n}</td>
                    <td className="var-stat">{variable.stats.missing}</td>
                    <td>
                      <select 
                        value={variable.role}
                        onChange={(e) => handleVariableRole(variable.name, e.target.value)}
                        className="role-select"
                      >
                        <option value="none">—</option>
                        <option value="dependent">Dependent</option>
                        <option value="independent">Independent</option>
                        <option value="grouping">Grouping</option>
                        <option value="covariate">Covariate</option>
                      </select>
                    </td>
                    <td>
                      <select 
                        value={variable.transform}
                        onChange={(e) => {/* Handle transform */}}
                        className="transform-select"
                      >
                        <option value="none">None</option>
                        <option value="log">Log</option>
                        <option value="sqrt">Square Root</option>
                        <option value="zscore">Z-Score</option>
                        <option value="rank">Rank</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Data Preview */}
      {rawData && rawData.length > 0 && (
        <div className="data-preview">
          <div className="preview-header">
            <h3>Data Preview</h3>
            <span className="preview-info">
              Showing {Math.min(previewRows, rawData.length)} of {rawData.length} rows
            </span>
          </div>
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  {variables.map(v => (
                    <th key={v.name}>{v.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawData.slice(0, previewRows).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="row-number">{rowIndex + 1}</td>
                    {variables.map(v => (
                      <td key={v.name} className={`cell-${v.type}`}>
                        {row[v.name] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="panel-actions">
        <button 
          className="btn-secondary"
          onClick={() => {
            setRawData(null);
            setVariables([]);
            setSelectedVariables({
              dependent: null,
              independent: [],
              grouping: null,
              covariates: []
            });
          }}
          disabled={!rawData}
        >
          Clear Data
        </button>
        <button 
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={!rawData || isLoading}
        >
          {isLoading ? 'Processing...' : 'Analyze Data →'}
        </button>
      </div>
    </div>
  );
};

export default DataInputPanel;