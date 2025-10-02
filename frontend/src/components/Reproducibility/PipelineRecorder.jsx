import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './PipelineRecorder.scss';

const StepTypes = {
  DATA_LOAD: { id: 'data_load', name: 'Data Loading', icon: '📁', color: '#3498db' },
  DATA_TRANSFORM: { id: 'data_transform', name: 'Data Transformation', icon: '🔄', color: '#9b59b6' },
  FILTER: { id: 'filter', name: 'Filtering', icon: '🔍', color: '#e67e22' },
  ASSUMPTION_CHECK: { id: 'assumption_check', name: 'Assumption Check', icon: '✓', color: '#f39c12' },
  STATISTICAL_TEST: { id: 'statistical_test', name: 'Statistical Test', icon: '📊', color: '#e74c3c' },
  EFFECT_SIZE: { id: 'effect_size', name: 'Effect Size', icon: '📏', color: '#1abc9c' },
  VISUALIZATION: { id: 'visualization', name: 'Visualization', icon: '📈', color: '#34495e' },
  EXPORT: { id: 'export', name: 'Export', icon: '💾', color: '#95a5a6' },
  CUSTOM: { id: 'custom', name: 'Custom Step', icon: '⚙️', color: '#7f8c8d' }
};

const RecordingModes = {
  MANUAL: {
    id: 'manual',
    name: 'Manual',
    description: 'Manually add and edit steps',
    icon: '✏️'
  },
  AUTOMATIC: {
    id: 'automatic',
    name: 'Automatic',
    description: 'Automatically capture all operations',
    icon: '🎯'
  },
  HYBRID: {
    id: 'hybrid',
    name: 'Hybrid',
    description: 'Automatic capture with manual annotations',
    icon: '🔀'
  }
};

