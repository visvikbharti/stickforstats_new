import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Tab,
  Tabs,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AnalysisIcon from '@mui/icons-material/Assessment';
import DesignIcon from '@mui/icons-material/Category';
import OptimizeIcon from '@mui/icons-material/TrendingUp';

// Import visualization components
import EffectPlot from './visualizations/EffectPlot';
import InteractionPlot from './visualizations/InteractionPlot';
import ResidualDiagnostics from './visualizations/ResidualDiagnostics';
import { fetchAnalysisData } from '../../services/doeService';

// Import WebSocket integration
import DOEWebSocketIntegration from './DOEWebSocketIntegration';

/**
 * Analysis component for DOE module
 * Provides tools for analyzing experimental results
 */
function Analysis({ content }) {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedExperiment, setSelectedExperiment] = useState('');
  const [activeTask, setActiveTask] = useState('design_generation');
  
  // Reference to WebSocket integration methods
  const webSocketRef = useRef({
    startDesignGeneration: () => {},
    startAnalysis: () => {},
    startOptimization: () => {}
  });
  
  // Fetch analysis data when component mounts or experiment changes
  useEffect(() => {
    if (!selectedExperiment) return;
    
    const loadAnalysisData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Only fetch real data from API - no mock data
        const data = await fetchAnalysisData(selectedExperiment);
        setAnalysisData(data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading analysis data:', err);
        setError('Failed to load analysis data. Please ensure you have uploaded experimental data.');
        setLoading(false);
      }
    };
    
    loadAnalysisData();
  }, [selectedExperiment]);
  
  // Handle analysis task completion
  const handleAnalysisComplete = (result) => {
    setAnalysisData(result);
  };
  
  // Handle design generation completion
  const handleDesignGenerated = (result) => {
    // Update UI with new design
    console.log('Design generated:', result);
    // You might want to switch tabs or update the experiment list
  };
  
  // Handle optimization completion
  const handleOptimizationComplete = (result) => {
    // Update UI with optimization results
    console.log('Optimization complete:', result);
  };
  
  // Start analysis
  const startAnalysis = () => {
    if (!selectedExperiment) {
      setError('Please select an experiment first');
      return;
    }
    
    setActiveTask('analysis');
    
    // For sample datasets, just set loading and then use the existing data 
    // as if it was returned from the server, to provide a smoother demo experience
    if (selectedExperiment.startsWith('sample-')) {
      setLoading(true);
      
      // Simulate a short loading time for better UX
      setTimeout(() => {
        setLoading(false);
        
        // If we already have analysis data, we don't need to do anything else
        // The data was already loaded in the useEffect
      }, 1500);
      
      return;
    }
    
    // For real experiments, use the websocket to request analysis
    webSocketRef.current.startAnalysis({
      experimentId: selectedExperiment,
      responseVariable: 'yield', // This would come from a form
      modelType: 'quadratic' // This would come from a form
    });
  };
  
  // Change tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Update active task based on tab
    switch(newValue) {
      case 0:
        setActiveTask('design_generation');
        break;
      case 1:
        setActiveTask('analysis');
        break;
      case 2:
        setActiveTask('optimization');
        break;
      default:
        setActiveTask('analysis');
    }
  };
  
  // Handle experiment selection
  const handleExperimentChange = (event) => {
    setSelectedExperiment(event.target.value);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Analysis & Interpretation
      </Typography>
      
      <Typography variant="body1" paragraph>
        Analyze your experimental results to identify significant factors, 
        interactions, and optimize your process. This section provides tools 
        for comprehensive analysis of your Design of Experiments data.
      </Typography>
      
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4 }}>
        {content?.introduction && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Introduction to DOE Analysis
            </Typography>
            <Typography variant="body1">
              {content.introduction}
            </Typography>
          </Box>
        )}
        
        {/* Experiment selection */}
        <Box sx={{ mb: 4 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="experiment-select-label">Select Experiment</InputLabel>
            <Select
              labelId="experiment-select-label"
              id="experiment-select"
              value={selectedExperiment}
              label="Select Experiment"
              onChange={handleExperimentChange}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="sample-1">Sample: Protein Expression</MenuItem>
              <MenuItem value="sample-2">Sample: Media Optimization</MenuItem>
              <MenuItem value="sample-3">Sample: Chromatography Method</MenuItem>
            </Select>
          </FormControl>
          
          <Typography variant="subtitle1" gutterBottom>
            Please select an experiment to analyze, or use one of our sample datasets 
            to explore the analysis tools.
          </Typography>
        </Box>
        
        {/* Analysis Tabs */}
        <Box sx={{ mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab icon={<DesignIcon />} label="Design" />
            <Tab icon={<AnalysisIcon />} label="Analysis" />
            <Tab icon={<OptimizeIcon />} label="Optimization" />
          </Tabs>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* WebSocket integration for real-time updates */}
          <DOEWebSocketIntegration
            experimentId={selectedExperiment || null}
            activeTask={activeTask}
            onDesignGenerated={handleDesignGenerated}
            onAnalysisComplete={handleAnalysisComplete}
            onOptimizationComplete={handleOptimizationComplete}
            ref={webSocketRef}
          />
          
          {/* Tab content */}
          <Box role="tabpanel" hidden={activeTab !== 0}>
            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Design Generation
                </Typography>
                <Typography variant="body2" paragraph>
                  Generate a new experimental design or modify an existing one.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setActiveTask('design_generation');
                    
                    // For demonstration, handle sample designs without errors
                    if (selectedExperiment && selectedExperiment.startsWith('sample-')) {
                      setLoading(true);
                      
                      // Simulate loading time for better UX
                      setTimeout(() => {
                        setLoading(false);
                        // We'd normally show a success message or update the UI here
                        
                        // Switch to the Analysis tab to show results
                        setActiveTab(1);
                      }, 1500);
                      
                      return;
                    }
                    
                    // For actual designs, use WebSocket
                    webSocketRef.current.startDesignGeneration({
                      factors: 3,
                      runs: 8,
                      designType: 'factorial'
                    });
                  }}
                >
                  Generate New Design
                </Button>
              </Box>
            )}
          </Box>
          
          <Box role="tabpanel" hidden={activeTab !== 1}>
            {activeTab === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Statistical Analysis
                </Typography>
                <Typography variant="body2" paragraph>
                  Analyze your experimental results to identify significant factors and interactions.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  disabled={!selectedExperiment}
                  onClick={startAnalysis}
                >
                  Run Analysis
                </Button>
                
                {/* Analysis visualizations */}
                {analysisData && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Analysis Results
                    </Typography>
                    
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Effect Plot
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <EffectPlot data={analysisData.effects} />
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Interaction Plot
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <InteractionPlot data={analysisData.interactions} />
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Residual Diagnostics
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResidualDiagnostics data={analysisData.residuals} />
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
          
          <Box role="tabpanel" hidden={activeTab !== 2}>
            {activeTab === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Response Optimization
                </Typography>
                <Typography variant="body2" paragraph>
                  Find optimal settings for your process variables to maximize desired responses.
                </Typography>
                {!analysisData?.optimization ? (
                  <Button 
                    variant="contained" 
                    color="primary"
                    disabled={!analysisData}
                    onClick={() => {
                      setActiveTask('optimization');
                      
                      // For demonstration, handle sample optimizations without errors
                      if (selectedExperiment && selectedExperiment.startsWith('sample-')) {
                        setLoading(true);
                        
                        // Simulate loading time for better UX
                        setTimeout(() => {
                          setLoading(false);
                          
                          // Update analysis data with optimization results
                          // For sample data, just add an optimization section to the existing data
                          setAnalysisData(prevData => ({
                            ...prevData,
                            optimization: {
                              status: "completed",
                              targetResponse: "yield",
                              optimalSettings: {
                                factors: {
                                  [selectedExperiment === 'sample-2' ? 'Glucose' : 
                                   selectedExperiment === 'sample-3' ? 'Flow Rate' : 'Temperature']: 1.23,
                                  [selectedExperiment === 'sample-2' ? 'NH4Cl' : 
                                   selectedExperiment === 'sample-3' ? 'Buffer pH' : 'pH']: 0.87,
                                  [selectedExperiment === 'sample-2' ? 'Inducer' : 
                                   selectedExperiment === 'sample-3' ? 'Salt Gradient' : 'Concentration']: -0.35,
                                  [selectedExperiment === 'sample-2' ? 'Aeration' : 
                                   selectedExperiment === 'sample-3' ? 'Column Length' : 'Time']: 0.12
                                },
                                predictedResponse: 9.45,
                                confidenceInterval: [8.92, 9.98],
                                desirability: 0.95
                              },
                              optimizationPath: [
                                {step: 1, value: 7.23, point: {x: 0.5, y: 0.2, z: -0.1, w: 0.0}},
                                {step: 2, value: 8.12, point: {x: 0.8, y: 0.4, z: -0.2, w: 0.05}},
                                {step: 3, value: 8.75, point: {x: 1.0, y: 0.6, z: -0.25, w: 0.1}},
                                {step: 4, value: 9.28, point: {x: 1.15, y: 0.75, z: -0.3, w: 0.1}},
                                {step: 5, value: 9.45, point: {x: 1.23, y: 0.87, z: -0.35, w: 0.12}}
                              ]
                            }
                          }));
                          
                          // Typically, you'd show a success message or visualization of the results here
                        }, 2000);
                        
                        return;
                      }
                      
                      // For actual optimization, use WebSocket
                      webSocketRef.current.startOptimization({
                        analysisId: selectedExperiment,
                        targetVariables: {
                          yield: { target: 'maximize', weight: 1.0 }
                        }
                      });
                    }}
                  >
                    Run Optimization
                  </Button>
                ) : (
                  // Display optimization results
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Optimization Results
                    </Typography>
                    
                    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Optimal Factor Settings
                      </Typography>
                      
                      <Box sx={{ mb: 3 }}>
                        {Object.entries(analysisData.optimization.optimalSettings.factors).map(([factor, value]) => (
                          <Box key={factor} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                            <Typography variant="body1">
                              {factor}:
                            </Typography>
                            <Typography variant="body1" fontWeight="bold">
                              {value.toFixed(2)}
                            </Typography>
                          </Box>
                        ))}
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, mt: 2, py: 1, borderBottom: 1, borderColor: 'primary.main', borderBottomWidth: 2 }}>
                          <Typography variant="body1" fontWeight="bold">
                            Predicted Response:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold" color="primary.main">
                            {analysisData.optimization.optimalSettings.predictedResponse.toFixed(2)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            95% Confidence Interval:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            [{analysisData.optimization.optimalSettings.confidenceInterval[0].toFixed(2)}, {analysisData.optimization.optimalSettings.confidenceInterval[1].toFixed(2)}]
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Desirability:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {analysisData.optimization.optimalSettings.desirability.toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="outlined" color="primary" sx={{ mr: 1 }}>
                          Download Report
                        </Button>
                        <Button variant="contained" color="primary">
                          Export Settings
                        </Button>
                      </Box>
                    </Paper>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
        
        {/* Sample visualization if no data selected */}
        {!analysisData && activeTab === 1 && (
          <>
            <Typography variant="h6" gutterBottom>
              Sample Analysis Tools
            </Typography>
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Effect Plot
              </Typography>
              <Box sx={{ height: 300 }}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography color="text.secondary">
                    Select an experiment and run analysis to view effect plots
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Interaction Plot
              </Typography>
              <Box sx={{ height: 300 }}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography color="text.secondary">
                    Select an experiment and run analysis to view interaction plots
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Residual Diagnostics
              </Typography>
              <Box sx={{ height: 300 }}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography color="text.secondary">
                    Select an experiment and run analysis to view residual diagnostics
                  </Typography>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default Analysis;