const PipelineRecorder = () => {
  const dispatch = useDispatch();
  const { currentProject } = useSelector(state => state.project || {});
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState('hybrid');
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [editingStep, setEditingStep] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);
  const [dependencies, setDependencies] = useState({});
  const [branchPoints, setBranchPoints] = useState([]);
  const [annotations, setAnnotations] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showTimeline, setShowTimeline] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [compactView, setCompactView] = useState(false);
  
  const timelineRef = useRef(null);
  const flowchartRef = useRef(null);

  // Start/stop recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      
      // Add recording stop marker
      const stopStep = {
        id: Date.now(),
        type: 'custom',
        name: 'Recording Stopped',
        timestamp: new Date().toISOString(),
        duration: 0,
        automatic: true
      };
      
      setPipelineSteps(prev => [...prev, stopStep]);
      
      if (autoSave) {
        savePipeline();
      }
    } else {
      // Start recording
      setIsRecording(true);
      
      // Add recording start marker
      const startStep = {
        id: Date.now(),
        type: 'custom',
        name: 'Recording Started',
        timestamp: new Date().toISOString(),
        duration: 0,
        automatic: true,
        metadata: {
          mode: recordingMode,
          session: generateSessionId()
        }
      };
      
      setPipelineSteps(prev => [...prev, startStep]);
    }
  }, [isRecording, recordingMode, autoSave]);

  // Generate session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Add step to pipeline
  const addStep = useCallback((stepData) => {
    const newStep = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      duration: 0,
      automatic: recordingMode === 'automatic',
      ...stepData
    };
    
    // Calculate duration from previous step
    if (pipelineSteps.length > 0) {
      const prevStep = pipelineSteps[pipelineSteps.length - 1];
      const prevTime = new Date(prevStep.timestamp);
      const currTime = new Date(newStep.timestamp);
      newStep.duration = (currTime - prevTime) / 1000; // in seconds
    }
    
    // Check for dependencies
    if (stepData.inputs) {
      const deps = {};
      stepData.inputs.forEach(input => {
        const dependentStep = pipelineSteps.find(s => 
          s.outputs && s.outputs.includes(input)
        );
        if (dependentStep) {
          deps[input] = dependentStep.id;
        }
      });
      setDependencies(prev => ({
        ...prev,
        [newStep.id]: deps
      }));
    }
    
    setPipelineSteps(prev => [...prev, newStep]);
    
    // Add to execution log
    setExecutionLog(prev => [...prev, {
      stepId: newStep.id,
      timestamp: newStep.timestamp,
      message: `Executed: ${newStep.name}`,
      status: 'success'
    }]);
    
    return newStep;
  }, [pipelineSteps, recordingMode]);

  // Manual step addition
  const addManualStep = useCallback(() => {
    const stepType = prompt('Select step type:\n1. Data Load\n2. Transform\n3. Filter\n4. Test\n5. Visualization\n6. Custom');
    
    const typeMap = {
      '1': 'data_load',
      '2': 'data_transform', 
      '3': 'filter',
      '4': 'statistical_test',
      '5': 'visualization',
      '6': 'custom'
    };
    
    const type = typeMap[stepType] || 'custom';
    const name = prompt('Step name:') || 'Unnamed Step';
    const description = prompt('Description (optional):') || '';
    
    addStep({
      type,
      name,
      description,
      manual: true,
      parameters: {},
      inputs: [],
      outputs: []
    });
  }, [addStep]);

  // Edit step
  const editStep = useCallback((stepId, updates) => {
    setPipelineSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
    
    // Update log
    setExecutionLog(prev => [...prev, {
      stepId,
      timestamp: new Date().toISOString(),
      message: `Edited: ${updates.name || 'Step'}`,
      status: 'info'
    }]);
  }, []);

  // Delete step
  const deleteStep = useCallback((stepId) => {
    // Check for dependencies
    const hasDependents = Object.values(dependencies).some(deps => 
      Object.values(deps).includes(stepId)
    );
    
    if (hasDependents) {
      if (!confirm('This step has dependents. Deleting it may break the pipeline. Continue?')) {
        return;
      }
    }
    
    setPipelineSteps(prev => prev.filter(step => step.id !== stepId));
    
    // Clean up dependencies
    setDependencies(prev => {
      const newDeps = { ...prev };
      delete newDeps[stepId];
      
      // Remove references to deleted step
      Object.keys(newDeps).forEach(key => {
        Object.keys(newDeps[key]).forEach(input => {
          if (newDeps[key][input] === stepId) {
            delete newDeps[key][input];
          }
        });
      });
      
      return newDeps;
    });
    
    // Update log
    setExecutionLog(prev => [...prev, {
      stepId,
      timestamp: new Date().toISOString(),
      message: 'Step deleted',
      status: 'warning'
    }]);
  }, [dependencies]);

  // Reorder steps
  const moveStep = useCallback((stepId, direction) => {
    setPipelineSteps(prev => {
      const index = prev.findIndex(s => s.id === stepId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newSteps = [...prev];
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      
      return newSteps;
    });
  }, []);

  // Add branch point
  const addBranchPoint = useCallback((afterStepId, condition) => {
    const branch = {
      id: Date.now(),
      afterStep: afterStepId,
      condition,
      trueBranch: [],
      falseBranch: [],
      timestamp: new Date().toISOString()
    };
    
    setBranchPoints(prev => [...prev, branch]);
  }, []);

  // Add annotation
  const addAnnotation = useCallback((stepId, text) => {
    setAnnotations(prev => ({
      ...prev,
      [stepId]: text
    }));
  }, []);

  // Validate pipeline
  const validatePipeline = useCallback(() => {
    const issues = [];
    
    // Check for missing inputs
    pipelineSteps.forEach(step => {
      if (step.inputs && step.inputs.length > 0) {
        step.inputs.forEach(input => {
          const hasSource = pipelineSteps.some(s => 
            s.outputs && s.outputs.includes(input) && 
            pipelineSteps.indexOf(s) < pipelineSteps.indexOf(step)
          );
          
          if (!hasSource) {
            issues.push({
              stepId: step.id,
              type: 'warning',
              message: `Missing input source: ${input}`
            });
          }
        });
      }
    });
    
    // Check for circular dependencies
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCircularDep = (stepId) => {
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const deps = dependencies[stepId] || {};
      for (const depId of Object.values(deps)) {
        if (!visited.has(depId)) {
          if (hasCircularDep(depId)) return true;
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    pipelineSteps.forEach(step => {
      if (!visited.has(step.id)) {
        if (hasCircularDep(step.id)) {
          issues.push({
            stepId: step.id,
            type: 'error',
            message: 'Circular dependency detected'
          });
        }
      }
    });
    
    // Check for unreachable steps
    const reachable = new Set();
    const markReachable = (stepId) => {
      reachable.add(stepId);
      Object.keys(dependencies).forEach(depId => {
        if (Object.values(dependencies[depId]).includes(stepId)) {
          if (!reachable.has(parseInt(depId))) {
            markReachable(parseInt(depId));
          }
        }
      });
    };
    
    // Start from steps with no dependencies
    pipelineSteps.forEach(step => {
      if (!dependencies[step.id] || Object.keys(dependencies[step.id]).length === 0) {
        markReachable(step.id);
      }
    });
    
    pipelineSteps.forEach(step => {
      if (!reachable.has(step.id)) {
        issues.push({
          stepId: step.id,
          type: 'info',
          message: 'Step may be unreachable'
        });
      }
    });
    
    return issues;
  }, [pipelineSteps, dependencies]);

  // Generate code
  const generateCode = useCallback((language = 'python') => {
    let code = '';
    
    if (language === 'python') {
      code = '# Auto-generated pipeline code\n';
      code += 'import pandas as pd\nimport numpy as np\nfrom scipy import stats\n\n';
      code += '# Pipeline execution\n';
      
      pipelineSteps.forEach(step => {
        code += `\n# Step ${pipelineSteps.indexOf(step) + 1}: ${step.name}\n`;
        
        switch (step.type) {
          case 'data_load':
            code += `data = pd.read_csv('${step.parameters?.file || 'data.csv'}')\n`;
            break;
            
          case 'data_transform':
            code += `# Transform: ${step.description || 'Custom transformation'}\n`;
            code += `data_transformed = transform_data(data)\n`;
            break;
            
          case 'filter':
            code += `# Filter: ${step.description || 'Apply filter'}\n`;
            code += `data_filtered = data[data['column'] > threshold]\n`;
            break;
            
          case 'statistical_test':
            code += `# Statistical test: ${step.description || 'Perform test'}\n`;
            code += `statistic, p_value = stats.ttest_ind(group1, group2)\n`;
            code += `print(f'Test statistic: {statistic:.4f}, p-value: {p_value:.4f}')\n`;
            break;
            
          case 'visualization':
            code += `# Visualization: ${step.description || 'Create plot'}\n`;
            code += `import matplotlib.pyplot as plt\n`;
            code += `plt.figure(figsize=(10, 6))\n`;
            code += `# Add plotting code here\n`;
            code += `plt.show()\n`;
            break;
            
          default:
            code += `# Custom step: ${step.description || step.name}\n`;
            code += `# TODO: Implement ${step.name}\n`;
        }
        
        if (step.parameters && Object.keys(step.parameters).length > 0) {
          code += `# Parameters: ${JSON.stringify(step.parameters)}\n`;
        }
      });
      
    } else if (language === 'r') {
      code = '# Auto-generated pipeline code\n';
      code += 'library(tidyverse)\nlibrary(stats)\n\n';
      code += '# Pipeline execution\n';
      
      pipelineSteps.forEach(step => {
        code += `\n# Step ${pipelineSteps.indexOf(step) + 1}: ${step.name}\n`;
        
        switch (step.type) {
          case 'data_load':
            code += `data <- read.csv('${step.parameters?.file || 'data.csv'}')\n`;
            break;
            
          case 'statistical_test':
            code += `# Statistical test: ${step.description || 'Perform test'}\n`;
            code += `result <- t.test(group1, group2)\n`;
            code += `print(result)\n`;
            break;
            
          default:
            code += `# ${step.type}: ${step.name}\n`;
            code += `# TODO: Implement\n`;
        }
      });
    }
    
    return code;
  }, [pipelineSteps]);

  // Export pipeline
  const exportPipeline = useCallback((format = 'json') => {
    const pipelineData = {
      version: '1.0',
      created: new Date().toISOString(),
      mode: recordingMode,
      steps: pipelineSteps,
      dependencies,
      branchPoints,
      annotations,
      executionLog: executionLog.slice(-100), // Last 100 log entries
      metadata: {
        totalSteps: pipelineSteps.length,
        totalDuration: pipelineSteps.reduce((sum, s) => sum + (s.duration || 0), 0),
        hasIssues: validatePipeline().length > 0
      }
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pipeline_${timestamp}`;
    
    let content, mimeType;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(pipelineData, null, 2);
        mimeType = 'application/json';
        break;
        
      case 'yaml':
        // Simplified YAML conversion
        content = `# Pipeline Export\nversion: ${pipelineData.version}\n`;
        content += `created: ${pipelineData.created}\n`;
        content += `steps:\n`;
        pipelineSteps.forEach(step => {
          content += `  - name: ${step.name}\n`;
          content += `    type: ${step.type}\n`;
          content += `    timestamp: ${step.timestamp}\n`;
        });
        mimeType = 'text/yaml';
        break;
        
      case 'python':
        content = generateCode('python');
        mimeType = 'text/x-python';
        break;
        
      case 'r':
        content = generateCode('r');
        mimeType = 'text/plain';
        break;
        
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format === 'python' ? 'py' : format === 'r' ? 'R' : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [pipelineSteps, dependencies, branchPoints, annotations, executionLog, recordingMode, generateCode, validatePipeline]);

  // Save pipeline
  const savePipeline = useCallback(() => {
    const pipelineData = {
      steps: pipelineSteps,
      dependencies,
      annotations,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('pipeline_autosave', JSON.stringify(pipelineData));
    
    setExecutionLog(prev => [...prev, {
      stepId: null,
      timestamp: new Date().toISOString(),
      message: 'Pipeline auto-saved',
      status: 'success'
    }]);
  }, [pipelineSteps, dependencies, annotations]);

  // Load pipeline
  const loadPipeline = useCallback(() => {
    const saved = localStorage.getItem('pipeline_autosave');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setPipelineSteps(data.steps || []);
        setDependencies(data.dependencies || {});
        setAnnotations(data.annotations || {});
        
        setExecutionLog(prev => [...prev, {
          stepId: null,
          timestamp: new Date().toISOString(),
          message: 'Pipeline loaded from auto-save',
          status: 'success'
        }]);
      } catch (e) {
        console.error('Failed to load pipeline:', e);
      }
    }
  }, []);

  // Draw timeline visualization
  const drawTimeline = useCallback(() => {
    if (!timelineRef.current || pipelineSteps.length === 0) return;
    
    const canvas = timelineRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Calculate time range
    const times = pipelineSteps.map(s => new Date(s.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;
    
    // Draw axis
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Draw steps
    pipelineSteps.forEach((step, index) => {
      const x = margin.left + ((new Date(step.timestamp).getTime() - minTime) / timeRange) * plotWidth;
      const y = margin.top + (index / (pipelineSteps.length - 1 || 1)) * plotHeight;
      
      // Draw connection line
      if (index > 0) {
        const prevStep = pipelineSteps[index - 1];
        const prevX = margin.left + ((new Date(prevStep.timestamp).getTime() - minTime) / timeRange) * plotWidth;
        const prevY = margin.top + ((index - 1) / (pipelineSteps.length - 1 || 1)) * plotHeight;
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      // Draw step node
      const stepType = StepTypes[step.type.toUpperCase()] || StepTypes.CUSTOM;
      ctx.fillStyle = stepType.color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw step label
      ctx.fillStyle = '#2c3e50';
      ctx.font = '10px IBM Plex Sans';
      ctx.textAlign = 'left';
      ctx.fillText(step.name.substring(0, 20), x + 10, y + 3);
    });
    
    // Draw time labels
    ctx.fillStyle = '#7f8c8d';
    ctx.font = '10px IBM Plex Sans';
    ctx.textAlign = 'center';
    
    const startTime = new Date(minTime);
    const endTime = new Date(maxTime);
    
    ctx.fillText(startTime.toLocaleTimeString(), margin.left, height - margin.bottom + 20);
    ctx.fillText(endTime.toLocaleTimeString(), width - margin.right, height - margin.bottom + 20);
  }, [pipelineSteps]);

  // Draw flowchart
  const drawFlowchart = useCallback(() => {
    if (!flowchartRef.current || pipelineSteps.length === 0) return;
    
    const canvas = flowchartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const nodeWidth = 120;
    const nodeHeight = 40;
    const nodeSpacing = 30;
    const levelSpacing = 80;
    
    // Organize steps into levels based on dependencies
    const levels = [];
    const assigned = new Set();
    
    // Level 0: Steps with no dependencies
    const level0 = pipelineSteps.filter(step => 
      !dependencies[step.id] || Object.keys(dependencies[step.id]).length === 0
    );
    
    if (level0.length > 0) {
      levels.push(level0);
      level0.forEach(s => assigned.add(s.id));
    }
    
    // Subsequent levels
    while (assigned.size < pipelineSteps.length) {
      const nextLevel = pipelineSteps.filter(step => 
        !assigned.has(step.id) &&
        (!dependencies[step.id] || 
         Object.values(dependencies[step.id]).every(depId => assigned.has(depId)))
      );
      
      if (nextLevel.length === 0) break; // Prevent infinite loop
      
      levels.push(nextLevel);
      nextLevel.forEach(s => assigned.add(s.id));
    }
    
    // Draw nodes and connections
    levels.forEach((level, levelIndex) => {
      const levelY = 50 + levelIndex * levelSpacing;
      const levelWidth = level.length * (nodeWidth + nodeSpacing);
      const startX = (width - levelWidth) / 2;
      
      level.forEach((step, stepIndex) => {
        const x = startX + stepIndex * (nodeWidth + nodeSpacing);
        const y = levelY;
        
        // Draw dependencies
        const stepDeps = dependencies[step.id] || {};
        Object.values(stepDeps).forEach(depId => {
          const depStep = pipelineSteps.find(s => s.id === depId);
          if (!depStep) return;
          
          // Find position of dependent step
          for (let li = 0; li < levels.length; li++) {
            const depIndex = levels[li].findIndex(s => s.id === depId);
            if (depIndex !== -1) {
              const depX = (width - levels[li].length * (nodeWidth + nodeSpacing)) / 2 + 
                          depIndex * (nodeWidth + nodeSpacing) + nodeWidth / 2;
              const depY = 50 + li * levelSpacing + nodeHeight;
              
              // Draw arrow
              ctx.strokeStyle = '#95a5a6';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(depX, depY);
              ctx.lineTo(x + nodeWidth / 2, y);
              ctx.stroke();
              
              // Arrowhead
              const angle = Math.atan2(y - depY, x + nodeWidth / 2 - depX);
              ctx.beginPath();
              ctx.moveTo(x + nodeWidth / 2, y);
              ctx.lineTo(
                x + nodeWidth / 2 - 8 * Math.cos(angle - Math.PI / 6),
                y - 8 * Math.sin(angle - Math.PI / 6)
              );
              ctx.lineTo(
                x + nodeWidth / 2 - 8 * Math.cos(angle + Math.PI / 6),
                y - 8 * Math.sin(angle + Math.PI / 6)
              );
              ctx.closePath();
              ctx.fill();
              
              break;
            }
          }
        });
        
        // Draw node
        const stepType = StepTypes[step.type.toUpperCase()] || StepTypes.CUSTOM;
        
        ctx.fillStyle = stepType.color;
        ctx.fillRect(x, y, nodeWidth, nodeHeight);
        
        // Draw text
        ctx.fillStyle = 'white';
        ctx.font = '11px IBM Plex Sans';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Icon
        ctx.font = '14px sans-serif';
        ctx.fillText(stepType.icon, x + 20, y + nodeHeight / 2);
        
        // Name
        ctx.font = '11px IBM Plex Sans';
        ctx.fillText(
          step.name.length > 12 ? step.name.substring(0, 12) + '...' : step.name,
          x + nodeWidth / 2 + 10,
          y + nodeHeight / 2
        );
      });
    });
  }, [pipelineSteps, dependencies]);

  // Auto-save effect
  useEffect(() => {
    if (autoSave && pipelineSteps.length > 0) {
      const saveTimer = setTimeout(() => {
        savePipeline();
      }, 5000); // Save after 5 seconds of inactivity
      
      return () => clearTimeout(saveTimer);
    }
  }, [pipelineSteps, autoSave, savePipeline]);

  // Update visualizations
  useEffect(() => {
    if (showTimeline) {
      drawTimeline();
    } else {
      drawFlowchart();
    }
  }, [pipelineSteps, showTimeline, drawTimeline, drawFlowchart]);

  // Filter steps
  const filteredSteps = pipelineSteps.filter(step => {
    const matchesSearch = !searchTerm || 
      step.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || step.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="pipeline-recorder">
      <div className="recorder-header">
        <h2>Pipeline Recorder</h2>
        <div className="header-controls">
          <div className="recording-controls">
            <button
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
            >
              {isRecording ? '⏹ Stop' : '⏺ Record'}
            </button>
            <select
              value={recordingMode}
              onChange={(e) => setRecordingMode(e.target.value)}
              disabled={isRecording}
            >
              {Object.values(RecordingModes).map(mode => (
                <option key={mode.id} value={mode.id}>
                  {mode.icon} {mode.name}
                </option>
              ))}
            </select>
          </div>
          <div className="view-controls">
            <button
              className={`view-btn ${showTimeline ? 'active' : ''}`}
              onClick={() => setShowTimeline(true)}
            >
              Timeline
            </button>
            <button
              className={`view-btn ${!showTimeline ? 'active' : ''}`}
              onClick={() => setShowTimeline(false)}
            >
              Flowchart
            </button>
            <button
              className={`compact-btn ${compactView ? 'active' : ''}`}
              onClick={() => setCompactView(!compactView)}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      <div className="recorder-body">
        <div className="pipeline-panel">
          <div className="panel-header">
            <h3>Pipeline Steps ({pipelineSteps.length})</h3>
            <div className="panel-controls">
              <input
                type="text"
                placeholder="Search steps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                {Object.values(StepTypes).map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
              <button
                className="add-step-btn"
                onClick={addManualStep}
              >
                + Add Step
              </button>
            </div>
          </div>

          <div className={`steps-list ${compactView ? 'compact' : ''}`}>
            {filteredSteps.map((step, index) => {
              const stepType = StepTypes[step.type.toUpperCase()] || StepTypes.CUSTOM;
              const isSelected = selectedStep?.id === step.id;
              const isEditing = editingStep?.id === step.id;
              
              return (
                <div
                  key={step.id}
                  className={`step-item ${isSelected ? 'selected' : ''} ${step.automatic ? 'automatic' : 'manual'}`}
                  onClick={() => setSelectedStep(step)}
                >
                  <div className="step-header">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-icon" style={{ color: stepType.color }}>
                      {stepType.icon}
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingStep.name}
                        onChange={(e) => setEditingStep({ ...editingStep, name: e.target.value })}
                        onBlur={() => {
                          editStep(step.id, { name: editingStep.name });
                          setEditingStep(null);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            editStep(step.id, { name: editingStep.name });
                            setEditingStep(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="step-name">{step.name}</span>
                    )}
                    <span className="step-type">{stepType.name}</span>
                  </div>
                  
                  {!compactView && (
                    <>
                      {step.description && (
                        <div className="step-description">{step.description}</div>
                      )}
                      
                      <div className="step-metadata">
                        <span className="timestamp">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                        {step.duration > 0 && (
                          <span className="duration">{step.duration.toFixed(1)}s</span>
                        )}
                        {step.automatic && <span className="auto-badge">Auto</span>}
                        {annotations[step.id] && <span className="annotation-badge">📝</span>}
                      </div>
                      
                      {isSelected && (
                        <div className="step-actions">
                          <button onClick={() => setEditingStep(step)}>✏️</button>
                          <button onClick={() => moveStep(step.id, 'up')}>⬆</button>
                          <button onClick={() => moveStep(step.id, 'down')}>⬇</button>
                          <button onClick={() => {
                            const note = prompt('Add annotation:', annotations[step.id] || '');
                            if (note !== null) addAnnotation(step.id, note);
                          }}>📝</button>
                          <button onClick={() => deleteStep(step.id)}>🗑</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="panel-footer">
            <label>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              Auto-save
            </label>
            <button onClick={savePipeline}>💾 Save</button>
            <button onClick={loadPipeline}>📂 Load</button>
            <button onClick={() => setPipelineSteps([])}>🗑 Clear</button>
          </div>
        </div>

        <div className="visualization-panel">
          <div className="visualization-container">
            {showTimeline ? (
              <canvas
                ref={timelineRef}
                width={600}
                height={400}
                className="timeline-canvas"
              />
            ) : (
              <canvas
                ref={flowchartRef}
                width={600}
                height={400}
                className="flowchart-canvas"
              />
            )}
          </div>

          {selectedStep && (
            <div className="step-details">
              <h4>Step Details</h4>
              <div className="details-content">
                <div className="detail-item">
                  <label>Name:</label>
                  <span>{selectedStep.name}</span>
                </div>
                <div className="detail-item">
                  <label>Type:</label>
                  <span>{StepTypes[selectedStep.type.toUpperCase()]?.name}</span>
                </div>
                <div className="detail-item">
                  <label>Timestamp:</label>
                  <span>{new Date(selectedStep.timestamp).toLocaleString()}</span>
                </div>
                {selectedStep.duration > 0 && (
                  <div className="detail-item">
                    <label>Duration:</label>
                    <span>{selectedStep.duration.toFixed(2)}s</span>
                  </div>
                )}
                {selectedStep.parameters && Object.keys(selectedStep.parameters).length > 0 && (
                  <div className="detail-item">
                    <label>Parameters:</label>
                    <pre>{JSON.stringify(selectedStep.parameters, null, 2)}</pre>
                  </div>
                )}
                {annotations[selectedStep.id] && (
                  <div className="detail-item">
                    <label>Annotation:</label>
                    <div className="annotation">{annotations[selectedStep.id]}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="validation-panel">
            <h4>Pipeline Validation</h4>
            <button 
              className="validate-btn"
              onClick={() => {
                const issues = validatePipeline();
                if (issues.length === 0) {
                  alert('Pipeline is valid!');
                } else {
                  alert(`Found ${issues.length} issue(s):\n${issues.map(i => `- ${i.message}`).join('\n')}`);
                }
              }}
            >
              Validate Pipeline
            </button>
          </div>
        </div>
      </div>

      <div className="recorder-footer">
        <div className="export-controls">
          <button onClick={() => exportPipeline('json')}>Export JSON</button>
          <button onClick={() => exportPipeline('yaml')}>Export YAML</button>
          <button onClick={() => exportPipeline('python')}>Export Python</button>
          <button onClick={() => exportPipeline('r')}>Export R</button>
        </div>
        <div className="status-info">
          Mode: {RecordingModes[recordingMode].name} | 
          Steps: {pipelineSteps.length} | 
          Duration: {pipelineSteps.reduce((sum, s) => sum + (s.duration || 0), 0).toFixed(1)}s
        </div>
      </div>
    </div>
  );
};

export default PipelineRecorder;